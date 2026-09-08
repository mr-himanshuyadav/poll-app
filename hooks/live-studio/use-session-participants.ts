"use client";

import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

import { supabase } from "@/lib/supabase";
import { useLiveRecovery } from "@/hooks/use-live-recovery";

import type {
    SessionParticipant,
} from "@/components/live-studio/live-studio-types";

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

/**
 * A participant is considered online when:
 *
 * - They have not explicitly left.
 * - Their last activity was within the last five minutes.
 */
function isParticipantOnline(
    participant: SessionParticipant,
): boolean {
    if (participant.left_at) {
        return false;
    }

    const lastSeen = new Date(
        participant.last_seen_at,
    ).getTime();

    if (Number.isNaN(lastSeen)) {
        return false;
    }

    const onlineThreshold =
        5 * 60 * 1000;

    return (
        Date.now() - lastSeen <=
        onlineThreshold
    );
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
                setError(null);
                setIsLoading(false);

                return;
            }

            setIsLoading(true);
            setError(null);

            try {
                const {
                    data,
                    error: queryError,
                } = await supabase
                    .from("participants")
                    .select(
                        `
                            id,
                            quiz_id,
                            session_token,
                            name,
                            roll_number,
                            is_anonymous,
                            joined_at,
                            last_seen_at,
                            left_at
                        `,
                    )
                    .eq(
                        "quiz_id",
                        sessionId,
                    )
                    .order(
                        "joined_at",
                        {
                            ascending: false,
                        },
                    );

                if (queryError) {
                    throw queryError;
                }

                setParticipants(
                    (data ??
                        []) as SessionParticipant[],
                );
            } catch (caughtError) {
                const normalizedError =
                    caughtError instanceof Error
                        ? caughtError
                        : new Error(
                              "Unable to load participants.",
                          );

                setError(normalizedError);
                setParticipants([]);
            } finally {
                setIsLoading(false);
            }
        }, [sessionId]);

    /**
     * Initial participant load.
     */
    useEffect(() => {
        void fetchParticipants();
    }, [fetchParticipants]);

    /**
     * Realtime participant updates.
     */
    useEffect(() => {
        if (
            !realtime ||
            !sessionId
        ) {
            return;
        }

        const channel = supabase
            .channel(
                `session-participants-${sessionId}`,
            )

            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "participants",
                    filter:
                        `quiz_id=eq.${sessionId}`,
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
                    table: "participants",
                    filter:
                        `quiz_id=eq.${sessionId}`,
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
                    table: "participants",
                    filter:
                        `quiz_id=eq.${sessionId}`,
                },
                (payload) => {
                    const deletedParticipant =
                        payload.old as {
                            id?: string;
                        };

                    if (
                        !deletedParticipant.id
                    ) {
                        return;
                    }

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

            .subscribe((status) => {
                if (
                    status === "CHANNEL_ERROR" ||
                    status === "TIMED_OUT"
                ) {
                    void fetchParticipants();
                }
            });

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
                    isParticipantOnline,
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