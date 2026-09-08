"use client";

import { useCallback, useMemo, useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { AnalyticsWorkspace } from "@/components/live-studio/analytics-workspace";
import { LiveQuestionWorkspace } from "@/components/live-studio/live-question-workspace";
import { LiveStudioHeader } from "@/components/live-studio/live-studio-header";
import { LiveStudioTabs } from "@/components/live-studio/live-studio-tabs";
import { ParticipantsWorkspace } from "@/components/live-studio/participants-workspace";
import { QuestionsWorkspace } from "@/components/live-studio/questions-workspace";
import { SessionSettingsDrawer } from "@/components/live-studio/session-settings-drawer";
import { StudioActionDialog } from "@/components/live-studio/studio-action-dialog";
import { StudioErrorState } from "@/components/live-studio/studio-error-state";
import { StudioLoadingState } from "@/components/live-studio/studio-loading-state";
import { StudioNotice, type StudioNoticeType } from "@/components/live-studio/studio-notice";
import type { LiveSession, SessionQuestion, StudioTab } from "@/components/live-studio/live-studio-types";
import { useLiveSession } from "@/hooks/live-studio/use-live-session";
import { useSessionAnalytics } from "@/hooks/live-studio/use-session-analytics";
import { useSessionParticipants } from "@/hooks/live-studio/use-session-participants";
import { useSessionQuestions } from "@/hooks/live-studio/use-session-questions";
import { useSessionResponses } from "@/hooks/live-studio/use-session-responses";
import { useLiveRecovery } from "@/hooks/use-live-recovery";

interface NoticeState { type: StudioNoticeType; title?: string; message: string; }

type ConfirmationState =
    | { type: "end-session" }
    | { type: "replace-live"; question: SessionQuestion }
    | { type: "replace-projector"; question: SessionQuestion }
    | null;

export default function LiveStudioPage() {
    const params = useParams();
    const router = useRouter();
    const sessionCode = useMemo(() => {
        const value = params?.code;
        return Array.isArray(value) ? value[0] ?? "" : value ?? "";
    }, [params]);

    const [activeTab, setActiveTab] = useState<StudioTab>("live");
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
    const [isSettingsSaving, setIsSettingsSaving] = useState(false);
    const [notice, setNotice] = useState<NoticeState | null>(null);
    const [confirmation, setConfirmation] = useState<ConfirmationState>(null);
    const [isConfirming, setIsConfirming] = useState(false);
    const [pendingResultsQuestion, setPendingResultsQuestion] = useState<SessionQuestion | null>(null);
    const [pendingResultsTarget, setPendingResultsTarget] = useState<"students" | "both">("students");
    const [viewedQuestionId, setViewedQuestionId] = useState<string | null>(null);

    const { session, isLoading: isSessionLoading, error: sessionError, refetch: refetchSession, updateSession } = useLiveSession({ sessionCode });
    const { questions, isLoading: areQuestionsLoading, isSaving: areQuestionsSaving, error: questionsError, refetch: refetchQuestions, createQuestion, updateQuestion, deleteQuestion, reorderQuestions } = useSessionQuestions({ sessionId: session?.id ?? null });
    const { participants, totalParticipants, onlineParticipants, isLoading: areParticipantsLoading, error: participantsError, refetch: refetchParticipants } = useSessionParticipants({ sessionId: session?.id ?? null, realtime: true });
    const { responses, activeQuestionResponses, totalResponses, isLoading: areResponsesLoading, error: responsesError, refetch: refetchResponses } = useSessionResponses({ sessionId: session?.id ?? null, activeQuestionId: session?.active_question_id ?? null, realtime: true });
    const { analytics, isLoading: areAnalyticsLoading, isUpdating: areAnalyticsUpdating, error: analyticsError, refetch: refetchAnalytics } = useSessionAnalytics({ sessionId: session?.id ?? null, enabled: Boolean(session?.id), refreshInterval: 10000 });

    useLiveRecovery({ onRecover: async () => { await Promise.all([refetchSession(), refetchQuestions(), refetchParticipants(), refetchResponses(), refetchAnalytics()]); } });

    const activeQuestion = useMemo(() => {
        const id = session?.active_question_id;
        return id ? questions.find((question) => question.id === id) ?? null : null;
    }, [questions, session?.active_question_id]);
    const viewedQuestion = useMemo(() => viewedQuestionId ? questions.find((question) => question.id === viewedQuestionId) ?? null : null, [questions, viewedQuestionId]);
    const selectedQuestion = useMemo(() => selectedQuestionId ? questions.find((question) => question.id === selectedQuestionId) ?? null : null, [questions, selectedQuestionId]);

    useEffect(() => {
        if (!viewedQuestionId && session?.active_question_id) setViewedQuestionId(session.active_question_id);
    }, [session?.active_question_id, viewedQuestionId]);

    const isInitialLoading = isSessionLoading || (Boolean(session?.id) && areQuestionsLoading);
    const primaryError = sessionError ?? questionsError ?? participantsError ?? responsesError ?? null;

    const showNotice = useCallback((type: StudioNoticeType, message: string, title?: string) => setNotice({ type, title, message }), []);
    const handleRefreshAll = useCallback(async () => {
        try {
            await Promise.all([refetchSession(), refetchQuestions(), refetchParticipants(), refetchResponses(), refetchAnalytics()]);
            showNotice("success", "Session data has been refreshed.", "Updated");
        } catch { showNotice("error", "Unable to refresh all session data.", "Refresh Failed"); }
    }, [refetchAnalytics, refetchParticipants, refetchQuestions, refetchResponses, refetchSession, showNotice]);
    const handleBack = useCallback(() => router.back(), [router]);

    const handleTabChange = useCallback((tab: StudioTab) => {
        setActiveTab(tab);
    }, []);


    const handlePauseSession = useCallback(async () => {
        if (!session || session.status === "completed") return;
        try { await updateSession({ status: "paused", paused_at: new Date().toISOString() }); showNotice("success", "Participants cannot submit responses until the session is resumed.", "Session Paused"); }
        catch (error) { showNotice("error", error instanceof Error ? error.message : "Unable to pause the session.", "Update Failed"); }
    }, [session, showNotice, updateSession]);

    const handleResumeSession = useCallback(async () => {
        if (!session || session.status === "completed") return;
        try { await updateSession({ status: "live", paused_at: null }); showNotice("success", "The session is live again and can accept responses.", "Session Resumed"); }
        catch (error) { showNotice("error", error instanceof Error ? error.message : "Unable to resume the session.", "Update Failed"); }
    }, [session, showNotice, updateSession]);

    const handleEndSession = useCallback(() => {
        if (!session || session.status === "completed") return;
        setConfirmation({ type: "end-session" });
    }, [session]);

    const confirmEndSession = useCallback(async () => {
        if (!session) return;
        setIsConfirming(true);
        const now = new Date().toISOString();
        try {
            if (session.active_question_id) await updateQuestion(session.active_question_id, { status: "closed", closed_at: now });
            await updateSession({ status: "completed", ended_at: now, active_question_id: null, student_display_type: "waiting", student_question_id: null, projector_display_type: "waiting", projector_question_id: null });
            setConfirmation(null);
            showNotice("success", "The session has ended. It is now available in review mode only.", "Session Ended");
        } catch (error) { showNotice("error", error instanceof Error ? error.message : "Unable to end the session.", "End Failed"); }
        finally { setIsConfirming(false); }
    }, [session, showNotice, updateQuestion, updateSession]);

    const handleSetActiveQuestion = useCallback(async (questionId: string | null) => {
        if (!session?.id || session.status === "completed") { if (session?.status === "completed") showNotice("error", "This session has ended and is now in review mode.", "Session Ended"); return; }
        try {
            if (questionId) {
                const now = new Date().toISOString();
                await Promise.all(questions.filter((question) => question.id !== questionId && question.status === "active").map((question) => updateQuestion(question.id, { status: "closed", closed_at: now })));
                await updateSession({ status: "live", active_question_id: questionId, student_display_type: "question", student_question_id: questionId, projector_display_type: "question", projector_question_id: questionId, started_at: session.started_at ?? now });
                await updateQuestion(questionId, { status: "active", activated_at: now, closed_at: null });
                setViewedQuestionId(questionId);
                showNotice("success", "The question is now live.", "Question Live");
            } else {
                const currentActiveId = session.active_question_id;
                if (currentActiveId) await updateQuestion(currentActiveId, { status: "closed", closed_at: new Date().toISOString() });
                await updateSession({ active_question_id: null, student_display_type: "waiting", student_question_id: null, projector_display_type: "waiting", projector_question_id: null });
                showNotice("success", "The active question has been closed.", "Question Closed");
            }
        } catch (error) { showNotice("error", error instanceof Error ? error.message : "Unable to change the live question.", "Update Failed"); }
    }, [questions, session, showNotice, updateQuestion, updateSession]);

    const showResultsToStudents = useCallback(async (question: SessionQuestion, options?: { closeQuestion?: boolean; showOnProjector?: boolean }) => {
        const now = new Date().toISOString();
        await Promise.all(questions.filter((item) => item.id !== question.id && item.results_visible === true).map((item) => updateQuestion(item.id, { results_visible: false })));
        if (options?.closeQuestion) {
            await updateQuestion(question.id, { status: "closed", closed_at: now, results_visible: true });
            await updateSession({ active_question_id: null, student_display_type: "results", student_question_id: question.id, ...(options.showOnProjector ? { projector_display_type: "results" as const, projector_question_id: question.id } : {}) });
        } else {
            await updateQuestion(question.id, { results_visible: true });
            await updateSession({ student_display_type: "results", student_question_id: question.id });
            if (options?.showOnProjector) await updateSession({ projector_display_type: "results", projector_question_id: question.id });
        }
        showNotice("success", options?.closeQuestion ? "The question was closed and results are now visible." : "Results are now visible to students.", "Results Shown");
    }, [questions, showNotice, updateQuestion, updateSession]);

    const handleRequestShowResults = useCallback((target?: "students" | "both") => {
        const resolvedTarget = target ?? (session?.default_result_visibility === "both" ? "both" : "students");
        if (!viewedQuestion) return;
        setPendingResultsTarget(resolvedTarget);
        if (activeQuestion) setPendingResultsQuestion(viewedQuestion);
        else void showResultsToStudents(viewedQuestion, { closeQuestion: true, showOnProjector: resolvedTarget === "both" });
    }, [activeQuestion, session?.default_result_visibility, showResultsToStudents, viewedQuestion]);

    const handleSaveSettings = useCallback(async (updates: Partial<LiveSession>) => {
        setIsSettingsSaving(true);
        try { await updateSession(updates); setSettingsOpen(false); showNotice("success", "Session settings have been saved successfully.", "Settings Saved"); }
        catch (error) { showNotice("error", error instanceof Error ? error.message : "Unable to save session settings.", "Save Failed"); throw error; }
        finally { setIsSettingsSaving(false); }
    }, [showNotice, updateSession]);

    const handleCreateQuestion = useCallback(async (question: Partial<SessionQuestion>) => {
        try { const newQuestion = await createQuestion(question); setSelectedQuestionId(newQuestion.id); showNotice("success", "A new question has been added to the session.", "Question Created"); return newQuestion; }
        catch (error) { showNotice("error", error instanceof Error ? error.message : "Unable to create the question.", "Creation Failed"); throw error; }
    }, [createQuestion, showNotice]);

    const handleUpdateQuestion = useCallback(async (questionId: string, updates: Partial<SessionQuestion>) => {
        try { const updated = await updateQuestion(questionId, updates); showNotice("success", "Question changes have been saved.", "Question Updated"); return updated; }
        catch (error) { showNotice("error", error instanceof Error ? error.message : "Unable to update the question.", "Update Failed"); throw error; }
    }, [showNotice, updateQuestion]);

    const handleDeleteQuestion = useCallback(async (questionId: string) => {
        try { if (session?.active_question_id === questionId) await updateSession({ active_question_id: null }); await deleteQuestion(questionId); if (selectedQuestionId === questionId) setSelectedQuestionId(null); showNotice("success", "The question has been deleted.", "Question Deleted"); }
        catch (error) { showNotice("error", error instanceof Error ? error.message : "Unable to delete the question.", "Deletion Failed"); throw error; }
    }, [deleteQuestion, selectedQuestionId, session?.active_question_id, showNotice, updateSession]);

    const handleReorderQuestions = useCallback(async (reorderedQuestions: SessionQuestion[]) => {
        try { await reorderQuestions(reorderedQuestions); showNotice("success", "Question order has been updated.", "Questions Reordered"); }
        catch (error) { showNotice("error", error instanceof Error ? error.message : "Unable to reorder questions.", "Reorder Failed"); throw error; }
    }, [reorderQuestions, showNotice]);

    if (isInitialLoading) return <StudioLoadingState />;
    if (!session || sessionError) return <StudioErrorState error={sessionError} onRetry={() => void handleRefreshAll()} onBack={handleBack} />;

    const confirmationCopy = confirmation?.type === "end-session"
        ? { title: "End this session?", description: "Participants will no longer be able to submit responses. You can reopen this Studio later to review the collected data.", confirmLabel: "End Session", variant: "danger" as const }
        : confirmation?.type === "replace-live"
            ? { title: "Replace live question?", description: "This will close the current live question and display the selected question to students.", confirmLabel: "Replace & Display", variant: "warning" as const }
            : confirmation?.type === "replace-projector"
                ? { title: "Replace projector display?", description: "The projector is displaying another item. Replace it with this question's results?", confirmLabel: "Replace Projector", variant: "warning" as const }
                : null;

    return (
        <div className="relative min-h-screen w-full bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-50">
            <LiveStudioHeader session={session} questions={questions} participantCount={totalParticipants} activeParticipantCount={onlineParticipants} onBack={handleBack} onOpenProjector={() => window.open(`/instructor/${session.join_code}/projector`, "_blank", "noopener,noreferrer")} onCopyJoinCode={() => { void navigator.clipboard.writeText(session.join_code); showNotice("success", "Join code copied to clipboard.", "Copied"); }} onCopyStudentLink={() => { const link = window.location.origin + "/join/" + session.join_code; void navigator.clipboard.writeText(link); showNotice("success", "Session link copied to clipboard.", "Copied"); }} onOpenSettings={() => setSettingsOpen(true)} isUpdating={isSettingsSaving} onPauseSession={handlePauseSession} onResumeSession={handleResumeSession} onEndSession={handleEndSession} />
            <LiveStudioTabs activeTab={activeTab} onTabChange={handleTabChange} questionCount={questions.length} participantCount={totalParticipants} />

            <main className="w-full">
                {notice ? <div className="fixed bottom-4 right-4 z-[70] w-[min(420px,calc(100vw-2rem))]"><StudioNotice type={notice.type} title={notice.title} message={notice.message} onClose={() => setNotice(null)} /></div> : null}
                {primaryError && !sessionError ? <div className="fixed bottom-20 right-4 z-[65] w-[min(460px,calc(100vw-2rem))]"><div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 shadow-xl dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" /><div className="min-w-0 flex-1"><p className="text-sm font-bold">Some live data could not be loaded</p><p className="mt-1 text-xs leading-5 text-amber-800/80 dark:text-amber-300/80">{primaryError.message}</p></div><Button type="button" size="sm" variant="outline" onClick={() => void handleRefreshAll()}>Try Again</Button></div></div> : null}

                {activeTab === "live" ? <LiveQuestionWorkspace sessionId={session.id} questions={questions} defaultResultVisibility={session.default_result_visibility ?? "both"} projectorResultsQuestionId={session.projector_display_type === "results" ? session.projector_question_id : null} projectorDisplayType={session.projector_display_type} projectorVisualizationType={session.projector_visualization_type ?? "horizontal-bar"} onProjectorVisualizationChange={async (visualization) => { await updateSession({ projector_visualization_type: visualization }); showNotice("success", "Projector visualization updated.", "Visualization Updated"); }} isSavingQuestion={areQuestionsSaving} onCreateQuestion={handleCreateQuestion} onUpdateQuestion={handleUpdateQuestion} projectorQuestion={questions.find((question) => question.id === session.projector_question_id) ?? null} viewedQuestion={viewedQuestion} activeQuestion={activeQuestion} responses={responses} participants={participants} questionAnalytics={analytics?.questions?.find((item) => item.question_id === viewedQuestion?.id) ? { questionId: viewedQuestion?.id ?? "", totalResponses: analytics.questions.find((item) => item.question_id === viewedQuestion?.id)?.total_responses ?? 0, uniqueResponders: analytics.questions.find((item) => item.question_id === viewedQuestion?.id)?.response_count ?? 0, participationRate: analytics.questions.find((item) => item.question_id === viewedQuestion?.id)?.response_rate ?? 0, averageResponseTimeMs: null, medianResponseTimeMs: null, dominantOption: null, dominantOptionPercentage: 0, optionDistribution: analytics.questions.find((item) => item.question_id === viewedQuestion?.id)?.distribution?.map((item) => ({ key: item.id, label: item.label, count: item.count, percentage: item.percentage })) ?? [] } : null} isUpdating={areQuestionsSaving} onActivateQuestion={(question) => { if (session.active_question_id && session.active_question_id !== question.id) setConfirmation({ type: "replace-live", question }); else void handleSetActiveQuestion(question.id); }} onViewQuestion={(question) => setViewedQuestionId(question.id)} onCloseQuestion={() => void handleSetActiveQuestion(null)} onShowResults={(target) => { if (!viewedQuestion) return; if (target === "projector" && session.projector_display_type !== "waiting" && session.projector_question_id !== viewedQuestion.id) { setConfirmation({ type: "replace-projector", question: viewedQuestion }); return; } if (target === "projector") { void updateSession({ projector_display_type: "results", projector_question_id: viewedQuestion.id }); return; } void handleRequestShowResults(target === "both" ? "both" : "students"); }} onRequestShowResults={() => void handleRequestShowResults()} onHideProjectorResults={async () => { const liveId = session.active_question_id; await updateSession(liveId ? { projector_display_type: "question", projector_question_id: liveId } : { projector_display_type: "waiting", projector_question_id: null }); showNotice("success", liveId ? "Results are hidden. The live question remains on the projector." : "Results are no longer displayed on the projector.", "Projector Updated"); }} onHideResults={async () => { if (!viewedQuestion) return; await updateQuestion(viewedQuestion.id, { results_visible: false, results_mode: viewedQuestion.results_mode === "live" ? "hidden" : viewedQuestion.results_mode }); await updateSession({ ...(session.student_display_type === "results" && session.student_question_id === viewedQuestion.id ? { student_display_type: "waiting" as const, student_question_id: null } : {}), ...(session.projector_display_type === "results" && session.projector_question_id === viewedQuestion.id ? (session.active_question_id ? { projector_display_type: "question" as const, projector_question_id: session.active_question_id } : { projector_display_type: "waiting" as const, projector_question_id: null }) : {}) }); showNotice("success", "Results are now hidden from students and the projector.", "Results Hidden Everywhere"); }} onShowResultsOnProjector={() => { if (!viewedQuestion) return; if (session.projector_display_type !== "waiting" && session.projector_question_id !== viewedQuestion.id) { setConfirmation({ type: "replace-projector", question: viewedQuestion }); return; } void updateSession({ projector_display_type: "results", projector_question_id: viewedQuestion.id }).then(() => showNotice("success", "Results are now displayed on the projector.", "Projector Updated")); }} onShowResultsOnBoth={() => void handleRequestShowResults("both")} onShowLiveResults={() => { if (!viewedQuestion) return; void updateQuestion(viewedQuestion.id, { results_mode: "live", results_visible: true }).then(() => updateSession({ student_display_type: "results", student_question_id: viewedQuestion.id, projector_display_type: "results", projector_question_id: viewedQuestion.id })).then(() => showNotice("success", "Live results are now updating as participants respond.", "Live Results")); }} onConfirmReplaceLiveQuestion={(question) => setConfirmation({ type: "replace-live", question })} onClearView={() => setViewedQuestionId(null)} onPreviousQuestion={() => {}} onNextQuestion={() => {}} /> : null}
                {activeTab === "questions" ? <QuestionsWorkspace sessionId={session.id} questions={questions} activeQuestion={activeQuestion} isSaving={areQuestionsSaving} isUpdating={areQuestionsSaving} onCreateQuestion={handleCreateQuestion} onUpdateQuestion={handleUpdateQuestion} onDeleteQuestion={(question) => handleDeleteQuestion(question.id)} onActivateQuestion={(question) => handleSetActiveQuestion(question.id)} onReorderQuestions={handleReorderQuestions} /> : null}
                {activeTab === "participants" ? <ParticipantsWorkspace participants={participants} isUpdating={areParticipantsLoading} /> : null}
                {activeTab === "analytics" ? <AnalyticsWorkspace analytics={analytics} questions={questions} isLoading={areAnalyticsLoading} isUpdating={areAnalyticsUpdating} /> : null}
            </main>

            {pendingResultsQuestion ? <StudioActionDialog open title={activeQuestion?.id === pendingResultsQuestion.id ? "Show live results?" : "Close current question?"} description={activeQuestion?.id === pendingResultsQuestion.id ? "Keep the question open and show live-updating results on the projector, or close it and show final results." : "Students are currently answering another question. To show these results, the current live question must be closed."} confirmLabel={"Close Question & Show Results"} cancelLabel="Cancel" variant="info" isLoading={areQuestionsSaving} onCancel={() => { if (activeQuestion && activeQuestion.id !== pendingResultsQuestion.id) setViewedQuestionId(activeQuestion.id); setPendingResultsQuestion(null); }} onConfirm={async () => { const question = pendingResultsQuestion; setPendingResultsQuestion(null); if (activeQuestion?.id === question.id) { await updateQuestion(question.id, { results_mode: "live", results_visible: false }); await updateSession({ student_display_type: "question", student_question_id: question.id, ...(pendingResultsTarget === "both" ? { projector_display_type: "results" as const, projector_question_id: question.id } : {}) }); showNotice("success", pendingResultsTarget === "both" ? "Live results are shown on the projector." : "Live results are enabled for students.", "Live Results"); } else { if (activeQuestion) { await handleSetActiveQuestion(null); setViewedQuestionId(question.id); } await showResultsToStudents(question, { closeQuestion: true, showOnProjector: pendingResultsTarget === "both" || activeQuestion?.id === question.id }); } }} /> : null}

            {confirmation && confirmationCopy ? <StudioActionDialog open title={confirmationCopy.title} description={confirmationCopy.description} confirmLabel={confirmationCopy.confirmLabel} variant={confirmationCopy.variant} isLoading={isConfirming || areQuestionsSaving} onCancel={() => setConfirmation(null)} onConfirm={async () => { const current = confirmation; if (!current) return; setIsConfirming(true); try { if (current.type === "end-session") await confirmEndSession(); else if (current.type === "replace-live") { setConfirmation(null); await handleSetActiveQuestion(current.question.id); } else { setConfirmation(null); await updateSession({ projector_display_type: "results", projector_question_id: current.question.id }); showNotice("success", "The projector display has been replaced.", "Projector Updated"); } } finally { setIsConfirming(false); } }} /> : null}

            <SessionSettingsDrawer open={settingsOpen} session={session} isSaving={isSettingsSaving} onClose={() => setSettingsOpen(false)} onSave={handleSaveSettings} />
        </div>
    );
}
