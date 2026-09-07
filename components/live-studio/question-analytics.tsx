"use client";

import {
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    BarChart3,
    CheckCircle2,
    ChevronDown,
    CircleDot,
} from "lucide-react";

import type {
    SessionAnalytics,
    SessionQuestion,
    SessionQuestionAnalytics,
} from "./live-studio-types";

import {
    getQuestionPrompt,
    getQuestionTypeLabel,
} from "./live-studio-utils";

interface QuestionAnalyticsProps {
    analytics: SessionAnalytics | null;

    questions: SessionQuestion[];

    isLoading?: boolean;
}

function clampPercentage(
    value: number,
): number {
    if (!Number.isFinite(value)) {
        return 0;
    }

    return Math.max(
        0,
        Math.min(100, value),
    );
}

export function QuestionAnalytics({
    analytics,
    questions,
    isLoading = false,
}: QuestionAnalyticsProps) {
    const [
        selectedQuestionId,
        setSelectedQuestionId,
    ] = useState<string | null>(
        questions[0]?.id ?? null,
    );

    useEffect(() => {
        if (questions.length === 0) {
            setSelectedQuestionId(null);

            return;
        }

        const selectedStillExists =
            selectedQuestionId &&
            questions.some(
                (question) =>
                    question.id ===
                    selectedQuestionId,
            );

        if (!selectedStillExists) {
            setSelectedQuestionId(
                questions[0].id,
            );
        }
    }, [
        questions,
        selectedQuestionId,
    ]);

    const selectedQuestion =
        useMemo(() => {
            if (
                questions.length === 0
            ) {
                return null;
            }

            return (
                questions.find(
                    (question) =>
                        question.id ===
                        selectedQuestionId,
                ) ??
                questions[0]
            );
        }, [
            questions,
            selectedQuestionId,
        ]);

    const selectedAnalytics =
        useMemo<
            SessionQuestionAnalytics | null
        >(() => {
            if (!selectedQuestion) {
                return null;
            }

            return (
                analytics?.questions.find(
                    (item) =>
                        item.question_id ===
                        selectedQuestion.id,
                ) ?? null
            );
        }, [
            analytics,
            selectedQuestion,
        ]);

    const totalResponses =
        selectedAnalytics?.total_responses ??
        0;

    const responseRate =
        selectedAnalytics?.response_rate ??
        selectedAnalytics?.participation_rate ??
        0;

    const distribution =
        selectedAnalytics?.distribution ??
        [];

    if (isLoading) {
        return (
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <div className="h-6 w-48 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />

                <div className="mt-6 h-[280px] animate-pulse rounded-xl bg-slate-100 dark:bg-slate-900" />
            </section>
        );
    }

    if (questions.length === 0) {
        return (
            <section className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center dark:border-slate-700 dark:bg-slate-950">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-900">
                    <BarChart3 className="h-7 w-7" />
                </div>

                <h2 className="mt-5 text-lg font-bold text-slate-900 dark:text-slate-100">
                    No question analytics yet
                </h2>

                <p className="mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
                    Question analytics will
                    appear here once questions
                    are created and
                    participants begin
                    responding.
                </p>
            </section>
        );
    }

    return (
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="flex flex-col gap-5 border-b border-slate-200 px-5 py-5 dark:border-slate-800 sm:px-6 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                        Question Performance
                    </p>

                    <h2 className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">
                        Question Analytics
                    </h2>
                </div>

                <div className="relative w-full lg:max-w-md">
                    <select
                        value={
                            selectedQuestion?.id ??
                            ""
                        }
                        onChange={(event) =>
                            setSelectedQuestionId(
                                event.target.value,
                            )
                        }
                        className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 pr-10 text-sm font-medium text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:focus:border-indigo-700 dark:focus:ring-indigo-950"
                    >
                        {questions.map(
                            (
                                question,
                                index,
                            ) => (
                                <option
                                    key={
                                        question.id
                                    }
                                    value={
                                        question.id
                                    }
                                >
                                    Q{index + 1}:{" "}
                                    {getQuestionPrompt(
                                        question,
                                    )}
                                </option>
                            ),
                        )}
                    </select>

                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>
            </div>

            {selectedQuestion ? (
                <div className="p-5 sm:p-6">
                    <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/40">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <CircleDot className="h-4 w-4 text-indigo-500" />

                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                        {getQuestionTypeLabel(
                                            selectedQuestion,
                                        )}
                                    </span>
                                </div>

                                <h3 className="mt-3 text-base font-bold leading-6 text-slate-900 dark:text-slate-100">
                                    {getQuestionPrompt(
                                        selectedQuestion,
                                    )}
                                </h3>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                        Responses
                                    </p>

                                    <p className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">
                                        {
                                            totalResponses
                                        }
                                    </p>
                                </div>

                                <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                        Rate
                                    </p>

                                    <p className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">
                                        {Math.round(
                                            Number(
                                                responseRate,
                                            ),
                                        )}
                                        %
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6">
                        {distribution.length >
                        0 ? (
                            <div className="space-y-4">
                                {distribution.map(
                                    (
                                        item,
                                        index,
                                    ) => {
                                        const count =
                                            Number(
                                                item.count ??
                                                    0,
                                            );

                                        const percentage =
                                            clampPercentage(
                                                Number(
                                                    item.percentage ??
                                                        0,
                                                ),
                                            );

                                        const label =
                                            item.label ||
                                            `Option ${
                                                index +
                                                1
                                            }`;

                                        return (
                                            <div
                                                key={
                                                    item.id ||
                                                    `${label}-${index}`
                                                }
                                            >
                                                <div className="mb-2 flex items-center justify-between gap-4">
                                                    <span className="truncate text-sm font-medium text-slate-700 dark:text-slate-300">
                                                        {
                                                            label
                                                        }
                                                    </span>

                                                    <span className="shrink-0 text-xs font-bold text-slate-500 dark:text-slate-400">
                                                        {
                                                            count
                                                        }{" "}
                                                        ·{" "}
                                                        {Math.round(
                                                            percentage,
                                                        )}
                                                        %
                                                    </span>
                                                </div>

                                                <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                                                    <div
                                                        className="h-full rounded-full bg-indigo-500 transition-all"
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
                            <div className="flex min-h-[180px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 px-6 text-center dark:border-slate-800">
                                <CheckCircle2 className="h-8 w-8 text-slate-300 dark:text-slate-700" />

                                <h4 className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-300">
                                    No responses yet
                                </h4>

                                <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                                    Response distribution
                                    will appear once
                                    participants answer
                                    this question.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            ) : null}
        </section>
    );
}