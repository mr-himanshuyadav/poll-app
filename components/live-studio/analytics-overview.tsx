"use client";

import type { ReactNode } from "react";

import {
    Activity,
    BarChart3,
    CheckCircle2,
    Users,
} from "lucide-react";

import type {
    SessionAnalytics,
} from "./live-studio-types";

interface AnalyticsOverviewProps {
    analytics: SessionAnalytics | null;

    isLoading?: boolean;

    isUpdating?: boolean;
}

interface AnalyticsMetric {
    label: string;

    value: string | number;

    description: string;

    icon: ReactNode;
}

function formatPercentage(
    value: number,
): string {
    if (!Number.isFinite(value)) {
        return "0%";
    }

    return `${Math.round(value)}%`;
}

export function AnalyticsOverview({
    analytics,
    isLoading = false,
    isUpdating = false,
}: AnalyticsOverviewProps) {
    const totalParticipants =
        analytics?.total_participants ??
        0;

    const totalResponses =
        analytics?.total_responses ??
        0;

    const answeredQuestions =
        analytics?.answered_questions ??
        0;

    const averageResponseRate =
        analytics?.average_response_rate ??
        analytics?.response_rate ??
        0;

    const metrics: AnalyticsMetric[] = [
        {
            label: "Participants",

            value: totalParticipants,

            description:
                "Total audience members who joined.",

            icon: (
                <Users className="h-5 w-5" />
            ),
        },

        {
            label: "Responses",

            value: totalResponses,

            description:
                "Responses received across the session.",

            icon: (
                <Activity className="h-5 w-5" />
            ),
        },

        {
            label:
                "Questions Answered",

            value: answeredQuestions,

            description:
                "Questions that received participant responses.",

            icon: (
                <CheckCircle2 className="h-5 w-5" />
            ),
        },

        {
            label: "Response Rate",

            value: formatPercentage(
                Number(
                    averageResponseRate,
                ),
            ),

            description:
                "Average participant response rate.",

            icon: (
                <BarChart3 className="h-5 w-5" />
            ),
        },
    ];

    if (isLoading) {
        return (
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {Array.from({
                    length: 4,
                }).map((_, index) => (
                    <div
                        key={index}
                        className="h-[150px] animate-pulse rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900"
                    />
                ))}
            </section>
        );
    }

    return (
        <section>
            <div className="mb-3 flex items-center justify-between">
                <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                        Session Overview
                    </h2>

                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        High-level performance
                        across the live
                        session.
                    </p>
                </div>

                {isUpdating ? (
                    <span className="text-xs font-medium text-slate-400">
                        Updating…
                    </span>
                ) : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {metrics.map(
                    (metric) => (
                        <div
                            key={metric.label}
                            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition dark:border-slate-800 dark:bg-slate-950"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
                                    {
                                        metric.icon
                                    }
                                </div>

                                <span className="text-2xl font-bold tracking-tight text-slate-950 dark:text-slate-50">
                                    {
                                        metric.value
                                    }
                                </span>
                            </div>

                            <div className="mt-5">
                                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                    {
                                        metric.label
                                    }
                                </p>

                                <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                                    {
                                        metric.description
                                    }
                                </p>
                            </div>
                        </div>
                    ),
                )}
            </div>
        </section>
    );
}