"use client";

import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";

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
    ) => Promise<void> | void;

    onUpdateQuestion: (
        questionId: string,
        updates: Partial<SessionQuestion>,
    ) => Promise<void> | void;

    onDeleteQuestion: (
        question: SessionQuestion,
    ) => Promise<void> | void;

    onActivateQuestion: (
        question: SessionQuestion,
    ) => Promise<void> | void;

    onReorderQuestions?: (
        questions: SessionQuestion[],
    ) => Promise<void> | void;
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

        if (!query) {
            return sortedQuestions;
        }

        return sortedQuestions.filter(
            (question) => {
                const content =
                    (
                        question.question ??
                        question.prompt ??
                        question.title ??
                        ""
                    ).toLowerCase();

                return content.includes(query);
            },
        );
    }, [
        sortedQuestions,
        searchQuery,
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
                    <div className="mb-4 relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                        <Input
                            value={searchQuery}
                            onChange={(event) =>
                                setSearchQuery(
                                    event.target.value,
                                )
                            }
                            placeholder="Search questions..."
                            className="pl-9"
                        />
                    </div>

                    <QuestionQueue
                        sessionId={sessionId}
                        questions={
                            filteredQuestions
                        }
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