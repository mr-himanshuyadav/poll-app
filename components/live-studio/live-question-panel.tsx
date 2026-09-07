"use client";

import {
    BarChart3,
    CheckCircle2,
    ChevronRight,
    CircleDot,
    Eye,
    EyeOff,
    Play,
    Radio,
    Square,
} from "lucide-react";

import { Button } from "@/components/ui/button";

import type {
    SessionQuestion,
} from "./live-studio-types";

import {
    getQuestionOptionLabel,
    getQuestionPosition,
    getQuestionPrompt,
    getQuestionStatusClassName,
    getQuestionStatusLabel,
    getQuestionTypeLabel,
    getResultsModeLabel,
} from "./live-studio-utils";

interface LiveQuestionPanelProps {
    sessionId: string;

    question: SessionQuestion | null;

    questions: SessionQuestion[];

    isUpdating?: boolean;

    onActivateQuestion: (
        question: SessionQuestion,
    ) => void;

    onCloseQuestion: () => void;

    onShowResults?: () => void;

    onHideResults?: () => void;
}

export function LiveQuestionPanel({
    question,
    questions,
    isUpdating = false,
    onActivateQuestion,
    onCloseQuestion,
    onShowResults,
    onHideResults,
}: LiveQuestionPanelProps) {
    if (!question) {
        const nextQuestion =
            questions.find(
                (item) =>
                    item.status !== "closed",
            ) ?? null;

        return (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
                <div className="flex min-h-[420px] flex-col items-center justify-center px-6 py-12 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
                        <Radio className="h-8 w-8" />
                    </div>

                    <h2 className="mt-5 text-xl font-bold text-slate-950 dark:text-slate-50">
                        No question is live
                    </h2>

                    <p className="mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
                        Select a question from
                        your queue and make it
                        live when you are ready
                        for participants to
                        respond.
                    </p>

                    {nextQuestion ? (
                        <Button
                            type="button"
                            className="mt-6"
                            disabled={isUpdating}
                            onClick={() =>
                                onActivateQuestion(
                                    nextQuestion,
                                )
                            }
                        >
                            <Play className="mr-2 h-4 w-4" />

                            Start Next Question

                            <ChevronRight className="ml-1 h-4 w-4" />
                        </Button>
                    ) : null}
                </div>
            </div>
        );
    }

    const questionPosition =
        getQuestionPosition(
            question,
            questions,
        );

    const questionType =
        question.question_type ??
        question.type ??
        "multiple_choice";

    const questionStatus =
        getQuestionStatusLabel(
            question.status,
        );

    const statusClassName =
        getQuestionStatusClassName(
            question.status,
        );

    const resultsVisible =
        question.results_visible === true;

    const canActivate =
        question.status !== "active";

    const canClose =
        question.status === "active";

    return (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800 sm:px-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 font-bold text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
                            {questionPosition ||
                                "—"}
                        </div>

                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <h2 className="text-sm font-bold text-slate-950 dark:text-slate-50">
                                    Question{" "}
                                    {questionPosition ||
                                        ""}
                                </h2>

                                <span
                                    className={[
                                        "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold",
                                        statusClassName,
                                    ].join(
                                        " ",
                                    )}
                                >
                                    {questionStatus}
                                </span>
                            </div>

                            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                                <span>
                                    {getQuestionTypeLabel(
                                        question,
                                    )}
                                </span>

                                <span className="hidden h-3 w-px bg-slate-200 dark:bg-slate-700 sm:block" />

                                <span>
                                    {getResultsModeLabel(
                                        question.results_mode,
                                    )}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {canActivate ? (
                            <Button
                                type="button"
                                disabled={isUpdating}
                                onClick={() =>
                                    onActivateQuestion(
                                        question,
                                    )
                                }
                            >
                                <Play className="mr-2 h-4 w-4" />

                                Make Live
                            </Button>
                        ) : null}

                        {canClose ? (
                            <Button
                                type="button"
                                variant="destructive"
                                disabled={isUpdating}
                                onClick={
                                    onCloseQuestion
                                }
                            >
                                <Square className="mr-2 h-4 w-4" />

                                Close Question
                            </Button>
                        ) : null}
                    </div>
                </div>
            </div>

            <div className="p-5 sm:p-6">
                <div className="max-w-4xl">
                    <p className="text-xl font-semibold leading-8 text-slate-950 dark:text-slate-50 sm:text-2xl">
                        {getQuestionPrompt(
                            question,
                        )}
                    </p>

                    {question.description ? (
                        <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
                            {
                                question.description
                            }
                        </p>
                    ) : null}
                </div>

                {questionType ===
                    "multiple_choice" &&
                question.options &&
                question.options.length > 0 ? (
                    <div className="mt-8 grid gap-3 sm:grid-cols-2">
                        {question.options.map(
                            (
                                option,
                                index,
                            ) => {
                                const label =
                                    option.label ??
                                    option.text ??
                                    option.value ??
                                    "";

                                return (
                                    <div
                                        key={
                                            option.id ??
                                            `${index}-${label}`
                                        }
                                        className="flex min-h-[72px] items-center gap-4 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/40"
                                    >
                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
                                            {getQuestionOptionLabel(
                                                index,
                                            )}
                                        </div>

                                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                                            {
                                                label
                                            }
                                        </span>
                                    </div>
                                );
                            },
                        )}
                    </div>
                ) : null}

                {questionType === "scale" ? (
                    <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900/40">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                    Scale
                                </p>

                                <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                                    {
                                        question.scale_min ??
                                        1
                                    }{" "}
                                    to{" "}
                                    {
                                        question.scale_max ??
                                        5
                                    }
                                </p>
                            </div>

                            <BarChart3 className="h-6 w-6 text-slate-400" />
                        </div>

                        <div className="mt-5 flex items-center gap-2">
                            {Array.from({
                                length:
                                    (question.scale_max ??
                                        5) -
                                        (question.scale_min ??
                                            1) +
                                    1,
                            }).map(
                                (_, index) => {
                                    const value =
                                        (question.scale_min ??
                                            1) +
                                        index;

                                    return (
                                        <div
                                            key={
                                                value
                                            }
                                            className="flex h-10 min-w-10 flex-1 items-center justify-center rounded-lg border border-slate-200 bg-white text-sm font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                                        >
                                            {
                                                value
                                            }
                                        </div>
                                    );
                                },
                            )}
                        </div>

                        <div className="mt-3 flex justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
                            <span>
                                {
                                    question.scale_min_label ??
                                    ""
                                }
                            </span>

                            <span className="text-right">
                                {
                                    question.scale_max_label ??
                                    ""
                                }
                            </span>
                        </div>
                    </div>
                ) : null}

                <div className="mt-8 flex flex-col gap-3 border-t border-slate-100 pt-5 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <CircleDot className="h-4 w-4" />

                        <span>
                            Results:{" "}
                            <strong className="font-semibold text-slate-700 dark:text-slate-200">
                                {resultsVisible
                                    ? "Visible"
                                    : "Hidden"}
                            </strong>
                        </span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {resultsVisible &&
                        onHideResults ? (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={isUpdating}
                                onClick={
                                    onHideResults
                                }
                            >
                                <EyeOff className="mr-2 h-4 w-4" />

                                Hide Results
                            </Button>
                        ) : null}

                        {!resultsVisible &&
                        onShowResults ? (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={isUpdating}
                                onClick={
                                    onShowResults
                                }
                            >
                                <Eye className="mr-2 h-4 w-4" />

                                Show Results
                            </Button>
                        ) : null}

                        {question.status ===
                        "closed" ? (
                            <div className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                                <CheckCircle2 className="h-4 w-4" />

                                Question closed
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>
        </section>
    );
}