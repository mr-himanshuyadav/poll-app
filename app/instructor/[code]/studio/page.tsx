"use client";

import {
    use,
    useEffect,
    useMemo,
    useState,
} from "react";

import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";

import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

import type {
    Participant,
    PollResponse,
    QuizTemplate,
    Session,
    SessionQuestion,
} from "@/lib/types";

type ResponseWithParticipant = PollResponse & {
    participant?: Participant | null;
};

type ResultsMode = "live" | "on_command" | "hidden";
type QuestionType = "multiple_choice" | "scale";

type QuestionAnalytics = {
    question: SessionQuestion;
    responseCount: number;
    uniqueResponders: number;
    responseRate: number;
    averageResponseTimeMs: number | null;
    medianResponseTimeMs: number | null;
    dominantOption: string | null;
    dominantOptionCount: number;
    dominantOptionPercentage: number;
};

type StatCardProps = {
    label: string;
    value: string | number;
    helper?: string;
    emphasis?: "default" | "success" | "warning" | "danger";
};

type BarRowProps = {
    label: string;
    count: number;
    total: number;
    index?: number;
    suffix?: string;
};

const ACTIVE_PARTICIPANT_THRESHOLD_MS = 45 * 1000;

function clampPercentage(value: number) {
    if (!Number.isFinite(value)) {
        return 0;
    }

    return Math.min(100, Math.max(0, value));
}

function formatPercentage(value: number) {
    return `${Math.round(clampPercentage(value))}%`;
}

function formatDurationMs(value: number | null) {
    if (value === null || !Number.isFinite(value)) {
        return "—";
    }

    if (value < 1000) {
        return `${Math.round(value)} ms`;
    }

    const seconds = value / 1000;

    if (seconds < 60) {
        return `${seconds.toFixed(1)}s`;
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);

    return `${minutes}m ${remainingSeconds}s`;
}

function median(values: number[]) {
    if (values.length === 0) {
        return null;
    }

    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);

    if (sorted.length % 2 === 0) {
        return (sorted[middle - 1] + sorted[middle]) / 2;
    }

    return sorted[middle];
}

function getQuestionStatusLabel(status: SessionQuestion["status"]) {
    switch (status) {
        case "active":
            return "LIVE";
        case "closed":
            return "CLOSED";
        default:
            return "QUEUED";
    }
}

function getQuestionStatusClass(status: SessionQuestion["status"]) {
    switch (status) {
        case "active":
            return "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-300";
        case "closed":
            return "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400";
        default:
            return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300";
    }
}

function getResultsModeLabel(mode: ResultsMode) {
    switch (mode) {
        case "live":
            return "Live";
        case "on_command":
            return "On command";
        case "hidden":
            return "Hidden";
        default:
            return mode;
    }
}

function getParticipantLabel(participant: Participant) {
    if (participant.is_anonymous) {
        return "Anonymous participant";
    }

    return participant.name?.trim() || "Unnamed participant";
}

function isParticipantActive(participant: Participant) {
    if (participant.left_at) {
        return false;
    }

    const lastSeen = new Date(
        participant.last_seen_at,
    ).getTime();

    if (!Number.isFinite(lastSeen)) {
        return false;
    }

    return (
        Date.now() - lastSeen <=
        ACTIVE_PARTICIPANT_THRESHOLD_MS
    );
}

function StatCard({
    label,
    value,
    helper,
    emphasis = "default",
}: StatCardProps) {
    const valueClass =
        emphasis === "success"
            ? "text-emerald-600 dark:text-emerald-400"
            : emphasis === "warning"
              ? "text-amber-600 dark:text-amber-400"
              : emphasis === "danger"
                ? "text-red-600 dark:text-red-400"
                : "text-slate-900 dark:text-white";

    return (
        <div className="rounded-2xl border bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {label}
            </p>

            <p className={`mt-2 text-2xl font-bold ${valueClass}`}>
                {value}
            </p>

            {helper ? (
                <p className="mt-1 text-xs text-muted-foreground">
                    {helper}
                </p>
            ) : null}
        </div>
    );
}

function BarRow({
    label,
    count,
    total,
    index,
    suffix,
}: BarRowProps) {
    const percentage =
        total > 0 ? (count / total) * 100 : 0;

    return (
        <div className="space-y-2">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                        {index !== undefined ? (
                            <span className="mr-2 text-xs font-bold text-muted-foreground">
                                {String.fromCharCode(
                                    65 + index,
                                )}
                                .
                            </span>
                        ) : null}
                        {label}
                    </p>
                </div>

                <div className="shrink-0 text-right">
                    <p className="text-sm font-bold">
                        {count}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        {formatPercentage(percentage)}
                        {suffix ? ` ${suffix}` : ""}
                    </p>
                </div>
            </div>

            <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                    className="h-full rounded-full bg-indigo-500 transition-all duration-300"
                    style={{
                        width: `${clampPercentage(percentage)}%`,
                    }}
                />
            </div>
        </div>
    );
}

export default function LiveStudio({
    params,
}: {
    params:
        | Promise<{ code: string }>
        | { code: string };
}) {
    const resolvedParams =
        params instanceof Promise
            ? use(params)
            : params;

    const sessionCode =
        resolvedParams.code.toUpperCase();

    const router = useRouter();

    const [sessionId, setSessionId] =
        useState<string | null>(null);

    const [session, setSession] =
        useState<Session | null>(null);

    const [template, setTemplate] =
        useState<QuizTemplate | null>(null);

    const [questions, setQuestions] =
        useState<SessionQuestion[]>([]);

    const [responses, setResponses] =
        useState<ResponseWithParticipant[]>([]);

    const [participants, setParticipants] =
        useState<Participant[]>([]);

    const [isLoading, setIsLoading] =
        useState(true);

    const [isUpdating, setIsUpdating] =
        useState(false);

    const [
        isUpdatingParticipants,
        setIsUpdatingParticipants,
    ] = useState(false);

    const [error, setError] =
        useState<string | null>(null);

    const [showQuestionComposer, setShowQuestionComposer] =
        useState(false);

    const [newQuestionText, setNewQuestionText] =
        useState("");

    const [newQuestionType, setNewQuestionType] =
        useState<QuestionType>("multiple_choice");

    const [newQuestionOptions, setNewQuestionOptions] =
        useState<string[]>([
            "Option 1",
            "Option 2",
        ]);

    const [
        newQuestionResultsMode,
        setNewQuestionResultsMode,
    ] = useState<ResultsMode>("on_command");

    const [
        isCreatingQuestion,
        setIsCreatingQuestion,
    ] = useState(false);

    const [
        editingQuestionId,
        setEditingQuestionId,
    ] = useState<string | null>(null);

    const [isSavingQuestion, setIsSavingQuestion] =
        useState(false);

    const [
        selectedAnalyticsQuestionId,
        setSelectedAnalyticsQuestionId,
    ] = useState<string | null>(null);

    const [participantFilter, setParticipantFilter] =
        useState<"all" | "active" | "away">("all");

    /*
     * ---------------------------------------------
     * LOAD RESPONSES
     * ---------------------------------------------
     */

    const loadResponses = async (
        currentSessionId: string,
    ) => {
        const {
            data: responseData,
            error: responseError,
        } = await supabase
            .from("responses")
            .select(
                `
                    id,
                    quiz_id,
                    question_id,
                    participant_id,
                    answer,
                    submitted_at,
                    updated_at,
                    response_time_ms
                `,
            )
            .eq(
                "quiz_id",
                currentSessionId,
            )
            .order("updated_at", {
                ascending: true,
            });

        if (responseError) {
            setError(responseError.message);
            return;
        }

        const rawResponses =
            (responseData ?? []) as PollResponse[];

        if (rawResponses.length === 0) {
            setResponses([]);
            return;
        }

        const participantIds = [
            ...new Set(
                rawResponses.map(
                    (response) =>
                        response.participant_id,
                ),
            ),
        ];

        const {
            data: participantData,
            error: participantError,
        } = await supabase
            .from("participants")
            .select("*")
            .in(
                "id",
                participantIds,
            );

        if (participantError) {
            setResponses(rawResponses);
            return;
        }

        const participantMap =
            new Map(
                (
                    (participantData ??
                        []) as Participant[]
                ).map(
                    (participant) => [
                        participant.id,
                        participant,
                    ],
                ),
            );

        setResponses(
            rawResponses.map(
                (response) => ({
                    ...response,
                    participant:
                        participantMap.get(
                            response.participant_id,
                        ) ?? null,
                }),
            ),
        );
    };

    /*
     * ---------------------------------------------
     * LOAD PARTICIPANTS
     * ---------------------------------------------
     */

    const loadParticipants = async (
        currentSessionId: string,
    ) => {
        const {
            data,
            error: participantError,
        } = await supabase
            .from("participants")
            .select("*")
            .eq(
                "quiz_id",
                currentSessionId,
            )
            .order("joined_at", {
                ascending: true,
            });

        if (participantError) {
            setError(participantError.message);
            return;
        }

        setParticipants(
            (data ?? []) as Participant[],
        );
    };

    /*
     * ---------------------------------------------
     * LOAD STUDIO
     * ---------------------------------------------
     */

    const loadStudio = async () => {
        setIsLoading(true);
        setError(null);

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            router.replace("/login");
            return;
        }

        const {
            data: sessionLookup,
            error: sessionLookupError,
        } = await supabase
            .from("sessions")
            .select("*")
            .eq(
                "join_code",
                sessionCode,
            )
            .eq(
                "instructor_id",
                user.id,
            )
            .single();

        if (
            sessionLookupError ||
            !sessionLookup
        ) {
            setError(
                sessionLookupError?.message ??
                    "Session not found.",
            );

            setIsLoading(false);
            return;
        }

        const currentSession =
            sessionLookup as Session;

        setSession(currentSession);
        setSessionId(currentSession.id);

        if (currentSession.template_id) {
            const {
                data: templateData,
                error: templateError,
            } = await supabase
                .from("quiz_templates")
                .select("*")
                .eq(
                    "id",
                    currentSession.template_id,
                )
                .eq(
                    "instructor_id",
                    user.id,
                )
                .single();

            if (
                templateError ||
                !templateData
            ) {
                setError(
                    templateError?.message ??
                        "Template not found.",
                );

                setIsLoading(false);
                return;
            }

            setTemplate(
                templateData as QuizTemplate,
            );
        } else {
            setTemplate(null);
        }

        const {
            data: questionData,
            error: questionError,
        } = await supabase
            .from("session_questions")
            .select("*")
            .eq(
                "session_id",
                currentSession.id,
            )
            .order("position", {
                ascending: true,
            })
            .order("created_at", {
                ascending: true,
            });

        if (questionError) {
            setError(questionError.message);
            setQuestions([]);
        } else {
            setQuestions(
                (questionData ??
                    []) as SessionQuestion[],
            );
        }

        await loadResponses(
            currentSession.id,
        );

        await loadParticipants(
            currentSession.id,
        );

        setIsLoading(false);
    };

    useEffect(() => {
        void loadStudio();
    }, [sessionCode]);

    /*
     * ---------------------------------------------
     * REALTIME
     * ---------------------------------------------
     */

    useEffect(() => {
        if (!sessionId) {
            return;
        }

        const sessionChannel =
            supabase
                .channel(
                    `studio-session-${sessionId}`,
                )
                .on(
                    "postgres_changes",
                    {
                        event: "UPDATE",
                        schema: "public",
                        table: "sessions",
                        filter: `id=eq.${sessionId}`,
                    },
                    (payload) => {
                        setSession(
                            payload.new as Session,
                        );
                    },
                )
                .subscribe();

        const questionChannel =
            supabase
                .channel(
                    `studio-session-questions-${sessionId}`,
                )
                .on(
                    "postgres_changes",
                    {
                        event: "*",
                        schema: "public",
                        table: "session_questions",
                        filter: `session_id=eq.${sessionId}`,
                    },
                    (payload) => {
                        const changedQuestion =
                            (
                                payload.eventType ===
                                    "DELETE"
                                    ? payload.old
                                    : payload.new
                            ) as SessionQuestion;

                        if (!changedQuestion) {
                            return;
                        }

                        if (
                            payload.eventType ===
                            "INSERT"
                        ) {
                            setQuestions(
                                (current) => {
                                    if (
                                        current.some(
                                            (question) =>
                                                question.id ===
                                                changedQuestion.id,
                                        )
                                    ) {
                                        return current;
                                    }

                                    return [
                                        ...current,
                                        changedQuestion,
                                    ].sort(
                                        (a, b) =>
                                            a.position -
                                            b.position,
                                    );
                                },
                            );

                            return;
                        }

                        if (
                            payload.eventType ===
                            "UPDATE"
                        ) {
                            setQuestions(
                                (current) =>
                                    current.map(
                                        (question) =>
                                            question.id ===
                                                changedQuestion.id
                                                ? changedQuestion
                                                : question,
                                    ),
                            );

                            return;
                        }

                        if (
                            payload.eventType ===
                            "DELETE"
                        ) {
                            setQuestions(
                                (current) =>
                                    current.filter(
                                        (question) =>
                                            question.id !==
                                            changedQuestion.id,
                                    ),
                            );
                        }
                    },
                )
                .subscribe();

        const responseChannel =
            supabase
                .channel(
                    `studio-responses-${sessionId}`,
                )
                .on(
                    "postgres_changes",
                    {
                        event: "*",
                        schema: "public",
                        table: "responses",
                        filter: `quiz_id=eq.${sessionId}`,
                    },
                    () => {
                        void loadResponses(
                            sessionId,
                        );
                    },
                )
                .subscribe();

        const participantChannel =
            supabase
                .channel(
                    `studio-participants-${sessionId}`,
                )
                .on(
                    "postgres_changes",
                    {
                        event: "*",
                        schema: "public",
                        table: "participants",
                        filter: `quiz_id=eq.${sessionId}`,
                    },
                    () => {
                        void loadParticipants(
                            sessionId,
                        );

                        void loadResponses(
                            sessionId,
                        );
                    },
                )
                .subscribe();

        return () => {
            void supabase.removeChannel(
                sessionChannel,
            );

            void supabase.removeChannel(
                questionChannel,
            );

            void supabase.removeChannel(
                responseChannel,
            );

            void supabase.removeChannel(
                participantChannel,
            );
        };
    }, [sessionId]);

    /*
     * ---------------------------------------------
     * DERIVED SESSION DATA
     * ---------------------------------------------
     */

    const activeQuestion =
        useMemo(() => {
            if (
                !session?.active_question_id
            ) {
                return null;
            }

            return (
                questions.find(
                    (question) =>
                        question.id ===
                        session.active_question_id,
                ) ?? null
            );
        }, [
            questions,
            session?.active_question_id,
        ]);

    const activeResponses =
        useMemo(() => {
            if (!activeQuestion) {
                return [];
            }

            return responses.filter(
                (response) =>
                    response.question_id ===
                    activeQuestion.id,
            );
        }, [
            activeQuestion,
            responses,
        ]);

    const responseCountByQuestion =
        useMemo(() => {
            const counts: Record<
                string,
                number
            > = {};

            for (const response of responses) {
                counts[
                    response.question_id
                ] =
                    (counts[
                        response.question_id
                    ] ?? 0) + 1;
            }

            return counts;
        }, [responses]);

    const uniqueResponseCountByQuestion =
        useMemo(() => {
            const participantSets: Record<
                string,
                Set<string>
            > = {};

            for (const response of responses) {
                if (!participantSets[response.question_id]) {
                    participantSets[
                        response.question_id
                    ] = new Set();
                }

                participantSets[
                    response.question_id
                ].add(
                    response.participant_id,
                );
            }

            const counts: Record<
                string,
                number
            > = {};

            Object.entries(
                participantSets,
            ).forEach(
                ([questionId, set]) => {
                    counts[questionId] =
                        set.size;
                },
            );

            return counts;
        }, [responses]);

    const participantSummary =
        useMemo(() => {
            let active = 0;
            let inactive = 0;

            for (const participant of participants) {
                if (
                    isParticipantActive(
                        participant,
                    )
                ) {
                    active += 1;
                } else {
                    inactive += 1;
                }
            }

            return {
                total: participants.length,
                active,
                inactive,
            };
        }, [participants]);

    const totalUniqueResponders =
        useMemo(() => {
            return new Set(
                responses.map(
                    (response) =>
                        response.participant_id,
                ),
            ).size;
        }, [responses]);

    const overallParticipationRate =
        useMemo(() => {
            if (
                participantSummary.total ===
                0
            ) {
                return 0;
            }

            return (
                totalUniqueResponders /
                participantSummary.total
            ) * 100;
        }, [
            participantSummary.total,
            totalUniqueResponders,
        ]);

    const validResponseTimes =
        useMemo(() => {
            return responses
                .map(
                    (response) =>
                        response.response_time_ms,
                )
                .filter(
                    (
                        value,
                    ): value is number =>
                        typeof value ===
                            "number" &&
                        Number.isFinite(value) &&
                        value > 0,
                );
        }, [responses]);

    const averageResponseTimeMs =
        useMemo(() => {
            if (
                validResponseTimes.length ===
                0
            ) {
                return null;
            }

            return (
                validResponseTimes.reduce(
                    (sum, value) =>
                        sum + value,
                    0,
                ) /
                validResponseTimes.length
            );
        }, [validResponseTimes]);

    const medianResponseTimeMs =
        useMemo(
            () =>
                median(
                    validResponseTimes,
                ),
            [validResponseTimes],
        );

    const activeResponderIds =
        useMemo(() => {
            return new Set(
                activeResponses.map(
                    (response) =>
                        response.participant_id,
                ),
            );
        }, [activeResponses]);

    const activeQuestionResponseRate =
        useMemo(() => {
            if (
                participantSummary.total ===
                0
            ) {
                return 0;
            }

            return (
                activeResponderIds.size /
                participantSummary.total
            ) * 100;
        }, [
            activeResponderIds.size,
            participantSummary.total,
        ]);

    const activeQuestionResponseTimes =
        useMemo(() => {
            return activeResponses
                .map(
                    (response) =>
                        response.response_time_ms,
                )
                .filter(
                    (
                        value,
                    ): value is number =>
                        typeof value ===
                            "number" &&
                        Number.isFinite(value) &&
                        value > 0,
                );
        }, [activeResponses]);

    const activeAverageResponseTimeMs =
        useMemo(() => {
            if (
                activeQuestionResponseTimes.length ===
                0
            ) {
                return null;
            }

            return (
                activeQuestionResponseTimes.reduce(
                    (sum, value) =>
                        sum + value,
                    0,
                ) /
                activeQuestionResponseTimes.length
            );
        }, [
            activeQuestionResponseTimes,
        ]);

    const activeMedianResponseTimeMs =
        useMemo(
            () =>
                median(
                    activeQuestionResponseTimes,
                ),
            [activeQuestionResponseTimes],
        );

    const activeTally =
        useMemo(() => {
            const tally: Record<
                string,
                number
            > = {};

            if (!activeQuestion) {
                return tally;
            }

            for (
                const option of activeQuestion.options
            ) {
                tally[option] =
                    activeResponses.filter(
                        (response) =>
                            response.answer ===
                            option,
                    ).length;
            }

            return tally;
        }, [
            activeQuestion,
            activeResponses,
        ]);

    const activeDominantOption =
        useMemo(() => {
            if (
                !activeQuestion ||
                activeQuestion.options.length ===
                    0 ||
                activeResponses.length ===
                    0
            ) {
                return null;
            }

            let winner:
                | {
                      option: string;
                      count: number;
                  }
                | null = null;

            for (
                const option of activeQuestion.options
            ) {
                const count =
                    activeTally[option] ?? 0;

                if (
                    !winner ||
                    count > winner.count
                ) {
                    winner = {
                        option,
                        count,
                    };
                }
            }

            return winner;
        }, [
            activeQuestion,
            activeResponses.length,
            activeTally,
        ]);

    const activeQuestionUnansweredCount =
        useMemo(() => {
            return Math.max(
                0,
                participantSummary.total -
                    activeResponderIds.size,
            );
        }, [
            participantSummary.total,
            activeResponderIds.size,
        ]);

    const questionAnalytics =
        useMemo<QuestionAnalytics[]>(() => {
            return questions.map(
                (question) => {
                    const questionResponses =
                        responses.filter(
                            (response) =>
                                response.question_id ===
                                question.id,
                        );

                    const responderIds =
                        new Set(
                            questionResponses.map(
                                (response) =>
                                    response.participant_id,
                            ),
                        );

                    const responseTimes =
                        questionResponses
                            .map(
                                (response) =>
                                    response.response_time_ms,
                            )
                            .filter(
                                (
                                    value,
                                ): value is number =>
                                    typeof value ===
                                        "number" &&
                                    Number.isFinite(
                                        value,
                                    ) &&
                                    value > 0,
                            );

                    let dominantOption:
                        | string
                        | null = null;

                    let dominantOptionCount =
                        0;

                    for (
                        const option of question.options
                    ) {
                        const count =
                            questionResponses.filter(
                                (response) =>
                                    response.answer ===
                                    option,
                            ).length;

                        if (
                            count >
                            dominantOptionCount
                        ) {
                            dominantOption =
                                option;
                            dominantOptionCount =
                                count;
                        }
                    }

                    return {
                        question,
                        responseCount:
                            questionResponses.length,
                        uniqueResponders:
                            responderIds.size,
                        responseRate:
                            participantSummary.total >
                            0
                                ? (responderIds.size /
                                      participantSummary.total) *
                                  100
                                : 0,
                        averageResponseTimeMs:
                            responseTimes.length >
                            0
                                ? responseTimes.reduce(
                                      (
                                          sum,
                                          value,
                                      ) =>
                                          sum +
                                          value,
                                      0,
                                  ) /
                                  responseTimes.length
                                : null,
                        medianResponseTimeMs:
                            median(
                                responseTimes,
                            ),
                        dominantOption,
                        dominantOptionCount,
                        dominantOptionPercentage:
                            questionResponses.length >
                            0
                                ? (dominantOptionCount /
                                      questionResponses.length) *
                                  100
                                : 0,
                    };
                },
            );
        }, [
            participantSummary.total,
            questions,
            responses,
        ]);

    const selectedAnalyticsQuestion =
        useMemo(() => {
            const preferredId =
                selectedAnalyticsQuestionId ??
                activeQuestion?.id ??
                questions[0]?.id ??
                null;

            return (
                questionAnalytics.find(
                    (item) =>
                        item.question.id ===
                        preferredId,
                ) ?? null
            );
        }, [
            activeQuestion?.id,
            questionAnalytics,
            questions,
            selectedAnalyticsQuestionId,
        ]);

    const filteredParticipants =
        useMemo(() => {
            switch (participantFilter) {
                case "active":
                    return participants.filter(
                        isParticipantActive,
                    );

                case "away":
                    return participants.filter(
                        (participant) =>
                            !isParticipantActive(
                                participant,
                            ),
                    );

                default:
                    return participants;
            }
        }, [
            participantFilter,
            participants,
        ]);

    const recentResponses =
        useMemo(() => {
            return [...responses]
                .sort((a, b) => {
                    const aTime =
                        new Date(
                            a.updated_at ??
                                a.submitted_at,
                        ).getTime();

                    const bTime =
                        new Date(
                            b.updated_at ??
                                b.submitted_at,
                        ).getTime();

                    return bTime - aTime;
                })
                .slice(0, 8);
        }, [responses]);

    /*
     * ---------------------------------------------
     * SESSION ACTIONS
     * ---------------------------------------------
     */

    const toggleLateJoin = async () => {
        if (
            !session ||
            isUpdatingParticipants
        ) {
            return;
        }

        setIsUpdatingParticipants(true);
        setError(null);

        const nextValue =
            !session.allow_late_join;

        const {
            data,
            error: updateError,
        } = await supabase
            .from("sessions")
            .update({
                allow_late_join:
                    nextValue,
                updated_at:
                    new Date().toISOString(),
            })
            .eq(
                "id",
                session.id,
            )
            .select("*")
            .single();

        if (
            updateError ||
            !data
        ) {
            setError(
                updateError?.message ??
                    "Unable to update joining settings.",
            );

            setIsUpdatingParticipants(false);
            return;
        }

        setSession(data as Session);
        setIsUpdatingParticipants(false);
    };

    const togglePause = async (
        paused: boolean,
    ) => {
        if (
            !session ||
            isUpdating
        ) {
            return;
        }

        setIsUpdating(true);
        setError(null);

        const now =
            new Date().toISOString();

        const {
            data: updatedSession,
            error: updateError,
        } = await supabase
            .from("sessions")
            .update({
                status:
                    paused
                        ? "paused"
                        : "live",
                is_offline:
                    paused,
                paused_at:
                    paused
                        ? now
                        : null,
                updated_at: now,
            })
            .eq(
                "id",
                session.id,
            )
            .select("*")
            .single();

        if (
            updateError ||
            !updatedSession
        ) {
            setError(
                updateError?.message ??
                    "Unable to update session.",
            );

            setIsUpdating(false);
            return;
        }

        setSession(
            updatedSession as Session,
        );

        setIsUpdating(false);
    };

    const endSession = async () => {
        if (
            !session ||
            isUpdating
        ) {
            return;
        }

        const confirmed =
            window.confirm(
                "Are you sure you want to end this session?",
            );

        if (!confirmed) {
            return;
        }

        setIsUpdating(true);
        setError(null);

        const now =
            new Date().toISOString();

        const {
            data: updatedSession,
            error: updateError,
        } = await supabase
            .from("sessions")
            .update({
                status: "completed",
                active_question_id:
                    null,
                ended_at: now,
                updated_at: now,
            })
            .eq(
                "id",
                session.id,
            )
            .select("*")
            .single();

        if (
            updateError ||
            !updatedSession
        ) {
            setError(
                updateError?.message ??
                    "Unable to end session.",
            );

            setIsUpdating(false);
            return;
        }

        setSession(
            updatedSession as Session,
        );

        setIsUpdating(false);

        router.push("/instructor");
    };

    /*
     * ---------------------------------------------
     * QUESTION COMPOSER
     * ---------------------------------------------
     */

    const resetQuestionComposer = () => {
        setEditingQuestionId(null);
        setNewQuestionText("");
        setNewQuestionOptions([
            "Option 1",
            "Option 2",
        ]);
        setNewQuestionType(
            "multiple_choice",
        );
        setNewQuestionResultsMode(
            "on_command",
        );
        setShowQuestionComposer(false);
    };

    const openNewQuestionComposer = () => {
        setEditingQuestionId(null);
        setNewQuestionText("");
        setNewQuestionOptions([
            "Option 1",
            "Option 2",
        ]);
        setNewQuestionType(
            "multiple_choice",
        );
        setNewQuestionResultsMode(
            "on_command",
        );
        setError(null);
        setShowQuestionComposer(true);
    };

    const startEditingQuestion = (
        question: SessionQuestion,
    ) => {
        if (question.status === "active") {
            setError(
                "Close the active question before editing it.",
            );
            return;
        }

        setEditingQuestionId(
            question.id,
        );

        setNewQuestionText(
            question.text,
        );

        setNewQuestionType(
            question.type === "scale"
                ? "scale"
                : "multiple_choice",
        );

        setNewQuestionOptions(
            question.options.length > 0
                ? [...question.options]
                : ["Option 1", "Option 2"],
        );

        setNewQuestionResultsMode(
            question.results_mode,
        );

        setError(null);
        setShowQuestionComposer(true);
    };

    const updateNewQuestionOption = (
        index: number,
        value: string,
    ) => {
        setNewQuestionOptions(
            (current) =>
                current.map(
                    (
                        option,
                        optionIndex,
                    ) =>
                        optionIndex ===
                        index
                            ? value
                            : option,
                ),
        );
    };

    const addNewQuestionOption = () => {
        setNewQuestionOptions(
            (current) => [
                ...current,
                `Option ${current.length + 1}`,
            ],
        );
    };

    const removeNewQuestionOption = (
        index: number,
    ) => {
        setNewQuestionOptions(
            (current) =>
                current.filter(
                    (
                        _,
                        optionIndex,
                    ) =>
                        optionIndex !==
                        index,
                ),
        );
    };

    const createSessionQuestion =
        async () => {
            if (
                !session ||
                isCreatingQuestion
            ) {
                return;
            }

            const trimmedText =
                newQuestionText.trim();

            if (!trimmedText) {
                setError(
                    "Please enter a question.",
                );
                return;
            }

            const cleanedOptions =
                newQuestionOptions
                    .map((option) =>
                        option.trim(),
                    )
                    .filter(Boolean);

            if (
                newQuestionType ===
                    "multiple_choice" &&
                cleanedOptions.length < 2
            ) {
                setError(
                    "A multiple-choice question needs at least two options.",
                );
                return;
            }

            if (
                newQuestionType ===
                    "scale" &&
                cleanedOptions.length < 2
            ) {
                setError(
                    "A scale question needs at least two scale points.",
                );
                return;
            }

            setIsCreatingQuestion(true);
            setError(null);

            const nextPosition =
                questions.length === 0
                    ? 1
                    : Math.max(
                          ...questions.map(
                              (
                                  question,
                              ) =>
                                  question.position,
                          ),
                      ) + 1;

            const now =
                new Date().toISOString();

            const {
                data,
                error: createError,
            } = await supabase
                .from(
                    "session_questions",
                )
                .insert({
                    session_id:
                        session.id,
                    source_question_id:
                        null,
                    text: trimmedText,
                    type:
                        newQuestionType,
                    options:
                        cleanedOptions,
                    config:
                        newQuestionType ===
                        "scale"
                            ? {
                                  min: 1,
                                  max:
                                      cleanedOptions.length,
                              }
                            : {},
                    position:
                        nextPosition,
                    status: "draft",
                    results_mode:
                        newQuestionResultsMode,
                    results_visible:
                        false,
                    created_at: now,
                    updated_at: now,
                })
                .select("*")
                .single();

            if (
                createError ||
                !data
            ) {
                setError(
                    createError?.message ??
                        "Unable to create question.",
                );

                setIsCreatingQuestion(false);
                return;
            }

            const createdQuestion =
                data as SessionQuestion;

            setQuestions(
                (current) =>
                    [
                        ...current,
                        createdQuestion,
                    ].sort(
                        (a, b) =>
                            a.position -
                            b.position,
                    ),
            );

            setSelectedAnalyticsQuestionId(
                createdQuestion.id,
            );

            resetQuestionComposer();
            setIsCreatingQuestion(false);
        };

    const saveEditedQuestion =
        async () => {
            if (
                !session ||
                !editingQuestionId ||
                isSavingQuestion
            ) {
                return;
            }

            const trimmedText =
                newQuestionText.trim();

            if (!trimmedText) {
                setError(
                    "Please enter a question.",
                );
                return;
            }

            const cleanedOptions =
                newQuestionOptions
                    .map((option) =>
                        option.trim(),
                    )
                    .filter(Boolean);

            if (
                cleanedOptions.length < 2
            ) {
                setError(
                    "Please provide at least two options.",
                );
                return;
            }

            const currentQuestion =
                questions.find(
                    (question) =>
                        question.id ===
                        editingQuestionId,
                );

            if (!currentQuestion) {
                setError(
                    "Question no longer exists.",
                );
                return;
            }

            if (
                currentQuestion.status ===
                "active"
            ) {
                setError(
                    "Close the active question before editing it.",
                );
                return;
            }

            setIsSavingQuestion(true);
            setError(null);

            const now =
                new Date().toISOString();

            const {
                data,
                error: updateError,
            } = await supabase
                .from(
                    "session_questions",
                )
                .update({
                    text: trimmedText,
                    type:
                        newQuestionType,
                    options:
                        cleanedOptions,
                    config:
                        newQuestionType ===
                        "scale"
                            ? {
                                  min: 1,
                                  max:
                                      cleanedOptions.length,
                              }
                            : {},
                    results_mode:
                        newQuestionResultsMode,
                    updated_at: now,
                })
                .eq(
                    "id",
                    editingQuestionId,
                )
                .eq(
                    "session_id",
                    session.id,
                )
                .select("*")
                .single();

            if (
                updateError ||
                !data
            ) {
                setError(
                    updateError?.message ??
                        "Unable to update question.",
                );

                setIsSavingQuestion(false);
                return;
            }

            const updatedQuestion =
                data as SessionQuestion;

            setQuestions(
                (current) =>
                    current.map(
                        (question) =>
                            question.id ===
                                updatedQuestion.id
                                ? updatedQuestion
                                : question,
                    ),
            );

            resetQuestionComposer();
            setIsSavingQuestion(false);
        };

    const deleteSessionQuestion =
        async (
            question: SessionQuestion,
        ) => {
            if (
                !session ||
                isUpdating ||
                question.status ===
                    "active"
            ) {
                return;
            }

            const confirmed =
                window.confirm(
                    "Are you sure you want to delete this question from the session?",
                );

            if (!confirmed) {
                return;
            }

            setIsUpdating(true);
            setError(null);

            const {
                error: deleteError,
            } = await supabase
                .from(
                    "session_questions",
                )
                .delete()
                .eq(
                    "id",
                    question.id,
                )
                .eq(
                    "session_id",
                    session.id,
                );

            if (deleteError) {
                setError(
                    deleteError.message,
                );

                setIsUpdating(false);
                return;
            }

            setQuestions(
                (current) =>
                    current.filter(
                        (item) =>
                            item.id !==
                            question.id,
                    ),
            );

            if (
                selectedAnalyticsQuestionId ===
                question.id
            ) {
                setSelectedAnalyticsQuestionId(
                    activeQuestion?.id ??
                        questions.find(
                            (item) =>
                                item.id !==
                                question.id,
                        )?.id ??
                        null,
                );
            }

            setIsUpdating(false);
        };

    /*
     * ---------------------------------------------
     * LIVE QUESTION CONTROLS
     * ---------------------------------------------
     */

    const pushQuestionLive =
        async (
            question: SessionQuestion,
        ) => {
            if (
                !session ||
                isUpdating
            ) {
                return;
            }

            setIsUpdating(true);
            setError(null);

            const now =
                new Date().toISOString();

            const previousQuestionId =
                session.active_question_id;

            if (
                previousQuestionId &&
                previousQuestionId !==
                    question.id
            ) {
                const {
                    error:
                        previousQuestionError,
                } = await supabase
                    .from(
                        "session_questions",
                    )
                    .update({
                        status: "closed",
                        closed_at: now,
                        updated_at: now,
                    })
                    .eq(
                        "id",
                        previousQuestionId,
                    )
                    .eq(
                        "session_id",
                        session.id,
                    );

                if (
                    previousQuestionError
                ) {
                    setError(
                        previousQuestionError.message,
                    );

                    setIsUpdating(false);
                    return;
                }
            }

            const resultsVisible =
                question.results_mode ===
                "live";

            const {
                data: updatedQuestion,
                error: questionError,
            } = await supabase
                .from(
                    "session_questions",
                )
                .update({
                    status: "active",
                    activated_at: now,
                    closed_at: null,
                    results_visible:
                        resultsVisible,
                    updated_at: now,
                })
                .eq(
                    "id",
                    question.id,
                )
                .eq(
                    "session_id",
                    session.id,
                )
                .select("*")
                .single();

            if (
                questionError ||
                !updatedQuestion
            ) {
                setError(
                    questionError?.message ??
                        "Unable to activate question.",
                );

                setIsUpdating(false);
                return;
            }

            const {
                data: updatedSession,
                error: sessionError,
            } = await supabase
                .from("sessions")
                .update({
                    active_question_id:
                        question.id,
                    status: "live",
                    is_offline:
                        false,
                    paused_at: null,
                    started_at:
                        session.started_at ??
                        now,
                    updated_at: now,
                })
                .eq(
                    "id",
                    session.id,
                )
                .select("*")
                .single();

            if (
                sessionError ||
                !updatedSession
            ) {
                setError(
                    sessionError?.message ??
                        "Unable to update session.",
                );

                setIsUpdating(false);
                return;
            }

            setSession(
                updatedSession as Session,
            );

            setQuestions(
                (current) =>
                    current.map(
                        (item) => {
                            if (
                                item.id ===
                                question.id
                            ) {
                                return updatedQuestion as SessionQuestion;
                            }

                            if (
                                item.id ===
                                previousQuestionId
                            ) {
                                return {
                                    ...item,
                                    status:
                                        "closed",
                                    closed_at:
                                        now,
                                    updated_at:
                                        now,
                                };
                            }

                            return item;
                        },
                    ),
            );

            setSelectedAnalyticsQuestionId(
                question.id,
            );

            setIsUpdating(false);
        };

    const closeActiveQuestion =
        async () => {
            if (
                !session?.active_question_id ||
                isUpdating
            ) {
                return;
            }

            setIsUpdating(true);
            setError(null);

            const questionId =
                session.active_question_id;

            const now =
                new Date().toISOString();

            const {
                data: updatedQuestion,
                error: questionError,
            } = await supabase
                .from(
                    "session_questions",
                )
                .update({
                    status: "closed",
                    closed_at: now,
                    updated_at: now,
                })
                .eq(
                    "id",
                    questionId,
                )
                .eq(
                    "session_id",
                    session.id,
                )
                .select("*")
                .single();

            if (
                questionError ||
                !updatedQuestion
            ) {
                setError(
                    questionError?.message ??
                        "Unable to close question.",
                );

                setIsUpdating(false);
                return;
            }

            const {
                data: updatedSession,
                error: sessionError,
            } = await supabase
                .from("sessions")
                .update({
                    active_question_id:
                        null,
                    updated_at: now,
                })
                .eq(
                    "id",
                    session.id,
                )
                .select("*")
                .single();

            if (
                sessionError ||
                !updatedSession
            ) {
                setError(
                    sessionError?.message ??
                        "Unable to update session.",
                );

                setIsUpdating(false);
                return;
            }

            setQuestions(
                (current) =>
                    current.map(
                        (question) =>
                            question.id ===
                                questionId
                                ? (updatedQuestion as SessionQuestion)
                                : question,
                    ),
            );

            setSession(
                updatedSession as Session,
            );

            setIsUpdating(false);
        };

    const revealResults = async () => {
        if (
            !session ||
            !activeQuestion ||
            isUpdating
        ) {
            return;
        }

        if (
            activeQuestion.results_mode ===
            "hidden"
        ) {
            return;
        }

        setIsUpdating(true);
        setError(null);

        const {
            data: updatedQuestion,
            error: updateError,
        } = await supabase
            .from(
                "session_questions",
            )
            .update({
                results_visible: true,
                updated_at:
                    new Date().toISOString(),
            })
            .eq(
                "id",
                activeQuestion.id,
            )
            .eq(
                "session_id",
                session.id,
            )
            .select("*")
            .single();

        if (
            updateError ||
            !updatedQuestion
        ) {
            setError(
                updateError?.message ??
                    "Unable to reveal results.",
            );

            setIsUpdating(false);
            return;
        }

        setQuestions(
            (current) =>
                current.map(
                    (question) =>
                        question.id ===
                            activeQuestion.id
                            ? (updatedQuestion as SessionQuestion)
                            : question,
                ),
        );

        setIsUpdating(false);
    };

    const hideResults = async () => {
        if (
            !session ||
            !activeQuestion ||
            isUpdating
        ) {
            return;
        }

        if (
            activeQuestion.results_mode ===
            "live"
        ) {
            return;
        }

        setIsUpdating(true);
        setError(null);

        const {
            data: updatedQuestion,
            error: updateError,
        } = await supabase
            .from(
                "session_questions",
            )
            .update({
                results_visible: false,
                updated_at:
                    new Date().toISOString(),
            })
            .eq(
                "id",
                activeQuestion.id,
            )
            .eq(
                "session_id",
                session.id,
            )
            .select("*")
            .single();

        if (
            updateError ||
            !updatedQuestion
        ) {
            setError(
                updateError?.message ??
                    "Unable to hide results.",
            );

            setIsUpdating(false);
            return;
        }

        setQuestions(
            (current) =>
                current.map(
                    (question) =>
                        question.id ===
                            activeQuestion.id
                            ? (updatedQuestion as SessionQuestion)
                            : question,
                ),
        );

        setIsUpdating(false);
    };

    /*
     * ---------------------------------------------
     * LOADING / ERROR
     * ---------------------------------------------
     */

    if (isLoading) {
        return (
            <main className="min-h-screen bg-slate-100 p-4 dark:bg-slate-950 sm:p-6">
                <div className="mx-auto flex min-h-[70vh] max-w-[1600px] items-center justify-center rounded-3xl border bg-white p-10 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div>
                        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-500" />
                        <p className="text-lg font-semibold">
                            Loading Live Studio...
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Connecting to session{" "}
                            {sessionCode}
                        </p>
                    </div>
                </div>
            </main>
        );
    }

    if (!session) {
        return (
            <main className="min-h-screen bg-slate-100 p-4 dark:bg-slate-950 sm:p-6">
                <div className="mx-auto flex min-h-[70vh] max-w-[1600px] items-center justify-center rounded-3xl border border-red-200 bg-red-50 p-10 text-center text-red-700">
                    <div>
                        <p className="text-lg font-semibold">
                            Unable to load session
                        </p>
                        <p className="mt-2 text-sm">
                            {error ??
                                "Session not found."}
                        </p>
                        <Button
                            className="mt-5"
                            variant="outline"
                            onClick={() =>
                                router.push(
                                    "/instructor",
                                )
                            }
                        >
                            Back to Dashboard
                        </Button>
                    </div>
                </div>
            </main>
        );
    }

    /*
     * ---------------------------------------------
     * UI HELPERS
     * ---------------------------------------------
     */

    const currentQuestionIndex =
        activeQuestion
            ? questions.findIndex(
                  (question) =>
                      question.id ===
                      activeQuestion.id,
              )
            : -1;

    const nextQuestion =
        currentQuestionIndex >= 0
            ? questions[
                  currentQuestionIndex + 1
              ]
            : null;

    const previousQuestion =
        currentQuestionIndex > 0
            ? questions[
                  currentQuestionIndex - 1
              ]
            : null;

    const currentQuestionVisible =
        activeQuestion?.results_mode ===
            "live" ||
        activeQuestion?.results_visible ===
            true;

    const activeQuestionAnalytics =
        activeQuestion
            ? questionAnalytics.find(
                  (item) =>
                      item.question.id ===
                      activeQuestion.id,
              ) ?? null
            : null;

    return (
        <main className="min-h-screen bg-slate-100 dark:bg-slate-950">
            <div className="mx-auto max-w-[1700px] p-3 sm:p-5 lg:p-6">
                {/* HEADER */}

                <header className="mb-5 overflow-hidden rounded-3xl border bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="border-b px-5 py-5 sm:px-6">
                        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                            <div className="min-w-0">
                                <div className="mb-3 flex flex-wrap items-center gap-2">
                                    <Badge>
                                        {session.status.toUpperCase()}
                                    </Badge>

                                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold dark:bg-slate-800">
                                        Code{" "}
                                        {session.join_code}
                                    </span>

                                    <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
                                        {responses.length}{" "}
                                        responses
                                    </span>

                                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
                                        {participantSummary.active}{" "}
                                        active
                                    </span>
                                </div>

                                <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:gap-3">
                                    <h1 className="truncate text-2xl font-bold sm:text-3xl">
                                        {session.name}
                                    </h1>

                                    <span className="pb-1 text-sm text-muted-foreground">
                                        {template?.title ??
                                            "Instant Session"}
                                    </span>
                                </div>

                                <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                                    Run the room from one place:
                                    broadcast questions,
                                    control visibility,
                                    monitor participation,
                                    and watch responses arrive
                                    in real time.
                                </p>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                <Button
                                    variant="outline"
                                    onClick={() =>
                                        router.push(
                                            "/instructor",
                                        )
                                    }
                                >
                                    Back
                                </Button>

                                <Button
                                    variant="outline"
                                    onClick={() =>
                                        window.open(
                                            `/instructor/${session.join_code}/projector`,
                                            "_blank",
                                            "noopener,noreferrer",
                                        )
                                    }
                                >
                                    Projector ↗
                                </Button>

                                <Button
                                    variant="destructive"
                                    disabled={
                                        isUpdating ||
                                        session.status ===
                                            "completed"
                                    }
                                    onClick={() =>
                                        void endSession()
                                    }
                                >
                                    End Session
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 divide-x sm:grid-cols-4 dark:divide-slate-800">
                        <div className="p-4 sm:px-5">
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Questions
                            </p>
                            <p className="mt-1 text-xl font-bold">
                                {questions.length}
                            </p>
                        </div>

                        <div className="p-4 sm:px-5">
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Participation
                            </p>
                            <p className="mt-1 text-xl font-bold">
                                {formatPercentage(
                                    overallParticipationRate,
                                )}
                            </p>
                        </div>

                        <div className="p-4 sm:px-5">
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Avg. Response
                            </p>
                            <p className="mt-1 text-xl font-bold">
                                {formatDurationMs(
                                    averageResponseTimeMs,
                                )}
                            </p>
                        </div>

                        <div className="p-4 sm:px-5">
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Room Activity
                            </p>
                            <p className="mt-1 text-xl font-bold">
                                {participantSummary.active}/
                                {participantSummary.total}
                            </p>
                        </div>
                    </div>
                </header>

                {error ? (
                    <div className="mb-5 flex items-start justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
                        <div>
                            <p className="font-semibold">
                                Studio notice
                            </p>
                            <p className="mt-1">
                                {error}
                            </p>
                        </div>

                        <button
                            type="button"
                            className="text-xs font-bold opacity-70 hover:opacity-100"
                            onClick={() =>
                                setError(null)
                            }
                        >
                            Dismiss
                        </button>
                    </div>
                ) : null}

                {/* TOP KPI GRID */}

                <section className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                    <StatCard
                        label="Students joined"
                        value={
                            participantSummary.total
                        }
                        helper={`${participantSummary.active} active right now`}
                    />

                    <StatCard
                        label="Students responding"
                        value={
                            totalUniqueResponders
                        }
                        helper={`${formatPercentage(
                            overallParticipationRate,
                        )} session participation`}
                        emphasis={
                            overallParticipationRate >= 70
                                ? "success"
                                : "default"
                        }
                    />

                    <StatCard
                        label="Total responses"
                        value={responses.length}
                        helper={`${responses.length === 1 ? "response" : "responses"} across all questions`}
                    />

                    <StatCard
                        label="Average response"
                        value={formatDurationMs(
                            averageResponseTimeMs,
                        )}
                        helper={`Median ${formatDurationMs(
                            medianResponseTimeMs,
                        )}`}
                    />

                    <StatCard
                        label="Unanswered now"
                        value={
                            activeQuestion
                                ? activeQuestionUnansweredCount
                                : "—"
                        }
                        helper={
                            activeQuestion
                                ? "For the current question"
                                : "No question live"
                        }
                        emphasis={
                            activeQuestion &&
                            activeQuestionUnansweredCount >
                                0
                                ? "warning"
                                : "default"
                        }
                    />
                </section>

                {/* MAIN COMMAND CENTER */}

                <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
                    <section className="min-w-0 space-y-5">
                        {/* LIVE CONTROL / QUESTION */}

                        <Card className="overflow-hidden">
                            <CardHeader className="border-b bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900">
                                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <CardTitle>
                                                Live Question
                                            </CardTitle>

                                            {activeQuestion ? (
                                                <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-[11px] font-bold text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
                                                    Question{" "}
                                                    {currentQuestionIndex +
                                                        1}
                                                    /
                                                    {
                                                        questions.length
                                                    }
                                                </span>
                                            ) : null}

                                            {activeQuestion ? (
                                                <span
                                                    className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${getQuestionStatusClass(
                                                        activeQuestion.status,
                                                    )}`}
                                                >
                                                    {getQuestionStatusLabel(
                                                        activeQuestion.status,
                                                    )}
                                                </span>
                                            ) : null}
                                        </div>

                                        <p className="mt-1 text-sm text-muted-foreground">
                                            {activeQuestion
                                                ? "This is the question currently visible to students."
                                                : "No question is currently live. Select one from the queue or create a new question."}
                                        </p>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        <Button
                                            variant="outline"
                                            onClick={() =>
                                                window.open(
                                                    `/instructor/${session.join_code}/projector`,
                                                    "_blank",
                                                    "noopener,noreferrer",
                                                )
                                            }
                                        >
                                            Projector ↗
                                        </Button>

                                        {activeQuestion ? (
                                            <Button
                                                variant="outline"
                                                disabled={
                                                    isUpdating
                                                }
                                                onClick={() =>
                                                    void closeActiveQuestion()
                                                }
                                            >
                                                Close
                                            </Button>
                                        ) : null}
                                    </div>
                                </div>
                            </CardHeader>

                            <CardContent className="p-5 sm:p-6">
                                {activeQuestion ? (
                                    <div className="space-y-6">
                                        <div className="rounded-2xl border bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
                                            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                                                        LIVE PROMPT
                                                    </p>

                                                    <h2 className="mt-2 text-2xl font-bold leading-tight sm:text-3xl">
                                                        {
                                                            activeQuestion.text
                                                        }
                                                    </h2>

                                                    <div className="mt-4 flex flex-wrap gap-2">
                                                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold dark:bg-slate-800">
                                                            {activeQuestion.type ===
                                                            "multiple_choice"
                                                                ? "Multiple choice"
                                                                : "Scale"}
                                                        </span>

                                                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold dark:bg-slate-800">
                                                            {
                                                                activeQuestion.options
                                                                    .length
                                                            }{" "}
                                                            options
                                                        </span>

                                                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold dark:bg-slate-800">
                                                            Results:{" "}
                                                            {getResultsModeLabel(
                                                                activeQuestion.results_mode,
                                                            )}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="grid min-w-[250px] grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-2">
                                                    <div className="rounded-xl bg-slate-50 p-3 text-center dark:bg-slate-900">
                                                        <p className="text-xs text-muted-foreground">
                                                            Responses
                                                        </p>
                                                        <p className="mt-1 text-2xl font-bold">
                                                            {
                                                                activeResponses.length
                                                            }
                                                        </p>
                                                    </div>

                                                    <div className="rounded-xl bg-slate-50 p-3 text-center dark:bg-slate-900">
                                                        <p className="text-xs text-muted-foreground">
                                                            Rate
                                                        </p>
                                                        <p className="mt-1 text-2xl font-bold">
                                                            {formatPercentage(
                                                                activeQuestionResponseRate,
                                                            )}
                                                        </p>
                                                    </div>

                                                    <div className="rounded-xl bg-slate-50 p-3 text-center dark:bg-slate-900">
                                                        <p className="text-xs text-muted-foreground">
                                                            Avg. time
                                                        </p>
                                                        <p className="mt-1 text-lg font-bold">
                                                            {formatDurationMs(
                                                                activeAverageResponseTimeMs,
                                                            )}
                                                        </p>
                                                    </div>

                                                    <div className="rounded-xl bg-slate-50 p-3 text-center dark:bg-slate-900">
                                                        <p className="text-xs text-muted-foreground">
                                                            Median
                                                        </p>
                                                        <p className="mt-1 text-lg font-bold">
                                                            {formatDurationMs(
                                                                activeMedianResponseTimeMs,
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* RESULT VISUALIZATION */}

                                        <div>
                                            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                                <div>
                                                    <p className="font-semibold">
                                                        Response
                                                        distribution
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {activeQuestion.results_mode ===
                                                        "hidden"
                                                            ? "Student-facing results are disabled, but instructor analytics remain available."
                                                            : currentQuestionVisible
                                                              ? "Students can currently see these results."
                                                              : "These results are visible only in the instructor studio."}
                                                    </p>
                                                </div>

                                                <div className="flex flex-wrap gap-2">
                                                    {activeQuestion.results_mode ===
                                                    "live" ? (
                                                        <Badge>
                                                            Live results
                                                        </Badge>
                                                    ) : activeQuestion.results_mode ===
                                                      "hidden" ? (
                                                        <Badge variant="secondary">
                                                            Hidden
                                                        </Badge>
                                                    ) : (
                                                        <Button
                                                            size="sm"
                                                            variant={
                                                                activeQuestion.results_visible
                                                                    ? "outline"
                                                                    : "default"
                                                            }
                                                            disabled={
                                                                isUpdating
                                                            }
                                                            onClick={() => {
                                                                if (
                                                                    activeQuestion.results_visible
                                                                ) {
                                                                    void hideResults();
                                                                } else {
                                                                    void revealResults();
                                                                }
                                                            }}
                                                        >
                                                            {activeQuestion.results_visible
                                                                ? "Hide student results"
                                                                : "Reveal student results"}
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>

                                            {activeQuestion.options.length >
                                            0 ? (
                                                <div className="space-y-4">
                                                    {activeQuestion.options.map(
                                                        (
                                                            option,
                                                            index,
                                                        ) => (
                                                            <div
                                                                key={`${activeQuestion.id}-${index}`}
                                                                className="rounded-2xl border bg-white p-4 dark:border-slate-800 dark:bg-slate-950"
                                                            >
                                                                <BarRow
                                                                    label={
                                                                        option
                                                                    }
                                                                    count={
                                                                        activeTally[
                                                                            option
                                                                        ] ??
                                                                        0
                                                                    }
                                                                    total={
                                                                        activeResponses.length
                                                                    }
                                                                    index={
                                                                        activeQuestion.type ===
                                                                        "multiple_choice"
                                                                            ? index
                                                                            : undefined
                                                                    }
                                                                />
                                                            </div>
                                                        ),
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                                                    No result
                                                    options are
                                                    configured.
                                                </div>
                                            )}
                                        </div>

                                        {activeDominantOption ? (
                                            <div className="grid gap-3 sm:grid-cols-3">
                                                <div className="rounded-2xl border bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
                                                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                                        Leading answer
                                                    </p>
                                                    <p className="mt-2 truncate font-bold">
                                                        {
                                                            activeDominantOption.option
                                                        }
                                                    </p>
                                                </div>

                                                <div className="rounded-2xl border bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
                                                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                                        Leading count
                                                    </p>
                                                    <p className="mt-2 text-2xl font-bold">
                                                        {
                                                            activeDominantOption.count
                                                        }
                                                    </p>
                                                </div>

                                                <div className="rounded-2xl border bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
                                                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                                        Leading share
                                                    </p>
                                                    <p className="mt-2 text-2xl font-bold">
                                                        {formatPercentage(
                                                            activeResponses.length >
                                                                0
                                                                ? (activeDominantOption.count /
                                                                      activeResponses.length) *
                                                                      100
                                                                : 0,
                                                        )}
                                                    </p>
                                                </div>
                                            </div>
                                        ) : null}

                                        <div className="grid gap-3 sm:grid-cols-3">
                                            <Button
                                                variant="outline"
                                                disabled={
                                                    !previousQuestion ||
                                                    isUpdating
                                                }
                                                onClick={() => {
                                                    if (
                                                        previousQuestion
                                                    ) {
                                                        void pushQuestionLive(
                                                            previousQuestion,
                                                        );
                                                    }
                                                }}
                                            >
                                                ← Previous
                                            </Button>

                                            <Button
                                                variant="outline"
                                                disabled={
                                                    isUpdating
                                                }
                                                onClick={() =>
                                                    void closeActiveQuestion()
                                                }
                                            >
                                                Close question
                                            </Button>

                                            <Button
                                                disabled={
                                                    !nextQuestion ||
                                                    isUpdating
                                                }
                                                onClick={() => {
                                                    if (
                                                        nextQuestion
                                                    ) {
                                                        void pushQuestionLive(
                                                            nextQuestion,
                                                        );
                                                    }
                                                }}
                                            >
                                                Next question →
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="rounded-3xl border border-dashed p-10 text-center sm:p-16">
                                        <div className="mx-auto max-w-2xl">
                                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-2xl dark:bg-indigo-950/40">
                                                +
                                            </div>

                                            <h2 className="mt-5 text-2xl font-bold">
                                                Ready to teach
                                            </h2>

                                            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                                                {session.template_id
                                                    ? "Choose a queued question below or create a session-only question. Nothing is sent to students until you make it live."
                                                    : "Create a question directly inside this instant session, then broadcast it whenever you are ready."}
                                            </p>

                                            <div className="mt-6 flex flex-wrap justify-center gap-2">
                                                <Button
                                                    onClick={
                                                        openNewQuestionComposer
                                                    }
                                                >
                                                    Create question
                                                </Button>

                                                {questions.length >
                                                0 ? (
                                                    <Button
                                                        variant="outline"
                                                        onClick={() => {
                                                            const firstQuestion =
                                                                questions.find(
                                                                    (
                                                                        item,
                                                                    ) =>
                                                                        item.status !==
                                                                        "closed",
                                                                ) ??
                                                                questions[0];

                                                            if (
                                                                firstQuestion
                                                            ) {
                                                                void pushQuestionLive(
                                                                    firstQuestion,
                                                                );
                                                            }
                                                        }}
                                                    >
                                                        Start with first question
                                                    </Button>
                                                ) : null}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* SESSION CONTROLS */}

                        <Card>
                            <CardHeader>
                                <CardTitle>
                                    Session Controls
                                </CardTitle>

                                <p className="text-sm text-muted-foreground">
                                    Room-level settings that affect
                                    everyone currently connected.
                                </p>
                            </CardHeader>

                            <CardContent>
                                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                                    <div className="rounded-2xl border p-4">
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <p className="font-semibold">
                                                    Polling
                                                </p>
                                                <p className="mt-1 text-xs text-muted-foreground">
                                                    {session.status ===
                                                    "paused"
                                                        ? "Responses are paused."
                                                        : session.status ===
                                                            "completed"
                                                          ? "Session is complete."
                                                          : "Students can respond to the live question."}
                                                </p>
                                            </div>

                                            <Switch
                                                checked={
                                                    session.status ===
                                                    "paused"
                                                }
                                                disabled={
                                                    isUpdating ||
                                                    session.status ===
                                                        "completed"
                                                }
                                                onCheckedChange={(
                                                    checked,
                                                ) =>
                                                    void togglePause(
                                                        checked,
                                                    )
                                                }
                                            />
                                        </div>
                                    </div>

                                    <div className="rounded-2xl border p-4">
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <p className="font-semibold">
                                                    Late join
                                                </p>
                                                <p className="mt-1 text-xs text-muted-foreground">
                                                    {session.allow_late_join
                                                        ? "Students may still enter."
                                                        : "New joins are locked."}
                                                </p>
                                            </div>

                                            <Switch
                                                checked={
                                                    session.allow_late_join
                                                }
                                                disabled={
                                                    isUpdatingParticipants
                                                }
                                                onCheckedChange={() =>
                                                    void toggleLateJoin()
                                                }
                                            />
                                        </div>
                                    </div>

                                    <div className="rounded-2xl border p-4">
                                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                            Student access
                                        </p>

                                        <p className="mt-2 font-bold">
                                            /session/
                                            {
                                                session.join_code
                                            }
                                        </p>

                                        <button
                                            type="button"
                                            className="mt-2 text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                                            onClick={async () => {
                                                try {
                                                    await navigator.clipboard.writeText(
                                                        `${window.location.origin}/session/${session.join_code}`,
                                                    );
                                                } catch {
                                                    setError(
                                                        "Could not copy the student URL.",
                                                    );
                                                }
                                            }}
                                        >
                                            Copy student link
                                        </button>
                                    </div>

                                    <div className="rounded-2xl border p-4">
                                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                            Session mode
                                        </p>

                                        <p className="mt-2 font-bold">
                                            {session.participant_mode ===
                                            "anonymous"
                                                ? "Anonymous participation"
                                                : "Identified participation"}
                                        </p>

                                        <p className="mt-1 text-xs text-muted-foreground">
                                            Results:{" "}
                                            {getResultsModeLabel(
                                                session.results_mode,
                                            )}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* COMPOSER */}

                        {showQuestionComposer ? (
                            <Card>
                                <CardHeader>
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <CardTitle>
                                                {editingQuestionId
                                                    ? "Edit session question"
                                                    : "Create session question"}
                                            </CardTitle>

                                            <p className="mt-1 text-sm text-muted-foreground">
                                                {editingQuestionId
                                                    ? "Changes apply only to this live session question."
                                                    : "This question belongs only to the current session."}
                                            </p>
                                        </div>

                                        <Button
                                            variant="outline"
                                            onClick={
                                                resetQuestionComposer
                                            }
                                        >
                                            Cancel
                                        </Button>
                                    </div>
                                </CardHeader>

                                <CardContent className="space-y-5">
                                    <div>
                                        <label className="text-sm font-medium">
                                            Question
                                        </label>

                                        <textarea
                                            value={
                                                newQuestionText
                                            }
                                            onChange={(
                                                event,
                                            ) =>
                                                setNewQuestionText(
                                                    event
                                                        .target
                                                        .value,
                                                )
                                            }
                                            placeholder="Ask something clear enough to answer quickly."
                                            className="mt-2 min-h-[130px] w-full rounded-2xl border bg-background px-4 py-3 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-ring"
                                        />
                                    </div>

                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div>
                                            <label className="text-sm font-medium">
                                                Question type
                                            </label>

                                            <select
                                                value={
                                                    newQuestionType
                                                }
                                                onChange={(
                                                    event,
                                                ) =>
                                                    setNewQuestionType(
                                                        event
                                                            .target
                                                            .value as QuestionType,
                                                    )
                                                }
                                                className="mt-2 h-11 w-full rounded-xl border bg-background px-3 text-sm"
                                            >
                                                <option value="multiple_choice">
                                                    Multiple choice
                                                </option>

                                                <option value="scale">
                                                    Scale
                                                </option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="text-sm font-medium">
                                                Student result mode
                                            </label>

                                            <select
                                                value={
                                                    newQuestionResultsMode
                                                }
                                                onChange={(
                                                    event,
                                                ) =>
                                                    setNewQuestionResultsMode(
                                                        event
                                                            .target
                                                            .value as ResultsMode,
                                                    )
                                                }
                                                className="mt-2 h-11 w-full rounded-xl border bg-background px-3 text-sm"
                                            >
                                                <option value="live">
                                                    Live results
                                                </option>

                                                <option value="on_command">
                                                    Reveal on command
                                                </option>

                                                <option value="hidden">
                                                    Hidden
                                                </option>
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                            <div>
                                                <p className="text-sm font-medium">
                                                    Options
                                                </p>

                                                <p className="text-xs text-muted-foreground">
                                                    Use labels students
                                                    can understand
                                                    instantly.
                                                </p>
                                            </div>

                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                onClick={
                                                    addNewQuestionOption
                                                }
                                            >
                                                Add option
                                            </Button>
                                        </div>

                                        <div className="mt-3 space-y-2">
                                            {newQuestionOptions.map(
                                                (
                                                    option,
                                                    index,
                                                ) => (
                                                    <div
                                                        key={index}
                                                        className="flex gap-2"
                                                    >
                                                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border bg-slate-50 text-xs font-bold text-muted-foreground dark:bg-slate-900">
                                                            {newQuestionType ===
                                                            "multiple_choice"
                                                                ? String.fromCharCode(
                                                                      65 +
                                                                          index,
                                                                  )
                                                                : index +
                                                                  1}
                                                        </div>

                                                        <input
                                                            value={
                                                                option
                                                            }
                                                            onChange={(
                                                                event,
                                                            ) =>
                                                                updateNewQuestionOption(
                                                                    index,
                                                                    event
                                                                        .target
                                                                        .value,
                                                                )
                                                            }
                                                            className="h-11 min-w-0 flex-1 rounded-xl border bg-background px-3 text-sm"
                                                            placeholder={`Option ${
                                                                index +
                                                                1
                                                            }`}
                                                        />

                                                        {newQuestionOptions.length >
                                                        2 ? (
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() =>
                                                                    removeNewQuestionOption(
                                                                        index,
                                                                    )
                                                                }
                                                            >
                                                                Remove
                                                            </Button>
                                                        ) : null}
                                                    </div>
                                                ),
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-3 border-t pt-5 sm:flex-row sm:justify-end">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            disabled={
                                                isCreatingQuestion ||
                                                isSavingQuestion
                                            }
                                            onClick={
                                                resetQuestionComposer
                                            }
                                        >
                                            Cancel
                                        </Button>

                                        <Button
                                            type="button"
                                            disabled={
                                                isCreatingQuestion ||
                                                isSavingQuestion
                                            }
                                            onClick={() => {
                                                if (
                                                    editingQuestionId
                                                ) {
                                                    void saveEditedQuestion();
                                                } else {
                                                    void createSessionQuestion();
                                                }
                                            }}
                                        >
                                            {editingQuestionId
                                                ? isSavingQuestion
                                                    ? "Saving..."
                                                    : "Save changes"
                                                : isCreatingQuestion
                                                  ? "Creating..."
                                                  : "Create question"}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ) : null}

                        {/* QUESTION ANALYTICS */}

                        <Card>
                            <CardHeader>
                                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                    <div>
                                        <CardTitle>
                                            Question Analytics
                                        </CardTitle>

                                        <p className="mt-1 text-sm text-muted-foreground">
                                            Compare engagement and
                                            response speed across the
                                            session.
                                        </p>
                                    </div>

                                    <select
                                        value={
                                            selectedAnalyticsQuestionId ??
                                            activeQuestion?.id ??
                                            questions[0]?.id ??
                                            ""
                                        }
                                        onChange={(event) =>
                                            setSelectedAnalyticsQuestionId(
                                                event.target
                                                    .value ||
                                                    null,
                                            )
                                        }
                                        className="h-10 rounded-xl border bg-background px-3 text-sm lg:max-w-[420px]"
                                    >
                                        <option value="">
                                            Select a question
                                        </option>

                                        {questions.map(
                                            (
                                                question,
                                                index,
                                            ) => (
                                                <option
                                                    key={
                                                        question.id
                                                    }
                                                    value={
                                                        question.id
                                                    }
                                                >
                                                    Q
                                                    {index +
                                                        1}{" "}
                                                    ·{" "}
                                                    {question.text.slice(
                                                        0,
                                                        70,
                                                    )}
                                                </option>
                                            ),
                                        )}
                                    </select>
                                </div>
                            </CardHeader>

                            <CardContent className="space-y-5">
                                {selectedAnalyticsQuestion ? (
                                    <>
                                        <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
                                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                                <div className="min-w-0">
                                                    <p className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                                                        Question
                                                        {
                                                            questions.findIndex(
                                                                (
                                                                    item,
                                                                ) =>
                                                                    item.id ===
                                                                    selectedAnalyticsQuestion
                                                                        .question
                                                                        .id,
                                                            ) + 1
                                                        }
                                                    </p>

                                                    <p className="mt-2 text-lg font-bold">
                                                        {
                                                            selectedAnalyticsQuestion
                                                                .question
                                                                .text
                                                        }
                                                    </p>
                                                </div>

                                                <span
                                                    className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-bold ${getQuestionStatusClass(
                                                        selectedAnalyticsQuestion
                                                            .question
                                                            .status,
                                                    )}`}
                                                >
                                                    {getQuestionStatusLabel(
                                                        selectedAnalyticsQuestion
                                                            .question
                                                            .status,
                                                    )}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                            <StatCard
                                                label="Responses"
                                                value={
                                                    selectedAnalyticsQuestion.responseCount
                                                }
                                                helper={`${selectedAnalyticsQuestion.uniqueResponders} unique participants`}
                                            />

                                            <StatCard
                                                label="Response rate"
                                                value={formatPercentage(
                                                    selectedAnalyticsQuestion.responseRate,
                                                )}
                                                helper={`of ${participantSummary.total} joined`}
                                            />

                                            <StatCard
                                                label="Average time"
                                                value={formatDurationMs(
                                                    selectedAnalyticsQuestion.averageResponseTimeMs,
                                                )}
                                                helper={`Median ${formatDurationMs(
                                                    selectedAnalyticsQuestion.medianResponseTimeMs,
                                                )}`}
                                            />

                                            <StatCard
                                                label="Leading answer"
                                                value={
                                                    selectedAnalyticsQuestion.dominantOption ??
                                                    "—"
                                                }
                                                helper={
                                                    selectedAnalyticsQuestion.dominantOptionCount >
                                                    0
                                                        ? `${formatPercentage(
                                                              selectedAnalyticsQuestion.dominantOptionPercentage,
                                                          )} of responses`
                                                        : "No responses"
                                                }
                                            />
                                        </div>

                                        <div className="grid gap-5 lg:grid-cols-2">
                                            <div className="rounded-2xl border p-4">
                                                <div className="mb-4">
                                                    <p className="font-semibold">
                                                        Answer distribution
                                                    </p>

                                                    <p className="text-xs text-muted-foreground">
                                                        Instructor
                                                        view of
                                                        every
                                                        option.
                                                    </p>
                                                </div>

                                                <div className="space-y-4">
                                                    {selectedAnalyticsQuestion.question.options.map(
                                                        (
                                                            option,
                                                            index,
                                                        ) => {
                                                            const count =
                                                                responses.filter(
                                                                    (
                                                                        response,
                                                                    ) =>
                                                                        response.question_id ===
                                                                            selectedAnalyticsQuestion
                                                                                .question
                                                                                .id &&
                                                                        response.answer ===
                                                                            option,
                                                                ).length;

                                                            return (
                                                                <BarRow
                                                                    key={`${selectedAnalyticsQuestion.question.id}-analytics-${index}`}
                                                                    label={
                                                                        option
                                                                    }
                                                                    count={
                                                                        count
                                                                    }
                                                                    total={
                                                                        selectedAnalyticsQuestion.responseCount
                                                                    }
                                                                    index={
                                                                        selectedAnalyticsQuestion
                                                                            .question
                                                                            .type ===
                                                                        "multiple_choice"
                                                                            ? index
                                                                            : undefined
                                                                    }
                                                                />
                                                            );
                                                        },
                                                    )}
                                                </div>
                                            </div>

                                            <div className="rounded-2xl border p-4">
                                                <div className="mb-4">
                                                    <p className="font-semibold">
                                                        Response-time
                                                        insight
                                                    </p>

                                                    <p className="text-xs text-muted-foreground">
                                                        Useful for
                                                        spotting
                                                        uncertainty
                                                        or
                                                        unusually
                                                        difficult
                                                        prompts.
                                                    </p>
                                                </div>

                                                <div className="space-y-3">
                                                    <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-900">
                                                        <span className="text-sm text-muted-foreground">
                                                            Average
                                                        </span>
                                                        <span className="font-bold">
                                                            {formatDurationMs(
                                                                selectedAnalyticsQuestion.averageResponseTimeMs,
                                                            )}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-900">
                                                        <span className="text-sm text-muted-foreground">
                                                            Median
                                                        </span>
                                                        <span className="font-bold">
                                                            {formatDurationMs(
                                                                selectedAnalyticsQuestion.medianResponseTimeMs,
                                                            )}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-900">
                                                        <span className="text-sm text-muted-foreground">
                                                            Unanswered
                                                        </span>
                                                        <span className="font-bold">
                                                            {Math.max(
                                                                0,
                                                                participantSummary.total -
                                                                    selectedAnalyticsQuestion.uniqueResponders,
                                                            )}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-900">
                                                        <span className="text-sm text-muted-foreground">
                                                            Status
                                                        </span>
                                                        <span className="font-bold">
                                                            {getQuestionStatusLabel(
                                                                selectedAnalyticsQuestion
                                                                    .question
                                                                    .status,
                                                            )}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">
                                        Create or load a question to
                                        see question analytics.
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* QUESTION PERFORMANCE TABLE */}

                        <Card>
                            <CardHeader>
                                <CardTitle>
                                    Question Performance
                                </CardTitle>

                                <p className="text-sm text-muted-foreground">
                                    Session-wide comparison of every
                                    question.
                                </p>
                            </CardHeader>

                            <CardContent className="p-0">
                                {questionAnalytics.length >
                                0 ? (
                                    <div className="overflow-x-auto">
                                        <table className="w-full min-w-[900px] text-sm">
                                            <thead className="border-y bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
                                                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                                                    <th className="px-5 py-3">
                                                        Question
                                                    </th>
                                                    <th className="px-4 py-3">
                                                        Status
                                                    </th>
                                                    <th className="px-4 py-3">
                                                        Responses
                                                    </th>
                                                    <th className="px-4 py-3">
                                                        Rate
                                                    </th>
                                                    <th className="px-4 py-3">
                                                        Avg.
                                                    </th>
                                                    <th className="px-4 py-3">
                                                        Median
                                                    </th>
                                                    <th className="px-4 py-3">
                                                        Leading
                                                    </th>
                                                </tr>
                                            </thead>

                                            <tbody>
                                                {questionAnalytics.map(
                                                    (
                                                        item,
                                                        index,
                                                    ) => (
                                                        <tr
                                                            key={
                                                                item
                                                                    .question
                                                                    .id
                                                            }
                                                            className="border-b last:border-0 dark:border-slate-800"
                                                        >
                                                            <td className="max-w-[420px] px-5 py-4">
                                                                <button
                                                                    type="button"
                                                                    className="text-left"
                                                                    onClick={() =>
                                                                        setSelectedAnalyticsQuestionId(
                                                                            item
                                                                                .question
                                                                                .id,
                                                                        )
                                                                    }
                                                                >
                                                                    <div className="flex items-start gap-3">
                                                                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold dark:bg-slate-800">
                                                                            {index +
                                                                                1}
                                                                        </span>

                                                                        <span className="font-medium hover:underline">
                                                                            {
                                                                                item
                                                                                    .question
                                                                                    .text
                                                                            }
                                                                        </span>
                                                                    </div>
                                                                </button>
                                                            </td>

                                                            <td className="px-4 py-4">
                                                                <span
                                                                    className={`rounded-full border px-2 py-1 text-[10px] font-bold ${getQuestionStatusClass(
                                                                        item
                                                                            .question
                                                                            .status,
                                                                    )}`}
                                                                >
                                                                    {getQuestionStatusLabel(
                                                                        item
                                                                            .question
                                                                            .status,
                                                                    )}
                                                                </span>
                                                            </td>

                                                            <td className="px-4 py-4 font-semibold">
                                                                {
                                                                    item.responseCount
                                                                }
                                                            </td>

                                                            <td className="px-4 py-4">
                                                                {formatPercentage(
                                                                    item.responseRate,
                                                                )}
                                                            </td>

                                                            <td className="px-4 py-4">
                                                                {formatDurationMs(
                                                                    item.averageResponseTimeMs,
                                                                )}
                                                            </td>

                                                            <td className="px-4 py-4">
                                                                {formatDurationMs(
                                                                    item.medianResponseTimeMs,
                                                                )}
                                                            </td>

                                                            <td className="max-w-[180px] px-4 py-4">
                                                                {item.dominantOption ? (
                                                                    <div>
                                                                        <p className="truncate font-medium">
                                                                            {
                                                                                item.dominantOption
                                                                            }
                                                                        </p>

                                                                        <p className="text-xs text-muted-foreground">
                                                                            {formatPercentage(
                                                                                item.dominantOptionPercentage,
                                                                            )}
                                                                        </p>
                                                                    </div>
                                                                ) : (
                                                                    "—"
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ),
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="p-10 text-center text-sm text-muted-foreground">
                                        No questions have been added
                                        to this session yet.
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </section>

                    {/* RIGHT SIDEBAR */}

                    <aside className="min-w-0 space-y-5">
                        {/* QUESTION QUEUE */}

                        <Card className="overflow-hidden">
                            <CardHeader className="border-b dark:border-slate-800">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <CardTitle>
                                            Question Queue
                                        </CardTitle>

                                        <p className="mt-1 text-xs text-muted-foreground">
                                            Broadcast, edit, or
                                            remove questions.
                                        </p>
                                    </div>

                                    <Button
                                        size="sm"
                                        onClick={
                                            openNewQuestionComposer
                                        }
                                    >
                                        + New
                                    </Button>
                                </div>
                            </CardHeader>

                            <CardContent className="max-h-[620px] space-y-3 overflow-y-auto p-3">
                                {questions.length ===
                                0 ? (
                                    <div className="rounded-2xl border border-dashed p-7 text-center">
                                        <p className="font-semibold">
                                            Queue is empty
                                        </p>

                                        <p className="mt-1 text-xs text-muted-foreground">
                                            Add a session question
                                            to start building your
                                            live flow.
                                        </p>

                                        <Button
                                            className="mt-4"
                                            size="sm"
                                            onClick={
                                                openNewQuestionComposer
                                            }
                                        >
                                            Create first question
                                        </Button>
                                    </div>
                                ) : (
                                    questions.map(
                                        (
                                            question,
                                            index,
                                        ) => {
                                            const isActive =
                                                session.active_question_id ===
                                                question.id;

                                            const responseCount =
                                                responseCountByQuestion[
                                                    question.id
                                                ] ?? 0;

                                            const uniqueResponders =
                                                uniqueResponseCountByQuestion[
                                                    question.id
                                                ] ?? 0;

                                            return (
                                                <div
                                                    key={
                                                        question.id
                                                    }
                                                    className={`rounded-2xl border p-3 transition ${
                                                        isActive
                                                            ? "border-indigo-500 bg-indigo-50 shadow-sm dark:bg-indigo-950/30"
                                                            : "bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900"
                                                    }`}
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xs font-bold dark:bg-slate-800">
                                                            {index +
                                                                1}
                                                        </div>

                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-center justify-between gap-2">
                                                                <span
                                                                    className={`rounded-full border px-2 py-1 text-[9px] font-bold ${getQuestionStatusClass(
                                                                        question.status,
                                                                    )}`}
                                                                >
                                                                    {getQuestionStatusLabel(
                                                                        question.status,
                                                                    )}
                                                                </span>

                                                                <span className="text-[10px] text-muted-foreground">
                                                                    {
                                                                        uniqueResponders
                                                                    }{" "}
                                                                    unique
                                                                </span>
                                                            </div>

                                                            <p className="mt-2 line-clamp-3 text-sm font-semibold leading-5">
                                                                {
                                                                    question.text
                                                                }
                                                            </p>

                                                            <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] text-muted-foreground">
                                                                <span className="rounded-full bg-slate-100 px-2 py-1 dark:bg-slate-800">
                                                                    {question.type ===
                                                                    "multiple_choice"
                                                                        ? "MCQ"
                                                                        : "Scale"}
                                                                </span>

                                                                <span className="rounded-full bg-slate-100 px-2 py-1 dark:bg-slate-800">
                                                                    {
                                                                        responseCount
                                                                    }{" "}
                                                                    responses
                                                                </span>

                                                                <span className="rounded-full bg-slate-100 px-2 py-1 dark:bg-slate-800">
                                                                    {
                                                                        question.options
                                                                            .length
                                                                    }{" "}
                                                                    options
                                                                </span>
                                                            </div>

                                                            <div className="mt-3 grid grid-cols-2 gap-2">
                                                                <Button
                                                                    size="sm"
                                                                    disabled={
                                                                        isUpdating ||
                                                                        session.status ===
                                                                            "completed"
                                                                    }
                                                                    onClick={() =>
                                                                        void pushQuestionLive(
                                                                            question,
                                                                        )
                                                                    }
                                                                >
                                                                    {isActive
                                                                        ? "Live now"
                                                                        : "Make live"}
                                                                </Button>

                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() => {
                                                                        setSelectedAnalyticsQuestionId(
                                                                            question.id,
                                                                        );
                                                                    }}
                                                                >
                                                                    Analytics
                                                                </Button>

                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    disabled={
                                                                        isUpdating ||
                                                                        question.status ===
                                                                            "active"
                                                                    }
                                                                    onClick={() =>
                                                                        startEditingQuestion(
                                                                            question,
                                                                        )
                                                                    }
                                                                >
                                                                    Edit
                                                                </Button>

                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    disabled={
                                                                        isUpdating ||
                                                                        question.status ===
                                                                            "active"
                                                                    }
                                                                    onClick={() =>
                                                                        void deleteSessionQuestion(
                                                                            question,
                                                                        )
                                                                    }
                                                                >
                                                                    Delete
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        },
                                    )
                                )}
                            </CardContent>
                        </Card>

                        {/* PARTICIPANTS */}

                        <Card>
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <CardTitle>
                                            Participants
                                        </CardTitle>

                                        <p className="mt-1 text-xs text-muted-foreground">
                                            Live room activity.
                                        </p>
                                    </div>

                                    <Badge variant="outline">
                                        {participantSummary.active}/
                                        {
                                            participantSummary.total
                                        }
                                    </Badge>
                                </div>
                            </CardHeader>

                            <CardContent className="space-y-3">
                                <div className="grid grid-cols-3 gap-2">
                                    <button
                                        type="button"
                                        className={`rounded-xl border p-3 text-center ${
                                            participantFilter ===
                                            "all"
                                                ? "border-indigo-400 bg-indigo-50 dark:border-indigo-700 dark:bg-indigo-950/30"
                                                : ""
                                        }`}
                                        onClick={() =>
                                            setParticipantFilter(
                                                "all",
                                            )
                                        }
                                    >
                                        <div className="text-lg font-bold">
                                            {
                                                participantSummary.total
                                            }
                                        </div>
                                        <div className="text-[10px] text-muted-foreground">
                                            All
                                        </div>
                                    </button>

                                    <button
                                        type="button"
                                        className={`rounded-xl border p-3 text-center ${
                                            participantFilter ===
                                            "active"
                                                ? "border-emerald-400 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/30"
                                                : ""
                                        }`}
                                        onClick={() =>
                                            setParticipantFilter(
                                                "active",
                                            )
                                        }
                                    >
                                        <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                                            {
                                                participantSummary.active
                                            }
                                        </div>
                                        <div className="text-[10px] text-muted-foreground">
                                            Active
                                        </div>
                                    </button>

                                    <button
                                        type="button"
                                        className={`rounded-xl border p-3 text-center ${
                                            participantFilter ===
                                            "away"
                                                ? "border-amber-400 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30"
                                                : ""
                                        }`}
                                        onClick={() =>
                                            setParticipantFilter(
                                                "away",
                                            )
                                        }
                                    >
                                        <div className="text-lg font-bold text-amber-600 dark:text-amber-400">
                                            {
                                                participantSummary.inactive
                                            }
                                        </div>
                                        <div className="text-[10px] text-muted-foreground">
                                            Away
                                        </div>
                                    </button>
                                </div>

                                <div className="rounded-xl border p-3">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-semibold">
                                                Current question
                                            </p>

                                            <p className="text-xs text-muted-foreground">
                                                {activeQuestion
                                                    ? `${activeResponderIds.size} of ${participantSummary.total} have answered`
                                                    : "No question live"}
                                            </p>
                                        </div>

                                        <span className="text-lg font-bold">
                                            {activeQuestion
                                                ? formatPercentage(
                                                      activeQuestionResponseRate,
                                                  )
                                                : "—"}
                                        </span>
                                    </div>

                                    {activeQuestion ? (
                                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                                            <div
                                                className="h-full rounded-full bg-emerald-500"
                                                style={{
                                                    width: `${clampPercentage(
                                                        activeQuestionResponseRate,
                                                    )}%`,
                                                }}
                                            />
                                        </div>
                                    ) : null}
                                </div>

                                <div className="max-h-[430px] space-y-2 overflow-y-auto pr-1">
                                    {filteredParticipants.length ===
                                    0 ? (
                                        <p className="py-6 text-center text-xs text-muted-foreground">
                                            No participants match
                                            this filter.
                                        </p>
                                    ) : (
                                        filteredParticipants.map(
                                            (
                                                participant,
                                            ) => {
                                                const active =
                                                    isParticipantActive(
                                                        participant,
                                                    );

                                                const hasAnswered =
                                                    activeResponderIds.has(
                                                        participant.id,
                                                    );

                                                return (
                                                    <div
                                                        key={
                                                            participant.id
                                                        }
                                                        className="rounded-xl border px-3 py-3 dark:border-slate-800"
                                                    >
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div className="min-w-0">
                                                                <p className="truncate text-sm font-semibold">
                                                                    {getParticipantLabel(
                                                                        participant,
                                                                    )}
                                                                </p>

                                                                <p className="mt-1 text-xs text-muted-foreground">
                                                                    {participant.is_anonymous
                                                                        ? "Anonymous"
                                                                        : `Roll ${
                                                                              participant.roll_number ??
                                                                              "—"
                                                                          }`}
                                                                </p>
                                                            </div>

                                                            <div className="flex shrink-0 items-center gap-2">
                                                                <span
                                                                    className={`h-2.5 w-2.5 rounded-full ${
                                                                        active
                                                                            ? "bg-emerald-500"
                                                                            : "bg-slate-300"
                                                                    }`}
                                                                />

                                                                <span className="text-[10px] text-muted-foreground">
                                                                    {active
                                                                        ? "Active"
                                                                        : "Away"}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {activeQuestion ? (
                                                            <div className="mt-3 flex items-center justify-between border-t pt-2 text-xs dark:border-slate-800">
                                                                <span className="text-muted-foreground">
                                                                    Current
                                                                    question
                                                                </span>

                                                                <span
                                                                    className={
                                                                        hasAnswered
                                                                            ? "font-semibold text-emerald-600 dark:text-emerald-400"
                                                                            : "font-semibold text-amber-600 dark:text-amber-400"
                                                                    }
                                                                >
                                                                    {hasAnswered
                                                                        ? "Answered"
                                                                        : "Waiting"}
                                                                </span>
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                );
                                            },
                                        )
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* RECENT RESPONSES */}

                        <Card>
                            <CardHeader>
                                <CardTitle>
                                    Recent Responses
                                </CardTitle>

                                <p className="text-xs text-muted-foreground">
                                    Latest updates arriving from
                                    students.
                                </p>
                            </CardHeader>

                            <CardContent className="space-y-2">
                                {recentResponses.length ===
                                0 ? (
                                    <div className="rounded-2xl border border-dashed p-7 text-center">
                                        <p className="text-sm font-semibold">
                                            No responses yet
                                        </p>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            Student submissions will
                                            appear here in real time.
                                        </p>
                                    </div>
                                ) : (
                                    recentResponses.map(
                                        (
                                            response,
                                        ) => {
                                            const question =
                                                questions.find(
                                                    (
                                                        item,
                                                    ) =>
                                                        item.id ===
                                                        response.question_id,
                                                );

                                            return (
                                                <div
                                                    key={
                                                        response.id
                                                    }
                                                    className="rounded-xl border px-3 py-3 dark:border-slate-800"
                                                >
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="min-w-0">
                                                            <p className="truncate text-sm font-semibold">
                                                                {getParticipantLabel(
                                                                    response.participant ??
                                                                        ({
                                                                            is_anonymous:
                                                                                true,
                                                                        } as Participant),
                                                                )}
                                                            </p>

                                                            <p className="mt-1 truncate text-xs text-muted-foreground">
                                                                {question
                                                                    ?.text ??
                                                                    "Question unavailable"}
                                                            </p>
                                                        </div>

                                                        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold dark:bg-slate-800">
                                                            {formatDurationMs(
                                                                response.response_time_ms,
                                                            )}
                                                        </span>
                                                    </div>

                                                    <div className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs dark:bg-slate-900">
                                                        <span className="font-semibold">
                                                            Answer:
                                                        </span>{" "}
                                                        {String(response.answer ?? "")}
                                                    </div>
                                                </div>
                                            );
                                        },
                                    )
                                )}
                            </CardContent>
                        </Card>
                    </aside>
                </div>

                {/* FOOTER SESSION SUMMARY */}

                <section className="mt-5 grid gap-5 lg:grid-cols-3">
                    <Card>
                        <CardHeader>
                            <CardTitle>
                                Engagement snapshot
                            </CardTitle>
                        </CardHeader>

                        <CardContent className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">
                                    Students joined
                                </span>
                                <span className="font-bold">
                                    {
                                        participantSummary.total
                                    }
                                </span>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">
                                    Students who answered
                                    at least once
                                </span>
                                <span className="font-bold">
                                    {
                                        totalUniqueResponders
                                    }
                                </span>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">
                                    Session participation
                                </span>
                                <span className="font-bold">
                                    {formatPercentage(
                                        overallParticipationRate,
                                    )}
                                </span>
                            </div>

                            <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                                <div
                                    className="h-full rounded-full bg-indigo-500"
                                    style={{
                                        width: `${clampPercentage(
                                            overallParticipationRate,
                                        )}%`,
                                    }}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>
                                Current question health
                            </CardTitle>
                        </CardHeader>

                        <CardContent className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">
                                    Answered
                                </span>
                                <span className="font-bold">
                                    {
                                        activeResponderIds.size
                                    }
                                </span>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">
                                    Waiting
                                </span>
                                <span className="font-bold">
                                    {
                                        activeQuestionUnansweredCount
                                    }
                                </span>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">
                                    Average response
                                </span>
                                <span className="font-bold">
                                    {formatDurationMs(
                                        activeAverageResponseTimeMs,
                                    )}
                                </span>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">
                                    Results mode
                                </span>
                                <span className="font-bold">
                                    {activeQuestion
                                        ? getResultsModeLabel(
                                              activeQuestion.results_mode,
                                          )
                                        : "—"}
                                </span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>
                                Session health
                            </CardTitle>
                        </CardHeader>

                        <CardContent className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">
                                    Live status
                                </span>

                                <Badge>
                                    {session.status.toUpperCase()}
                                </Badge>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">
                                    Late join
                                </span>

                                <span className="font-bold">
                                    {session.allow_late_join
                                        ? "Open"
                                        : "Locked"}
                                </span>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">
                                    Current question
                                </span>

                                <span className="max-w-[180px] truncate text-right font-bold">
                                    {activeQuestion
                                        ? activeQuestion.text
                                        : "None"}
                                </span>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">
                                    Session responses
                                </span>

                                <span className="font-bold">
                                    {responses.length}
                                </span>
                            </div>
                        </CardContent>
                    </Card>
                </section>
            </div>
        </main>
    );
}