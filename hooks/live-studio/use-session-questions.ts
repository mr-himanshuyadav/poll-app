"use client";

import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

import { supabase } from "@/lib/supabase";
import { useLiveRecovery } from "@/hooks/use-live-recovery";

import type {
    SessionQuestion,
} from "@/components/live-studio/live-studio-types";

interface UseSessionQuestionsOptions {
    sessionId?: string | null;
}

interface UseSessionQuestionsReturn {
    questions: SessionQuestion[];

    isLoading: boolean;

    isSaving: boolean;

    error: Error | null;

    refetch: () => Promise<void>;

    createQuestion: (
        question: Partial<SessionQuestion>,
    ) => Promise<SessionQuestion>;

    updateQuestion: (
        questionId: string,
        updates: Partial<SessionQuestion>,
    ) => Promise<SessionQuestion>;

    deleteQuestion: (
        questionId: string,
    ) => Promise<void>;

    reorderQuestions: (
        questions: SessionQuestion[],
    ) => Promise<void>;

    setQuestions: (
        questions: SessionQuestion[],
    ) => void;
}

function normalizeQuestion(
    data: any,
): SessionQuestion {
    return data as SessionQuestion;
}

export function useSessionQuestions({
    sessionId,
}: UseSessionQuestionsOptions): UseSessionQuestionsReturn {
    const [questions, setQuestions] =
        useState<SessionQuestion[]>([]);

    const [isLoading, setIsLoading] =
        useState(true);

    const [isSaving, setIsSaving] =
        useState(false);

    const [error, setError] =
        useState<Error | null>(null);

    const fetchQuestions =
        useCallback(async () => {
            if (!sessionId) {
                setQuestions([]);
                setIsLoading(false);

                return;
            }

            setIsLoading(true);
            setError(null);

            try {
                const { data, error } =
                    await supabase
                        .from(
                            "session_questions",
                        )
                        .select("*")
                        .eq(
                            "session_id",
                            sessionId,
                        )
                        .order(
                            "position",
                            {
                                ascending: true,
                            },
                        );

                if (error) {
                    throw error;
                }

                setQuestions(
                    (data ?? []).map(
                        normalizeQuestion,
                    ),
                );
            } catch (error) {
                const normalizedError =
                    error instanceof Error
                        ? error
                        : new Error(
                              "Unable to load questions.",
                          );

                setError(normalizedError);
                setQuestions([]);
            } finally {
                setIsLoading(false);
            }
        }, [sessionId]);

    useEffect(() => {
        void fetchQuestions();
    }, [fetchQuestions]);

    const createQuestion =
        useCallback(
            async (
                question: Partial<SessionQuestion>,
            ): Promise<SessionQuestion> => {
                if (!sessionId) {
                    throw new Error(
                        "Session is not available.",
                    );
                }

                setIsSaving(true);
                setError(null);

                try {
                    const nextPosition =
    questions.length;

const payload = {
    ...question,
    session_id: sessionId,
    position:
        question.position ??
        nextPosition,
};

                    const { data, error } =
                        await supabase
                            .from(
                                "session_questions",
                            )
                            .insert(payload)
                            .select()
                            .single();

                    if (error) {
                        throw error;
                    }

                    if (!data) {
                        throw new Error(
                            "Unable to create question.",
                        );
                    }

                    const newQuestion =
                        normalizeQuestion(data);

                    setQuestions(
                        (currentQuestions) => [
                            ...currentQuestions,
                            newQuestion,
                        ],
                    );

                    return newQuestion;
                } catch (error) {
                    const normalizedError =
                        error instanceof Error
                            ? error
                            : new Error(
                                  "Unable to create question.",
                              );

                    setError(
                        normalizedError,
                    );

                    throw normalizedError;
                } finally {
                    setIsSaving(false);
                }
            },
            [
                questions.length,
                sessionId,
            ],
        );

    const updateQuestion =
        useCallback(
            async (
                questionId: string,
                updates: Partial<SessionQuestion>,
            ): Promise<SessionQuestion> => {
                setIsSaving(true);
                setError(null);

                try {
                    const { data, error } =
                        await supabase
                            .from(
                                "session_questions",
                            )
                            .update(updates)
                            .eq(
                                "id",
                                questionId,
                            )
                            .select()
                            .single();

                    if (error) {
                        throw error;
                    }

                    if (!data) {
                        throw new Error(
                            "Unable to update question.",
                        );
                    }

                    const updatedQuestion =
                        normalizeQuestion(data);

                    setQuestions(
                        (currentQuestions) =>
                            currentQuestions.map(
                                (question) =>
                                    question.id ===
                                    questionId
                                        ? updatedQuestion
                                        : question,
                            ),
                    );

                    return updatedQuestion;
                } catch (error) {
                    const normalizedError =
                        error instanceof Error
                            ? error
                            : new Error(
                                  "Unable to update question.",
                              );

                    setError(
                        normalizedError,
                    );

                    throw normalizedError;
                } finally {
                    setIsSaving(false);
                }
            },
            [],
        );

    const deleteQuestion =
        useCallback(
            async (
                questionId: string,
            ): Promise<void> => {
                setIsSaving(true);
                setError(null);

                try {
                    const { error } =
                        await supabase
                            .from(
                                "session_questions",
                            )
                            .delete()
                            .eq(
                                "id",
                                questionId,
                            );

                    if (error) {
                        throw error;
                    }

                    setQuestions(
                        (currentQuestions) =>
                            currentQuestions.filter(
                                (question) =>
                                    question.id !==
                                    questionId,
                            ),
                    );
                } catch (error) {
                    const normalizedError =
                        error instanceof Error
                            ? error
                            : new Error(
                                  "Unable to delete question.",
                              );

                    setError(
                        normalizedError,
                    );

                    throw normalizedError;
                } finally {
                    setIsSaving(false);
                }
            },
            [],
        );

    const reorderQuestions =
        useCallback(
            async (
                reorderedQuestions: SessionQuestion[],
            ): Promise<void> => {
                if (
                    reorderedQuestions.length === 0
                ) {
                    return;
                }

                setIsSaving(true);
                setError(null);

                const previousQuestions =
                    questions;

                const optimisticQuestions =
                    reorderedQuestions.map(
                        (
                            question,
                            index,
                        ) => ({
                            ...question,
                            position:
                                index,
                        }),
                    );

                setQuestions(
                    optimisticQuestions,
                );

                try {
                    const updates =
                        optimisticQuestions.map(
                            (
                                question,
                                index,
                            ) =>
                                supabase
                                    .from(
                                        "session_questions",
                                    )
                                    .update({
                                        position:
                                            index,
                                    })
                                    .eq(
                                        "id",
                                        question.id,
                                    ),
                        );

                    const results =
                        await Promise.all(
                            updates,
                        );

                    const failedResult =
                        results.find(
                            (result) =>
                                result.error,
                        );

                    if (failedResult?.error) {
                        throw failedResult.error;
                    }
                } catch (error) {
                    setQuestions(
                        previousQuestions,
                    );

                    const normalizedError =
                        error instanceof Error
                            ? error
                            : new Error(
                                  "Unable to reorder questions.",
                              );

                    setError(
                        normalizedError,
                    );

                    throw normalizedError;
                } finally {
                    setIsSaving(false);
                }
            },
            [questions],
        );

    const sortedQuestions =
        useMemo(
            () =>
                [...questions].sort(
                    (a, b) =>
                        Number(
                            a.position??
                                0,
                        ) -
                        Number(
                            b.position ??
                                0,
                        ),
                ),
            [questions],
        );

    return {
        questions: sortedQuestions,
        isLoading,
        isSaving,
        error,
        refetch: fetchQuestions,
        createQuestion,
        updateQuestion,
        deleteQuestion,
        reorderQuestions,
        setQuestions,
    };
}