"use client";

import {
    useCallback,
    useEffect,
    useState,
} from "react";

import { supabase } from "@/lib/supabase";

import type {
    LiveSession,
} from "@/components/live-studio/live-studio-types";

interface UseLiveSessionOptions {
    sessionCode: string;
}

interface UseLiveSessionReturn {
    session: LiveSession | null;

    isLoading: boolean;

    error: Error | null;

    refetch: () => Promise<void>;

    updateSession: (
        updates: Partial<LiveSession>,
    ) => Promise<LiveSession | null>;

    setSession: (
        session: LiveSession | null,
    ) => void;
}

function normalizeSession(
    data: any,
): LiveSession {
    return data as LiveSession;
}

export function useLiveSession({
    sessionCode,
}: UseLiveSessionOptions): UseLiveSessionReturn {
    const [session, setSession] =
        useState<LiveSession | null>(
            null,
        );

    const [isLoading, setIsLoading] =
        useState(true);

    const [error, setError] =
        useState<Error | null>(null);

    const fetchSession =
        useCallback(async () => {
            if (!sessionCode) {
                setSession(null);
                setIsLoading(false);

                return;
            }

            setIsLoading(true);
            setError(null);

            try {
                const { data, error } =
                    await supabase
                        .from("sessions")
                        .select("*")
                        .eq(
                            "session_code",
                            sessionCode,
                        )
                        .single();

                if (error) {
                    throw error;
                }

                if (!data) {
                    throw new Error(
                        "Session not found.",
                    );
                }

                setSession(
                    normalizeSession(data),
                );
            } catch (error) {
                const normalizedError =
                    error instanceof Error
                        ? error
                        : new Error(
                              "Unable to load session.",
                          );

                setError(normalizedError);
                setSession(null);
            } finally {
                setIsLoading(false);
            }
        }, [sessionCode]);

    useEffect(() => {
        void fetchSession();
    }, [fetchSession]);

    const updateSession =
        useCallback(
            async (
                updates: Partial<LiveSession>,
            ): Promise<LiveSession | null> => {
                if (!session?.id) {
                    throw new Error(
                        "Session is not available.",
                    );
                }

                setError(null);

                try {
                    const { data, error } =
                        await supabase
                            .from("sessions")
                            .update(updates)
                            .eq(
                                "id",
                                session.id,
                            )
                            .select()
                            .single();

                    if (error) {
                        throw error;
                    }

                    if (!data) {
                        throw new Error(
                            "Unable to update session.",
                        );
                    }

                    const updatedSession =
                        normalizeSession(data);

                    setSession(
                        updatedSession,
                    );

                    return updatedSession;
                } catch (error) {
                    const normalizedError =
                        error instanceof Error
                            ? error
                            : new Error(
                                  "Unable to update session.",
                              );

                    setError(
                        normalizedError,
                    );

                    throw normalizedError;
                }
            },
            [session?.id],
        );

    return {
        session,
        isLoading,
        error,
        refetch: fetchSession,
        updateSession,
        setSession,
    };
}