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
import { Users, CheckCircle2, Clock3 } from "lucide-react";
import { QuestionNavigation } from "./question-navigation";

interface LiveQuestionWorkspaceProps {
    sessionId: string;

    questions: SessionQuestion[];

    projectorResultsQuestionId?: string | null;

    defaultResultVisibility?: "students" | "projector" | "both";

    projectorDisplayType?: "waiting" | "question" | "results";

    projectorVisualizationType?:
        | "horizontal-bar"
        | "vertical-bar"
        | "donut"
        | "ranked"
        | "percentage";

    onProjectorVisualizationChange?: (
        visualization:
            | "horizontal-bar"
            | "vertical-bar"
            | "donut"
            | "ranked"
            | "percentage",
    ) => void;

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

    const percentage =
        totalParticipants > 0
            ? Math.round((responseCount / totalParticipants) * 100)
            : 0;

    const remainingParticipants =
        Math.max(0, totalParticipants - responseCount);

    const respondedParticipantIds = new Set(
        viewedQuestionResponses.map(
            (response) => response.participant_id,
        ),
    );

    const recentResponders = participants
        .filter((participant) =>
            respondedParticipantIds.has(participant.id),
        )
        .slice(0, 4);

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

                    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                        <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_320px]">
                            <div className="min-w-0">
                                <ResponseDistribution
                                    question={viewedQuestion}
                                    analytics={questionAnalytics}
                                    responses={viewedQuestionResponses}
                                    visualizationType={
                                        projectorVisualizationType ??
                                        "horizontal-bar"
                                    }
                                    onVisualizationChange={
                                        onProjectorVisualizationChange
                                    }
                                />
                            </div>

                            <div className="border-t border-slate-200 p-5 dark:border-slate-800 lg:border-l lg:border-t-0">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                            Response Pulse
                                        </p>
                                        <p className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">
                                            {responseCount} / {totalParticipants}
                                        </p>
                                    </div>
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300">
                                        <Users className="h-5 w-5" />
                                    </div>
                                </div>

                                <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                                    <div
                                        className="h-full rounded-full bg-indigo-600 transition-all duration-500"
                                        style={{ width: `${percentage}%` }}
                                    />
                                </div>

                                <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                                    <span>{percentage}% participation</span>
                                    <span>{remainingParticipants} waiting</span>
                                </div>

                                <div className="mt-5 grid grid-cols-2 gap-3">
                                    <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900/60">
                                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                                            <CheckCircle2 className="h-4 w-4" />
                                            Responded
                                        </div>
                                        <p className="mt-2 text-xl font-bold">{responseCount}</p>
                                    </div>
                                    <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900/60">
                                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                                            <Clock3 className="h-4 w-4" />
                                            Waiting
                                        </div>
                                        <p className="mt-2 text-xl font-bold">{remainingParticipants}</p>
                                    </div>
                                </div>

                                <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-800">
                                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                        Recent responders
                                    </p>
                                    <div className="mt-3 space-y-2">
                                        {recentResponders.length > 0 ? (
                                            recentResponders.map((participant) => (
                                                <div key={participant.id} className="flex items-center justify-between gap-3 text-sm">
                                                    <span className="min-w-0 truncate font-medium text-slate-700 dark:text-slate-200">
                                                        {participant.name || "Anonymous participant"}
                                                    </span>
                                                    <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-xs leading-5 text-slate-500">
                                                Responses will appear here as participants answer.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                <aside className="space-y-6">

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