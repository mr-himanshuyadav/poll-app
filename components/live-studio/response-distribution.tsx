"use client";

import {
    BarChart3,
    Users,
} from "lucide-react";

import type {
    QuestionAnalytics,
    SessionQuestion,
    SessionResponse,
} from "./live-studio-types";

import {
    formatPercentage,
    getQuestionOptionLabel,
    getQuestionPrompt,
} from "./live-studio-utils";

interface ResponseDistributionProps {
    question: SessionQuestion | null;

    analytics: QuestionAnalytics | null;

    responses: SessionResponse[];
}

export function ResponseDistribution({
    question,
    analytics,
    responses,
}: ResponseDistributionProps) {
    if (!question) {
        return (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-400 dark:bg-slate-900">
                        <BarChart3 className="h-5 w-5" />
                    </div>

                    <div>
                        <h3 className="font-bold text-slate-900 dark:text-slate-100">
                            Response Distribution
                        </h3>

                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            No live question selected
                        </p>
                    </div>
                </div>
            </section>
        );
    }

    /*
     * The Live Studio distribution must be based on the
     * realtime response rows for the viewed question.
     *
     * Session analytics refreshes independently and can contain
     * stale or differently-normalized values after schema changes.
     */
    const answerToString = (
        answer: unknown,
    ): string => {
        if (typeof answer === "string") {
            return answer;
        }

        if (
            typeof answer === "number" ||
            typeof answer === "boolean"
        ) {
            return String(answer);
        }

        if (answer === null) {
            return "";
        }

        if (Array.isArray(answer)) {
            return answer
                .map(answerToString)
                .join(", ");
        }

        try {
            return JSON.stringify(answer);
        } catch {
            return String(answer);
        }
    };

    const optionLabels = question.options.map(
        (option) => String(option),
    );

    const responseCounts = new Map<
        string,
        number
    >();

    for (const response of responses) {
        const answer = answerToString(
            response.answer,
        );

        responseCounts.set(
            answer,
            (responseCounts.get(answer) ?? 0) +
                1,
        );
    }

    const totalResponses = responses.length;

    const distribution = optionLabels.map(
        (label, index) => {
            const count =
                responseCounts.get(label) ?? 0;

            return {
                key: `${index}-${label}`,
                label,
                count,
                percentage:
                    totalResponses > 0
                        ? (count / totalResponses) *
                          100
                        : 0,
            };
        },
    );

    const hasDistribution =
        totalResponses > 0;

    return (
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800 sm:px-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-400">
                            <BarChart3 className="h-5 w-5" />
                        </div>

                        <div>
                            <h3 className="font-bold text-slate-950 dark:text-slate-50">
                                Response Distribution
                            </h3>

                            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                Live breakdown of
                                submitted responses
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 self-start rounded-lg bg-slate-50 px-3 py-2 text-xs dark:bg-slate-900 sm:self-auto">
                        <Users className="h-3.5 w-3.5 text-slate-400" />

                        <span className="font-semibold text-slate-700 dark:text-slate-200">
                            {totalResponses}
                        </span>

                        <span className="text-slate-500 dark:text-slate-400">
                            responses
                        </span>
                    </div>
                </div>
            </div>

            <div className="p-5 sm:p-6">
                <p className="mb-6 line-clamp-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                    {getQuestionPrompt(
                        question,
                    )}
                </p>

                {hasDistribution ? (
                    <div className="space-y-4">
                        {distribution.map(
                            (
                                option,
                                index,
                            ) => (
                                <div
                                    key={
                                        option.key
                                    }
                                >
                                    <div className="mb-2 flex items-center justify-between gap-4">
                                        <div className="flex min-w-0 items-center gap-3">
                                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-100 text-xs font-bold text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                                                {getQuestionOptionLabel(
                                                    index,
                                                )}
                                            </span>

                                            <span className="truncate text-sm font-semibold text-slate-700 dark:text-slate-200">
                                                {
                                                    option.label
                                                }
                                            </span>
                                        </div>

                                        <div className="flex shrink-0 items-center gap-3">
                                            <span className="text-xs font-medium text-slate-400">
                                                {
                                                    option.count
                                                }
                                            </span>

                                            <span className="min-w-[42px] text-right text-sm font-bold text-slate-900 dark:text-slate-100">
                                                {formatPercentage(
                                                    option.percentage,
                                                )}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                                        <div
                                            className="h-full rounded-full bg-indigo-600 transition-all duration-500 dark:bg-indigo-400"
                                            style={{
                                                width: `${Math.min(
                                                    100,
                                                    Math.max(
                                                        0,
                                                        option.percentage,
                                                    ),
                                                )}%`,
                                            }}
                                        />
                                    </div>
                                </div>
                            ),
                        )}
                    </div>
                ) : (
                    <div className="flex min-h-[220px] flex-col items-center justify-center text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400 dark:bg-slate-900">
                            <BarChart3 className="h-5 w-5" />
                        </div>

                        <p className="mt-4 text-sm font-semibold text-slate-700 dark:text-slate-200">
                            No responses yet
                        </p>

                        <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500 dark:text-slate-400">
                            Response distribution
                            will update automatically
                            as participants submit
                            their answers.
                        </p>
                    </div>
                )}
            </div>
        </section>
    );
}