"use client";

import { useMemo, useState } from "react";
import {
    CheckCircle2,
    CircleDot,
    ChevronRight,
    Eye,
    Pencil,
    Play,
    Plus,
    Search,
    SlidersHorizontal,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import type {
    SessionQuestion,
} from "./live-studio-types";

import { QuestionQueue } from "./question-queue";
import { QuestionEditor } from "./question-editor";

interface QuestionsWorkspaceProps {
    sessionId: string;

    questions: SessionQuestion[];

    activeQuestion: SessionQuestion | null;

    isSaving?: boolean;

    isUpdating?: boolean;

    onCreateQuestion: (
        question: Partial<SessionQuestion>,
    ) => Promise<SessionQuestion> | Promise<void> | void;

    onUpdateQuestion: (
        questionId: string,
        updates: Partial<SessionQuestion>,
    ) => Promise<SessionQuestion> | Promise<void> | void;

    onDeleteQuestion: (
        question: SessionQuestion,
    ) => Promise<SessionQuestion> | Promise<void> | void;

    onActivateQuestion: (
        question: SessionQuestion,
    ) => Promise<SessionQuestion> | Promise<void> | void;

    onReorderQuestions?: (
        questions: SessionQuestion[],
    ) => Promise<SessionQuestion> | Promise<void> | void;
}

export function QuestionsWorkspace({
    sessionId,
    questions,
    activeQuestion,
    isSaving = false,
    isUpdating = false,
    onCreateQuestion,
    onUpdateQuestion,
    onDeleteQuestion,
    onActivateQuestion,
    onReorderQuestions,
}: QuestionsWorkspaceProps) {
    const [selectedQuestionId, setSelectedQuestionId] =
        useState<string | null>(
            activeQuestion?.id ?? null,
        );

    const [searchQuery, setSearchQuery] =
        useState("");
    const [queueFilter, setQueueFilter] =
        useState<"all" | "live" | "ready" | "closed">("all");

    const [isCreatingQuestion, setIsCreatingQuestion] =
        useState(false);

    const sortedQuestions = useMemo(() => {
        return [...questions].sort(
            (a, b) =>
                (a.position ?? 0) -
                (b.position ?? 0),
        );
    }, [questions]);

    const filteredQuestions = useMemo(() => {
        const query =
            searchQuery.trim().toLowerCase();

        return sortedQuestions.filter((question) => {
            const content = question.text.toLowerCase();

            const matchesSearch =
                !query || content.includes(query);

            const isLive =
                question.id === activeQuestion?.id ||
                question.status === "active";

            const matchesFilter =
                queueFilter === "all" ||
                (queueFilter === "live" && isLive) ||
                (queueFilter === "ready" &&
                    !isLive &&
                    question.status !== "closed") ||
                (queueFilter === "closed" &&
                    question.status === "closed");

            return matchesSearch && matchesFilter;
        });
    }, [
        sortedQuestions,
        searchQuery,
        queueFilter,
        activeQuestion?.id,
    ]);

    const selectedQuestion = useMemo(() => {
        if (!selectedQuestionId) {
            return null;
        }

        return (
            questions.find(
                (question) =>
                    question.id ===
                    selectedQuestionId,
            ) ?? null
        );
    }, [
        questions,
        selectedQuestionId,
    ]);

    const handleCreateQuestion = () => {
        setSelectedQuestionId(null);
        setIsCreatingQuestion(true);
    };

    const handleSelectQuestion = (
        question: SessionQuestion,
    ) => {
        setSelectedQuestionId(question.id);
        setIsCreatingQuestion(false);
    };

    const handleCancelCreate = () => {
        setIsCreatingQuestion(false);

        if (activeQuestion) {
            setSelectedQuestionId(
                activeQuestion.id,
            );
        }
    };

    const handleCreate = async (
        question: Partial<SessionQuestion>,
    ) => {
        await onCreateQuestion(question);

        setIsCreatingQuestion(false);
    };

    return (
        <div className="mx-auto w-full max-w-[1600px] px-4 pb-24 pt-6 sm:px-6 lg:px-8 md:pb-8">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                        Session Builder
                    </p>

                    <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 dark:text-slate-50">
                        Questions
                    </h1>

                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Create, organize and
                        manage the questions for
                        this live session.
                    </p>
                </div>

                <Button
                    type="button"
                    onClick={handleCreateQuestion}
                    disabled={
                        isSaving ||
                        isUpdating
                    }
                >
                    <Plus className="mr-2 h-4 w-4" />

                    Add Question
                </Button>
            </div>

            <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
                <aside className="min-w-0">
                    <div className="mb-3 relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                        <Input
                            value={searchQuery}
                            onChange={(event) =>
                                setSearchQuery(event.target.value)
                            }
                            placeholder="Search questions..."
                            className="pl-9"
                        />
                    </div>

                    <div className="mb-4 flex items-center gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-900/60">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center text-slate-400">
                            <SlidersHorizontal className="h-4 w-4" />
                        </div>
                        {([
                            ["all", "All", null],
                            ["live", "Live", CircleDot],
                            ["ready", "Ready", null],
                            ["closed", "Closed", CheckCircle2],
                        ] as const).map(([value, label, Icon]) => {
                            const active = queueFilter === value;
                            const count = sortedQuestions.filter((question) => {
                                const isLive =
                                    question.id === activeQuestion?.id ||
                                    question.status === "active";
                                return value === "all"
                                    ? true
                                    : value === "live"
                                      ? isLive
                                      : value === "ready"
                                        ? !isLive && question.status !== "closed"
                                        : question.status === "closed";
                            }).length;

                            return (
                                <button
                                    key={value}
                                    type="button"
                                    onClick={() => setQueueFilter(value)}
                                    className={[
                                        "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition-all duration-200",
                                        active
                                            ? "bg-white text-indigo-700 shadow-sm dark:bg-slate-800 dark:text-indigo-300"
                                            : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200",
                                    ].join(" ")}
                                >
                                    {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
                                    {label}
                                    <span className="text-[10px] opacity-60">{count}</span>
                                </button>
                            );
                        })}
                    </div>

                    <QuestionQueue
                        sessionId={sessionId}
                        questions={filteredQuestions}
                        selectedQuestionId={
                            selectedQuestionId
                        }
                        activeQuestionId={
                            activeQuestion?.id ??
                            null
                        }
                        isUpdating={
                            isUpdating
                        }
                        onSelectQuestion={
                            handleSelectQuestion
                        }
                        onActivateQuestion={
                            onActivateQuestion
                        }
                        onReorderQuestions={
                            onReorderQuestions
                        }
                    />
                </aside>

                <main className="min-w-0">
                    {isCreatingQuestion ? (
                        <QuestionEditor
                            mode="create"
                            sessionId={
                                sessionId
                            }
                            isSaving={
                                isSaving
                            }
                            onSave={
                                handleCreate
                            }
                            onCancel={
                                handleCancelCreate
                            }
                        />
                    ) : selectedQuestion ? (
                        <>
                            {(() => {
                                const isSelectedLive =
                                    selectedQuestion.id ===
                                        activeQuestion?.id ||
                                    selectedQuestion.status ===
                                        "active";
                                const isSelectedClosed =
                                    selectedQuestion.status ===
                                    "closed";

                                const steps = [
                                    {
                                        label: "Ready",
                                        complete:
                                            isSelectedLive ||
                                            isSelectedClosed,
                                        current:
                                            !isSelectedLive &&
                                            !isSelectedClosed,
                                    },
                                    {
                                        label: "Live",
                                        complete: isSelectedClosed,
                                        current: isSelectedLive,
                                    },
                                    {
                                        label: "Closed",
                                        complete: isSelectedClosed,
                                        current: isSelectedClosed,
                                    },
                                ];

                                return (
                                    <div className="mb-3 flex items-center gap-1 overflow-x-auto px-1 py-1">
                                        {steps.map((step, index) => (
                                            <div
                                                key={step.label}
                                                className="flex shrink-0 items-center gap-1"
                                            >
                                                {index > 0 ? (
                                                    <ChevronRight className="h-3.5 w-3.5 text-slate-300 dark:text-slate-700" />
                                                ) : null}
                                                <div
                                                    className={[
                                                        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide transition-all",
                                                        step.current
                                                            ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300"
                                                            : step.complete
                                                              ? "text-emerald-600 dark:text-emerald-400"
                                                              : "text-slate-400 dark:text-slate-500",
                                                    ].join(" ")}
                                                >
                                                    <span
                                                        className={[
                                                            "h-1.5 w-1.5 rounded-full",
                                                            step.current
                                                                ? "bg-indigo-500 animate-pulse"
                                                                : step.complete
                                                                  ? "bg-emerald-500"
                                                                  : "bg-slate-300 dark:bg-slate-700",
                                                        ].join(" ")}
                                                    />
                                                    {step.label}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                );
                            })()}

                            {(() => {
                                const isSelectedLive =
                                    selectedQuestion.id ===
                                        activeQuestion?.id ||
                                    selectedQuestion.status ===
                                        "active";
                                const isSelectedClosed =
                                    selectedQuestion.status ===
                                    "closed";

                                return (
                                    <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition-all duration-200 dark:border-slate-800 dark:bg-slate-950 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                {isSelectedLive ? (
                                                    <CircleDot className="h-4 w-4 text-emerald-500" />
                                                ) : isSelectedClosed ? (
                                                    <CheckCircle2 className="h-4 w-4 text-slate-400" />
                                                ) : (
                                                    <Pencil className="h-4 w-4 text-indigo-500" />
                                                )}
                                                <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                                                    {isSelectedLive
                                                        ? "Live question"
                                                        : isSelectedClosed
                                                          ? "Completed question"
                                                          : "Ready question"}
                                                </span>
                                            </div>
                                            <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                                                {isSelectedLive
                                                    ? "Currently active for this session. Changes are saved here without duplicating live controls."
                                                    : isSelectedClosed
                                                      ? "This question is closed. You can review or update it for future use."
                                                      : "Review or edit the question before displaying it to participants."}
                                            </p>
                                        </div>

                                        <div className="flex shrink-0 items-center gap-2">
                                            {isSelectedLive ? (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() =>
                                                        handleSelectQuestion(
                                                            selectedQuestion,
                                                        )
                                                    }
                                                >
                                                    <Eye className="mr-2 h-4 w-4" />
                                                    Viewing
                                                </Button>
                                            ) : isSelectedClosed ? (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() =>
                                                        handleSelectQuestion(
                                                            selectedQuestion,
                                                        )
                                                    }
                                                >
                                                    <Eye className="mr-2 h-4 w-4" />
                                                    Review
                                                </Button>
                                            ) : (
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    disabled={isUpdating}
                                                    onClick={() =>
                                                        onActivateQuestion(
                                                            selectedQuestion,
                                                        )
                                                    }
                                                >
                                                    <Play className="mr-2 h-4 w-4" />
                                                    Display
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })()}

                            <QuestionEditor
                            mode="edit"
                            sessionId={
                                sessionId
                            }
                            question={
                                selectedQuestion
                            }
                            isSaving={
                                isSaving
                            }
                            onSave={async (
                                updates,
                            ) => {
                                await onUpdateQuestion(
                                    selectedQuestion.id,
                                    updates,
                                );
                            }}
                            onDelete={async () => {
                                await onDeleteQuestion(
                                    selectedQuestion,
                                );

                                setSelectedQuestionId(
                                    null,
                                );
                            }}
                        />
                        </>
                    ) : (
                        <div className="flex min-h-[500px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center dark:border-slate-700 dark:bg-slate-950">
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
                                <Plus className="h-7 w-7" />
                            </div>

                            <h2 className="mt-5 text-lg font-bold text-slate-950 dark:text-slate-50">
                                Select or create a
                                question
                            </h2>

                            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
                                Choose a question
                                from the queue or
                                create a new one to
                                start building your
                                session.
                            </p>

                            <Button
                                type="button"
                                className="mt-6"
                                onClick={
                                    handleCreateQuestion
                                }
                            >
                                <Plus className="mr-2 h-4 w-4" />

                                Create Question
                            </Button>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}