"use client";

import type { QuestionAnalytics, SessionParticipant, SessionQuestion, SessionResponse } from "./live-studio-types";
import { LiveQuestionPanel } from "./live-question-panel";
import { ResponseProgressPanel } from "./response-progress-panel";
import { ResponseWorkspace } from "./response-workspace";
import { ResponseDistribution } from "./response-distribution";
import { ResponseParticipants } from "./response-participants";
import { ResponseActivity } from "./response-activity";
import { Users, CheckCircle2, Clock3, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { QuestionEditor } from "./question-editor";
import { QuestionNavigation } from "./question-navigation";
import { getParticipantDisplayName } from "@/lib/participant-labels";

interface LiveQuestionWorkspaceProps {
    sessionId: string;
    questions: SessionQuestion[];
    projectorResultsQuestionId?: string | null;
    defaultResultVisibility?: "students" | "projector" | "both";
    projectorDisplayType?: "waiting" | "question" | "results";
    projectorVisualizationType?: "horizontal-bar" | "vertical-bar" | "donut" | "ranked" | "percentage" | "likert";
    onProjectorVisualizationChange?: (visualization: "horizontal-bar" | "vertical-bar" | "donut" | "ranked" | "percentage" | "likert") => void;
    projectorQuestion: SessionQuestion | null;
    viewedQuestion: SessionQuestion | null;
    activeQuestion: SessionQuestion | null;
    responses: SessionResponse[];
    participants: SessionParticipant[];
    questionAnalytics: QuestionAnalytics | null;
    isUpdating?: boolean;
    onActivateQuestion: (question: SessionQuestion) => void;
    onViewQuestion: (question: SessionQuestion) => void;
    onCloseQuestion: () => void;
    onConfirmReplaceLiveQuestion?: (question: SessionQuestion) => void;
    onShowResults?: (target: "students" | "projector" | "both") => void;
    onRequestShowResults?: () => void;
    onShowResultsOnProjector?: () => void;
    onShowResultsOnBoth?: () => void;
    onHideResults?: () => void;
    onHideProjectorResults?: () => void;
    onPreviousQuestion?: () => void;
    onNextQuestion?: () => void;
    isSavingQuestion?: boolean;
    onCreateQuestion?: (question: Partial<SessionQuestion>) => Promise<void> | void;
    onUpdateQuestion?: (questionId: string, updates: Partial<SessionQuestion>) => Promise<void> | void;
    onClearView?: () => void;
}

export function LiveQuestionWorkspace({
    sessionId, questions, projectorResultsQuestionId, defaultResultVisibility = "both", projectorDisplayType = "waiting", projectorVisualizationType = "horizontal-bar", onProjectorVisualizationChange,
    projectorQuestion, viewedQuestion, activeQuestion, responses, participants, questionAnalytics, isUpdating = false,
    onActivateQuestion, onViewQuestion, onCloseQuestion, onShowResults, onRequestShowResults, onShowResultsOnProjector, onShowResultsOnBoth,
    onHideResults, onHideProjectorResults, onConfirmReplaceLiveQuestion, onPreviousQuestion, onNextQuestion, isSavingQuestion = false, onCreateQuestion, onUpdateQuestion, onClearView,
}: LiveQuestionWorkspaceProps) {
    const [questionEditorMode, setQuestionEditorMode] = useState<"create" | "edit" | null>(null);
    const viewedQuestionResponses = viewedQuestion ? responses.filter((response) => response.question_id === viewedQuestion.id) : [];
    const totalParticipants = participants.length;
    const responseCount = questionAnalytics?.uniqueResponders ?? new Set(viewedQuestionResponses.map((response) => response.participant_id ?? response.id)).size;
    const percentage = totalParticipants > 0 ? Math.round((responseCount / totalParticipants) * 100) : 0;
    const remainingParticipants = Math.max(0, totalParticipants - responseCount);
    const respondedParticipantIds = new Set(viewedQuestionResponses.map((response) => response.participant_id));
    const recentResponders = participants.filter((participant) => respondedParticipantIds.has(participant.id)).slice(0, 4);

    return (
        <div className="w-full px-4 pb-24 pt-5 sm:px-6 lg:px-8 md:pb-8">
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                <div className="min-w-0 space-y-6">
                    <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                            <p className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Live Control</p>
                            <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">{viewedQuestion ? "Question currently in view" : "Choose a question from the queue"}</p>
                        </div>
                        {viewedQuestion && onClearView ? <Button type="button" variant="ghost" size="icon" onClick={onClearView} className="shrink-0" aria-label="Clear question workspace" title="Clear workspace"><X className="h-4 w-4" /></Button> : null}
                    </div>

                    <LiveQuestionPanel
                        sessionId={sessionId} question={viewedQuestion} activeQuestion={activeQuestion} questions={questions}
                        defaultResultVisibility={defaultResultVisibility} projectorResultsVisible={projectorResultsQuestionId === viewedQuestion?.id}
                        isUpdating={isUpdating} onActivateQuestion={onActivateQuestion} onCloseQuestion={onCloseQuestion}
                        onShowResults={onRequestShowResults ?? onShowResults} onShowResultsOnProjector={onShowResultsOnProjector}
                        onShowResultsOnBoth={onShowResultsOnBoth} onHideResults={onHideResults} onHideProjectorResults={onHideProjectorResults}
                        onConfirmReplaceLiveQuestion={onConfirmReplaceLiveQuestion}
                        onEditQuestion={viewedQuestion ? () => setQuestionEditorMode("edit") : undefined}
                    />

                    <ResponseWorkspace
                        responseCount={responseCount} participantCount={totalParticipants} participantsLabel="View all participants & response history" onParticipantsNavigate={() => {}}
                        overview={(navigateToParticipants) => (
                            <div className="grid gap-6 p-5 lg:grid-cols-[minmax(0,1fr)_280px]">
                                <ResponseProgressPanel totalParticipants={totalParticipants} responseCount={responseCount} activeQuestion={viewedQuestion ?? activeQuestion} embedded />
                                <div className="border-t border-slate-100 pt-5 dark:border-slate-800 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
                                    <div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Response Pulse</p><p className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">{responseCount} / {totalParticipants}</p></div><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300"><Users className="h-5 w-5" /></div></div>
                                    <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-indigo-600 transition-all duration-500" style={{ width: `${percentage}%` }} /></div>
                                    <div className="mt-2 flex items-center justify-between text-xs text-slate-500"><span>{percentage}% participation</span><span>{remainingParticipants} waiting</span></div>
                                    <div className="mt-5 grid grid-cols-2 gap-3"><button type="button" onClick={() => navigateToParticipants("responded")} className="rounded-xl bg-slate-50 p-3 text-left transition hover:bg-indigo-50 dark:bg-slate-900/60 dark:hover:bg-indigo-950/30"><div className="flex items-center gap-2 text-xs font-semibold text-slate-400"><CheckCircle2 className="h-4 w-4" />Responded</div><p className="mt-2 text-xl font-bold">{responseCount}</p></button><button type="button" onClick={() => navigateToParticipants("waiting")} className="rounded-xl bg-slate-50 p-3 text-left transition hover:bg-indigo-50 dark:bg-slate-900/60 dark:hover:bg-indigo-950/30"><div className="flex items-center gap-2 text-xs font-semibold text-slate-400"><Clock3 className="h-4 w-4" />Waiting</div><p className="mt-2 text-xl font-bold">{remainingParticipants}</p></button></div>
                                    <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-800"><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Recent responders</p><div className="mt-3 space-y-2">{recentResponders.length > 0 ? recentResponders.map((participant) => <div key={participant.id} className="flex items-center justify-between gap-3 text-sm"><span className="min-w-0 truncate font-medium text-slate-700 dark:text-slate-200">{getParticipantDisplayName(participant, participants)}</span><span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" /></div>) : <p className="text-xs leading-5 text-slate-500">Responses will appear here as participants answer.</p>}</div></div>
                                </div>
                            </div>
                        )}
                        distribution={(navigateToParticipants) => <div className="p-0"><ResponseDistribution question={viewedQuestion} analytics={questionAnalytics} responses={viewedQuestionResponses} visualizationType={projectorVisualizationType ?? "horizontal-bar"} embedded onOptionSelect={(answer) => navigateToParticipants("responded", answer)} onVisualizationChange={onProjectorVisualizationChange} /></div>}
                        participants={(activeFilter, activeAnswer) => <ResponseParticipants participants={participants} responses={viewedQuestionResponses} allResponses={responses} questions={questions} activeFilter={activeFilter} activeAnswer={activeAnswer} />}
                        activity={<ResponseActivity participants={participants} responses={viewedQuestionResponses} />}
                    />
                </div>

                <aside className="space-y-6">
                    <QuestionNavigation questions={questions} activeQuestion={viewedQuestion} liveQuestionId={activeQuestion?.id ?? null} isUpdating={isUpdating} onSelectQuestion={onViewQuestion} onActivateQuestion={onActivateQuestion} onConfirmReplaceLiveQuestion={onConfirmReplaceLiveQuestion} onPreviousQuestion={onPreviousQuestion} onNextQuestion={onNextQuestion} onAddQuestion={onCreateQuestion ? () => setQuestionEditorMode("create") : undefined} />
                </aside>
            </div>

            <Dialog open={questionEditorMode !== null} onOpenChange={(open) => !open && setQuestionEditorMode(null)}>
                <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] !max-w-[1200px] overflow-y-auto p-0 sm:w-[calc(100vw-4rem)] sm:!max-w-[1200px]">
                    <DialogHeader className="border-b px-6 py-4"><DialogTitle>{questionEditorMode === "create" ? "Add Question" : "Edit Question"}</DialogTitle></DialogHeader>
                    <div className="w-full p-4 sm:p-6 lg:p-8">
                        {questionEditorMode === "create" ? <QuestionEditor mode="create" sessionId={sessionId} isSaving={isSavingQuestion} onSave={async (question) => { await onCreateQuestion?.(question); setQuestionEditorMode(null); }} onCancel={() => setQuestionEditorMode(null)} /> : viewedQuestion ? <QuestionEditor mode="edit" sessionId={sessionId} question={viewedQuestion} isSaving={isSavingQuestion} onSave={async (updates) => { await onUpdateQuestion?.(viewedQuestion.id, updates); setQuestionEditorMode(null); }} onCancel={() => setQuestionEditorMode(null)} /> : null}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
