"use client";

import {
    useCallback,
    useMemo,
    useState,
} from "react";

import { useParams, useRouter } from "next/navigation";

import {
    AlertTriangle,
    ArrowLeft,
    CheckCircle2,
    Settings2,
} from "lucide-react";

import { Button } from "@/components/ui/button";

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
        analyticsError ??
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
                if (!session?.id) {
                    return;
                }

                try {
                    await updateSession({
                        active_question_id:
                            questionId,
                    });

                    showNotice(
                        "success",
                        questionId
                            ? "The active question has been updated."
                            : "There is no active question now.",
                        "Live Session Updated",
                    );
                } catch (error) {
                    showNotice(
                        "error",
                        error instanceof Error
                            ? error.message
                            : "Unable to update the active question.",
                        "Update Failed",
                    );
                }
            },
            [
                session?.id,
                showNotice,
                updateSession,
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
        <div className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-50">
            <LiveStudioHeader
                session={session}
                activeQuestion={
                    activeQuestion
                }
                totalParticipants={
                    totalParticipants
                }
                onlineParticipants={
                    onlineParticipants
                }
                onBack={handleBack}
                onOpenSettings={() =>
                    setSettingsOpen(true)
                }
                onRefresh={() => {
                    void handleRefreshAll();
                }}
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
                        session={session}
                        questions={questions}
                        activeQuestion={
                            activeQuestion
                        }
                        responses={
                            activeQuestionResponses
                        }
                        totalResponses={
                            totalResponses
                        }
                        totalParticipants={
                            totalParticipants
                        }
                        isLoading={
                            areQuestionsLoading ||
                            areResponsesLoading
                        }
                        onSetActiveQuestion={
                            handleSetActiveQuestion
                        }
                        onSelectQuestion={
                            handleSelectQuestion
                        }
                    />
                ) : null}

                {activeTab ===
                "questions" ? (
                    <QuestionsWorkspace
                        questions={questions}
                        selectedQuestion={
                            selectedQuestion
                        }
                        activeQuestionId={
                            session.active_question_id ??
                            null
                        }
                        isLoading={
                            areQuestionsLoading
                        }
                        isSaving={
                            areQuestionsSaving
                        }
                        onSelectQuestion={(
                            question,
                        ) =>
                            setSelectedQuestionId(
                                question.id,
                            )
                        }
                        onCreateQuestion={
                            handleCreateQuestion
                        }
                        onUpdateQuestion={
                            handleUpdateQuestion
                        }
                        onDeleteQuestion={
                            handleDeleteQuestion
                        }
                        onReorderQuestions={
                            handleReorderQuestions
                        }
                        onSetActiveQuestion={
                            handleSetActiveQuestion
                        }
                    />
                ) : null}

                {activeTab ===
                "participants" ? (
                    <ParticipantsWorkspace
                        participants={
                            participants
                        }
                        totalParticipants={
                            totalParticipants
                        }
                        onlineParticipants={
                            onlineParticipants
                        }
                        isLoading={
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