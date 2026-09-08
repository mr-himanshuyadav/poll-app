"use client";

import {
    Check,
    Copy,
    ExternalLink,
    Gauge,
    Home,
    Link2,
    Pause,
    Play,
    Presentation,
    Users,
    Settings,
    Square,
} from "lucide-react";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

import type {
    Session,
    SessionStatus,
    Template,
    SessionQuestion,
} from "./live-studio-types";

import {
    getSessionStatusClassName,
    getSessionStatusLabel,
} from "./live-studio-utils";

interface LiveStudioHeaderProps {
    session: Session;
    template?: Template | null;
    questions?: SessionQuestion[];
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

function SessionStatusIndicator({ status }: { status: SessionStatus }) {
    const label = getSessionStatusLabel(status);
    const className = getSessionStatusClassName(status);
    const isLive = status === "live";
    const isPaused = status === "paused";

    return (
        <div className={["inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-wide", className].join(" ")}>
            {isLive ? (
                <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-40" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-current" />
                </span>
            ) : null}
            {isPaused ? <Pause className="h-3.5 w-3.5" /> : null}
            {status === "completed" ? <Check className="h-3.5 w-3.5 fill-current text-slate-500 dark:text-slate-400" /> : null}
            {label}
        </div>
    );
}

export function LiveStudioHeader({
    session,
    template,
    questions = [],
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
    const sessionName = session.name ?? template?.title ?? "Live Session";
    const projectorLive = session.projector_display_type !== "waiting";
    const projectorTitle =
        session.projector_display_type === "results" ? "Results" :
        session.projector_display_type === "question" ? "Question" : isCompleted ? "No display" : "Waiting";
    const projectorQuestionNumber = session.projector_question_id
        ? (questions.findIndex((question) => question.id === session.projector_question_id) + 1 || null)
        : null;

    const studentLive = session.student_display_type !== "waiting";
    const studentTitle =
        session.student_display_type === "results" ? "Results" :
        session.student_display_type === "question" ? "Question" : isCompleted ? "No display" : "Waiting";
    const studentQuestionNumber = session.student_question_id
        ? (questions.findIndex((question) => question.id === session.student_question_id) + 1 || null)
        : null;

    const [copiedItem, setCopiedItem] = useState<"code" | "link" | null>(null);

    useEffect(() => {
        if (!copiedItem) return;
        const timeout = window.setTimeout(() => setCopiedItem(null), 1600);
        return () => window.clearTimeout(timeout);
    }, [copiedItem]);

    const handleCopy = (item: "code" | "link", action?: () => void) => {
        action?.();
        setCopiedItem(item);
    };

    const isPaused = session.status === "paused";
    const isCompleted = session.status === "completed";

    return (
        <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
            <div className="w-full px-4 py-4 sm:px-6 lg:px-8">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                        <button type="button" onClick={onBack} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400" aria-label="Home" title="Control Center"><Home className="h-5 w-5" /></button>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <h1 className="truncate text-lg font-bold tracking-tight text-slate-950 dark:text-slate-50 sm:text-xl">
{sessionName}
                                </h1>
                                <span className="hidden rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 sm:inline-flex dark:bg-slate-900 dark:text-slate-400">
                                    Live Studio
                                </span>
                                {onOpenSettings ? <Button type="button" variant="ghost" size="icon" onClick={onOpenSettings} disabled={isUpdating} aria-label="Session settings" title="Session settings" className="h-8 w-8"><Settings className="h-4 w-4" /></Button> : null}
                                <ThemeToggle />
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <SessionStatusIndicator status={session.status} />
                        {!isCompleted && isPaused && onResumeSession ? <Button type="button" variant="outline" disabled={isUpdating} onClick={onResumeSession}><Play className="mr-2 h-4 w-4" /> Resume</Button> : null}
                        {!isCompleted && !isPaused && onPauseSession ? <Button type="button" variant="outline" disabled={isUpdating} onClick={onPauseSession}><Pause className="h-4 w-4" /> Pause</Button> : null}
                        {!isCompleted && onEndSession ? <Button type="button" variant="destructive" disabled={isUpdating} onClick={onEndSession}><Square className="h-4 w-4 fill-current" /> End</Button> : null}
                    </div>
                </div>

                <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-3 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                        <div className="flex h-[58px] items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900">
                            {isCompleted ? <><Gauge className="h-5 w-5 text-indigo-500" /><span className="text-lg font-extrabold text-slate-700 dark:text-slate-200">{participantCount}</span><span className="text-slate-500">joined</span></> : <><div className="flex items-center gap-1.5"><Gauge className="h-5 w-5 text-indigo-500" /><span className="text-lg font-extrabold text-slate-700 dark:text-slate-200">{activeParticipantCount}</span><span className="text-slate-500">active</span></div><span className="text-slate-300 dark:text-slate-700">/</span><span className="font-bold text-slate-700 dark:text-slate-200">{participantCount}</span><span className="text-slate-500">joined</span></>}
                        </div>
                        <div className="h-8 w-px bg-slate-200 dark:bg-slate-800" />
                        <div className="flex h-[58px] items-center rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="px-2"><span className="text-[10px] font-bold uppercase text-slate-400">Session Code</span><div className="font-mono text-lg font-extrabold tracking-widest text-slate-900 dark:text-slate-100">{session.join_code}</div></div>{onCopyJoinCode ? <Button type="button" variant="ghost" size="icon" onClick={() => handleCopy("code", onCopyJoinCode)} aria-label="Copy join code" title={copiedItem === "code" ? "Copied" : "Copy join code"}><span className="relative flex h-4 w-4 items-center justify-center">{copiedItem === "code" ? <Check className="absolute h-4 w-4 animate-in zoom-in-50 duration-200" /> : <Copy className="absolute h-4 w-4 animate-in fade-in zoom-in-75 duration-200" />}</span></Button> : null}{!isCompleted && onCopyStudentLink ? <Button type="button" variant="ghost" size="icon" onClick={() => handleCopy("link", onCopyStudentLink)} aria-label="Copy session link" title={copiedItem === "link" ? "Copied" : "Copy session link"}><span className="relative flex h-4 w-4 items-center justify-center">{copiedItem === "link" ? <Check className="absolute h-4 w-4 animate-in zoom-in-50 duration-200" /> : <Link2 className="absolute h-4 w-4 animate-in fade-in zoom-in-75 duration-200" />}</span></Button> : null}</div>
                    </div>
                    <div className="ml-auto flex items-center gap-3"><div
                            className={["flex min-w-0 items-center gap-3 rounded-2xl border bg-slate-50 px-3 py-2.5 text-left shadow-sm dark:bg-slate-900/70", isCompleted ? "border-slate-200 opacity-60 dark:border-slate-800" : studentLive ? "border-indigo-300 dark:border-indigo-800/70" : "border-slate-200 dark:border-slate-800"].join(" ")}
                            title="What students are currently seeing"
                        >
                            <div className={["relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border", studentLive ? "border-indigo-400 bg-white text-indigo-600 dark:border-indigo-700 dark:bg-slate-950 dark:text-indigo-400" : "border-slate-200 bg-white text-slate-400 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-500"].join(" ")}>
                                {studentLive ? <><span className="pointer-events-none absolute inset-0 rounded-xl border border-indigo-400/70 studio-live-wave" /><span className="pointer-events-none absolute inset-0 rounded-xl border border-indigo-400/40 studio-live-wave studio-live-wave-delay" /></> : null}
                                <Users className="relative z-10 h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Students</span>
                                <p className="mt-0.5 truncate text-sm font-bold text-slate-800 dark:text-slate-100">
                                    {studentTitle}{studentQuestionNumber ? ` · ${studentQuestionNumber}` : ""}
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={onOpenProjector}
                            className={["group flex min-w-0 items-center gap-3 rounded-2xl border bg-slate-50 px-3 py-2.5 text-left transition hover:bg-indigo-50 dark:bg-slate-900/70 dark:hover:bg-indigo-950/30", isCompleted ? "border-slate-200 opacity-60 dark:border-slate-800" : projectorLive ? "border-emerald-300 dark:border-emerald-800/70" : "border-slate-200 hover:border-indigo-300 dark:border-slate-800 dark:hover:border-indigo-800"].join(" ")}
                            title="Open projector in a new tab"
                        >
                            <div className={["relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border", projectorLive ? "border-emerald-200 bg-white text-emerald-600 dark:border-emerald-900/60 dark:bg-slate-950 dark:text-emerald-400" : "border-slate-200 bg-white text-slate-400 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-500"].join(" ") }>
                                {projectorLive ? <><span className="pointer-events-none absolute inset-0 rounded-xl border border-emerald-400/70 studio-live-wave" /><span className="pointer-events-none absolute inset-0 rounded-xl border border-emerald-400/40 studio-live-wave studio-live-wave-delay" /></> : null}
                                <Presentation className="relative z-10 h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Projector</span>
                                    <ExternalLink className="h-3 w-3 text-slate-400 transition group-hover:text-indigo-500" />
                                </div>
                                <p className="mt-0.5 truncate text-sm font-bold text-slate-800 dark:text-slate-100">
                                    {projectorTitle}{projectorQuestionNumber ? ` · ${projectorQuestionNumber}` : ""}
                                </p>
                            </div>
                                                    </button>

</div>
                </div>
            </div>
<style jsx>{`
                @keyframes studio-live-wave {
                    0% { transform: scale(1); opacity: .75; }
                    100% { transform: scale(1.45); opacity: 0; }
                }
                .studio-live-wave { animation: studio-live-wave 1.8s ease-out infinite; }
                .studio-live-wave-delay { animation-delay: .9s; }
            `}</style>
                </header>
    );
}
