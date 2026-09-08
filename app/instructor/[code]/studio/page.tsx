"use client";

import {
    useCallback,
    useMemo,
    useState,
    useEffect,
} from "react";

import { useParams, useRouter } from "next/navigation";

import {
    AlertTriangle,
    ArrowLeft,
    CheckCircle2,
    Settings2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

import {
    AnalyticsWorkspace,
} from "@/components/live-studio/analytics-workspace";

import {
    LiveQuestionWorkspace,
} from "@/components/live-studio/live-question-workspace";

import {
    LiveStudioHeader,
} from "@/components/live-studio/live-studio-header";

import {
    LiveStudioTabs,
} from "@/components/live-studio/live-studio-tabs";

import {
    ParticipantsWorkspace,
} from "@/components/live-studio/participants-workspace";

import {
    QuestionsWorkspace,
} from "@/components/live-studio/questions-workspace";

import {
    SessionSettingsDrawer,
} from "@/components/live-studio/session-settings-drawer";

import {
    StudioErrorState,
} from "@/components/live-studio/studio-error-state";

import {
    StudioLoadingState,
} from "@/components/live-studio/studio-loading-state";

import {
    StudioNotice,
    type StudioNoticeType,
} from "@/components/live-studio/studio-notice";

import type {
    LiveSession,
    SessionQuestion,
    StudioTab
} from "@/components/live-studio/live-studio-types";

import {
    useLiveSession,
} from "@/hooks/live-studio/use-live-session";

import {
    useSessionAnalytics,
} from "@/hooks/live-studio/use-session-analytics";

import {
    useSessionParticipants,
} from "@/hooks/live-studio/use-session-participants";

import {
    useSessionQuestions,
} from "@/hooks/live-studio/use-session-questions";

import {
    useSessionResponses,
} from "@/hooks/live-studio/use-session-responses";

interface NoticeState {
    type: StudioNoticeType;

    title?: string;

    message: string;
}

export default function LiveStudioPage() {
    const params = useParams();

    const router = useRouter();

    const sessionCode = useMemo(() => {
        const value =
            params?.code;

        if (Array.isArray(value)) {
            return value[0] ?? "";
        }

        return value ?? "";
    }, [params]);

    const [activeTab, setActiveTab] =
        useState<
    "live" |
    "questions" |
    "participants" |
    "analytics"
>("live");

    const [
        settingsOpen,
        setSettingsOpen,
    ] = useState(false);

    const [
        selectedQuestionId,
        setSelectedQuestionId,
    ] = useState<string | null>(
        null,
    );

    const [
        isSettingsSaving,
        setIsSettingsSaving,
    ] = useState(false);

    const [notice, setNotice] =
        useState<NoticeState | null>(
            null,
        );

    const [pendingLiveQuestion, setPendingLiveQuestion] =
        useState<SessionQuestion | null>(null);

    const [pendingProjectorQuestion, setPendingProjectorQuestion] =
        useState<SessionQuestion | null>(null);

    const [pendingResultsQuestion, setPendingResultsQuestion] =
        useState<SessionQuestion | null>(null);

    const [pendingResultsTarget, setPendingResultsTarget] =
        useState<"students" | "both">("students");

    const [viewedQuestionId, setViewedQuestionId] =
        useState<string | null>(null);

    const {
        session,
        isLoading: isSessionLoading,
        error: sessionError,
        refetch: refetchSession,
        updateSession,
    } = useLiveSession({
        sessionCode,
    });

    const {
        questions,
        isLoading: areQuestionsLoading,
        isSaving: areQuestionsSaving,
        error: questionsError,
        refetch: refetchQuestions,
        createQuestion,
        updateQuestion,
        deleteQuestion,
        reorderQuestions,
    } = useSessionQuestions({
        sessionId:
            session?.id ?? null,
    });

    const {
        participants,
        totalParticipants,
        onlineParticipants,
        isLoading: areParticipantsLoading,
        error: participantsError,
        refetch: refetchParticipants,
    } = useSessionParticipants({
        sessionId:
            session?.id ?? null,

        realtime: true,
    });

    const {
        responses,
        activeQuestionResponses,
        totalResponses,
        isLoading: areResponsesLoading,
        error: responsesError,
        refetch: refetchResponses,
    } = useSessionResponses({
        sessionId:
            session?.id ?? null,

        activeQuestionId:
            session?.active_question_id ??
            null,

        realtime: true,
    });

    const {
        analytics,
        isLoading: areAnalyticsLoading,
        isUpdating: areAnalyticsUpdating,
        error: analyticsError,
        refetch: refetchAnalytics,
    } = useSessionAnalytics({
        sessionId:
            session?.id ?? null,

        enabled: Boolean(
            session?.id,
        ),

        refreshInterval: 10000,
    });

    const activeQuestion =
        useMemo(() => {
            const activeQuestionId =
                session?.active_question_id;

            if (!activeQuestionId) {
                return null;
            }

            return (
                questions.find(
                    (question) =>
                        question.id ===
                        activeQuestionId,
                ) ?? null
            );
        }, [
            questions,
            session?.active_question_id,
        ]);

    const viewedQuestion =
        useMemo(() => {
            if (!viewedQuestionId) {
                return null;
            }

            return (
                questions.find(
                    (question) =>
                        question.id ===
                        viewedQuestionId,
                ) ?? null
            );
        }, [
            questions,
            viewedQuestionId,
        ]);

    useEffect(() => {
        if (
            viewedQuestionId ||
            !session?.active_question_id
        ) {
            return;
        }

        setViewedQuestionId(
            session.active_question_id,
        );
    }, [
        session?.active_question_id,
        viewedQuestionId,
    ]);

    const selectedQuestion =
        useMemo(() => {
            if (
                !selectedQuestionId
            ) {
                return null;
            }

            return (
                questions.find(
                    (question) =>
                        question.id ===
                        selectedQuestionId,
                ) ?? null
            );
        }, [
            questions,
            selectedQuestionId,
        ]);

    const isInitialLoading =
        isSessionLoading ||
        (Boolean(session?.id) &&
            areQuestionsLoading);

    const primaryError =
    sessionError ??
    questionsError ??
    participantsError ??
    responsesError ??
    null;

    const showNotice = useCallback(
        (
            type: StudioNoticeType,
            message: string,
            title?: string,
        ) => {
            setNotice({
                type,
                title,
                message,
            });
        },
        [],
    );

    const handleRefreshAll =
        useCallback(async () => {
            try {
                await Promise.all([
                    refetchSession(),
                    refetchQuestions(),
                    refetchParticipants(),
                    refetchResponses(),
                    refetchAnalytics(),
                ]);

                showNotice(
                    "success",
                    "Session data has been refreshed.",
                    "Updated",
                );
            } catch {
                showNotice(
                    "error",
                    "Unable to refresh all session data.",
                    "Refresh Failed",
                );
            }
        }, [
            refetchAnalytics,
            refetchParticipants,
            refetchQuestions,
            refetchResponses,
            refetchSession,
            showNotice,
        ]);

    const handleBack = useCallback(() => {
        router.back();
    }, [router]);

    const handlePauseSession = useCallback(async () => {
        if (!session || session.status === "completed") return;
        try {
            await updateSession({
                status: "paused",
                paused_at: new Date().toISOString(),
            });
            showNotice("success", "The session is paused. Participants cannot submit responses until it is resumed.", "Session Paused");
        } catch (error) {
            showNotice("error", error instanceof Error ? error.message : "Unable to pause the session.", "Update Failed");
        }
    }, [session, updateSession, showNotice]);

    const handleResumeSession = useCallback(async () => {
        if (!session || session.status === "completed") return;
        try {
            await updateSession({
                status: "live",
                paused_at: null,
            });
            showNotice("success", "The session is live again and can accept responses.", "Session Resumed");
        } catch (error) {
            showNotice("error", error instanceof Error ? error.message : "Unable to resume the session.", "Update Failed");
        }
    }, [session, updateSession, showNotice]);

    const handleEndSession = useCallback(async () => {
        if (!session || session.status === "completed") return;
        const confirmed = window.confirm(
            "End this session? Participants will no longer be able to submit responses. You can still reopen this Studio later to review all collected data.",
        );
        if (!confirmed) return;

        const now = new Date().toISOString();
        try {
            if (session.active_question_id) {
                await updateQuestion(session.active_question_id, {
                    status: "closed",
                    closed_at: now,
                });
            }

            await updateSession({
                status: "completed",
                ended_at: now,
                active_question_id: null,
                student_display_type: "waiting",
                student_question_id: null,
                projector_display_type: "waiting",
                projector_question_id: null,
            });

            showNotice("success", "The session has ended. It is now available in review mode only.", "Session Ended");
        } catch (error) {
            showNotice("error", error instanceof Error ? error.message : "Unable to end the session.", "End Failed");
        }
    }, [session, updateQuestion, updateSession, showNotice]);

    const handleTabChange =
        useCallback(
            (tab: StudioTab) => {
                setActiveTab(tab);

                if (
                    tab !== "questions"
                ) {
                    setSelectedQuestionId(
                        null,
                    );
                }
            },
            [],
        );

    const handleSelectQuestion =
        useCallback(
            (
                question: SessionQuestion,
            ) => {
                setSelectedQuestionId(
                    question.id,
                );

                setActiveTab(
                    "questions",
                );
            },
            [],
        );

    const handleSetActiveQuestion =
    useCallback(
        async (
            questionId: string | null,
        ) => {
            if (!session?.id || session.status === "completed") {
                if (session?.status === "completed") {
                    showNotice("error", "This session has ended and is now in review mode.", "Session Ended");
                }
                return;
            }

            try {
                if (questionId) {
                    const now =
                        new Date().toISOString();

                    // Close any other active questions through
                    // the hook so local state stays in sync without
                    // forcing a full questions refetch.
                    const otherActiveQuestions =
                        questions.filter(
                            (question) =>
                                question.id !==
                                    questionId &&
                                question.status ===
                                    "active",
                        );

                    await Promise.all(
                        otherActiveQuestions.map(
                            (question) =>
                                updateQuestion(
                                    question.id,
                                    {
                                        status: "closed",
                                        closed_at: now,
                                    },
                                ),
                        ),
                    );

                    // Update the session pointer first so the
                    // student-facing app immediately has one
                    // authoritative live question.
                    await updateSession({
                        status: "live",
                        active_question_id:
                            questionId,
                        student_display_type: "question",
                        student_question_id: questionId,
                        projector_display_type:
                            "question",
                        projector_question_id:
                            questionId,
                        started_at:
                            session.started_at ??
                            now,
                    });

                    // Then activate the selected question.
                    await updateQuestion(
                        questionId,
                        {
                            status: "active",
                            activated_at: now,
                            closed_at: null,
                        },
                    );

                    // Keep the newly live question in view.
                    setViewedQuestionId(questionId);

                    showNotice(
                        "success",
                        "The question is now live.",
                        "Question Live",
                    );
                } else {
                    const currentActiveId =
                        session.active_question_id;

                    if (currentActiveId) {
                        await updateQuestion(
                            currentActiveId,
                            {
                                status: "closed",
                                closed_at:
                                    new Date().toISOString(),
                            },
                        );
                    }

                    // Closing a question must remove it from both
                    // participant and projector views. Otherwise the
                    // student-facing display can keep rendering the last
                    // student_question_id even though the question is closed.
                    await updateSession({
                        active_question_id: null,
                        student_display_type: "waiting",
                        student_question_id: null,
                        projector_display_type:
                            "waiting",
                        projector_question_id: null,
                    });

                    showNotice(
                        "success",
                        "The active question has been closed.",
                        "Question Closed",
                    );
                }
            } catch (error) {
                showNotice(
                    "error",
                    error instanceof Error
                        ? error.message
                        : "Unable to change the live question.",
                    "Update Failed",
                );
            }
        },
        [
            session?.id,
            session?.active_question_id,
            session?.started_at,
            session?.status,
            questions,
            showNotice,
            updateQuestion,
            updateSession,
        ],
    );

    const showResultsToStudents =
        useCallback(
            async (
                question: SessionQuestion,
                options?: {
                    closeQuestion?: boolean;
                    showOnProjector?: boolean;
                },
            ) => {
                const now =
                    new Date().toISOString();

                // A student-facing result replaces any
                // previously visible student result.
                await Promise.all(
                    questions
                        .filter(
                            (item) =>
                                item.id !== question.id &&
                                item.results_visible === true,
                        )
                        .map((item) =>
                            updateQuestion(
                                item.id,
                                {
                                    results_visible: false,
                                },
                            ),
                        ),
                );

                if (options?.closeQuestion) {
                    await updateQuestion(
                        question.id,
                        {
                            status: "closed",
                            closed_at: now,
                            results_visible: true,
                        },
                    );

                    await updateSession({
                        active_question_id: null,
                        student_display_type: "results",
                        student_question_id: question.id,
                        ...(options.showOnProjector
                            ? {
                                  projector_display_type:
                                      "results" as const,
                                  projector_question_id:
                                      question.id,
                              }
                            : {}),
                    });
                } else {
                    await updateQuestion(
                        question.id,
                        {
                            results_visible: true,
                        },
                    );

                    await updateSession({
                        student_display_type: "results",
                        student_question_id: question.id,
                    });

                    if (options?.showOnProjector) {
                        await updateSession({
                            projector_display_type:
                                "results",
                            projector_question_id:
                                question.id,
                        });
                    }
                }

                showNotice(
                    "success",
                    options?.closeQuestion
                        ? "The question was closed and results are now visible."
                        : "Results are now visible to students.",
                    "Results Shown",
                );
            },
            [
                questions,
                showNotice,
                updateQuestion,
                updateSession,
            ],
        );

    const handleRequestShowResults =
        useCallback(
            (target?: "students" | "both") => {
                const resolvedTarget =
                    target ??
                    (session?.default_result_visibility === "both"
                        ? "both"
                        : "students");
                if (!viewedQuestion) {
                    return;
                }

                setPendingResultsTarget(resolvedTarget);

                if (activeQuestion) {
                    setPendingResultsQuestion(viewedQuestion);
                    return;
                }

                void showResultsToStudents(
                    viewedQuestion,
                    {
                        closeQuestion: true,
                        showOnProjector: resolvedTarget === "both",
                    },
                );
            },
            [
                activeQuestion,
                session?.default_result_visibility,
                showResultsToStudents,
                viewedQuestion,
            ],
        );

    const handleSaveSettings =
        useCallback(
            async (
                updates: Partial<LiveSession>,
            ) => {
                setIsSettingsSaving(
                    true,
                );

                try {
                    await updateSession(
                        updates,
                    );

                    setSettingsOpen(
                        false,
                    );

                    showNotice(
                        "success",
                        "Session settings have been saved successfully.",
                        "Settings Saved",
                    );
                } catch (error) {
                    showNotice(
                        "error",
                        error instanceof Error
                            ? error.message
                            : "Unable to save session settings.",
                        "Save Failed",
                    );

                    throw error;
                } finally {
                    setIsSettingsSaving(
                        false,
                    );
                }
            },
            [
                showNotice,
                updateSession,
            ],
        );

    const handleCreateQuestion =
        useCallback(
            async (
                question: Partial<SessionQuestion>,
            ) => {
                try {
                    const newQuestion =
                        await createQuestion(
                            question,
                        );

                    setSelectedQuestionId(
                        newQuestion.id,
                    );

                    showNotice(
                        "success",
                        "A new question has been added to the session.",
                        "Question Created",
                    );

                    return newQuestion;
                } catch (error) {
                    showNotice(
                        "error",
                        error instanceof Error
                            ? error.message
                            : "Unable to create the question.",
                        "Creation Failed",
                    );

                    throw error;
                }
            },
            [
                createQuestion,
                showNotice,
            ],
        );

    const handleUpdateQuestion =
        useCallback(
            async (
                questionId: string,
                updates: Partial<SessionQuestion>,
            ) => {
                try {
                    const updatedQuestion =
                        await updateQuestion(
                            questionId,
                            updates,
                        );

                    showNotice(
                        "success",
                        "Question changes have been saved.",
                        "Question Updated",
                    );

                    return updatedQuestion;
                } catch (error) {
                    showNotice(
                        "error",
                        error instanceof Error
                            ? error.message
                            : "Unable to update the question.",
                        "Update Failed",
                    );

                    throw error;
                }
            },
            [
                showNotice,
                updateQuestion,
            ],
        );

    const handleDeleteQuestion =
        useCallback(
            async (
                questionId: string,
            ) => {
                const isActiveQuestion =
                    session?.active_question_id ===
                    questionId;

                try {
                    if (isActiveQuestion) {
                        await updateSession({
                            active_question_id:
                                null,
                        });
                    }

                    await deleteQuestion(
                        questionId,
                    );

                    if (
                        selectedQuestionId ===
                        questionId
                    ) {
                        setSelectedQuestionId(
                            null,
                        );
                    }

                    showNotice(
                        "success",
                        "The question has been deleted.",
                        "Question Deleted",
                    );
                } catch (error) {
                    showNotice(
                        "error",
                        error instanceof Error
                            ? error.message
                            : "Unable to delete the question.",
                        "Deletion Failed",
                    );

                    throw error;
                }
            },
            [
                deleteQuestion,
                selectedQuestionId,
                session?.active_question_id,
                showNotice,
                updateSession,
            ],
        );

    const handleReorderQuestions =
        useCallback(
            async (
                reorderedQuestions: SessionQuestion[],
            ) => {
                try {
                    await reorderQuestions(
                        reorderedQuestions,
                    );

                    showNotice(
                        "success",
                        "Question order has been updated.",
                        "Questions Reordered",
                    );
                } catch (error) {
                    showNotice(
                        "error",
                        error instanceof Error
                            ? error.message
                            : "Unable to reorder questions.",
                        "Reorder Failed",
                    );

                    throw error;
                }
            },
            [
                reorderQuestions,
                showNotice,
            ],
        );

    if (isInitialLoading) {
        return (
            <StudioLoadingState />
        );
    }

    if (!session || sessionError) {
        return (
            <StudioErrorState
                error={sessionError}
                onRetry={() => {
                    void handleRefreshAll();
                }}
                onBack={handleBack}
            />
        );
    }

    return (
        <div className="relative min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-50">
            <div className="fixed right-4 top-4 z-50">
                <ThemeToggle />
            </div>
            <LiveStudioHeader
    session={session}
    participantCount={totalParticipants}
    activeParticipantCount={onlineParticipants}
    onBack={handleBack}
    onOpenProjector={() => {
        router.push(
            `/instructor/${session.join_code}/projector`,
        );
    }}
    onOpenSettings={() =>
        setSettingsOpen(true)
    }
    isUpdating={isSettingsSaving}
    onPauseSession={handlePauseSession}
    onResumeSession={handleResumeSession}
    onEndSession={handleEndSession}
/>
            <LiveStudioTabs
    activeTab={activeTab}
    onTabChange={handleTabChange}
    questionCount={questions.length}
    participantCount={totalParticipants}
/>

            <main>
                {notice ? (
                    <div className="mx-auto max-w-[1600px] px-4 pt-4 sm:px-6 lg:px-8">
                        <StudioNotice
                            type={notice.type}
                            title={
                                notice.title
                            }
                            message={
                                notice.message
                            }
                            onClose={() =>
                                setNotice(
                                    null,
                                )
                            }
                        />
                    </div>
                ) : null}

                {primaryError &&
                !sessionError ? (
                    <div className="mx-auto max-w-[1600px] px-4 pt-4 sm:px-6 lg:px-8">
                        <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />

                                <div>
                                    <p className="text-sm font-bold">
                                        Some live data could not be loaded
                                    </p>

                                    <p className="mt-1 text-xs leading-5 text-amber-800/80 dark:text-amber-300/80">
                                        {
                                            primaryError.message
                                        }
                                    </p>
                                </div>
                            </div>

                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                    void handleRefreshAll();
                                }}
                                className="border-amber-200 bg-white dark:border-amber-900/50 dark:bg-slate-950"
                            >
                                Try Again
                            </Button>
                        </div>
                    </div>
                ) : null}

                {activeTab === "live" ? (
                    <LiveQuestionWorkspace
    sessionId={session.id}
    questions={questions}
    defaultResultVisibility={
        session.default_result_visibility ?? "both"
    }
    projectorResultsQuestionId={
        session.projector_display_type ===
        "results"
            ? session.projector_question_id
            : null
    }
    projectorDisplayType={session.projector_display_type}
    projectorVisualizationType={
        session.projector_visualization_type ??
        "horizontal-bar"
    }
    onProjectorVisualizationChange={async (
        visualization,
    ) => {
        await updateSession({
            projector_visualization_type:
                visualization,
        });

        showNotice(
            "success",
            "Projector visualization updated.",
            "Visualization Updated",
        );
    }}
    isSavingQuestion={areQuestionsSaving}
    onCreateQuestion={async (question) => {
        await handleCreateQuestion(question);
    }}
    onUpdateQuestion={async (questionId, updates) => {
        await handleUpdateQuestion(questionId, updates);
    }}
    projectorQuestion={
        questions.find((question) => question.id === session.projector_question_id) ?? null
    }
    viewedQuestion={viewedQuestion}
    activeQuestion={activeQuestion}
    responses={responses}
    participants={participants}
    questionAnalytics={
    analytics?.questions?.find(
        (item) =>
            item.question_id ===
            viewedQuestion?.id,
    )
        ? {
              questionId:
                  viewedQuestion?.id ?? "",
              totalResponses:
                  analytics.questions.find(
                      (item) =>
                          item.question_id ===
                          viewedQuestion?.id,
                  )?.total_responses ?? 0,
              uniqueResponders:
                  analytics.questions.find(
                      (item) =>
                          item.question_id ===
                          viewedQuestion?.id,
                  )?.response_count ?? 0,
              participationRate:
                  analytics.questions.find(
                      (item) =>
                          item.question_id ===
                          viewedQuestion?.id,
                  )?.response_rate ?? 0,
              averageResponseTimeMs:
                  null,
              medianResponseTimeMs:
                  null,
              dominantOption:
                  null,
              dominantOptionPercentage:
                  0,
              optionDistribution:
    analytics.questions.find(
        (item) =>
            item.question_id ===
            viewedQuestion?.id,
    )?.distribution?.map(
        (item) => ({
            key: item.id,
            label: item.label,
            count: item.count,
            percentage:
                item.percentage,
        }),
    ) ?? [],
          }
        : null
}
    isUpdating={
        areQuestionsSaving
    }
    onActivateQuestion={async (
        question,
    ) => {
        await handleSetActiveQuestion(
            question.id,
        );
    }}
    onViewQuestion={(question) => {
        setViewedQuestionId(question.id);
    }}
    onCloseQuestion={async () => {
        await handleSetActiveQuestion(
            null,
        );
    }}
    onShowResults={(target) => {
        if (target === "projector") {
            if (!viewedQuestion) return;

            if (
                session.projector_display_type !== "waiting" &&
                session.projector_question_id !== viewedQuestion.id &&
                !window.confirm(
                    "The projector is displaying another item. Replace it with this question's results?",
                )
            ) {
                return;
            }

            void updateSession({
                projector_display_type: "results",
                projector_question_id: viewedQuestion.id,
            });
            return;
        }

        void handleRequestShowResults(
            target === "both" ? "both" : "students",
        );
    }}
    onRequestShowResults={() => {
        void handleRequestShowResults();
    }}
    onHideProjectorResults={async () => {
        await updateSession({
            projector_display_type:
                "waiting",
            projector_question_id: null,
        });

        showNotice(
            "success",
            "Results are no longer displayed on the projector.",
            "Projector Updated",
        );
    }}
    onHideResults={async () => {
        if (!viewedQuestion) {
            return;
        }

        await updateQuestion(
            viewedQuestion.id,
            {
                results_visible: false,
                results_mode:
                    viewedQuestion.results_mode === "live"
                        ? "hidden"
                        : viewedQuestion.results_mode,
            },
        );

        await updateSession({
            ...(session.student_display_type === "results" &&
            session.student_question_id === viewedQuestion.id
                ? {
                      student_display_type: "waiting" as const,
                      student_question_id: null,
                  }
                : {}),
            ...(session.projector_display_type === "results" &&
            session.projector_question_id === viewedQuestion.id
                ? {
                      projector_display_type: "waiting" as const,
                      projector_question_id: null,
                  }
                : {}),
        });

        showNotice(
            "success",
            "Results are now hidden from students and the projector.",
            "Results Hidden Everywhere",
        );
    }}
    onShowResultsOnProjector={async () => {
        if (!viewedQuestion) return;

        if (
            session.projector_display_type !== "waiting" &&
            session.projector_question_id !== viewedQuestion.id
        ) {
            const confirmed = window.confirm(
                "The projector is displaying another item. Replace it with this question's results?",
            );

            if (!confirmed) return;
        }

        await updateSession({
            projector_display_type: "results",
            projector_question_id: viewedQuestion.id,
        });

        showNotice(
            "success",
            "Results are now displayed on the projector.",
            "Projector Updated",
        );
    }}
    onShowResultsOnBoth={() => {
        void handleRequestShowResults("both");
    }}
    onConfirmReplaceLiveQuestion={(question) => {
        setPendingLiveQuestion(question);
    }}
/>
                ) : null}

                {activeTab ===
                "questions" ? (
                    <QuestionsWorkspace
    sessionId={session.id}
    questions={questions}
    activeQuestion={activeQuestion}
    isSaving={
        areQuestionsSaving
    }
    isUpdating={
        areQuestionsSaving
    }
    onCreateQuestion={
        async (question) => {
            await handleCreateQuestion(
                question,
            );
        }
    }
    onUpdateQuestion={
        async (
            questionId,
            updates,
        ) => {
            await handleUpdateQuestion(
                questionId,
                updates,
            );
        }
    }
    onDeleteQuestion={
        async (question) => {
            await handleDeleteQuestion(
                question.id,
            );
        }
    }
    onActivateQuestion={
        async (question) => {
            await handleSetActiveQuestion(
                question.id,
            );
        }
    }
    onReorderQuestions={
        handleReorderQuestions
    }
/>
                ) : null}

                {activeTab ===
                "participants" ? (
                    <ParticipantsWorkspace
    participants={
        participants
    }
    isUpdating={
        areParticipantsLoading
    }
/>
                ) : null}

                {activeTab ===
                "analytics" ? (
                    <AnalyticsWorkspace
                        analytics={analytics}
                        questions={questions}
                        isLoading={
                            areAnalyticsLoading
                        }
                        isUpdating={
                            areAnalyticsUpdating
                        }
                    />
                ) : null}
            </main>

            {pendingLiveQuestion ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-[2px] animate-in fade-in duration-200">
                    <div className="w-full max-w-md animate-in zoom-in-95 slide-in-from-bottom-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl duration-200 dark:border-slate-800 dark:bg-slate-950">
                        <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                                <AlertTriangle className="h-5 w-5" />
                            </div>

                            <div>
                                <h2 className="text-base font-bold">
                                    Replace live question?
                                </h2>

                                <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                                    This will close the current question and display the selected question to students.
                                </p>
                            </div>
                        </div>

                        <div className="mt-5 flex justify-end gap-2">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() =>
                                    setPendingLiveQuestion(null)
                                }
                            >
                                Cancel
                            </Button>

                            <Button
                                type="button"
                                disabled={areQuestionsSaving}
                                onClick={async () => {
                                    const question =
                                        pendingLiveQuestion;

                                    setPendingLiveQuestion(null);

                                    await handleSetActiveQuestion(
                                        question.id,
                                    );
                                }}
                            >
                                <span className="mr-2 inline-flex h-2 w-2 rounded-full bg-current" />

                                Replace & Display
                            </Button>
                        </div>
                    </div>
                </div>
            ) : null}

            {pendingResultsQuestion ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-[2px] animate-in fade-in duration-200">
                    <div className="w-full max-w-md animate-in zoom-in-95 slide-in-from-bottom-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl duration-200 dark:border-slate-800 dark:bg-slate-950">
                        <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
                                <CheckCircle2 className="h-5 w-5" />
                            </div>
                            <div>
                                <h2 className="text-base font-bold">
                                    {activeQuestion?.id === pendingResultsQuestion.id
                                        ? "Show live results?"
                                        : "Close current question?"}
                                </h2>
                                <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                                    {activeQuestion?.id === pendingResultsQuestion.id
                                        ? "You can keep the question open and show live-updating results on the projector, or close it and show the final results."
                                        : "Students are currently answering another question. To show these results, the current live question must be closed."}
                                </p>
                            </div>
                        </div>

                        <div className="mt-5 flex flex-wrap justify-end gap-2">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => {
                                    if (
                                        activeQuestion &&
                                        activeQuestion.id !==
                                            pendingResultsQuestion.id
                                    ) {
                                        setViewedQuestionId(activeQuestion.id);
                                    }
                                    setPendingResultsQuestion(null);
                                }}
                            >
                                Cancel
                            </Button>

                            {activeQuestion?.id === pendingResultsQuestion.id ? (
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled={areQuestionsSaving}
                                    onClick={async () => {
                                        const question = pendingResultsQuestion;
                                        setPendingResultsQuestion(null);

                                        await updateQuestion(
                                            question.id,
                                            {
                                                results_mode: "live",
                                                results_visible: false,
                                            },
                                        );

                                        await updateSession({
                                            student_display_type: "question",
                                            student_question_id: question.id,
                                            ...(pendingResultsTarget === "both"
                                                ? {
                                                      projector_display_type: "results" as const,
                                                      projector_question_id: question.id,
                                                  }
                                                : {}),
                                        });

                                        showNotice(
                                            "success",
                                            pendingResultsTarget === "both"
                                                ? "Live results are shown on the projector. Students will see results after answering."
                                                : "Live results are enabled. Students will see results after answering.",
                                            "Live Results",
                                        );
                                    }}
                                >
                                    Show Live
                                </Button>
                            ) : null}

                            <Button
                                type="button"
                                disabled={areQuestionsSaving}
                                onClick={async () => {
                                    const question = pendingResultsQuestion;
                                    setPendingResultsQuestion(null);

                                    if (
                                        activeQuestion &&
                                        activeQuestion.id !== question.id
                                    ) {
                                        await handleSetActiveQuestion(null);
                                        setViewedQuestionId(question.id);
                                    }

                                    await showResultsToStudents(question, {
                                        closeQuestion: true,
                                        showOnProjector:
                                            pendingResultsTarget === "both" ||
                                            activeQuestion?.id === question.id,
                                    });
                                }}
                            >
                                Close Question & Show Results
                            </Button>
                        </div>
                    </div>
                </div>
            ) : null}

            <SessionSettingsDrawer
                open={settingsOpen}
                session={session}
                isSaving={isSettingsSaving}
                onClose={() =>
                    setSettingsOpen(false)
                }
                onSave={
                    handleSaveSettings
                }
            />

            <div className="fixed bottom-4 right-4 z-30 pointer-events-none">
                {session.active_question_id ? (
                    <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-4 py-2 shadow-lg dark:border-emerald-900/50 dark:bg-slate-900">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />

                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                            Live question active
                        </span>
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={() =>
                            setSettingsOpen(true)
                        }
                        className="pointer-events-auto flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 shadow-lg transition hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-indigo-700 dark:hover:text-indigo-400"
                    >
                        <Settings2 className="h-4 w-4" />

                        Session Settings
                    </button>
                )}
            </div>
        </div>
    );
}