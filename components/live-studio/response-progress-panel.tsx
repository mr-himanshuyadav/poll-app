"use client";

import {
    CheckCircle2,
    Clock3,
    Users,
} from "lucide-react";

import type {
    SessionQuestion,
} from "./live-studio-types";

import {
    calculateProgressPercentage,
    formatPercentage,
    getQuestionStatusLabel,
} from "./live-studio-utils";

interface ResponseProgressPanelProps {
    totalParticipants: number;

    responseCount: number;

    activeQuestion: SessionQuestion | null;
    embedded?: boolean;
}

export function ResponseProgressPanel({
    totalParticipants,
    responseCount,
    activeQuestion,
    embedded = false,
}: ResponseProgressPanelProps) {
    const percentage =
        calculateProgressPercentage(
            responseCount,
            totalParticipants,
        );

    const remainingParticipants =
        Math.max(
            0,
            totalParticipants - responseCount,
        );

    const isQuestionLive =
        activeQuestion?.status === "active";

    return (
        <section
            className={
                embedded
                    ? "p-0"
                    : "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950"
            }
        >
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Response Progress
                    </p>

                    <h3 className="mt-1 text-lg font-bold text-slate-950 dark:text-slate-50">
                        Participation
                    </h3>
                </div>

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
                    <Users className="h-5 w-5" />
                </div>
            </div>

            {activeQuestion ? (
                <>
                    <div className="mt-6 flex items-end justify-between gap-4">
                        <div>
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-3xl font-bold tracking-tight text-slate-950 dark:text-slate-50">
                                    {responseCount}
                                </span>

                                <span className="text-sm font-medium text-slate-400">
                                    /{" "}
                                    {
                                        totalParticipants
                                    }
                                </span>
                            </div>

                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                participants responded
                            </p>
                        </div>

                        <div className="text-right">
                            <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                                {formatPercentage(
                                    percentage,
                                )}
                            </span>
                        </div>
                    </div>

                    <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                            className="h-full rounded-full bg-indigo-600 transition-all duration-500 dark:bg-indigo-400"
                            style={{
                                width: `${percentage}%`,
                            }}
                        />
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3">
                        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900/60">
                            <div className="flex items-center gap-2 text-slate-400">
                                <CheckCircle2 className="h-4 w-4" />

                                <span className="text-xs font-semibold">
                                    Responded
                                </span>
                            </div>

                            <p className="mt-2 text-lg font-bold text-slate-900 dark:text-slate-100">
                                {responseCount}
                            </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900/60">
                            <div className="flex items-center gap-2 text-slate-400">
                                <Clock3 className="h-4 w-4" />

                                <span className="text-xs font-semibold">
                                    Waiting
                                </span>
                            </div>

                            <p className="mt-2 text-lg font-bold text-slate-900 dark:text-slate-100">
                                {
                                    remainingParticipants
                                }
                            </p>
                        </div>
                    </div>

                    <div className="mt-5 rounded-xl border border-slate-100 px-3 py-3 dark:border-slate-800">
                        <div className="flex items-center justify-between gap-3">
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                Question status
                            </span>

                            <span
                                className={[
                                    "inline-flex items-center gap-1.5 text-xs font-bold",
                                    isQuestionLive
                                        ? "text-emerald-600 dark:text-emerald-400"
                                        : "text-slate-500 dark:text-slate-400",
                                ].join(" ")}
                            >
                                <span
                                    className={[
                                        "h-2 w-2 rounded-full",
                                        isQuestionLive
                                            ? "bg-emerald-500"
                                            : "bg-slate-400",
                                    ].join(
                                        " ",
                                    )}
                                />

                                {getQuestionStatusLabel(
                                    activeQuestion.status,
                                )}
                            </span>
                        </div>
                    </div>
                </>
            ) : (
                <div className="mt-8 flex min-h-[220px] flex-col items-center justify-center text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400 dark:bg-slate-900">
                        <Clock3 className="h-5 w-5" />
                    </div>

                    <p className="mt-4 text-sm font-semibold text-slate-700 dark:text-slate-200">
                        Waiting for a question
                    </p>

                    <p className="mt-1 max-w-[220px] text-xs leading-5 text-slate-500 dark:text-slate-400">
                        Response progress will
                        appear here once a
                        question becomes live.
                    </p>
                </div>
            )}
        </section>
    );
}