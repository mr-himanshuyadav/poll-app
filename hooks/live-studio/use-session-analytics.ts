"use client";

import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";

import { supabase } from "@/lib/supabase";

import type {
    SessionAnalytics,
    SessionQuestionAnalytics,
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

interface AnalyticsResponse {
    id: string;

    question_id: string;

    participant_id: string;

    answer: unknown;

    response_time_ms: number | null;
}

interface AnalyticsQuestion {
    id: string;

    position: number;

    options: string[];
}

function normalizeAnswer(
    answer: unknown,
): string {
    if (
        typeof answer === "string"
    ) {
        return answer;
    }

    if (
        typeof answer === "number" ||
        typeof answer === "boolean"
    ) {
        return String(answer);
    }

    if (answer === null) {
        return "";
    }

    if (Array.isArray(answer)) {
        return answer
            .map(normalizeAnswer)
            .join(", ");
    }

    try {
        return JSON.stringify(answer);
    } catch {
        return String(answer);
    }
}

function createQuestionAnalytics(
    question: AnalyticsQuestion,
    responses: AnalyticsResponse[],
    totalParticipants: number,
): SessionQuestionAnalytics {
    const questionResponses =
        responses.filter(
            (response) =>
                response.question_id ===
                question.id,
        );

    const totalResponses =
        questionResponses.length;

    const uniqueResponders =
        new Set(
            questionResponses.map(
                (response) =>
                    response.participant_id,
            ),
        ).size;

    const participationRate =
        totalParticipants > 0
            ? (uniqueResponders /
                  totalParticipants) *
              100
            : 0;

    const distributionMap =
        new Map<string, number>();

    /**
     * Start with all configured options.
     *
     * This ensures options with zero responses
     * still appear in analytics.
     */
    question.options.forEach(
        (option) => {
            distributionMap.set(
                option,
                0,
            );
        },
    );

    questionResponses.forEach(
        (response) => {
            const answer =
                normalizeAnswer(
                    response.answer,
                );

            distributionMap.set(
                answer,
                (
                    distributionMap.get(
                        answer,
                    ) ?? 0
                ) + 1,
            );
        },
    );

    const distribution =
        Array.from(
            distributionMap.entries(),
        ).map(
            ([label, count]) => ({
                id: label,

                label,

                count,

                percentage:
                    totalResponses > 0
                        ? (count /
                              totalResponses) *
                          100
                        : 0,
            }),
        );

    return {
        question_id:
            question.id,

        total_responses:
            totalResponses,

        response_count:
            uniqueResponders,

        response_rate:
            participationRate,

        participation_rate:
            participationRate,

        options:
            question.options,

        distribution,
    };
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

    const isMountedRef =
        useRef(true);

    useEffect(() => {
        return () => {
            isMountedRef.current =
                false;
        };
    }, []);

    const fetchAnalytics =
        useCallback(
            async (
                silent = false,
            ): Promise<void> => {
                if (
                    !sessionId ||
                    !enabled
                ) {
                    if (
                        isMountedRef.current
                    ) {
                        setAnalytics(null);
                        setError(null);
                        setIsLoading(false);
                        setIsUpdating(false);
                    }

                    return;
                }

                if (
                    isMountedRef.current
                ) {
                    if (silent) {
                        setIsUpdating(true);
                    } else {
                        setIsLoading(true);
                    }

                    setError(null);
                }

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
                                `
                                    id,
                                    question_id,
                                    participant_id,
                                    answer,
                                    response_time_ms
                                `,
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
                                `
                                    id,
                                    position,
                                    options
                                `,
                            )
                            .eq(
                                "session_id",
                                sessionId,
                            )
                            .order(
                                "position",
                                {
                                    ascending:
                                        true,
                                },
                            ),
                    ]);

                    if (
                        participantsResult.error
                    ) {
                        throw new Error(
                            `Participants analytics failed: ${participantsResult.error.message}`,
                        );
                    }

                    if (
                        responsesResult.error
                    ) {
                        throw new Error(
                            `Responses analytics failed: ${responsesResult.error.message}`,
                        );
                    }

                    if (
                        questionsResult.error
                    ) {
                        throw new Error(
                            `Questions analytics failed: ${questionsResult.error.message}`,
                        );
                    }

                    const totalParticipants =
                        participantsResult.count ??
                        0;

                    const responses =
                        (
                            responsesResult.data ??
                            []
                        ) as AnalyticsResponse[];

                    const questions =
                        (
                            questionsResult.data ??
                            []
                        ).map(
                            (
                                question,
                            ): AnalyticsQuestion => ({
                                id:
                                    question.id,

                                position:
                                    question.position,

                                options:
                                    Array.isArray(
                                        question.options,
                                    )
                                        ? question.options
                                        : [],
                            }),
                        );

                    const questionAnalytics =
                        questions.map(
                            (question) =>
                                createQuestionAnalytics(
                                    question,
                                    responses,
                                    totalParticipants,
                                ),
                        );

                    const totalResponses =
                        responses.length;

                    const answeredQuestions =
                        questionAnalytics.filter(
                            (question) =>
                                question.total_responses >
                                0,
                        ).length;

                    const averageResponseRate =
                        questionAnalytics.length >
                        0
                            ? questionAnalytics.reduce(
                                  (
                                      total,
                                      question,
                                  ) =>
                                      total +
                                      question.response_rate,
                                  0,
                              ) /
                              questionAnalytics.length
                            : 0;

                    const calculatedAnalytics: SessionAnalytics =
                        {
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
                        };

                    if (
                        isMountedRef.current
                    ) {
                        setAnalytics(
                            calculatedAnalytics,
                        );
                    }
                } catch (caughtError) {
                    const normalizedError =
                        caughtError instanceof Error
                            ? caughtError
                            : new Error(
                                  "Unable to load analytics.",
                              );

                    if (
                        isMountedRef.current
                    ) {
                        setError(
                            normalizedError,
                        );
                    }
                } finally {
                    if (
                        isMountedRef.current
                    ) {
                        setIsLoading(false);
                        setIsUpdating(false);
                    }
                }
            },
            [
                enabled,
                sessionId,
            ],
        );

    /**
     * Initial load.
     */
    useEffect(() => {
        void fetchAnalytics(false);
    }, [fetchAnalytics]);

    /**
     * Background refresh.
     */
    useEffect(() => {
        if (
            !enabled ||
            !sessionId ||
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

    return {
        analytics,

        isLoading,

        isUpdating,

        error,

        refetch: () =>
            fetchAnalytics(false),
    };
}