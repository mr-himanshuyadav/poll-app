"use client";

import {
    ClipboardList,
    GripVertical,
} from "lucide-react";

import type {
    SessionQuestion,
} from "./live-studio-types";

import { QuestionRow } from "./question-row";

interface QuestionQueueProps {
    sessionId: string;

    questions: SessionQuestion[];

    selectedQuestionId: string | null;

    activeQuestionId: string | null;

    isUpdating?: boolean;

    isCompleted?: boolean;

    onSelectQuestion: (
        question: SessionQuestion,
    ) => void;

    onActivateQuestion: (
        question: SessionQuestion,
    ) => Promise<void> | void;

    onReorderQuestions?: (
        questions: SessionQuestion[],
    ) => Promise<void> | void;
}

export function QuestionQueue({
    questions,
    selectedQuestionId,
    activeQuestionId,
    isUpdating = false,
    isCompleted = false,
    onSelectQuestion,
    onActivateQuestion,
}: QuestionQueueProps) {
    if (questions.length === 0) {
        return (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <div className="flex min-h-[260px] flex-col items-center justify-center px-4 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400 dark:bg-slate-900">
                        <ClipboardList className="h-6 w-6" />
                    </div>

                    <h3 className="mt-4 text-sm font-bold text-slate-800 dark:text-slate-200">
                        No matching questions
                    </h3>

                    <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                        Try another filter or search term.
                    </p>
                </div>
            </section>
        );
    }

    return (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4 dark:border-slate-800">
                <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Question Queue
                    </p>

                    <h2 className="mt-1 text-sm font-bold text-slate-900 dark:text-slate-100">
                        {questions.length}{" "}
                        {questions.length === 1
                            ? "question"
                            : "questions"}
                    </h2>
                </div>

                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-50 text-slate-400 dark:bg-slate-900">
                    <ClipboardList className="h-4 w-4" />
                </div>
            </div>

            <div className="max-h-[620px] overflow-y-auto p-2">
                {questions.map(
                    (question, index) => (
                        <QuestionRow
                            key={question.id}
                            question={question}
                            position={index + 1}
                            isSelected={
                                selectedQuestionId ===
                                question.id
                            }
                            isActive={
                                activeQuestionId ===
                                question.id
                            }
                            isUpdating={
                                isUpdating
                            }
                            viewOnly={isCompleted}
                            onSelect={() =>
                                onSelectQuestion(
                                    question,
                                )
                            }
                            onActivate={() =>
                                onActivateQuestion(
                                    question,
                                )
                            }
                        />
                    ),
                )}
            </div>

            <div className="border-t border-slate-100 px-4 py-3 dark:border-slate-800">
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <GripVertical className="h-3.5 w-3.5" />

                    <span>
                        Question order can be
                        managed from the session
                        queue.
                    </span>
                </div>
            </div>
        </section>
    );
}