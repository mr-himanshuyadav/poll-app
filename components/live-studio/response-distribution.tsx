"use client";

import { useState } from "react";

import {
    ChartBar,
    ChartColumn,
    CircleGauge,
    ListOrdered,
    Percent,
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

export type ResponseVisualizationType =
    | "horizontal-bar"
    | "vertical-bar"
    | "donut"
    | "ranked"
    | "percentage";

interface ResponseDistributionProps {
    question: SessionQuestion | null;

    analytics: QuestionAnalytics | null;

    responses: SessionResponse[];

    /**
     * Visualization is intentionally controlled by the parent.
     * Step 1B will expose the instructor selector.
     */
    visualizationType?: ResponseVisualizationType;

    onVisualizationChange?: (
        visualization: ResponseVisualizationType,
    ) => void;

    embedded?: boolean;
    onOptionSelect?: (answer: string) => void;
}

export function ResponseDistribution({
    question,
    analytics,
    responses,
    visualizationType = "horizontal-bar",
    onVisualizationChange,
    embedded = false,
    onOptionSelect,
}: ResponseDistributionProps) {
    const [
        selectedVisualization,
        setSelectedVisualization,
    ] = useState<ResponseVisualizationType>(
        visualizationType,
    );
    if (!question) {
        return (
            <section
                className={
                    embedded
                        ? "p-5 sm:p-6"
                        : "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6"
                }
            >
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-400 dark:bg-slate-900">
                        <ChartBar className="h-5 w-5" />
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

    const chartColors = [
        "bg-indigo-500",
        "bg-violet-500",
        "bg-sky-500",
        "bg-emerald-500",
        "bg-amber-500",
        "bg-rose-500",
        "bg-cyan-500",
        "bg-fuchsia-500",
    ];

    const renderVisualization = () => {
        if (selectedVisualization === "donut") {
            const gradient = distribution
                .reduce<string[]>(
                    (segments, option, index) => {
                        const start = distribution
                            .slice(0, index)
                            .reduce(
                                (sum, item) =>
                                    sum + item.percentage,
                                0,
                            );
                        const end =
                            start + option.percentage;
                        const hue =
                            [
                                "#6366f1",
                                "#8b5cf6",
                                "#0ea5e9",
                                "#10b981",
                                "#f59e0b",
                                "#f43f5e",
                                "#06b6d4",
                                "#d946ef",
                            ][index % 8];

                        segments.push(
                            `${hue} ${start}% ${end}%`,
                        );

                        return segments;
                    },
                    [],
                )
                .join(", ");

            return (
                <div className="grid gap-6 lg:grid-cols-[minmax(0,220px)_1fr] lg:items-center">
                    <div className="relative mx-auto h-52 w-52 rounded-full"
                        style={{
                            background:
                                `conic-gradient(${gradient})`,
                        }}
                    >
                        <div className="absolute inset-7 flex flex-col items-center justify-center rounded-full bg-white text-center dark:bg-slate-950">
                            <span className="text-3xl font-black text-slate-950 dark:text-white">
                                {totalResponses}
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Responses
                            </span>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {distribution.map((option, index) => (
                            <div
                                key={option.key}
                                className="flex items-center justify-between gap-3"
                            >
                                <div className="flex min-w-0 items-center gap-2">
                                    <span
                                        className={`h-2.5 w-2.5 shrink-0 rounded-full ${chartColors[index % chartColors.length]}`}
                                    />
                                    <span className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">
                                        {option.label}
                                    </span>
                                </div>
                                <span className="shrink-0 text-sm font-bold text-slate-900 dark:text-slate-100">
                                    {formatPercentage(option.percentage)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        if (selectedVisualization === "vertical-bar") {
            const maxPercentage = Math.max(
                ...distribution.map(
                    (item) => item.percentage,
                ),
                1,
            );

            return (
                <div className="flex min-h-[260px] items-end gap-3 overflow-x-auto pb-2">
                    {distribution.map((option, index) => (
                        <div
                            key={option.key}
                            className="flex min-w-16 flex-1 flex-col items-center gap-2"
                        >
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                                {formatPercentage(option.percentage)}
                            </span>
                            <div className="flex h-44 w-full items-end rounded-lg bg-slate-100 p-1 dark:bg-slate-900">
                                <div
                                    className={`w-full rounded-md transition-all duration-500 ${chartColors[index % chartColors.length]}`}
                                    style={{
                                        height: `${Math.max(
                                            4,
                                            (option.percentage /
                                                maxPercentage) *
                                                100,
                                        )}%`,
                                    }}
                                />
                            </div>
                            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-100 text-xs font-bold text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                                {getQuestionOptionLabel(index)}
                            </span>
                        </div>
                    ))}
                </div>
            );
        }

        if (selectedVisualization === "ranked") {
            return (
                <div className="space-y-3">
                    {[...distribution]
                        .sort(
                            (a, b) =>
                                b.count - a.count,
                        )
                        .map((option, index) => (
                            <div
                                key={option.key}
                                onClick={() => onOptionSelect?.(option.label)}
                                className={`flex items-center gap-3 rounded-xl border border-slate-100 p-3 transition-all dark:border-slate-800 ${onOptionSelect ? "cursor-pointer hover:border-indigo-200 hover:bg-indigo-50/40 dark:hover:border-indigo-900 dark:hover:bg-indigo-950/20" : ""}`}
                            >
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-black text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                                    #{index + 1}
                                </span>
                                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-700 dark:text-slate-200">
                                    {option.label}
                                </span>
                                <span className="text-sm font-bold text-slate-950 dark:text-white">
                                    {option.count}
                                </span>
                                <span className="w-14 text-right text-xs font-semibold text-slate-400">
                                    {formatPercentage(option.percentage)}
                                </span>
                            </div>
                        ))}
                </div>
            );
        }

        if (selectedVisualization === "percentage") {
            return (
                <div className="grid gap-3 sm:grid-cols-2">
                    {distribution.map((option, index) => (
                        <div
                            key={option.key}
                            onClick={() => onOptionSelect?.(option.label)}
                            className={`rounded-xl border border-slate-100 p-4 transition-all dark:border-slate-800 ${onOptionSelect ? "cursor-pointer hover:border-indigo-200 hover:bg-indigo-50/40 dark:hover:border-indigo-900 dark:hover:bg-indigo-950/20" : ""}`}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <span className="line-clamp-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                                    {option.label}
                                </span>
                                <span className={`h-3 w-3 shrink-0 rounded-full ${chartColors[index % chartColors.length]}`} />
                            </div>
                            <div className="mt-5 flex items-end justify-between">
                                <span className="text-3xl font-black tracking-tight text-slate-950 dark:text-white">
                                    {formatPercentage(option.percentage)}
                                </span>
                                <span className="text-sm font-semibold text-slate-400">
                                    {option.count} votes
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            );
        }

        return (
            <div className="space-y-4">
                {distribution.map((option, index) => (
                    <div key={option.key} onClick={() => onOptionSelect?.(option.label)} className={onOptionSelect ? "cursor-pointer rounded-lg p-1 transition hover:bg-indigo-50/60 dark:hover:bg-indigo-950/20" : ""}>
                        <div className="mb-2 flex items-center justify-between gap-4">
                            <div className="flex min-w-0 items-center gap-3">
                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-100 text-xs font-bold text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                                    {getQuestionOptionLabel(index)}
                                </span>
                                <span className="truncate text-sm font-semibold text-slate-700 dark:text-slate-200">
                                    {option.label}
                                </span>
                            </div>
                            <div className="flex shrink-0 items-center gap-3">
                                <span className="text-xs font-medium text-slate-400">
                                    {option.count}
                                </span>
                                <span className="min-w-[42px] text-right text-sm font-bold text-slate-900 dark:text-slate-100">
                                    {formatPercentage(option.percentage)}
                                </span>
                            </div>
                        </div>
                        <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                            <div
                                className="h-full rounded-full bg-indigo-600 transition-all duration-500 dark:bg-indigo-400"
                                style={{
                                    width: `${Math.min(100, Math.max(0, option.percentage))}%`,
                                }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <section
            className={
                embedded
                    ? "bg-transparent"
                    : "rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950"
            }
        >
            <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800 sm:px-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-400">
                            <ChartBar className="h-5 w-5" />
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

                    <div className="flex flex-wrap items-center gap-2 self-start sm:justify-end">
                        <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-900">
                            {[
                                {
                                    type: "horizontal-bar" as const,
                                    label: "Horizontal bars",
                                    icon: ChartBar,
                                },
                                {
                                    type: "vertical-bar" as const,
                                    label: "Vertical bars",
                                    icon: ChartColumn,
                                },
                                {
                                    type: "donut" as const,
                                    label: "Donut chart",
                                    icon: CircleGauge,
                                },
                                {
                                    type: "ranked" as const,
                                    label: "Ranked results",
                                    icon: ListOrdered,
                                },
                                {
                                    type: "percentage" as const,
                                    label: "Percentage cards",
                                    icon: Percent,
                                },
                            ].map((item) => {
                                const Icon = item.icon;
                                const active =
                                    selectedVisualization ===
                                    item.type;

                                return (
                                    <button
                                        key={item.type}
                                        type="button"
                                        title={item.label}
                                        aria-label={item.label}
                                        onClick={() => {
                                            setSelectedVisualization(
                                                item.type,
                                            );
                                            onVisualizationChange?.(
                                                item.type,
                                            );
                                        }}
                                        className={
                                            `flex h-8 w-8 items-center justify-center rounded-md transition-all duration-200 ${
                                                active
                                                    ? "bg-white text-indigo-600 shadow-sm dark:bg-slate-800 dark:text-indigo-400"
                                                    : "text-slate-400 hover:bg-white hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                                            }`
                                        }
                                    >
                                        <Icon className="h-4 w-4" />
                                    </button>
                                );
                            })}
                        </div>

                    <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs dark:bg-slate-900">
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
            </div>

            <div className="p-5 sm:p-6">
                <p className="mb-6 line-clamp-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                    {getQuestionPrompt(
                        question,
                    )}
                </p>

                {hasDistribution ? (
                    <div className="animate-in fade-in duration-300">
                        {renderVisualization()}
                    </div>
                ) : (
                    <div className="flex min-h-[220px] flex-col items-center justify-center text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400 dark:bg-slate-900">
                            <ChartBar className="h-5 w-5" />
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