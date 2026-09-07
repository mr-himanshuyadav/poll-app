"use client";

import {
    BarChart3,
    Users,
    Zap,
    ListChecks,
} from "lucide-react";

import type {
    StudioTab,
} from "./live-studio-types";

interface LiveStudioTabsProps {
    activeTab: StudioTab;

    onTabChange: (
        tab: StudioTab,
    ) => void;

    participantCount?: number;

    questionCount?: number;
}

interface TabItem {
    id: StudioTab;

    label: string;

    icon: React.ComponentType<{
        className?: string;
    }>;

    badge?: number;
}

export function LiveStudioTabs({
    activeTab,
    onTabChange,
    participantCount,
    questionCount,
}: LiveStudioTabsProps) {
    const tabs: TabItem[] = [
        {
            id: "live",
            label: "Live",
            icon: Zap,
        },
        {
            id: "questions",
            label: "Questions",
            icon: ListChecks,
            badge: questionCount,
        },
        {
            id: "participants",
            label: "Participants",
            icon: Users,
            badge: participantCount,
        },
        {
            id: "analytics",
            label: "Analytics",
            icon: BarChart3,
        },
    ];

    return (
        <>
            {/* Desktop / Tablet Navigation */}
            <div className="hidden border-b border-slate-200 bg-white px-2 dark:border-slate-800 dark:bg-slate-950 md:block">
                <div className="mx-auto flex max-w-[1600px] items-center gap-1">
                    {tabs.map((tab) => {
                        const Icon =
                            tab.icon;

                        const isActive =
                            activeTab ===
                            tab.id;

                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() =>
                                    onTabChange(
                                        tab.id,
                                    )
                                }
                                className={[
                                    "relative flex items-center gap-2 px-4 py-4 text-sm font-semibold transition",
                                    isActive
                                        ? "text-indigo-600 dark:text-indigo-400"
                                        : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100",
                                ].join(" ")}
                            >
                                <Icon className="h-4 w-4" />

                                <span>
                                    {tab.label}
                                </span>

                                {typeof tab.badge ===
                                    "number" &&
                                tab.badge > 0 ? (
                                    <span
                                        className={[
                                            "flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                                            isActive
                                                ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
                                                : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
                                        ].join(
                                            " ",
                                        )}
                                    >
                                        {tab.badge}
                                    </span>
                                ) : null}

                                {isActive ? (
                                    <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-indigo-600 dark:bg-indigo-400" />
                                ) : null}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Mobile Bottom Navigation */}
            <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 md:hidden">
                <div className="grid grid-cols-4">
                    {tabs.map((tab) => {
                        const Icon =
                            tab.icon;

                        const isActive =
                            activeTab ===
                            tab.id;

                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() =>
                                    onTabChange(
                                        tab.id,
                                    )
                                }
                                className={[
                                    "relative flex min-h-[64px] flex-col items-center justify-center gap-1 px-2 text-[10px] font-semibold transition",
                                    isActive
                                        ? "text-indigo-600 dark:text-indigo-400"
                                        : "text-slate-500 dark:text-slate-400",
                                ].join(" ")}
                            >
                                <div className="relative">
                                    <Icon className="h-5 w-5" />

                                    {typeof tab.badge ===
                                        "number" &&
                                    tab.badge >
                                        0 ? (
                                        <span className="absolute -right-2 -top-2 flex min-w-4 items-center justify-center rounded-full bg-indigo-600 px-1 text-[8px] leading-4 text-white">
                                            {tab.badge >
                                            99
                                                ? "99+"
                                                : tab.badge}
                                        </span>
                                    ) : null}
                                </div>

                                <span>
                                    {tab.label}
                                </span>

                                {isActive ? (
                                    <span className="absolute bottom-0 h-0.5 w-8 rounded-full bg-indigo-600 dark:bg-indigo-400" />
                                ) : null}
                            </button>
                        );
                    })}
                </div>
            </nav>
        </>
    );
}