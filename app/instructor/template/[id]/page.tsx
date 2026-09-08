"use client";

import {
  use,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Button } from "@/components/ui/button";

import type {
  Question,
  QuizTemplate,
  SessionQuestion,
} from "@/lib/types";

import { QuestionEditor } from "@/components/live-studio/question-editor";

type TemplateSession = {
  id: string;
  template_id: string | null;
  instructor_id: string;
  name: string;
  join_code: string;
  status:
    | "draft"
    | "ready"
    | "live"
    | "paused"
    | "completed"
    | "archived";
  participant_mode:
    | "anonymous"
    | "identified";
  results_mode:
    | "live"
    | "on_command"
    | "hidden";
  allow_late_join: boolean;
  allow_answer_change: boolean;
  is_offline: boolean;
  active_question_id: string | null;
  created_at: string;
  started_at: string | null;
  paused_at: string | null;
  ended_at: string | null;
  updated_at: string;
};

export default function TemplateEditor({
  params,
}: {
  params:
    | Promise<{ id: string }>
    | { id: string };
}) {
  const resolvedParams =
    params instanceof Promise
      ? use(params)
      : params;

  const templateId =
    resolvedParams.id;

  const router = useRouter();

  const [template, setTemplate] =
    useState<QuizTemplate | null>(
      null,
    );

  const [questions, setQuestions] =
    useState<Question[]>([]);

  const [sessions, setSessions] =
    useState<TemplateSession[]>([]);


  const [isLoading, setIsLoading] =
    useState(true);

  const [isSaving, setIsSaving] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [editingQuestionId, setEditingQuestionId] =
    useState<string | null>(null);

  const [isDeletingTemplate, setIsDeletingTemplate] =
    useState(false);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/login");
      return;
    }

    const {
      data: templateData,
      error: templateError,
    } =
      await supabase
        .from("quiz_templates")
        .select("*")
        .eq("id", templateId)
        .eq(
          "instructor_id",
          user.id,
        )
        .single();

    if (
      templateError ||
      !templateData
    ) {
      setError(
        templateError?.message ??
          "Quiz module not found.",
      );

      setIsLoading(false);
      return;
    }

    const [
      questionResult,
      sessionResult,
    ] = await Promise.all([
      supabase
        .from("questions")
        .select("*")
        .eq(
          "template_id",
          templateId,
        )
        .order("position", {
          ascending: true,
        })
        .order("created_at", {
          ascending: true,
        }),

      supabase
        .from("sessions")
        .select("*")
        .eq(
          "template_id",
          templateId,
        )
        .eq(
          "instructor_id",
          user.id,
        )
        .order("created_at", {
          ascending: false,
        }),
    ]);

    if (questionResult.error) {
      setError(
        questionResult.error.message,
      );

      setQuestions([]);
    } else {
      setQuestions(
        (questionResult.data ??
          []) as Question[],
      );
    }

    if (sessionResult.error) {
      setError(
        sessionResult.error.message,
      );

      setSessions([]);
    } else {
      setSessions(
        (sessionResult.data ??
          []) as TemplateSession[],
      );
    }

    setTemplate(
      templateData as QuizTemplate,
    );

    setIsLoading(false);
  };

  useEffect(() => {
    void loadData();
  }, [templateId]);

  const questionCountLabel =
    useMemo(
      () =>
        `${questions.length} ${
          questions.length === 1
            ? "question"
            : "questions"
        }`,
      [questions.length],
    );

  const completedSessions =
    sessions.filter(
      (session) =>
        session.status ===
          "completed" ||
        session.status ===
          "archived",
    );

  const activeSessions =
    sessions.filter(
      (session) =>
        session.status ===
          "live" ||
        session.status ===
          "paused" ||
        session.status ===
          "ready",
    );

  const saveQuestion = async (
    updates: Partial<SessionQuestion>,
  ) => {
    const text = updates.text?.trim() ?? "";

    if (!text) {
      setError("Enter a question.");
      return;
    }

    if (
      updates.type === "multiple_choice" &&
      (updates.options ?? []).filter(
        (option) => option.trim(),
      ).length < 2
    ) {
      setError(
        "A multiple-choice question needs at least two options.",
      );
      return;
    }

    setIsSaving(true);
    setError(null);

    const nextPosition =
      questions.length === 0
        ? 1
        : Math.max(
            ...questions.map(
              (question) => question.position,
            ),
          ) + 1;

    const payload = {
      template_id: templateId,
      text,
      type: updates.type ?? "multiple_choice",
      options: updates.options ?? [],
      config: updates.config ?? {},
      position: nextPosition,
      status: "draft",
      // Template questions always inherit the session's result setting.
      results_mode: "default",
    };

    const {
      data,
      error: saveError,
    } = await supabase
      .from("questions")
      .insert(payload)
      .select("*")
      .single();

    if (saveError) {
      setError(saveError.message);
      setIsSaving(false);
      return;
    }

    setQuestions((current) => [
      ...current,
      data as Question,
    ]);

    setEditingQuestionId(null);
    setIsSaving(false);
  };

  const updateQuestion = async (
    questionId: string,
    updates: Partial<SessionQuestion>,
  ) => {
    const text = updates.text?.trim() ?? "";

    if (!text) {
      setError("Enter a question.");
      return;
    }

    setIsSaving(true);
    setError(null);

    const payload = {
      text,
      type: updates.type,
      options: updates.options ?? [],
      config: updates.config ?? {},
      // Keep template questions on the new default result behavior.
      results_mode: "default",
    };

    const { data, error: updateError } = await supabase
      .from("questions")
      .update(payload)
      .eq("id", questionId)
      .eq("template_id", templateId)
      .select("*")
      .single();

    if (updateError) {
      setError(updateError.message);
      setIsSaving(false);
      return;
    }

    setQuestions((current) =>
      current.map((question) =>
        question.id === questionId
          ? (data as Question)
          : question,
      ),
    );

    setIsSaving(false);
  };

  const deleteQuestion = async (
    questionId: string,
  ) => {
    const confirmed =
      window.confirm(
        "Delete this question? This cannot be undone.",
      );

    if (!confirmed) {
      return;
    }

    setError(null);

    const {
      error: deleteError,
    } =
      await supabase
        .from("questions")
        .delete()
        .eq("id", questionId)
        .eq(
          "template_id",
          templateId,
        );

    if (deleteError) {
      setError(
        deleteError.message,
      );
      return;
    }

    setQuestions(
      (current) =>
        current.filter(
          (question) =>
            question.id !==
            questionId,
        ),
    );
  };

  const deleteTemplate = async () => {
    if (!template || isDeletingTemplate) return;

    const confirmed = window.confirm(
      `Delete "${template.title}" and all ${questions.length} template question${questions.length === 1 ? "" : "s"}? This cannot be undone.`,
    );

    if (!confirmed) return;

    setIsDeletingTemplate(true);
    setError(null);

    const { error: questionsError } = await supabase
      .from("questions")
      .delete()
      .eq("template_id", templateId);

    if (questionsError) {
      setError(questionsError.message);
      setIsDeletingTemplate(false);
      return;
    }

    const { error: templateDeleteError } = await supabase
      .from("quiz_templates")
      .delete()
      .eq("id", templateId);

    if (templateDeleteError) {
      setError(templateDeleteError.message);
      setIsDeletingTemplate(false);
      return;
    }

    router.replace("/instructor");
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10 dark:bg-slate-950">
        <div className="mx-auto max-w-7xl rounded-2xl border bg-white p-10 text-center text-sm text-muted-foreground shadow-sm dark:bg-slate-900">
          Loading quiz module...
        </div>
      </main>
    );
  }

  if (!template) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10 dark:bg-slate-950">
        <div className="mx-auto max-w-7xl rounded-2xl border border-red-200 bg-red-50 p-10 text-center text-sm text-red-700">
          {error ??
            "Quiz module not found."}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">

        {/* HEADER */}

        <header className="mb-8 rounded-3xl border bg-white p-6 shadow-sm dark:bg-slate-900">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

            <div>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
                  Quiz Module
                </span>

                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold dark:bg-slate-800">
                  {questionCountLabel}
                </span>

                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold dark:bg-slate-800">
                  {sessions.length}{" "}
                  {sessions.length ===
                  1
                    ? "session"
                    : "sessions"}
                </span>
              </div>

              <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
                {template.title}
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Build your reusable question bank and
                review every live session launched from
                this module.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => router.push("/instructor")}
              >
                Back to Command Center
              </Button>

              <Button
                variant="destructive"
                disabled={isDeletingTemplate}
                onClick={() => void deleteTemplate()}
              >
                {isDeletingTemplate
                  ? "Deleting..."
                  : "Delete Template"}
              </Button>
            </div>
          </div>
        </header>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* MAIN CONTENT */}

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">

          {/* LEFT */}

          <div className="space-y-10">

            {/* QUESTION BANK */}

            <section>
              <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-2xl font-bold">
                    Question Bank
                  </h2>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Reusable questions used when launching
                    future sessions.
                  </p>
                </div>
              </div>

              {questions.length ===
              0 ? (
                <div className="rounded-2xl border border-dashed bg-white p-12 text-center shadow-sm dark:bg-slate-900">
                  <h3 className="text-lg font-semibold">
                    No questions yet
                  </h3>

                  <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                    Create your first reusable question
                    using the composer on the right.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {questions.map(
                    (
                      question,
                      index,
                    ) => (
                      <Card
                        key={
                          question.id
                        }
                        className="overflow-hidden"
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <p className="text-xs font-bold uppercase tracking-[0.15em] text-indigo-600">
                                Question{" "}
                                {index +
                                  1}
                              </p>

                              <CardTitle className="mt-2 text-lg leading-7">
                                {
                                  question.text
                                }
                              </CardTitle>
                            </div>

                            <div className="flex shrink-0 gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  setEditingQuestionId(
                                    question.id,
                                  )
                                }
                              >
                                Edit
                              </Button>

                              <Button
                                variant="ghost"
                                className="text-red-600 hover:bg-red-50 hover:text-red-700"
                                onClick={() =>
                                  void deleteQuestion(
                                    question.id,
                                  )
                                }
                              >
                                Delete
                              </Button>
                            </div>
                          </div>
                        </CardHeader>

                        <CardContent className="space-y-4">
                          <div className="flex flex-wrap gap-2">
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold dark:bg-slate-800">
                              {question.type ===
                              "multiple_choice"
                                ? "Multiple Choice"
                                : question.type ===
                                    "scale"
                                  ? `Scale 1–${
                                      typeof question.config
                                        .max ===
                                      "number"
                                        ? question
                                            .config
                                            .max
                                        : question
                                            .options
                                            .length
                                    }`
                                  : question.type}
                            </span>

                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold dark:bg-slate-800">
                              {question.status}
                            </span>
                          </div>

                          {question.type === "multiple_choice" ? (
                            <div className="grid gap-2 sm:grid-cols-2">
                              {question.options.map((option, optionIndex) => (
                                <div key={`${question.id}-${optionIndex}`} className="rounded-xl border bg-slate-50 px-4 py-3 text-sm dark:bg-slate-950">
                                  <span className="mr-2 font-bold text-muted-foreground">
                                    {String.fromCharCode(65 + optionIndex)}.
                                  </span>
                                  {String(option)}
                                </div>
                              ))}
                            </div>
                          ) : question.type === "scale" ? (
                            <div className="rounded-xl border bg-slate-50 p-4 dark:bg-slate-950">
                              {(() => {
                                const min = typeof question.config?.min === "number" ? question.config.min : 1;
                                const max = typeof question.config?.max === "number" ? question.config.max : 5;
                                const labels = (question.config?.scaleLabels ?? {}) as Record<string, string>;
                                const preset = typeof question.config?.scalePreset === "string" ? question.config.scalePreset : "numeric";
                                const values = Array.from({ length: Math.max(0, max - min + 1) }, (_, valueIndex) => min + valueIndex);

                                return (
                                  <div className="space-y-3">
                                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                                      <span>Scale {min}–{max}</span>
                                      <span className="capitalize">{preset.replace(/_/g, " ")}</span>
                                    </div>
                                    <div className="grid gap-2 sm:grid-cols-2">
                                      {values.map((value) => (
                                        <div key={value} className="flex items-center gap-3 rounded-lg border bg-white px-3 py-2 text-sm dark:bg-slate-900">
                                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-xs font-black text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">{value}</span>
                                          <span className="min-w-0 break-words">{labels[String(value)] || (value === min ? String(question.config?.minLabel || "") : value === max ? String(question.config?.maxLabel || "") : "") || "—"}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          ) : null}
                        </CardContent>
                      </Card>
                    ),
                  )}
                </div>
              )}
            </section>

            {/* SESSION HISTORY */}

            <section>
              <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold">
                      Session History
                    </h2>

                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold dark:bg-slate-800">
                      {sessions.length}
                    </span>
                  </div>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Every live classroom launched from this module.
                  </p>
                </div>

                {sessions.length >
                  0 && (
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
                      {activeSessions.length} active
                    </span>

                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold dark:bg-slate-800">
                      {completedSessions.length} completed
                    </span>
                  </div>
                )}
              </div>

              {sessions.length ===
              0 ? (
                <div className="rounded-2xl border border-dashed bg-white p-12 text-center shadow-sm dark:bg-slate-900">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300">
                    +
                  </div>

                  <h3 className="mt-4 text-lg font-semibold">
                    No sessions yet
                  </h3>

                  <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                    Launch this module from the Command
                    Center and the session will appear here.
                  </p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border bg-white shadow-sm dark:bg-slate-900">
                  <div className="hidden grid-cols-[1.6fr_1fr_1fr_130px] gap-4 border-b bg-slate-50 px-5 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground dark:bg-slate-950 lg:grid">
                    <span>Session</span>
                    <span>Status</span>
                    <span>Created</span>
                    <span className="text-right">
                      Action
                    </span>
                  </div>

                  <div className="divide-y">
                    {sessions.map(
                      (session) => {
                        const statusLabel =
                          session.status ===
                          "completed"
                            ? "Completed"
                            : session.status ===
                                "live"
                              ? "Live"
                              : session.status ===
                                  "paused"
                                ? "Paused"
                                : session.status ===
                                    "ready"
                                  ? "Ready"
                                  : session.status;

                        const statusClass =
                          session.status ===
                          "completed"
                            ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                            : session.status ===
                                "live"
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
                              : session.status ===
                                  "paused"
                                ? "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300"
                                : "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300";

                        return (
                          <div
                            key={
                              session.id
                            }
                            className="grid gap-4 px-5 py-4 lg:grid-cols-[1.6fr_1fr_1fr_130px] lg:items-center"
                          >
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusClass}`}
                                >
                                  {
                                    statusLabel
                                  }
                                </span>

                                <span className="text-xs text-muted-foreground">
                                  Code{" "}
                                  <span className="font-semibold">
                                    {
                                      session.join_code
                                    }
                                  </span>
                                </span>
                              </div>

                              <h3 className="mt-2 truncate font-semibold">
                                {
                                  session.name
                                }
                              </h3>
                            </div>

                            <div className="text-sm text-muted-foreground">
                              <span className="mr-1 lg:hidden">
                                Status:
                              </span>

                              {
                                statusLabel
                              }
                            </div>

                            <div className="text-sm text-muted-foreground">
                              <span className="mr-1 lg:hidden">
                                Created:
                              </span>

                              {new Date(
                                session.created_at,
                              ).toLocaleString()}
                            </div>

                            <div className="flex justify-start lg:justify-end">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  router.push(
                                    `/instructor/${session.join_code}/studio}`,
                                  )
                                }
                              >
                                Open Studio
                              </Button>
                            </div>
                          </div>
                        );
                      },
                    )}
                  </div>
                </div>
              )}
            </section>
          </div>

          {/* RIGHT — QUESTION EDITOR */}

          <aside className="lg:sticky lg:top-6 lg:self-start">
            <div className="template-question-editor">
            <QuestionEditor
              key={editingQuestionId ?? "new"}
              mode={
                editingQuestionId
                  ? "edit"
                  : "create"
              }
              sessionId={templateId}
              question={
                editingQuestionId
                  ? (questions.find(
              (question) =>
                question.id ===
                editingQuestionId,
            ) as unknown as SessionQuestion | null)
                  : null
              }
              isSaving={isSaving}
              sessionResultsMode="on_command"
              onSave={async (updates) => {
                if (editingQuestionId) {
                  await updateQuestion(
                    editingQuestionId,
                    updates,
                  );
                } else {
                  await saveQuestion(updates);
                }
              }}
              onCancel={() =>
                setEditingQuestionId(null)
              }
              onDelete={
                editingQuestionId
                  ? async () => {
                      await deleteQuestion(
                        editingQuestionId,
                      );
                      setEditingQuestionId(null);
                    }
                  : undefined
              }
            />
            </div>

            <div className="mt-3 rounded-xl border bg-slate-50 p-4 text-xs leading-5 text-muted-foreground dark:bg-slate-950">
              Template questions use the same modern question editor as Live Studio. Result display is saved as <strong>Default</strong>, so every question follows the result setting of the session where it is launched.
            </div>
            <style jsx>{`
              .template-question-editor :global(section > div:nth-child(2) > div:last-child) {
                display: none;
              }
            `}</style>
          </aside>
        </div>
      </div>
    </main>
  );
}