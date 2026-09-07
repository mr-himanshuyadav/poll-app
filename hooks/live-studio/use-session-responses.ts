"use client";

import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

import { supabase } from "@/lib/supabase";

interface SessionResponse {
    id: string;

    session_id: string;

    question_id: string;

    participant_id?: string | null;

    response?: unknown;

    answer?: unknown;

    created_at?: string;
}

interface UseSessionResponsesOptions {
    sessionId?: string | null;

    activeQuestionId?: string | null;

    realtime?: boolean;
}

interface UseSessionResponsesReturn {
    responses: SessionResponse[];

    activeQuestionResponses: SessionResponse[];

    totalResponses: number;

    isLoading: boolean;

    error: Error | null;

    refetch: () => Promise<void>;
}

export function useSessionResponses({
    sessionId,
    activeQuestionId,
    realtime = true,
}: UseSessionResponsesOptions): UseSessionResponsesReturn {
    const [responses, setResponses] =
        useState<SessionResponse[]>([]);

    const [isLoading, setIsLoading] =
        useState(true);

    const [error, setError] =
        useState<Error | null>(null);

    const fetchResponses =
        useCallback(async () => {
            if (!sessionId) {
                setResponses([]);
                setIsLoading(false);

                return;
            }

            setIsLoading(true);
            setError(null);

            try {
                const { data, error } =
                    await supabase
                        .from(
                            "responses",
                        )
                        .select("*")
                        .eq(
                            "quiz_id",
                            sessionId,
                        )
                        .order(
                            "created_at",
                            {
                                ascending: false,
                            },
                        );

                if (error) {
                    throw error;
                }

                setResponses(
                    (data ?? []) as SessionResponse[],
                );
            } catch (error) {
                const normalizedError =
                    error instanceof Error
                        ? error
                        : new Error(
                              "Unable to load responses.",
                          );

                setError(normalizedError);
                setResponses([]);
            } finally {
                setIsLoading(false);
            }
        }, [sessionId]);

    useEffect(() => {
        void fetchResponses();
    }, [fetchResponses]);

    useEffect(() => {
        if (
            !realtime ||
            !sessionId
        ) {
            return;
        }

        const channel =
            supabase
                .channel(
                    `session-responses-${sessionId}`,
                )
                .on(
                    "postgres_changes",
                    {
                        event: "INSERT",
                        schema: "public",
                        table: "responses",
                        filter: `quiz_id=eq.${sessionId}`,
                    },
                    (payload) => {
                        const newResponse =
                            payload.new as SessionResponse;

                        setResponses(
                            (
                                currentResponses,
                            ) => {
                                const alreadyExists =
                                    currentResponses.some(
                                        (
                                            response,
                                        ) =>
                                            response.id ===
                                            newResponse.id,
                                    );

                                if (
                                    alreadyExists
                                ) {
                                    return currentResponses;
                                }

                                return [
                                    newResponse,
                                    ...currentResponses,
                                ];
                            },
                        );
                    },
                )
                .on(
                    "postgres_changes",
                    {
                        event: "UPDATE",
                        schema: "public",
                        table: "responses",
                        filter: `quiz_id=eq.${sessionId}`,
                    },
                    (payload) => {
                        const updatedResponse =
                            payload.new as SessionResponse;

                        setResponses(
                            (
                                currentResponses,
                            ) =>
                                currentResponses.map(
                                    (
                                        response,
                                    ) =>
                                        response.id ===
                                        updatedResponse.id
                                            ? updatedResponse
                                            : response,
                                ),
                        );
                    },
                )
                .on(
                    "postgres_changes",
                    {
                        event: "DELETE",
                        schema: "public",
                        table: "responses",
                        filter: `quiz_id=eq.${sessionId}`,
                    },
                    (payload) => {
                        const deletedResponse =
                            payload.old as {
                                id?: string;
                            };

                        setResponses(
                            (
                                currentResponses,
                            ) =>
                                currentResponses.filter(
                                    (
                                        response,
                                    ) =>
                                        response.id !==
                                        deletedResponse.id,
                                ),
                        );
                    },
                )
                .subscribe();

        return () => {
            void supabase.removeChannel(
                channel,
            );
        };
    }, [
        realtime,
        sessionId,
    ]);

    const activeQuestionResponses =
        useMemo(() => {
            if (!activeQuestionId) {
                return [];
            }

            return responses.filter(
                (response) =>
                    response.question_id ===
                    activeQuestionId,
            );
        }, [
            activeQuestionId,
            responses,
        ]);

    return {
        responses,
        activeQuestionResponses,
        totalResponses:
            activeQuestionResponses.length,
        isLoading,
        error,
        refetch: fetchResponses,
    };
}