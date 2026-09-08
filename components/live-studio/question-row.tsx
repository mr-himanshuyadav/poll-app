"use client";

import {
    CheckCircle2,
    Circle,
    Eye,
    Play,
    Radio,
} from "lucide-react";

import { Button } from "@/components/ui/button";

import type {
    SessionQuestion,
} from "./live-studio-types";

import {
    getQuestionPrompt,
    getQuestionStatusClassName,
    getQuestionStatusLabel,
    getQuestionTypeLabel,
} from "./live-studio-utils";

interface QuestionRowProps {
    question: SessionQuestion;

    position: number;

    isSelected: boolean;

    isActive: boolean;

    isUpdating?: boolean;

    viewOnly?: boolean;

    onSelect: () => void;

    onActivate: () => void;
}

export function QuestionRow({
    question,
    position,
    isSelected,
    isActive,
    isUpdating = false,
    viewOnly = false,
    onSelect,
    onActivate,
}: QuestionRowProps) {
    const isLive =
        isActive ||
        question.status === "active";

    const isClosed =
        question.status === "closed";

    return (
        <div
            className={[
                "group relative mb-1 rounded-xl border transition",
                isSelected
                    ? "border-indigo-200 bg-indigo-50/70 dark:border-indigo-900/60 dark:bg-indigo-950/30"
                    : "border-transparent hover:border-slate-200 hover:bg-slate-50 dark:hover:border-slate-800 dark:hover:bg-slate-900/60",
            ].join(" ")}
        >
            <button
                type="button"
                onClick={onSelect}
                className="flex w-full items-start gap-3 p-3 text-left"
            >
                <div
                    className={[
                        "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold",
                        isLive
                            ? "bg-emerald-500 text-white"
                            : isSelected
                              ? "bg-indigo-600 text-white"
                              : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300",
                    ].join(" ")}
                >
                    {viewOnly ? (
                        <Eye className="h-4 w-4" />
                    ) : isLive ? (
                        <Radio className="h-4 w-4" />
                    ) : isClosed ? (
                        <CheckCircle2 className="h-4 w-4" />
                    ) : (
                        position
                    )}
                </div>

                <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-semibold leading-5 text-slate-700 dark:text-slate-200">
                        {getQuestionPrompt(
                            question,
                        )}
                    </p>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                            {getQuestionTypeLabel(
                                question,
                            )}
                        </span>

                        <span
                            className={[
                                "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold",
                                getQuestionStatusClassName(
                                    question.status,
                                ),
                            ].join(" ")}
                        >
                            {getQuestionStatusLabel(
                                question.status,
                            )}
                        </span>
                    </div>
                </div>
            </button>

            <div className="flex items-center justify-between gap-3 px-3 pb-3">
                <div>
                    {viewOnly ? (
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-slate-400"><Eye className="h-3.5 w-3.5" />View only</span>
                    ) : isLive ? (
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                            <span className="relative flex h-2 w-2">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                            </span>
                            Live now
                        </span>
                    ) : isClosed ? (
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-slate-400">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Closed
                        </span>
                    ) : (
                        <span className="text-[10px] font-medium text-slate-400">
                            Ready to display
                        </span>
                    )}
                </div>

                {viewOnly ? (
                    <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={(event) => { event.stopPropagation(); onSelect(); }}><Eye className="mr-1.5 h-3.5 w-3.5" />View</Button>
                ) : isLive ? (
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                        Managing
                    </span>
                ) : isClosed ? (
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        disabled={isUpdating}
                        onClick={(event) => {
                            event.stopPropagation();
                            onSelect();
                        }}
                    >
                        <Eye className="mr-1.5 h-3.5 w-3.5" />
                        View
                    </Button>
                ) : (
                    <Button
                        type="button"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        disabled={isUpdating}
                        onClick={(event) => {
                            event.stopPropagation();
                            onActivate();
                        }}
                    >
                        <Play className="mr-1.5 h-3.5 w-3.5" />
                        Display
                    </Button>
                )}
            </div>


        </div>
    );
}
