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

type ResponseWithParticipant =
    PollResponse & {
        participant?: Participant | null;
    };

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
        useState<ResponseWithParticipant[]>(
            [],
        );

    const [participants, setParticipants] =
        useState<Participant[]>([]);

    const [
        isUpdatingParticipants,
        setIsUpdatingParticipants,
    ] = useState(false);

    const [isLoading, setIsLoading] =
        useState(true);

    const [isUpdating, setIsUpdating] =
        useState(false);

    const [error, setError] =
        useState<string | null>(null);

    const [showQuestionComposer, setShowQuestionComposer] =
        useState(false);

    const [newQuestionText, setNewQuestionText] =
        useState("");

    const [newQuestionType, setNewQuestionType] =
        useState<"multiple_choice" | "scale">(
            "multiple_choice",
        );

    const [newQuestionOptions, setNewQuestionOptions] =
        useState<string[]>([
            "Option 1",
            "Option 2",
        ]);

    const [newQuestionResultsMode, setNewQuestionResultsMode] =
        useState<"live" | "on_command" | "hidden">(
            "on_command",
        );

    const [isCreatingQuestion, setIsCreatingQuestion] =
        useState(false);

    const [editingQuestionId, setEditingQuestionId] =
        useState<string | null>(null);

    const [isSavingQuestion, setIsSavingQuestion] =
        useState(false);

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
            setError(
                responseError.message,
            );
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
            setResponses(
                rawResponses,
            );
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
            setError(
                participantError.message,
            );
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
            .eq("join_code", sessionCode)
            .eq("instructor_id", user.id)
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

        setSession(
            currentSession,
        );

        setSessionId(
            currentSession.id,
        );


        /*
         * LOAD TEMPLATE
         *
         * Instant sessions have no template.
         */

        if (
            currentSession.template_id
        ) {
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

        /*
         * LOAD SESSION QUESTION
         * SNAPSHOTS
         */

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
            setError(
                questionError.message,
            );

            setQuestions([]);
        } else {
            setQuestions(
                (questionData ??
                    []) as SessionQuestion[],
            );
        }

        /*
         * LOAD RESPONSES
         */

        await loadResponses(
            currentSession.id,
        );

        /*
         * LOAD PARTICIPANTS
         */

        await loadParticipants(
            currentSession.id,
        );

        setIsLoading(false);
    };

    /*
     * ---------------------------------------------
     * INITIAL LOAD
     * ---------------------------------------------
     */

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

        /*
         * SESSION REALTIME
         */

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

        /*
         * SESSION QUESTIONS
         * REALTIME
         */

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

                        if (
                            !changedQuestion
                        ) {
                            return;
                        }

                        /*
                         * INSERT
                         */

                        if (
                            payload.eventType ===
                            "INSERT"
                        ) {
                            setQuestions(
                                (current) => {
                                    const exists =
                                        current.some(
                                            (question) =>
                                                question.id ===
                                                changedQuestion.id,
                                        );

                                    if (exists) {
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

                        /*
                         * UPDATE
                         */

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

                        /*
                         * DELETE
                         */

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

        /*
         * RESPONSES REALTIME
         */

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

        /*
         * PARTICIPANTS REALTIME
         */

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
     * ACTIVE QUESTION
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

    /*
     * ---------------------------------------------
     * ACTIVE RESPONSES
     * ---------------------------------------------
     */

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

    /*
     * ---------------------------------------------
     * PARTICIPANT SUMMARY
     * ---------------------------------------------
     */

    const activeParticipantThresholdMs =
        45 * 1000;

    const participantSummary =
        useMemo(() => {
            const now = Date.now();

            let active = 0;
            let inactive = 0;

            for (
                const participant of participants
            ) {
                if (participant.left_at) {
                    inactive += 1;
                    continue;
                }

                const lastSeen =
                    new Date(
                        participant.last_seen_at,
                    ).getTime();

                if (
                    now - lastSeen <=
                    activeParticipantThresholdMs
                ) {
                    active += 1;
                } else {
                    inactive += 1;
                }
            }

            return {
                total:
                    participants.length,
                active,
                inactive,
            };
        }, [participants]);

    /*
     * ---------------------------------------------
     * RESPONSE COUNTS
     * ---------------------------------------------
     */

    const responseCountByQuestion =
        useMemo(() => {
            const counts: Record<
                string,
                number
            > = {};

            for (
                const response of responses
            ) {
                counts[
                    response.question_id
                ] =
                    (counts[
                        response.question_id
                    ] ?? 0) + 1;
            }

            return counts;
        }, [responses]);

    /*
     * ---------------------------------------------
     * ACTIVE QUESTION RESULTS
     * ---------------------------------------------
     */

    const activeTally = useMemo(() => {
        const tally: Record<
            string,
            number
        > = {};

        if (!activeQuestion) {
            return tally;
        }

        for (
            const option of
            activeQuestion.options
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

    /*
     * ---------------------------------------------
     * TOGGLE LATE JOIN
     * ---------------------------------------------
     */

    const toggleLateJoin =
        async () => {
            if (
                !session ||
                isUpdatingParticipants
            ) {
                return;
            }

            setIsUpdatingParticipants(
                true,
            );

            setError(null);

            const nextValue =
                !session.allow_late_join;

            const {
                data,
                error: updateError,
            } =
                await supabase
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

                setIsUpdatingParticipants(
                    false,
                );

                return;
            }

            setSession(
                data as Session,
            );

            setIsUpdatingParticipants(
                false,
            );
        };

    /*
   * ---------------------------------------------
   * CREATE SESSION QUESTION
   * ---------------------------------------------
   */

    const createSessionQuestion = async () => {
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
                .map((option) => option.trim())
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

        setIsCreatingQuestion(true);
        setError(null);

        const nextPosition =
            questions.length === 0
                ? 1
                : Math.max(
                    ...questions.map(
                        (question) =>
                            question.position,
                    ),
                ) + 1;

        const now =
            new Date().toISOString();

        const options =
            newQuestionType === "scale"
                ? cleanedOptions
                : cleanedOptions;

        const {
            data,
            error: createError,
        } = await supabase
            .from("session_questions")
            .insert({
                session_id: session.id,

                source_question_id: null,

                text: trimmedText,

                type: newQuestionType,

                options,

                config:
                    newQuestionType === "scale"
                        ? {
                            min: 1,
                            max:
                                options.length > 0
                                    ? options.length
                                    : 5,
                        }
                        : {},

                position: nextPosition,

                status: "draft",

                results_mode:
                    newQuestionResultsMode,

                results_visible: false,

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

        setQuestions((current) =>
            [...current, createdQuestion].sort(
                (a, b) =>
                    a.position - b.position,
            ),
        );

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

        setIsCreatingQuestion(false);
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

        setShowQuestionComposer(true);

        setError(null);
    };

    const saveEditedQuestion = async () => {
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
                .map((option) => option.trim())
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
            .from("session_questions")
            .update({
                text: trimmedText,

                type: newQuestionType,

                options:
                    cleanedOptions,

                config:
                    newQuestionType === "scale"
                        ? {
                            min: 1,
                            max:
                                cleanedOptions.length > 0
                                    ? cleanedOptions.length
                                    : 5,
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

        setQuestions((current) =>
            current.map(
                (question) =>
                    question.id ===
                        updatedQuestion.id
                        ? updatedQuestion
                        : question,
            ),
        );

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

        setIsSavingQuestion(false);
    };

    const deleteSessionQuestion = async (
        question: SessionQuestion,
    ) => {
        if (
            !session ||
            isUpdating ||
            question.status === "active"
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
            .from("session_questions")
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

        setIsUpdating(false);
    };

    const updateNewQuestionOption = (
        index: number,
        value: string,
    ) => {
        setNewQuestionOptions(
            (current) =>
                current.map(
                    (option, optionIndex) =>
                        optionIndex === index
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
                    (_, optionIndex) =>
                        optionIndex !== index,
                ),
        );
    };

    /*
     * ---------------------------------------------
     * PUSH QUESTION LIVE
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

            /*
             * CLOSE PREVIOUS QUESTION
             */

            if (
                session.active_question_id &&
                session.active_question_id !==
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
                        session.active_question_id,
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

            /*
             * DETERMINE INITIAL
             * RESULTS VISIBILITY
             */

            const resultsVisible =
                question.results_mode ===
                "live";

            /*
             * ACTIVATE QUESTION
             */

            const {
                data: updatedQuestion,
                error: questionError,
            } =
                await supabase
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

            /*
             * UPDATE SESSION
             */

            const {
                data: updatedSession,
                error: sessionError,
            } =
                await supabase
                    .from("sessions")
                    .update({
                        active_question_id:
                            question.id,
                        status: "live",
                        is_offline: false,
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

            /*
             * LOCAL SESSION UPDATE
             */

            setSession(
                updatedSession as Session,
            );

            /*
             * LOCAL QUESTION UPDATE
             */

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
                                session.active_question_id
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

            setIsUpdating(false);
        };

    /*
     * ---------------------------------------------
     * CLOSE ACTIVE QUESTION
     * ---------------------------------------------
     */

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
            } =
                await supabase
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
            } =
                await supabase
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

    /*
     * ---------------------------------------------
     * REVEAL RESULTS
     * ---------------------------------------------
     */

    const revealResults =
        async () => {
            const currentSession = session;
            const currentQuestion = activeQuestion;

            if (
                !currentSession ||
                !currentQuestion ||
                isUpdating
            ) {
                return;
            }

            if (
                currentQuestion.results_mode ===
                "hidden"
            ) {
                return;
            }

            setIsUpdating(true);
            setError(null);

            const {
                data: updatedQuestion,
                error: updateError,
            } =
                await supabase
                    .from(
                        "session_questions",
                    )
                    .update({
                        results_visible:
                            true,
                        updated_at:
                            new Date().toISOString(),
                    })
                    .eq(
                        "id",
                        currentQuestion.id,
                    )
                    .eq(
                        "session_id",
                        currentSession.id,
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
                                currentQuestion.id
                                ? (updatedQuestion as SessionQuestion)
                                : question,
                    ),
            );

            setIsUpdating(false);
        };

    /*
     * ---------------------------------------------
     * HIDE RESULTS
     * ---------------------------------------------
     */

    const hideResults =
        async () => {
            const currentSession = session;
            const currentQuestion = activeQuestion;

            if (
                !currentSession ||
                !currentQuestion ||
                isUpdating
            ) {
                return;
            }

            if (
                currentQuestion.results_mode ===
                "live"
            ) {
                return;
            }

            setIsUpdating(true);
            setError(null);

            const {
                data: updatedQuestion,
                error: updateError,
            } =
                await supabase
                    .from(
                        "session_questions",
                    )
                    .update({
                        results_visible:
                            false,
                        updated_at:
                            new Date().toISOString(),
                    })
                    .eq(
                        "id",
                        currentQuestion.id,
                    )
                    .eq(
                        "session_id",
                        currentSession.id,
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
                                currentQuestion.id
                                ? (updatedQuestion as SessionQuestion)
                                : question,
                    ),
            );

            setIsUpdating(false);
        };

    /*
     * ---------------------------------------------
     * PAUSE SESSION
     * ---------------------------------------------
     */

    const togglePause =
        async (
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

            const nextStatus =
                paused
                    ? "paused"
                    : "live";

            const {
                data: updatedSession,
                error: updateError,
            } =
                await supabase
                    .from("sessions")
                    .update({
                        status:
                            nextStatus,
                        is_offline:
                            paused,
                        paused_at:
                            paused
                                ? now
                                : null,
                        updated_at:
                            now,
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

    /*
     * ---------------------------------------------
     * END SESSION
     * ---------------------------------------------
     */

    const endSession =
        async () => {
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
            } =
                await supabase
                    .from("sessions")
                    .update({
                        status:
                            "completed",
                        active_question_id:
                            null,
                        ended_at:
                            now,
                        updated_at:
                            now,
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

            router.push(
                "/instructor",
            );
        };

    /*
     * ---------------------------------------------
     * LOADING
     * ---------------------------------------------
     */

    if (isLoading) {
        return (
            <main className="min-h-screen bg-slate-100 p-4 dark:bg-slate-950 sm:p-6">
                <div className="mx-auto max-w-[1600px] rounded-2xl border bg-white p-10 text-center dark:bg-slate-900">
                    Loading Live Studio...
                </div>
            </main>
        );
    }

    /*
     * ---------------------------------------------
     * ERROR
     * ---------------------------------------------
     */

    if (!session) {
        return (
            <main className="min-h-screen bg-slate-100 p-4 dark:bg-slate-950 sm:p-6">
                <div className="mx-auto max-w-[1600px] rounded-2xl border border-red-200 bg-red-50 p-10 text-center text-red-700">
                    {error ??
                        "Unable to load session."}
                </div>
            </main>
        );
    }

    /*
     * ---------------------------------------------
     * RESULTS MODE LABEL
     * ---------------------------------------------
     */

    const getResultsModeLabel =
        () => {
            if (!activeQuestion) {
                return "";
            }

            if (
                activeQuestion.results_mode ===
                "live"
            ) {
                return "Live Results";
            }

            if (
                activeQuestion.results_mode ===
                "hidden"
            ) {
                return "Hidden Results";
            }

            return "Results on Command";
        };

    /*
     * ---------------------------------------------
     * UI
     * ---------------------------------------------
     */

    return (
        <main className="min-h-screen bg-slate-100 dark:bg-slate-950">
            <div className="mx-auto max-w-[1600px] p-4 sm:p-6">
                {/* HEADER */}

                <header className="mb-5 rounded-2xl border bg-white p-5 shadow-sm dark:bg-slate-900">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                        <div className="min-w-0">
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                                <Badge>
                                    {session.status.toUpperCase()}
                                </Badge>

                                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold dark:bg-slate-800">
                                    Join Code:{" "}
                                    {session.join_code}
                                </span>

                                <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
                                    {responses.length}{" "}
                                    responses
                                </span>

                                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold dark:bg-slate-800">
                                    {participantSummary.total}{" "}
                                    participants
                                </span>
                            </div>

                            <h1 className="truncate text-2xl font-bold sm:text-3xl">
                                {session.name}
                            </h1>

                            <p className="mt-1 text-sm text-muted-foreground">
                                {template?.title ??
                                    "Instant Session"}
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
                                Projector
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
                </header>

                {error && (
                    <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {error}
                    </div>
                )}

                {/* THREE COLUMN LAYOUT */}

                <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)_380px]">
                    {/* LEFT COLUMN */}

                    <aside className="space-y-5">
                        <Card>
                            <CardHeader>
                                <CardTitle>
                                    Live Controls
                                </CardTitle>
                            </CardHeader>

                            <CardContent className="space-y-4">
                                <Button
                                    className="h-11 w-full"
                                    onClick={() =>
                                        window.open(
                                            `/instructor/${session.join_code}/projector`,
                                            "_blank",
                                            "noopener,noreferrer",
                                        )
                                    }
                                >
                                    Open Projector ↗
                                </Button>

                                <div className="rounded-xl border p-4">
                                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                        Participation
                                    </p>

                                    <p className="mt-1 font-semibold">
                                        {session.participant_mode ===
                                            "anonymous"
                                            ? "Anonymous"
                                            : "Name + Roll Number"}
                                    </p>
                                </div>

                                <div className="rounded-xl border p-4">
                                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                        Results
                                    </p>

                                    <p className="mt-1 font-semibold">
                                        {session.results_mode ===
                                            "live"
                                            ? "Live"
                                            : session.results_mode ===
                                                "on_command"
                                                ? "On Command"
                                                : "Hidden"}
                                    </p>
                                </div>

                                <div className="flex items-center justify-between rounded-xl border p-4">
                                    <div>
                                        <p className="font-medium">
                                            Pause Polling
                                        </p>

                                        <p className="text-xs text-muted-foreground">
                                            Temporarily stop responses.
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

                                <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
                                    <p className="text-xs text-muted-foreground">
                                        Total Responses
                                    </p>

                                    <p className="mt-1 text-3xl font-bold">
                                        {responses.length}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>
                                    Session Information
                                </CardTitle>
                            </CardHeader>

                            <CardContent className="space-y-3">
                                <div>
                                    <p className="text-xs text-muted-foreground">
                                        Questions
                                    </p>

                                    <p className="font-semibold">
                                        {questions.length}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs text-muted-foreground">
                                        Participants
                                    </p>

                                    <p className="font-semibold">
                                        {participantSummary.total}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs text-muted-foreground">
                                        Active Participants
                                    </p>

                                    <p className="font-semibold">
                                        {participantSummary.active}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs text-muted-foreground">
                                        Late Join
                                    </p>

                                    <p className="font-semibold">
                                        {session.allow_late_join
                                            ? "Enabled"
                                            : "Disabled"}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs text-muted-foreground">
                                        Answer Changes
                                    </p>

                                    <p className="font-semibold">
                                        {session.allow_answer_change
                                            ? "Allowed"
                                            : "Locked"}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </aside>

                    {/* CENTER COLUMN */}

                    <section className="min-w-0">
                        <Card className="min-h-[720px]">
                            <CardHeader className="border-b">
                                <div className="flex items-center justify-between gap-4">
                                    <div>
                                        <CardTitle>
                                            {activeQuestion
                                                ? "Live Question"
                                                : "Live Session"}
                                        </CardTitle>

                                        <p className="mt-1 text-sm text-muted-foreground">
                                            Question controls and live
                                            result summary.
                                        </p>
                                    </div>

                                    {activeQuestion && (
                                        <Badge>
                                            {
                                                activeResponses.length
                                            }{" "}
                                            responses
                                        </Badge>
                                    )}
                                </div>
                            </CardHeader>

                            <CardContent className="p-6">
                                {activeQuestion ? (
                                    <div className="space-y-8">
                                        {/* QUESTION */}

                                        <div>
                                            <div className="mb-3 flex flex-wrap items-center gap-2">
                                                <span className="text-xs font-semibold uppercase tracking-[0.15em] text-indigo-600">
                                                    Current Question
                                                </span>

                                                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold dark:bg-slate-800">
                                                    {getResultsModeLabel()}
                                                </span>
                                            </div>

                                            <h2 className="text-2xl font-bold leading-tight lg:text-4xl">
                                                {activeQuestion.text}
                                            </h2>
                                        </div>

                                        {/* RESULTS CONTROL */}

                                        <div className="rounded-2xl border bg-slate-50 p-4 dark:bg-slate-900">
                                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                                <div>
                                                    <p className="font-semibold">
                                                        Student Results
                                                    </p>

                                                    <p className="mt-1 text-sm text-muted-foreground">
                                                        {activeQuestion.results_mode ===
                                                            "live"
                                                            ? "Results are automatically visible to students."
                                                            : activeQuestion.results_mode ===
                                                                "hidden"
                                                                ? "Results cannot be shown to students."
                                                                : activeQuestion.results_visible
                                                                    ? "Results are currently visible to students."
                                                                    : "Results are currently hidden from students."}
                                                    </p>
                                                </div>

                                                {/* LIVE MODE */}

                                                {activeQuestion.results_mode ===
                                                    "live" && (
                                                        <Badge>
                                                            Automatically Visible
                                                        </Badge>
                                                    )}

                                                {/* HIDDEN MODE */}

                                                {activeQuestion.results_mode ===
                                                    "hidden" && (
                                                        <Badge variant="secondary">
                                                            Permanently Hidden
                                                        </Badge>
                                                    )}

                                                {/* ON COMMAND MODE */}

                                                {activeQuestion.results_mode ===
                                                    "on_command" && (
                                                        <Button
                                                            disabled={
                                                                isUpdating
                                                            }
                                                            variant={
                                                                activeQuestion.results_visible
                                                                    ? "outline"
                                                                    : "default"
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
                                                                ? "Hide Results"
                                                                : "Reveal Results"}
                                                        </Button>
                                                    )}
                                            </div>
                                        </div>

                                        {/* RESULT VISUALIZATION */}

                                        {activeQuestion.type ===
                                            "multiple_choice" ? (
                                            <div className="space-y-4">
                                                {activeQuestion.options.map(
                                                    (
                                                        option,
                                                        index,
                                                    ) => {
                                                        const count =
                                                            activeTally[
                                                            option
                                                            ] ??
                                                            0;

                                                        const percentage =
                                                            activeResponses.length ===
                                                                0
                                                                ? 0
                                                                : Math.round(
                                                                    (count /
                                                                        activeResponses.length) *
                                                                    100,
                                                                );

                                                        return (
                                                            <div
                                                                key={`${activeQuestion.id}-${index}`}
                                                                className="rounded-xl border p-4"
                                                            >
                                                                <div className="flex items-center justify-between gap-4">
                                                                    <div className="min-w-0">
                                                                        <span className="mr-2 font-bold text-muted-foreground">
                                                                            {String.fromCharCode(
                                                                                65 +
                                                                                index,
                                                                            )}
                                                                            .
                                                                        </span>

                                                                        <span className="font-semibold">
                                                                            {option}
                                                                        </span>
                                                                    </div>

                                                                    <div className="shrink-0 text-right">
                                                                        <p className="font-bold">
                                                                            {count}
                                                                        </p>

                                                                        <p className="text-xs text-muted-foreground">
                                                                            {
                                                                                percentage
                                                                            }
                                                                            %
                                                                        </p>
                                                                    </div>
                                                                </div>

                                                                <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                                                                    <div
                                                                        className="h-full rounded-full bg-indigo-500 transition-all duration-300"
                                                                        style={{
                                                                            width: `${percentage}%`,
                                                                        }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        );
                                                    },
                                                )}
                                            </div>
                                        ) : (
                                            <div className="rounded-xl border bg-slate-50 p-6 text-center dark:bg-slate-900">
                                                <p className="text-sm text-muted-foreground">
                                                    {
                                                        activeResponses.length
                                                    }{" "}
                                                    response
                                                    {activeResponses.length ===
                                                        1
                                                        ? ""
                                                        : "s"}{" "}
                                                    received.
                                                </p>
                                            </div>
                                        )}

                                        {/* QUESTION CONTROLS */}

                                        <div className="grid gap-3 sm:grid-cols-2">
                                            <Button
                                                variant="outline"
                                                disabled={
                                                    isUpdating
                                                }
                                                onClick={() =>
                                                    void closeActiveQuestion()
                                                }
                                            >
                                                Close Question
                                            </Button>

                                            <Button
                                                disabled={
                                                    isUpdating
                                                }
                                                onClick={() => {
                                                    const index =
                                                        questions.findIndex(
                                                            (item) =>
                                                                item.id ===
                                                                activeQuestion.id,
                                                        );

                                                    const nextQuestion =
                                                        questions[
                                                        index + 1
                                                        ];

                                                    if (
                                                        nextQuestion
                                                    ) {
                                                        void pushQuestionLive(
                                                            nextQuestion,
                                                        );
                                                    }
                                                }}
                                            >
                                                Next Question
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-6">

                                        <div className="flex flex-col gap-4 rounded-2xl border bg-slate-50 p-5 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
                                            <div>
                                                <h2 className="text-2xl font-bold">
                                                    Ready to teach
                                                </h2>

                                                <p className="mt-1 text-sm text-muted-foreground">
                                                    {session.template_id
                                                        ? "Choose a question from the queue or create one for this session."
                                                        : "Create a question directly in this instant session."}
                                                </p>
                                            </div>

                                            <Button
                                                onClick={() => {
                                                    if (showQuestionComposer) {
                                                        setShowQuestionComposer(false);
                                                        setEditingQuestionId(null);
                                                        return;
                                                    }

                                                    setShowQuestionComposer(true);
                                                }}
                                            >
                                                {showQuestionComposer
                                                    ? "Cancel"
                                                    : editingQuestionId
                                                        ? "Edit Question"
                                                        : "Create Question"}
                                            </Button>
                                        </div>

                                        {showQuestionComposer && (
                                            <div className="rounded-2xl border bg-white p-6 shadow-sm dark:bg-slate-900">
                                                <div className="space-y-6">

                                                    <div>
                                                        <h3 className="text-lg font-semibold">
                                                            {editingQuestionId
                                                                ? "Edit Session Question"
                                                                : "New Session Question"}
                                                        </h3>

                                                        <p className="mt-1 text-sm text-muted-foreground">
                                                            {editingQuestionId
                                                                ? "Update this session question before broadcasting it."
                                                                : "This question will belong only to this live session."}
                                                        </p>
                                                    </div>

                                                    <div>
                                                        <label className="text-sm font-medium">
                                                            Question
                                                        </label>

                                                        <textarea
                                                            value={newQuestionText}
                                                            onChange={(event) =>
                                                                setNewQuestionText(
                                                                    event.target.value,
                                                                )
                                                            }
                                                            placeholder="Enter your question..."
                                                            className="mt-2 min-h-[120px] w-full rounded-xl border bg-background px-4 py-3 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-ring"
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="text-sm font-medium">
                                                            Question Type
                                                        </label>

                                                        <select
                                                            value={newQuestionType}
                                                            onChange={(event) =>
                                                                setNewQuestionType(
                                                                    event.target.value as
                                                                    | "multiple_choice"
                                                                    | "scale",
                                                                )
                                                            }
                                                            className="mt-2 h-10 w-full rounded-xl border bg-background px-3 text-sm"
                                                        >
                                                            <option value="multiple_choice">
                                                                Multiple Choice
                                                            </option>

                                                            <option value="scale">
                                                                Scale
                                                            </option>
                                                        </select>
                                                    </div>

                                                    <div>
                                                        <div className="flex items-center justify-between">
                                                            <label className="text-sm font-medium">
                                                                Options
                                                            </label>

                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={
                                                                    addNewQuestionOption
                                                                }
                                                            >
                                                                Add Option
                                                            </Button>
                                                        </div>

                                                        <div className="mt-3 space-y-2">
                                                            {newQuestionOptions.map(
                                                                (option, index) => (
                                                                    <div
                                                                        key={index}
                                                                        className="flex gap-2"
                                                                    >
                                                                        <input
                                                                            value={option}
                                                                            onChange={(event) =>
                                                                                updateNewQuestionOption(
                                                                                    index,
                                                                                    event.target.value,
                                                                                )
                                                                            }
                                                                            className="h-10 min-w-0 flex-1 rounded-xl border bg-background px-3 text-sm"
                                                                            placeholder={`Option ${index + 1
                                                                                }`}
                                                                        />

                                                                        {newQuestionOptions.length >
                                                                            2 && (
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
                                                                            )}
                                                                    </div>
                                                                ),
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <label className="text-sm font-medium">
                                                            Results Mode
                                                        </label>

                                                        <select
                                                            value={
                                                                newQuestionResultsMode
                                                            }
                                                            onChange={(event) =>
                                                                setNewQuestionResultsMode(
                                                                    event.target.value as
                                                                    | "live"
                                                                    | "on_command"
                                                                    | "hidden",
                                                                )
                                                            }
                                                            className="mt-2 h-10 w-full rounded-xl border bg-background px-3 text-sm"
                                                        >
                                                            <option value="live">
                                                                Live Results
                                                            </option>

                                                            <option value="on_command">
                                                                Reveal on Command
                                                            </option>

                                                            <option value="hidden">
                                                                Hidden Results
                                                            </option>
                                                        </select>
                                                    </div>

                                                    <div className="flex justify-end gap-2 border-t pt-5">
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            disabled={
                                                                isCreatingQuestion
                                                            }
                                                            onClick={() =>
                                                                setShowQuestionComposer(
                                                                    false,
                                                                )
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
                                                                if (editingQuestionId) {
                                                                    void saveEditedQuestion();
                                                                } else {
                                                                    void createSessionQuestion();
                                                                }
                                                            }}
                                                        >
                                                            {editingQuestionId
                                                                ? isSavingQuestion
                                                                    ? "Saving..."
                                                                    : "Save Changes"
                                                                : isCreatingQuestion
                                                                    ? "Creating..."
                                                                    : "Create Question"}
                                                        </Button>
                                                    </div>

                                                </div>
                                            </div>
                                        )}

                                        {!showQuestionComposer && (
                                            <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-dashed text-center">
                                                <div>
                                                    <p className="text-lg font-semibold">
                                                        No question is currently live
                                                    </p>

                                                    <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                                                        Create a question above or select a queued question from the right.
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </section>

                    {/* RIGHT COLUMN */}

                    <aside className="min-w-0 space-y-5">
                        {/* PARTICIPANTS */}

                        <Card>
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-sm">
                                        Participants
                                    </CardTitle>

                                    <Badge variant="outline">
                                        {
                                            participantSummary.active
                                        }
                                        /
                                        {
                                            participantSummary.total
                                        }{" "}
                                        active
                                    </Badge>
                                </div>
                            </CardHeader>

                            <CardContent className="space-y-3">
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="rounded-lg border p-2 text-center">
                                        <div className="text-lg font-bold">
                                            {
                                                participantSummary.total
                                            }
                                        </div>

                                        <div className="text-[10px] text-muted-foreground">
                                            Joined
                                        </div>
                                    </div>

                                    <div className="rounded-lg border p-2 text-center">
                                        <div className="text-lg font-bold text-green-600">
                                            {
                                                participantSummary.active
                                            }
                                        </div>

                                        <div className="text-[10px] text-muted-foreground">
                                            Active
                                        </div>
                                    </div>

                                    <div className="rounded-lg border p-2 text-center">
                                        <div className="text-lg font-bold text-muted-foreground">
                                            {
                                                participantSummary.inactive
                                            }
                                        </div>

                                        <div className="text-[10px] text-muted-foreground">
                                            Inactive
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between rounded-lg border p-3">
                                    <div>
                                        <p className="text-sm font-medium">
                                            Late joining
                                        </p>

                                        <p className="text-xs text-muted-foreground">
                                            {session.allow_late_join
                                                ? "New students can join"
                                                : "Joining is locked"}
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

                                <div className="max-h-56 space-y-1 overflow-y-auto pr-1">
                                    {participants.length ===
                                        0 ? (
                                        <p className="py-4 text-center text-xs text-muted-foreground">
                                            No participants yet.
                                        </p>
                                    ) : (
                                        participants.map(
                                            (
                                                participant,
                                            ) => {
                                                const isActive =
                                                    !participant.left_at &&
                                                    Date.now() -
                                                    new Date(
                                                        participant.last_seen_at,
                                                    ).getTime() <=
                                                    activeParticipantThresholdMs;

                                                return (
                                                    <div
                                                        key={
                                                            participant.id
                                                        }
                                                        className="flex items-center justify-between rounded-lg border px-3 py-2"
                                                    >
                                                        <div className="min-w-0">
                                                            <p className="truncate text-sm font-medium">
                                                                {participant.is_anonymous
                                                                    ? "Anonymous participant"
                                                                    : participant.name ??
                                                                    "Unnamed participant"}
                                                            </p>

                                                            <p className="text-xs text-muted-foreground">
                                                                {participant.is_anonymous
                                                                    ? "Anonymous"
                                                                    : `Roll ${participant.roll_number ??
                                                                    "—"
                                                                    }`}
                                                            </p>
                                                        </div>

                                                        <div className="flex items-center gap-2">
                                                            <span
                                                                className={[
                                                                    "h-2 w-2 rounded-full",
                                                                    isActive
                                                                        ? "bg-green-500"
                                                                        : "bg-slate-300",
                                                                ].join(" ")}
                                                            />

                                                            <span className="text-[10px] text-muted-foreground">
                                                                {isActive
                                                                    ? "Active"
                                                                    : "Away"}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            },
                                        )
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* QUESTION QUEUE */}

                        <Card>
                            <CardHeader className="border-b">
                                <CardTitle>
                                    Question Queue
                                </CardTitle>

                                <p className="text-sm text-muted-foreground">
                                    Select any question to make
                                    it live.
                                </p>
                            </CardHeader>

                            <CardContent className="max-h-[420px] space-y-3 overflow-y-auto p-3">
                                {questions.map(
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

                                        return (
                                            <div
                                                key={
                                                    question.id
                                                }
                                                className={`rounded-xl border p-3 transition ${isActive
                                                    ? "border-indigo-500 bg-indigo-50 shadow-sm dark:bg-indigo-950/30"
                                                    : "hover:bg-slate-50 dark:hover:bg-slate-900"
                                                    }`}
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold dark:bg-slate-800">
                                                        Q
                                                        {index +
                                                            1}
                                                    </div>

                                                    <div className="min-w-0 flex-1">
                                                        <p className="line-clamp-2 text-sm font-semibold">
                                                            {
                                                                question.text
                                                            }
                                                        </p>

                                                        <div className="mt-2 flex flex-wrap items-center gap-2">
                                                            <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-medium dark:bg-slate-800">
                                                                {question.type ===
                                                                    "multiple_choice"
                                                                    ? "MCQ"
                                                                    : question.type}
                                                            </span>

                                                            <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-medium dark:bg-slate-800">
                                                                {
                                                                    responseCount
                                                                }{" "}
                                                                responses
                                                            </span>

                                                            {question.status ===
                                                                "closed" && (
                                                                    <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-medium dark:bg-slate-800">
                                                                        Closed
                                                                    </span>
                                                                )}

                                                            {question.source_question_id ===
                                                                null && (
                                                                    <span className="rounded-full bg-indigo-50 px-2 py-1 text-[10px] font-medium text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
                                                                        Session
                                                                    </span>
                                                                )}
                                                        </div>

                                                        <Button
                                                            size="sm"
                                                            className="mt-3 w-full"
                                                            variant={
                                                                isActive
                                                                    ? "default"
                                                                    : "outline"
                                                            }
                                                            disabled={
                                                                isUpdating ||
                                                                isActive
                                                            }
                                                            onClick={() =>
                                                                void pushQuestionLive(
                                                                    question,
                                                                )
                                                            }
                                                        >
                                                            {isActive
                                                                ? "Live Now"
                                                                : "Push Live"}
                                                        </Button>
                                                        {question.status !== "active" && (
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() =>
                                                                    startEditingQuestion(
                                                                        question,
                                                                    )
                                                                }
                                                            >
                                                                Edit
                                                            </Button>
                                                        )}
                                                        {question.status !== "active" && (
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                disabled={isUpdating}
                                                                onClick={() =>
                                                                    void deleteSessionQuestion(
                                                                        question,
                                                                    )
                                                                }
                                                            >
                                                                Delete
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    },
                                )}

                                {questions.length ===
                                    0 && (
                                        <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                                            No questions found.
                                        </div>
                                    )}
                            </CardContent>
                        </Card>

                        {/* LIVE RESPONSES */}

                        <Card>
                            <CardHeader className="border-b">
                                <CardTitle>
                                    Live Responses
                                </CardTitle>

                                <p className="text-sm text-muted-foreground">
                                    Student answers for the
                                    current question.
                                </p>
                            </CardHeader>

                            <CardContent className="max-h-[520px] overflow-y-auto p-3">
                                {!activeQuestion ? (
                                    <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                                        No active question.
                                    </div>
                                ) : activeResponses.length ===
                                    0 ? (
                                    <div className="rounded-xl border border-dashed p-6 text-center">
                                        <p className="font-semibold">
                                            Waiting for responses
                                        </p>

                                        <p className="mt-1 text-xs text-muted-foreground">
                                            New answers will appear
                                            here in real time.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {activeResponses.map(
                                            (
                                                response,
                                                index,
                                            ) => {
                                                const participant =
                                                    response.participant;

                                                const displayName =
                                                    participant?.is_anonymous
                                                        ? `Anonymous ${index +
                                                        1
                                                        }`
                                                        : participant?.name ??
                                                        `Participant ${index +
                                                        1
                                                        }`;

                                                const roll =
                                                    participant?.roll_number !==
                                                        null &&
                                                        participant?.roll_number !==
                                                        undefined
                                                        ? `Roll ${participant.roll_number}`
                                                        : null;

                                                const isUpdated =
                                                    response.updated_at !==
                                                    response.submitted_at;

                                                return (
                                                    <div
                                                        key={
                                                            response.id
                                                        }
                                                        className="rounded-xl border p-3"
                                                    >
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div className="min-w-0">
                                                                <p className="truncate text-sm font-semibold">
                                                                    {
                                                                        displayName
                                                                    }
                                                                </p>

                                                                {roll && (
                                                                    <p className="text-[11px] text-muted-foreground">
                                                                        {roll}
                                                                    </p>
                                                                )}
                                                            </div>

                                                            <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-medium dark:bg-slate-800">
                                                                {isUpdated
                                                                    ? "Updated"
                                                                    : "Submitted"}
                                                            </span>
                                                        </div>

                                                        <div className="mt-2 rounded-lg bg-slate-50 p-3 text-sm font-semibold dark:bg-slate-900">
                                                            {typeof response.answer ===
                                                                "string"
                                                                ? response.answer
                                                                : JSON.stringify(
                                                                    response.answer,
                                                                )}
                                                        </div>

                                                        <p className="mt-2 text-[10px] text-muted-foreground">
                                                            {new Date(
                                                                response.updated_at,
                                                            ).toLocaleTimeString()}
                                                        </p>
                                                    </div>
                                                );
                                            },
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </aside>
                </div>
            </div>
        </main>
    );
}