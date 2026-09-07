"use client";

import {
    ArrowLeft,
    Copy,
    ExternalLink,
    MoreHorizontal,
    Pause,
    Play,
    Presentation,
    Square,
} from "lucide-react";

import { Button } from "@/components/ui/button";

import type {
    Session,
    SessionStatus,
    Template,
} from "./live-studio-types";

import {
    getSessionStatusClassName,
    getSessionStatusLabel,
} from "./live-studio-utils";

interface LiveStudioHeaderProps {
    session: Session;

    template?: Template | null;

    participantCount: number;

    activeParticipantCount: number;

    isUpdating?: boolean;

    onBack: () => void;

    onOpenProjector: () => void;

    onCopyJoinCode?: () => void;

    onCopyStudentLink?: () => void;

    onPauseSession?: () => void;

    onResumeSession?: () => void;

    onEndSession?: () => void;

    onOpenSettings?: () => void;
}

function SessionStatusIndicator({
    status,
}: {
    status: SessionStatus;
}) {
    const label =
        getSessionStatusLabel(status);

    const className =
        getSessionStatusClassName(status);

    const isLive =
        status === "live";

    const isPaused =
        status === "paused";

    return (
        <div
            className={[
                "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-wide",
                className,
            ].join(" ")}
        >
            {isLive ? (
                <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-40" />

                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-current" />
                </span>
            ) : null}

            {isPaused ? (
                <Pause className="h-3.5 w-3.5" />
            ) : null}

            {status === "completed" ? (
                <Square className="h-3.5 w-3.5" />
            ) : null}

            {label}
        </div>
    );
}

export function LiveStudioHeader({
    session,
    template,
    participantCount,
    activeParticipantCount,
    isUpdating = false,
    onBack,
    onOpenProjector,
    onCopyJoinCode,
    onCopyStudentLink,
    onPauseSession,
    onResumeSession,
    onEndSession,
    onOpenSettings,
}: LiveStudioHeaderProps) {
    const sessionName =
        session.name ??
        session.title ??
        template?.title ??
        template?.name ??
        "Live Session";

    const isPaused =
        session.status === "paused";

    const isCompleted =
        session.status === "completed";

    return (
        <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
            <div className="mx-auto max-w-[1600px] px-4 py-4 sm:px-6 lg:px-8">
                <div className="flex flex-col gap-5">
                    {/* Top Row */}
                    <div className="flex items-center justify-between gap-3">
                        <button
                            type="button"
                            onClick={onBack}
                            className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-100"
                        >
                            <ArrowLeft className="h-4 w-4" />

                            <span>
                                Sessions
                            </span>
                        </button>

                        <div className="flex items-center gap-2">
                            <SessionStatusIndicator
                                status={
                                    session.status
                                }
                            />

                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={
                                    onOpenSettings
                                }
                                disabled={
                                    isUpdating
                                }
                                className="hidden sm:inline-flex"
                            >
                                <MoreHorizontal className="h-4 w-4" />

                                <span className="sr-only">
                                    Session options
                                </span>
                            </Button>
                        </div>
                    </div>

                    {/* Main Session Information */}
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className="truncate text-2xl font-bold tracking-tight text-slate-950 dark:text-slate-50 sm:text-3xl">
                                    {sessionName}
                                </h1>

                                <div className="sm:hidden">
                                    <SessionStatusIndicator
                                        status={
                                            session.status
                                        }
                                    />
                                </div>
                            </div>

                            {template?.title ||
                            template?.name ? (
                                <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
                                    {template.title ??
                                        template.name}
                                </p>
                            ) : null}

                            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                                        Join Code
                                    </span>

                                    <code className="rounded-md bg-slate-100 px-2 py-1 font-mono text-sm font-bold tracking-wider text-slate-800 dark:bg-slate-900 dark:text-slate-200">
                                        {
                                            session.join_code
                                        }
                                    </code>

                                    {onCopyJoinCode ? (
                                        <button
                                            type="button"
                                            onClick={
                                                onCopyJoinCode
                                            }
                                            className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-900 dark:hover:text-slate-100"
                                            aria-label="Copy join code"
                                        >
                                            <Copy className="h-3.5 w-3.5" />
                                        </button>
                                    ) : null}
                                </div>

                                <div className="hidden h-4 w-px bg-slate-200 dark:bg-slate-800 sm:block" />

                                <div className="flex items-center gap-1.5 text-sm">
                                    <span className="flex h-2 w-2 rounded-full bg-emerald-500" />

                                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                                        {
                                            activeParticipantCount
                                        }
                                    </span>

                                    <span className="text-slate-500 dark:text-slate-400">
                                        active
                                    </span>

                                    <span className="text-slate-300 dark:text-slate-700">
                                        /
                                    </span>

                                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                                        {
                                            participantCount
                                        }
                                    </span>

                                    <span className="text-slate-500 dark:text-slate-400">
                                        joined
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap items-center gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={
                                    onOpenProjector
                                }
                            >
                                <Presentation className="mr-2 h-4 w-4" />

                                Projector

                                <ExternalLink className="ml-2 h-3.5 w-3.5 opacity-60" />
                            </Button>

                            {!isCompleted &&
                            isPaused &&
                            onResumeSession ? (
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled={
                                        isUpdating
                                    }
                                    onClick={
                                        onResumeSession
                                    }
                                >
                                    <Play className="mr-2 h-4 w-4" />

                                    Resume
                                </Button>
                            ) : null}

                            {!isCompleted &&
                            !isPaused &&
                            onPauseSession ? (
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled={
                                        isUpdating
                                    }
                                    onClick={
                                        onPauseSession
                                    }
                                >
                                    <Pause className="mr-2 h-4 w-4" />

                                    Pause
                                </Button>
                            ) : null}

                            {onOpenSettings ? (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={
                                        onOpenSettings
                                    }
                                    disabled={
                                        isUpdating
                                    }
                                    className="sm:hidden"
                                >
                                    <MoreHorizontal className="h-4 w-4" />

                                    <span className="sr-only">
                                        Session options
                                    </span>
                                </Button>
                            ) : null}

                            {onEndSession ? (
                                <Button
                                    type="button"
                                    variant="destructive"
                                    disabled={
                                        isUpdating ||
                                        isCompleted
                                    }
                                    onClick={
                                        onEndSession
                                    }
                                >
                                    <Square className="mr-2 h-4 w-4" />

                                    End Session
                                </Button>
                            ) : null}
                        </div>
                    </div>

                    {/* Compact Mobile Student Access */}
                    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 sm:hidden dark:border-slate-800 dark:bg-slate-900/50">
                        <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                                Student access
                            </p>

                            <p className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-slate-400">
                                Share the join code with
                                your students
                            </p>
                        </div>

                        {onCopyStudentLink ? (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={
                                    onCopyStudentLink
                                }
                            >
                                <Copy className="mr-1.5 h-3.5 w-3.5" />

                                Copy
                            </Button>
                        ) : null}
                    </div>
                </div>
            </div>
        </header>
    );
}