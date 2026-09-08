"use client";

import {
    BarChart3,
    CheckCircle2,
    ChevronRight,
    CircleDot,
    Eye,
    EyeOff,
    Play,
    Pencil,
    Radio,
    Square,
    X,
    ChevronDown,
    Users,
    MonitorUp,
} from "lucide-react";

import { useState } from "react";

import { Button } from "@/components/ui/button";

import type {
    SessionQuestion,
} from "./live-studio-types";

import {
    getQuestionOptionLabel,
    getQuestionPosition,
    getQuestionPrompt,
    getQuestionStatusClassName,
    getQuestionStatusLabel,
    getQuestionTypeLabel,
    getResultsModeLabel,
} from "./live-studio-utils";

interface LiveQuestionPanelProps {
    sessionId: string;

    question: SessionQuestion | null;

    activeQuestion: SessionQuestion | null;

    questions: SessionQuestion[];

    projectorResultsVisible?: boolean;

    defaultResultVisibility?: "students" | "projector" | "both";

    isUpdating?: boolean;

    onActivateQuestion: (
        question: SessionQuestion,
    ) => void;

    onCloseQuestion: () => void;

    onShowResults?: (
        target: "students" | "projector" | "both",
    ) => void;

    onShowResultsOnProjector?: () => void;

    onShowResultsOnBoth?: () => void;
    onShowLiveResults?: () => void;

    onHideResults?: () => void;

    onHideProjectorResults?: () => void;

    onConfirmReplaceLiveQuestion?: (
        question: SessionQuestion,
    ) => void;
    onEditQuestion?: () => void;
}

function getScaleNumber(
    value: unknown,
    fallback: number,
): number {
    if (
        typeof value === "number" &&
        Number.isFinite(value)
    ) {
        return value;
    }

    if (typeof value === "string") {
        const parsed = Number(value);

        if (Number.isFinite(parsed)) {
            return parsed;
        }
    }

    return fallback;
}

function getScaleLabel(
    value: unknown,
): string {
    return typeof value === "string"
        ? value
        : "";
}

export function LiveQuestionPanel({
    question,
    activeQuestion,
    questions,
    projectorResultsVisible = false,
    defaultResultVisibility = "both",
    isUpdating = false,
    onActivateQuestion,
    onCloseQuestion,
    onShowResults,
    onShowResultsOnProjector,
    onShowResultsOnBoth,
    onShowLiveResults,
    onHideResults,
    onHideProjectorResults,
    onConfirmReplaceLiveQuestion,
    onEditQuestion,
}: LiveQuestionPanelProps) {
    const [resultsMenuOpen, setResultsMenuOpen] =
        useState(false);

    if (!question) {
        const nextQuestion =
            [...questions]
                .sort(
                    (a, b) =>
                        (a.position ?? 0) -
                        (b.position ?? 0),
                )
                .find(
                    (item) =>
                        item.status !==
                        "closed",
                ) ?? null;

        return (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
                <div className="flex min-h-[420px] flex-col items-center justify-center px-6 py-12 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
                        <Radio className="h-8 w-8" />
                    </div>

                    <h2 className="mt-5 text-xl font-bold text-slate-950 dark:text-slate-50">
                        No question is live
                    </h2>

                    <p className="mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
                        Select a question from
                        your queue and make it
                        live when you are ready
                        for participants to
                        respond.
                    </p>

                    {nextQuestion ? (
                        <Button
                            type="button"
                            className="mt-6"
                            disabled={
                                isUpdating
                            }
                            onClick={() =>
                                onActivateQuestion(
                                    nextQuestion,
                                )
                            }
                        >
                            <Play className="mr-2 h-4 w-4" />

                            Start Next Question

                            <ChevronRight className="ml-1 h-4 w-4" />
                        </Button>
                    ) : null}
                </div>
            </div>
        );
    }

    const questionPosition =
        getQuestionPosition(
            question,
            questions,
        );

    const questionType =
        question.type ??
        "multiple_choice";

    const questionStatus =
        getQuestionStatusLabel(
            question.status,
        );

    const statusClassName =
        getQuestionStatusClassName(
            question.status,
        );

    const studentsResultsVisible =
        question.results_visible ===
        true;

    const resultsVisible =
        studentsResultsVisible ||
        projectorResultsVisible;

    const visibilityLabel =
        studentsResultsVisible &&
        projectorResultsVisible
            ? "Both"
            : studentsResultsVisible
            ? "Students"
            : projectorResultsVisible
            ? "Projector"
            : "Hidden";

    const isLive =
        question.status === "active";

    const canActivate =
        !isLive;

    const canClose = isLive;

    const anotherQuestionIsLive =
        activeQuestion !== null &&
        activeQuestion.id !== question.id;

    const activeQuestionPosition =
        anotherQuestionIsLive
            ? getQuestionPosition(
                  activeQuestion,
                  questions,
              )
            : null;

    const handleDisplayToStudents =
        () => {
            if (
                anotherQuestionIsLive &&
                onConfirmReplaceLiveQuestion
            ) {
                onConfirmReplaceLiveQuestion(
                    question,
                );

                return;
            }

            onActivateQuestion(question);
        };

    const scaleMin =
        getScaleNumber(
            question.config?.min,
            1,
        );

    const scaleMax =
        getScaleNumber(
            question.config?.max,
            5,
        );

    const normalizedScaleMin =
        Math.min(
            scaleMin,
            scaleMax,
        );

    const normalizedScaleMax =
        Math.max(
            scaleMin,
            scaleMax,
        );

    const scaleValues =
        Array.from(
            {
                length:
                    normalizedScaleMax -
                    normalizedScaleMin +
                    1,
            },
            (_, index) =>
                normalizedScaleMin +
                index,
        );

    const scaleMinLabel =
        getScaleLabel(
            question.config?.minLabel,
        );

    const scaleMaxLabel =
        getScaleLabel(
            question.config?.maxLabel,
        );

    const scaleLabels =
        question.config?.scaleLabels && typeof question.config.scaleLabels === "object"
            ? question.config.scaleLabels as Record<string, string>
            : {};

    return (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 ease-out dark:border-slate-800 dark:bg-slate-950">
            {anotherQuestionIsLive ? (
                <div className="animate-in fade-in slide-in-from-top-2 border-b border-amber-200 bg-amber-50/80 px-5 py-2.5 duration-300 dark:border-amber-900/60 dark:bg-amber-950/30 sm:px-6">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2 text-xs font-semibold text-amber-800 dark:text-amber-200">
                            <span className="relative flex h-2.5 w-2.5 shrink-0">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500 opacity-70" />
                                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-500" />
                            </span>

                            <span>
                                Question {activeQuestionPosition ?? ""} is live for students
                            </span>
                        </div>

                        <Radio className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                    </div>
                </div>
            ) : null}

            <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800 sm:px-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 font-bold text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
                            {questionPosition ||
                                "—"}
                        </div>

                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <h2 className="text-sm font-bold text-slate-950 dark:text-slate-50">
                                    Question{" "}
                                    {questionPosition ||
                                        ""}
                                </h2>

                                <span
                                    className={[
                                        "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold",
                                        statusClassName,
                                    ].join(
                                        " ",
                                    )}
                                >
                                    {questionStatus}
                                </span>
                            </div>

                            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                                <span>
                                    {getQuestionTypeLabel(
                                        question,
                                    )}
                                </span>

                                <span className="hidden h-3 w-px bg-slate-200 dark:bg-slate-700 sm:block" />

                                <span>
                                    {getResultsModeLabel(
                                        question.results_mode,
                                    )}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {onEditQuestion ? (<Button type="button" variant="outline" disabled={isUpdating} onClick={onEditQuestion}><Pencil className="h-4 w-4" /> Edit</Button>) : null}
                        {canActivate ? (<Button type="button" disabled={isUpdating} onClick={handleDisplayToStudents}><Play className="h-4 w-4 fill-current" /> Go Live</Button>) : null}
                        {canClose ? (<Button type="button" variant="destructive" disabled={isUpdating} onClick={onCloseQuestion}><Square className="mr-2 h-4 w-4 fill-current" /> Stop</Button>) : null}
                    </div>
                </div>
            </div>

            <div className="p-5 sm:p-6">
                <div className="max-w-4xl">
                    <p className="text-xl font-semibold leading-8 text-slate-950 dark:text-slate-50 sm:text-2xl">
                        {getQuestionPrompt(
                            question,
                        )}
                    </p>
                </div>

                {questionType ===
                    "multiple_choice" &&
                Array.isArray(
                    question.options,
                ) &&
                question.options.length >
                    0 ? (
                    <div className="mt-8 grid gap-3 sm:grid-cols-2">
                        {question.options.map(
                            (
                                option,
                                index,
                            ) => {
                                const label =
                                    String(
                                        option,
                                    );

                                return (
                                    <div
                                        key={`${index}-${label}`}
                                        className="flex min-h-[72px] items-center gap-4 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/40"
                                    >
                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
                                            {getQuestionOptionLabel(
                                                index,
                                            )}
                                        </div>

                                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                                            {label}
                                        </span>
                                    </div>
                                );
                            },
                        )}
                    </div>
                ) : null}

                {questionType ===
                "scale" ? (
                    <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900/40">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                    Scale
                                </p>

                                <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                                    {
                                        normalizedScaleMin
                                    }{" "}
                                    to{" "}
                                    {
                                        normalizedScaleMax
                                    }
                                </p>
                            </div>

                            <BarChart3 className="h-6 w-6 text-slate-400" />
                        </div>

                        <div className="mt-5 flex items-center gap-2">
                            {scaleValues.map(
                                (value) => (
                                    <div
                                        key={value}
                                        className="flex min-h-10 min-w-10 flex-1 flex-col items-center justify-center rounded-lg border border-slate-200 bg-white px-1 py-2 text-center dark:border-slate-700 dark:bg-slate-950"
                                    >
                                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{value}</span>
                                        {scaleLabels[String(value)] ? <span className="mt-1 text-[10px] font-medium leading-tight text-slate-500 dark:text-slate-400">{scaleLabels[String(value)]}</span> : null}
                                    </div>
                                ),
                            )}
                        </div>

                        {(scaleMinLabel ||
                            scaleMaxLabel) ? (
                            <div className="mt-3 flex justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
                                <span>
                                    {
                                        scaleMinLabel
                                    }
                                </span>

                                <span className="text-right">
                                    {
                                        scaleMaxLabel
                                    }
                                </span>
                            </div>
                        ) : null}
                    </div>
                ) : null}

                <div className="mt-8 flex flex-col gap-3 border-t border-slate-100 pt-5 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <CircleDot className="h-4 w-4" />

                        <span>
                            Result Visibility:{" "}

                            <strong className="font-semibold text-slate-700 dark:text-slate-200">
                                {visibilityLabel}
                            </strong>
                        </span>
                    </div>

                    <div className="relative">
                        <div className="flex overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                disabled={isUpdating}
                                className="rounded-none"
                                onClick={() => {
                                    if (studentsResultsVisible) {
                                        onHideResults?.();
                                        return;
                                    }

                                    if (projectorResultsVisible) {
                                        onHideProjectorResults?.();
                                        return;
                                    }

                                    onShowResults?.(
                                        defaultResultVisibility,
                                    );
                                }}
                            >
                                {resultsVisible ? (
                                    <EyeOff className="mr-2 h-4 w-4" />
                                ) : (
                                    <Eye className="mr-2 h-4 w-4" />
                                )}

                                {resultsVisible
                                    ? "Hide Results"
                                    : "Show Results"}
                            </Button>

                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                disabled={isUpdating}
                                aria-label="Choose result visibility"
                                className="rounded-none border-l border-slate-200 px-2 dark:border-slate-700"
                                onClick={() =>
                                    setResultsMenuOpen((open) => !open)
                                }
                            >
                                <ChevronDown
                                    className={[
                                        "h-4 w-4 transition-transform duration-200",
                                        resultsMenuOpen ? "rotate-180" : "",
                                    ].join(" ")}
                                />
                            </Button>
                        </div>

                        {resultsMenuOpen ? (
                            <div className="absolute bottom-full right-0 z-20 mb-2 w-56 animate-in fade-in slide-in-from-bottom-2 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl duration-200 dark:border-slate-800 dark:bg-slate-950">
                                <button
                                    type="button"
                                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition hover:bg-slate-50 dark:hover:bg-slate-900"
                                    onClick={() => {
                                        setResultsMenuOpen(false);
                                        if (studentsResultsVisible) {
                                            onHideResults?.();
                                        } else {
                                            onShowResults?.("students");
                                        }
                                    }}
                                >
                                    {studentsResultsVisible ? (
                                        <EyeOff className="h-4 w-4 text-indigo-500" />
                                    ) : (
                                        <Users className="h-4 w-4 text-indigo-500" />
                                    )}
                                    <span>
                                        {studentsResultsVisible
                                            ? "Hide from Students"
                                            : "Show to Students"}
                                    </span>
                                </button>

                                <button
                                    type="button"
                                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition hover:bg-slate-50 dark:hover:bg-slate-900"
                                    onClick={() => {
                                        setResultsMenuOpen(false);
                                        if (projectorResultsVisible) {
                                            onHideProjectorResults?.();
                                        } else {
                                            onShowResultsOnProjector?.();
                                        }
                                    }}
                                >
                                    {projectorResultsVisible ? (
                                        <EyeOff className="h-4 w-4 text-indigo-500" />
                                    ) : (
                                        <MonitorUp className="h-4 w-4 text-indigo-500" />
                                    )}
                                    <span>
                                        {projectorResultsVisible
                                            ? "Hide from Projector"
                                            : "Show on Projector"}
                                    </span>
                                </button>

                                {isLive && onShowLiveResults ? (
                                    <button
                                        type="button"
                                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition hover:bg-slate-50 dark:hover:bg-slate-900"
                                        onClick={() => {
                                            setResultsMenuOpen(false);
                                            onShowLiveResults();
                                        }}
                                    >
                                        <Radio className="h-4 w-4 text-indigo-500" />
                                        <span>Show Live Results</span>
                                    </button>
                                ) : null}

                                <button
                                    type="button"
                                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition hover:bg-slate-50 dark:hover:bg-slate-900"
                                    onClick={() => {
                                        setResultsMenuOpen(false);
                                        if (
                                            studentsResultsVisible ||
                                            projectorResultsVisible
                                        ) {
                                            if (studentsResultsVisible) {
                                                onHideResults?.();
                                            }

                                            if (projectorResultsVisible) {
                                                onHideProjectorResults?.();
                                            }
                                        } else {
                                            onShowResultsOnBoth?.();
                                        }
                                    }}
                                >
                                    {resultsVisible ? (
                                        <EyeOff className="h-4 w-4 text-indigo-500" />
                                    ) : (
                                        <Eye className="h-4 w-4 text-indigo-500" />
                                    )}
                                    <span>
                                        {resultsVisible
                                            ? "Hide from Both"
                                            : "Show on Both"}
                                    </span>
                                </button>
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>
        </section>
    );
}