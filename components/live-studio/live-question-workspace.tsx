"use client";

import type {
    QuestionAnalytics,
    SessionParticipant,
    SessionQuestion,
    SessionResponse,
} from "./live-studio-types";

import { LiveQuestionPanel } from "./live-question-panel";
import { ResponseProgressPanel } from "./response-progress-panel";
import { ResponseDistribution } from "./response-distribution";
import { QuestionNavigation } from "./question-navigation";

interface LiveQuestionWorkspaceProps {
    sessionId: string;

    questions: SessionQuestion[];

    projectorResultsQuestionId?: string | null;

    defaultResultVisibility?: "students" | "projector" | "both";

    projectorDisplayType?: "waiting" | "question" | "results";

    projectorQuestion: SessionQuestion | null;

    viewedQuestion: SessionQuestion | null;

    activeQuestion: SessionQuestion | null;

    responses: SessionResponse[];

    participants: SessionParticipant[];

    questionAnalytics: QuestionAnalytics | null;

    isUpdating?: boolean;

    onActivateQuestion: (
        question: SessionQuestion,
    ) => void;

    onViewQuestion: (
        question: SessionQuestion,
    ) => void;

    onCloseQuestion: () => void;


    onConfirmReplaceLiveQuestion?: (
        question: SessionQuestion,
    ) => void;

    onShowResults?: (
        target: "students" | "projector" | "both",
    ) => void;

    onRequestShowResults?: () => void;

    onShowResultsOnProjector?: () => void;

    onShowResultsOnBoth?: () => void;

    onHideResults?: () => void;

    onHideProjectorResults?: () => void;

    onPreviousQuestion?: () => void;

    onNextQuestion?: () => void;
}

export function LiveQuestionWorkspace({
    sessionId,
    questions,
    projectorResultsQuestionId,
    defaultResultVisibility = "both",
    projectorDisplayType = "waiting",
    projectorQuestion,
    viewedQuestion,
    activeQuestion,
    responses,
    participants,
    questionAnalytics,
    isUpdating = false,
    onActivateQuestion,
    onViewQuestion,
    onCloseQuestion,
    onShowResults,
    onRequestShowResults,
    onShowResultsOnProjector,
    onShowResultsOnBoth,
    onHideResults,
    onHideProjectorResults,
    onConfirmReplaceLiveQuestion,
    onPreviousQuestion,
    onNextQuestion,
}: LiveQuestionWorkspaceProps) {
    const viewedQuestionResponses =
        viewedQuestion
            ? responses.filter(
                  (response) =>
                      response.question_id ===
                      viewedQuestion.id,
              )
            : [];

    const totalParticipants =
        participants.length;

    const responseCount =
        questionAnalytics?.uniqueResponders ??
        new Set(
            viewedQuestionResponses.map(
                (response) =>
                    response.participant_id ??
response.id
            ),
        ).size;

    const projectorLabel =
        projectorDisplayType === "waiting"
            ? "Waiting"
            : projectorQuestion
            ? `Q${questions.findIndex((item) => item.id === projectorQuestion.id) + 1} — ${projectorDisplayType === "results" ? "Results" : "Question"}`
            : "Updating";

    return (
        <div className="mx-auto w-full max-w-[1600px] px-4 pb-24 pt-6 sm:px-6 lg:px-8 md:pb-8">
            <div className="mb-4 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300">🖥️</span>
                    <div>
                        <p className="text-xs font-medium text-slate-500">Projector</p>
                        <p className="font-semibold text-slate-800 dark:text-slate-100">{projectorLabel}</p>
                    </div>
                </div>
                <span className={[
                    "h-2.5 w-2.5 rounded-full",
                    projectorDisplayType === "waiting" ? "bg-slate-300" : "bg-emerald-500 animate-pulse",
                ].join(" ")} />
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                <div className="min-w-0 space-y-6">
                    <LiveQuestionPanel
                        sessionId={sessionId}
                        question={viewedQuestion}
                        activeQuestion={activeQuestion}
                        questions={questions}
                        defaultResultVisibility={
                            defaultResultVisibility
                        }
                        projectorResultsVisible={
                            projectorResultsQuestionId ===
                            viewedQuestion?.id
                        }
                        isUpdating={isUpdating}
                        onActivateQuestion={
                            onActivateQuestion
                        }
                        onCloseQuestion={
                            onCloseQuestion
                        }
                        onShowResults={
                            onRequestShowResults ??
                            onShowResults
                        }
                        onShowResultsOnProjector={
                            onShowResultsOnProjector
                        }
                        onShowResultsOnBoth={
                            onShowResultsOnBoth
                        }
                        onHideResults={onHideResults}
                        onHideProjectorResults={
                            onHideProjectorResults
                        }
                        onConfirmReplaceLiveQuestion={
                            onConfirmReplaceLiveQuestion
                        }
                    />

                    <ResponseDistribution
                        question={activeQuestion}
                        analytics={
                            questionAnalytics
                        }
                        responses={
                            viewedQuestionResponses
                        }
                    />
                </div>

                <aside className="space-y-6">
                    <ResponseProgressPanel
                        totalParticipants={
                            totalParticipants
                        }
                        responseCount={
                            responseCount
                        }
                        activeQuestion={
                            viewedQuestion
                        }
                    />

                    <QuestionNavigation
                        questions={questions}
                        activeQuestion={
                            viewedQuestion
                        }
                        liveQuestionId={
                            activeQuestion?.id ?? null
                        }
                        isUpdating={isUpdating}
                        onSelectQuestion={
                            onViewQuestion
                        }
                        onActivateQuestion={
                            onActivateQuestion
                        }
                        onConfirmReplaceLiveQuestion={
                            onConfirmReplaceLiveQuestion
                        }
                        onPreviousQuestion={
                            onPreviousQuestion
                        }
                        onNextQuestion={
                            onNextQuestion
                        }
                    />
                </aside>
            </div>
        </div>
    );
}