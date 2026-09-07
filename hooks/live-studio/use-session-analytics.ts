"use client";

import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

import { supabase } from "@/lib/supabase";

import type {
    SessionAnalytics,
} from "@/components/live-studio/live-studio-types";

interface UseSessionAnalyticsOptions {
    sessionId?: string | null;

    enabled?: boolean;

    refreshInterval?: number;
}

interface UseSessionAnalyticsReturn {
    analytics: SessionAnalytics | null;

    isLoading: boolean;

    isUpdating: boolean;

    error: Error | null;

    refetch: () => Promise<void>;
}

export function useSessionAnalytics({
    sessionId,
    enabled = true,
    refreshInterval = 10000,
}: UseSessionAnalyticsOptions): UseSessionAnalyticsReturn {
    const [analytics, setAnalytics] =
        useState<SessionAnalytics | null>(
            null,
        );

    const [isLoading, setIsLoading] =
        useState(true);

    const [isUpdating, setIsUpdating] =
        useState(false);

    const [error, setError] =
        useState<Error | null>(null);

    const fetchAnalytics =
        useCallback(
            async (
                silent = false,
            ): Promise<void> => {
                if (!sessionId || !enabled) {
                    setAnalytics(null);
                    setIsLoading(false);

                    return;
                }

                if (silent) {
                    setIsUpdating(true);
                } else {
                    setIsLoading(true);
                }

                setError(null);

                try {
                    const [
                        participantsResult,
                        responsesResult,
                        questionsResult,
                    ] = await Promise.all([
                        supabase
                            .from(
                                "participants",
                            )
                            .select(
                                "id",
                                {
                                    count: "exact",
                                    head: true,
                                },
                            )
                            .eq(
                                "quiz_id",
                                sessionId,
                            ),

                        supabase
                            .from(
                                "responses",
                            )
                            .select(
                                "id, question_id",
                            )
                            .eq(
                                "quiz_id",
                                sessionId,
                            ),

                        supabase
                            .from(
                                "session_questions",
                            )
                            .select(
                                "id, position",
                            )
                            .eq(
                                "session_id",
                                sessionId,
                            )
                            .order(
                                "position",
                                {
                                    ascending: true,
                                },
                            ),
                    ]);

                    if (
                        participantsResult.error
                    ) {
                        throw participantsResult.error;
                    }

                    if (
                        responsesResult.error
                    ) {
                        throw responsesResult.error;
                    }

                    if (
                        questionsResult.error
                    ) {
                        throw questionsResult.error;
                    }

                    const totalParticipants =
                        participantsResult.count ??
                        0;

                    const responses =
                        responsesResult.data ?? [];

                    const questions =
                        questionsResult.data ?? [];

                    const responseMap =
                        new Map<
                            string,
                            number
                        >();

                    responses.forEach(
                        (response: any) => {
                            const currentCount =
                                responseMap.get(
                                    response.question_id,
                                ) ?? 0;

                            responseMap.set(
                                response.question_id,
                                currentCount + 1,
                            );
                        },
                    );

                    const questionAnalytics =
                        questions.map(
                            (
                                question: any,
                            ) => {
                                const responseCount =
                                    responseMap.get(
                                        question.id,
                                    ) ?? 0;

                                const responseRate =
                                    totalParticipants >
                                    0
                                        ? (responseCount /
                                              totalParticipants) *
                                          100
                                        : 0;

                                return {
                                    question_id:
                                        question.id,
                                    total_responses:
                                        responseCount,
                                    response_count:
                                        responseCount,
                                    response_rate:
                                        responseRate,
                                    participation_rate:
                                        responseRate,
                                };
                            },
                        );

                    const answeredQuestions =
                        questionAnalytics.filter(
                            (
                                question: any,
                            ) =>
                                question.total_responses >
                                0,
                        ).length;

                    const totalResponses =
                        responses.length;

                    const averageResponseRate =
                        questionAnalytics.length >
                        0
                            ? questionAnalytics.reduce(
                                  (
                                      total,
                                      question,
                                  ) =>
                                      total +
                                      Number(
                                          question.response_rate,
                                      ),
                                  0,
                              ) /
                              questionAnalytics.length
                            : 0;

                    const calculatedAnalytics = {
                        total_participants:
                            totalParticipants,

                        total_responses:
                            totalResponses,

                        answered_questions:
                            answeredQuestions,

                        average_response_rate:
                            averageResponseRate,

                        response_rate:
                            averageResponseRate,

                        questions:
                            questionAnalytics,
                    } as SessionAnalytics;

                    setAnalytics(
                        calculatedAnalytics,
                    );
                } catch (error) {
                    const normalizedError =
                        error instanceof Error
                            ? error
                            : new Error(
                                  "Unable to load analytics.",
                              );

                    setError(
                        normalizedError,
                    );
                } finally {
                    setIsLoading(false);
                    setIsUpdating(false);
                }
            },
            [
                enabled,
                sessionId,
            ],
        );

    useEffect(() => {
        if (!enabled) {
            return;
        }

        void fetchAnalytics(false);
    }, [
        enabled,
        fetchAnalytics,
    ]);

    useEffect(() => {
        if (
            !enabled ||
            !sessionId ||
            !refreshInterval ||
            refreshInterval <= 0
        ) {
            return;
        }

        const interval =
            window.setInterval(() => {
                void fetchAnalytics(true);
            }, refreshInterval);

        return () => {
            window.clearInterval(
                interval,
            );
        };
    }, [
        enabled,
        fetchAnalytics,
        refreshInterval,
        sessionId,
    ]);

    const stableAnalytics =
        useMemo(
            () => analytics,
            [analytics],
        );

    return {
        analytics: stableAnalytics,
        isLoading,
        isUpdating,
        error,
        refetch: () =>
            fetchAnalytics(false),
    };
}