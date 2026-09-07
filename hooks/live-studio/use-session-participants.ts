"use client";

import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

import { supabase } from "@/lib/supabase";

interface SessionParticipant {
    id: string;

    session_id: string;

    user_id?: string | null;

    name?: string | null;

    display_name?: string | null;

    email?: string | null;

    joined_at?: string | null;

    created_at?: string | null;

    last_seen_at?: string | null;

    is_online?: boolean;
}

interface UseSessionParticipantsOptions {
    sessionId?: string | null;

    realtime?: boolean;
}

interface UseSessionParticipantsReturn {
    participants: SessionParticipant[];

    totalParticipants: number;

    onlineParticipants: number;

    isLoading: boolean;

    error: Error | null;

    refetch: () => Promise<void>;
}

export function useSessionParticipants({
    sessionId,
    realtime = true,
}: UseSessionParticipantsOptions): UseSessionParticipantsReturn {
    const [participants, setParticipants] =
        useState<SessionParticipant[]>([]);

    const [isLoading, setIsLoading] =
        useState(true);

    const [error, setError] =
        useState<Error | null>(null);

    const fetchParticipants =
        useCallback(async () => {
            if (!sessionId) {
                setParticipants([]);
                setIsLoading(false);

                return;
            }

            setIsLoading(true);
            setError(null);

            try {
                const { data, error } =
                    await supabase
                        .from(
                            "session_participants",
                        )
                        .select("*")
                        .eq(
                            "session_id",
                            sessionId,
                        )
                        .order(
                            "joined_at",
                            {
                                ascending: false,
                            },
                        );

                if (error) {
                    throw error;
                }

                setParticipants(
                    (data ??
                        []) as SessionParticipant[],
                );
            } catch (error) {
                const normalizedError =
                    error instanceof Error
                        ? error
                        : new Error(
                              "Unable to load participants.",
                          );

                setError(normalizedError);
                setParticipants([]);
            } finally {
                setIsLoading(false);
            }
        }, [sessionId]);

    useEffect(() => {
        void fetchParticipants();
    }, [fetchParticipants]);

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
                    `session-participants-${sessionId}`,
                )
                .on(
                    "postgres_changes",
                    {
                        event: "INSERT",
                        schema: "public",
                        table: "session_participants",
                        filter: `session_id=eq.${sessionId}`,
                    },
                    (payload) => {
                        const newParticipant =
                            payload.new as SessionParticipant;

                        setParticipants(
                            (
                                currentParticipants,
                            ) => {
                                const exists =
                                    currentParticipants.some(
                                        (
                                            participant,
                                        ) =>
                                            participant.id ===
                                            newParticipant.id,
                                    );

                                if (exists) {
                                    return currentParticipants;
                                }

                                return [
                                    newParticipant,
                                    ...currentParticipants,
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
                        table: "session_participants",
                        filter: `session_id=eq.${sessionId}`,
                    },
                    (payload) => {
                        const updatedParticipant =
                            payload.new as SessionParticipant;

                        setParticipants(
                            (
                                currentParticipants,
                            ) =>
                                currentParticipants.map(
                                    (
                                        participant,
                                    ) =>
                                        participant.id ===
                                        updatedParticipant.id
                                            ? updatedParticipant
                                            : participant,
                                ),
                        );
                    },
                )
                .on(
                    "postgres_changes",
                    {
                        event: "DELETE",
                        schema: "public",
                        table: "session_participants",
                        filter: `session_id=eq.${sessionId}`,
                    },
                    (payload) => {
                        const deletedParticipant =
                            payload.old as {
                                id?: string;
                            };

                        setParticipants(
                            (
                                currentParticipants,
                            ) =>
                                currentParticipants.filter(
                                    (
                                        participant,
                                    ) =>
                                        participant.id !==
                                        deletedParticipant.id,
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

    const onlineParticipants =
        useMemo(
            () =>
                participants.filter(
                    (participant) =>
                        participant.is_online ===
                        true,
                ).length,
            [participants],
        );

    return {
        participants,
        totalParticipants:
            participants.length,
        onlineParticipants,
        isLoading,
        error,
        refetch: fetchParticipants,
    };
}