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

    onShowResults?: () => void;

    onHideResults?: () => void;

    onPreviousQuestion?: () => void;

    onNextQuestion?: () => void;
}

export function LiveQuestionWorkspace({
    sessionId,
    questions,
    viewedQuestion,
    activeQuestion,
    responses,
    participants,
    questionAnalytics,
    isUpdating = false,
    onActivateQuestion,
    onViewQuestion,
    onCloseQuestion,
    onConfirmReplaceLiveQuestion,
    onShowResults,
    onHideResults,
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

    return (
        <div className="mx-auto w-full max-w-[1600px] px-4 pb-24 pt-6 sm:px-6 lg:px-8 md:pb-8">
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                <div className="min-w-0 space-y-6">
                    <LiveQuestionPanel
                        sessionId={sessionId}
                        question={viewedQuestion}
                        activeQuestion={activeQuestion}
                        questions={questions}
                        isUpdating={isUpdating}
                        onActivateQuestion={
                            onActivateQuestion
                        }
                        onCloseQuestion={
                            onCloseQuestion
                        }
                        onConfirmReplaceLiveQuestion={
                            onConfirmReplaceLiveQuestion
                        }
                        onShowResults={
                            onShowResults
                        }
                        onHideResults={
                            onHideResults
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