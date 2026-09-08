"use client";

import {
    ChevronLeft,
    ChevronRight,
    Eye,
    ListChecks,
    Plus,
    Radio,
} from "lucide-react";

import { Button } from "@/components/ui/button";

import type {
    SessionQuestion,
} from "./live-studio-types";

import {
    getQuestionPosition,
    getQuestionStatusClassName,
    getQuestionStatusLabel,
    getQuestionPrompt,
} from "./live-studio-utils";

interface QuestionNavigationProps {
    questions: SessionQuestion[];
    activeQuestion: SessionQuestion | null;
    liveQuestionId?: string | null;
    isUpdating?: boolean;
    onSelectQuestion: (question: SessionQuestion) => void;
    onActivateQuestion: (question: SessionQuestion) => void;
    onConfirmReplaceLiveQuestion?: (question: SessionQuestion) => void;
    onPreviousQuestion?: () => void;
    onNextQuestion?: () => void;
    onAddQuestion?: () => void;
}

export function QuestionNavigation({
    questions,
    activeQuestion,
    liveQuestionId = null,
    isUpdating = false,
    onSelectQuestion,
    onActivateQuestion,
    onConfirmReplaceLiveQuestion,
    onPreviousQuestion,
    onNextQuestion,
    onAddQuestion,
}: QuestionNavigationProps) {
    const sortedQuestions = [...questions].sort(
        (a, b) => (a.position ?? 0) - (b.position ?? 0),
    );

    const activeIndex = activeQuestion
        ? sortedQuestions.findIndex((question) => question.id === activeQuestion.id)
        : -1;

    const canGoPrevious = activeIndex > 0;
    const canGoNext = activeIndex >= 0 && activeIndex < sortedQuestions.length - 1;

    return (
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                <div className="flex min-w-0 items-center gap-2.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                        <ListChecks className="h-4.5 w-4.5" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Question Queue</p>
                        <p className="mt-0.5 truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                            {sortedQuestions.length} {sortedQuestions.length === 1 ? "question" : "questions"}
                        </p>
                    </div>
                </div>

                {onAddQuestion ? (
                    <Button
                        type="button"
                        size="sm"
                        onClick={onAddQuestion}
                        disabled={isUpdating}
                        className="shrink-0"
                    >
                        <Plus className="mr-1.5 h-4 w-4" />
                        Add new question
                    </Button>
                ) : null}
            </div>

            {sortedQuestions.length === 0 ? (
                <div className="flex min-h-[180px] items-center justify-center px-5 py-8 text-center">
                    <p className="max-w-[220px] text-sm leading-6 text-slate-500 dark:text-slate-400">
                        Add a question to start building your live queue.
                    </p>
                </div>
            ) : (
                <>
                    <div className="flex items-center gap-2 px-4 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            disabled={isUpdating || !canGoPrevious}
                            onClick={onPreviousQuestion}
                        >
                            <ChevronLeft className="h-4 w-4" />
                            <span className="sr-only">Previous question</span>
                        </Button>
                        <div className="flex-1 text-center">
                            <p className="text-xs text-slate-400">
                                {activeQuestion
                                    ? `Question ${activeIndex + 1} of ${sortedQuestions.length}`
                                    : `${sortedQuestions.length} questions`}
                            </p>
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            disabled={isUpdating || !canGoNext}
                            onClick={onNextQuestion}
                        >
                            <ChevronRight className="h-4 w-4" />
                            <span className="sr-only">Next question</span>
                        </Button>
                    </div>

                    <div className="max-h-[360px] space-y-2 overflow-y-auto px-4 pb-4 pt-4">
                        {sortedQuestions.map((question) => {
                            const isActive = activeQuestion?.id === question.id;
                            const isLive = liveQuestionId === question.id;
                            const position = getQuestionPosition(question, sortedQuestions);

                            return (
                                <div
                                    key={question.id}
                                    role="button"
                                    tabIndex={0}
                                    aria-disabled={isUpdating}
                                    onClick={() => {
                                        if (!isUpdating) onSelectQuestion(question);
                                    }}
                                    onKeyDown={(event) => {
                                        if (
                                            isUpdating ||
                                            (event.key !== "Enter" && event.key !== " ")
                                        ) {
                                            return;
                                        }
                                        event.preventDefault();
                                        onSelectQuestion(question);
                                    }}
                                    className={[
                                        "relative w-full rounded-xl border p-3 text-left transition",
                                        isActive
                                            ? "border-indigo-200 bg-indigo-50/70 dark:border-indigo-900/60 dark:bg-indigo-950/30"
                                            : "border-transparent bg-slate-50 hover:border-slate-200 hover:bg-white dark:bg-slate-900/50 dark:hover:border-slate-800 dark:hover:bg-slate-900",
                                    ].join(" ")}
                                >
                                    <div className="flex gap-3 pr-16">
                                        <span
                                            className={[
                                                "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold",
                                                isActive
                                                    ? "bg-indigo-600 text-white"
                                                    : "bg-white text-slate-500 shadow-sm dark:bg-slate-800 dark:text-slate-300",
                                            ].join(" ")}
                                        >
                                            {position}
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <p className="line-clamp-2 text-xs font-semibold leading-5 text-slate-700 dark:text-slate-200">
                                                {getQuestionPrompt(question)}
                                            </p>
                                            <div className="mt-2">
                                                <span
                                                    className={[
                                                        "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold",
                                                        getQuestionStatusClassName(question.status),
                                                    ].join(" ")}
                                                >
                                                    {getQuestionStatusLabel(question.status)}
                                                </span>
                                            </div>
                                        </div>

                                        <div
                                            className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1"
                                            onClick={(event) => event.stopPropagation()}
                                        >
                                            <Button
                                                type="button"
                                                size="icon"
                                                variant="ghost"
                                                className="h-8 w-8"
                                                onClick={() => onSelectQuestion(question)}
                                                aria-label="View question"
                                                title="View question"
                                            >
                                                <Eye className="h-4 w-4" />
                                            </Button>

                                            {!isLive ? (
                                                <Button
                                                    type="button"
                                                    size="icon"
                                                    variant="ghost"
                                                    disabled={isUpdating}
                                                    className="h-8 w-8"
                                                    onClick={() => {
                                                        if (liveQuestionId && liveQuestionId !== question.id) {
                                                            onConfirmReplaceLiveQuestion?.(question);
                                                            return;
                                                        }
                                                        onActivateQuestion(question);
                                                    }}
                                                    aria-label="Make question live"
                                                    title="Make question live"
                                                >
                                                    <Radio className="h-4 w-4" />
                                                </Button>
                                            ) : null}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </section>
    );
}
