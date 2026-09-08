"use client";

import { useState } from "react";
import { BarChart3, LayoutDashboard, Users, Activity } from "lucide-react";

interface ResponseWorkspaceProps {
    responseCount?: number;
    participantCount?: number;
    participantsLabel?: string;
    onParticipantsNavigate?: (filter?: "all" | "responded" | "waiting") => void;
    participants?: React.ReactNode | ((filter: "all" | "responded" | "waiting") => React.ReactNode);
    overview: React.ReactNode;
    distribution: React.ReactNode;
    activity?: React.ReactNode;
}

type ResponseWorkspaceView =
    | "overview"
    | "distribution"
    | "participants"
    | "activity";

const views = [
    { id: "overview" as const, label: "Overview", icon: LayoutDashboard },
    { id: "distribution" as const, label: "Distribution", icon: BarChart3 },
    { id: "participants" as const, label: "Participants", icon: Users },
    { id: "activity" as const, label: "Activity", icon: Activity },
];

export function ResponseWorkspace({
    overview,
    distribution,
    participants,
    activity,
    responseCount = 0,
    participantCount = 0,
    participantsLabel = "View participant details",
    onParticipantsNavigate,
}: ResponseWorkspaceProps) {
    const [activeView, setActiveView] =
        useState<ResponseWorkspaceView>("overview");
    const [participantFilter, setParticipantFilter] =
        useState<"all" | "responded" | "waiting">("all");

    const navigateToParticipants = (
        filter: "all" | "responded" | "waiting" = "all",
    ) => {
        setParticipantFilter(filter);
        onParticipantsNavigate?.(filter);
        setActiveView("participants");
    };

    const content =
        activeView === "overview"
            ? overview
            : activeView === "distribution"
              ? distribution
              : activeView === "participants"
                ? (typeof participants === "function"
                    ? participants(participantFilter)
                    : participants) ?? (
                    <WorkspacePlaceholder
                        title="Participants"
                        description="Participant response tools will be added in the next step."
                    />
                )
                : activity ?? (
                    <WorkspacePlaceholder
                        title="Activity"
                        description="Live response activity will be added in the next step."
                    />
                );

    return (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="flex flex-col gap-4 border-b border-slate-200 px-4 py-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Live Responses
                    </p>
                    <h3 className="mt-1 text-lg font-bold text-slate-950 dark:text-slate-50">
                        Response Workspace
                    </h3>
                </div>

                <div className="flex w-full gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1 dark:bg-slate-900 sm:w-auto">
                    {views.map((view) => {
                        const Icon = view.icon;
                        const active = activeView === view.id;

                        return (
                            <button
                                key={view.id}
                                type="button"
                                onClick={() => view.id === "participants" ? navigateToParticipants("all") : setActiveView(view.id)}
                                className={[
                                    "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-all duration-200",
                                    active
                                        ? "bg-white text-indigo-600 shadow-sm dark:bg-slate-800 dark:text-indigo-400"
                                        : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100",
                                ].join(" ")}
                            >
                                <Icon className="h-4 w-4" />
                                <span>{view.label}</span>
                                {view.id === "participants" && participantCount > 0 ? (
                                    <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500 dark:bg-slate-700">
                                        {participantCount}
                                    </span>
                                ) : null}
                                {view.id === "activity" && responseCount > 0 ? (
                                    <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500 dark:bg-slate-700">
                                        {responseCount}
                                    </span>
                                ) : null}
                            </button>
                        );
                    })}
                </div>
            </div>

            {activeView === "overview" && onParticipantsNavigate ? (
                <div className="border-b border-slate-100 px-5 py-3 dark:border-slate-800">
                    <button
                        type="button"
                        onClick={() => {
                            navigateToParticipants("all");
                        }}
                        className="text-sm font-semibold text-indigo-600 transition hover:text-indigo-700 dark:text-indigo-400"
                    >
                        {participantsLabel} →
                    </button>
                </div>
            ) : null}

            <div className="min-h-[300px] animate-in fade-in-50 slide-in-from-bottom-1 duration-200">
                {content}
            </div>
        </section>
    );
}

function WorkspacePlaceholder({
    title,
    description,
}: {
    title: string;
    description: string;
}) {
    return (
        <div className="flex min-h-[300px] flex-col items-center justify-center px-6 text-center">
            <h4 className="font-bold text-slate-900 dark:text-slate-100">
                {title}
            </h4>
            <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500 dark:text-slate-400">
                {description}
            </p>
        </div>
    );
}
