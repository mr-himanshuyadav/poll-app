"use client";

import {
    BarChart3,
    Users,
} from "lucide-react";

import type {
    SessionAnalytics,
    SessionQuestion,
} from "./live-studio-types";

import {
    AnalyticsOverview,
} from "./analytics-overview";

import {
    QuestionAnalytics,
} from "./question-analytics";

interface AnalyticsWorkspaceProps {
    analytics: SessionAnalytics | null;
    
    questions: SessionQuestion[];
    
    isLoading ? : boolean;
    
    isUpdating ? : boolean;
}

export function AnalyticsWorkspace({
    analytics,
    questions,
    isLoading = false,
    isUpdating = false,
}: AnalyticsWorkspaceProps) {
    const totalQuestions =
        questions.length;
    
    const totalParticipants =
        analytics?.total_participants ??
        0;
    
    return (
        <div className="w-full px-4 pb-24 pt-6 sm:px-6 md:pb-8 lg:px-8">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                        Session Insights
                    </p>

                    <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 dark:text-slate-50">
                        Analytics
                    </h1>

                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Understand participation,
                        responses and question
                        performance across your
                        live session.
                    </p>
                </div>

                <div className="flex gap-3">
                    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                        <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
                                <Users className="h-4 w-4" />
                            </div>

                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                    Participants
                                </p>

                                <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                                    {
                                        totalParticipants
                                    }
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                        <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-400">
                                <BarChart3 className="h-4 w-4" />
                            </div>

                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                    Questions
                                </p>

                                <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                                    {
                                        totalQuestions
                                    }
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                <AnalyticsOverview
                    analytics={analytics}
                    isLoading={isLoading}
                    isUpdating={isUpdating}
                />

                <QuestionAnalytics
                    analytics={analytics}
                    questions={questions}
                    isLoading={isLoading}
                />
            </div>
        </div>
    );
}