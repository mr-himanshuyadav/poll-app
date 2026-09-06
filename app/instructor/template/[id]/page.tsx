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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type {
  Question,
  QuestionType,
  QuizTemplate,
} from "@/lib/types";

type FormState = {
  text: string;
  type: "multiple_choice" | "scale";
  options: string[];
  scaleMax: 5 | 10;
};

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

const emptyForm: FormState = {
  text: "",
  type: "multiple_choice",
  options: ["", ""],
  scaleMax: 5,
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

  const [form, setForm] =
    useState<FormState>(
      emptyForm,
    );

  const [isLoading, setIsLoading] =
    useState(true);

  const [isSaving, setIsSaving] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

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

  const updateOption = (
    index: number,
    value: string,
  ) => {
    setForm((current) => ({
      ...current,
      options:
        current.options.map(
          (
            option,
            optionIndex,
          ) =>
            optionIndex ===
            index
              ? value
              : option,
        ),
    }));
  };

  const addOption = () => {
    setForm((current) => ({
      ...current,
      options: [
        ...current.options,
        "",
      ],
    }));
  };

  const removeOption = (
    index: number,
  ) => {
    setForm((current) => {
      if (
        current.options.length <=
        2
      ) {
        return current;
      }

      return {
        ...current,
        options:
          current.options.filter(
            (
              _,
              optionIndex,
            ) =>
              optionIndex !==
              index,
          ),
      };
    });
  };

  const resetForm = () => {
    setForm(emptyForm);
  };

  const saveQuestion = async () => {
    const text =
      form.text.trim();

    if (!text) {
      setError(
        "Enter a question.",
      );
      return;
    }

    if (
      form.type ===
        "multiple_choice" &&
      form.options.filter(
        (option) =>
          option.trim(),
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
              (question) =>
                question.position,
            ),
          ) + 1;

    const options =
      form.type ===
      "multiple_choice"
        ? form.options
            .map((option) =>
              option.trim(),
            )
            .filter(Boolean)
        : Array.from(
            {
              length:
                form.scaleMax,
            },
            (_, index) =>
              String(
                index + 1,
              ),
          );

    const config =
      form.type ===
      "multiple_choice"
        ? {
            allowMultiple:
              false,
          }
        : {
            min: 1,
            max: form.scaleMax,
            step: 1,
          };

    const {
      data,
      error: saveError,
    } = await supabase
      .from("questions")
      .insert({
        template_id:
          templateId,
        text,
        type:
          form.type as QuestionType,
        options,
        config,
        position:
          nextPosition,
        status: "draft",
        results_mode:
          "on_command",
      })
      .select("*")
      .single();

    if (saveError) {
      setError(
        saveError.message,
      );
      setIsSaving(false);
      return;
    }

    setQuestions(
      (current) => [
        ...current,
        data as Question,
      ],
    );

    resetForm();
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

            <Button
              variant="outline"
              onClick={() =>
                router.push(
                  "/instructor",
                )
              }
            >
              Back to Command Center
            </Button>
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

                            <Button
                              variant="ghost"
                              className="shrink-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                              onClick={() =>
                                void deleteQuestion(
                                  question.id,
                                )
                              }
                            >
                              Delete
                            </Button>
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
                              {question.results_mode ===
                              "live"
                                ? "Live Results"
                                : question.results_mode ===
                                    "hidden"
                                  ? "Hidden Results"
                                  : "Results on Command"}
                            </span>

                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold dark:bg-slate-800">
                              {question.status}
                            </span>
                          </div>

                          <div className="grid gap-2 sm:grid-cols-2">
                            {question.options.map(
                              (
                                option,
                                optionIndex,
                              ) => (
                                <div
                                  key={`${question.id}-${optionIndex}`}
                                  className="rounded-xl border bg-slate-50 px-4 py-3 text-sm dark:bg-slate-950"
                                >
                                  {question.type ===
                                    "multiple_choice" && (
                                    <span className="mr-2 font-bold text-muted-foreground">
                                      {String.fromCharCode(
                                        65 +
                                          optionIndex,
                                      )}
                                      .
                                    </span>
                                  )}

                                  {
                                    String(
                                      option,
                                    )
                                  }
                                </div>
                              ),
                            )}
                          </div>
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
                                    `/instructor/studio/${session.id}`,
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

          {/* RIGHT — COMPOSER */}

          <aside className="lg:sticky lg:top-6 lg:self-start">
            <Card className="overflow-hidden shadow-sm">
              <CardHeader className="border-b">
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-indigo-600">
                  Question Builder
                </p>

                <CardTitle className="text-xl">
                  Add a reusable question
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-5 p-5">

                <div className="space-y-2">
                  <Label htmlFor="question-text">
                    Question
                  </Label>

                  <textarea
                    id="question-text"
                    className="min-h-32 w-full resize-none rounded-xl border bg-background px-3 py-3 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                    placeholder="Enter the question you want to ask your class..."
                    value={
                      form.text
                    }
                    onChange={(
                      event,
                    ) =>
                      setForm(
                        (
                          current,
                        ) => ({
                          ...current,
                          text:
                            event
                              .target
                              .value,
                        }),
                      )
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>
                    Question Type
                  </Label>

                  <Select
                    value={
                      form.type
                    }
                    onValueChange={(
                      value,
                    ) =>
                      setForm(
                        (
                          current,
                        ) => ({
                          ...current,
                          type:
                            value as FormState["type"],
                          options:
                            value ===
                            "multiple_choice"
                              ? current
                                  .options
                                  .length >=
                                2
                                ? current.options
                                : [
                                    "",
                                    "",
                                  ]
                              : current.options,
                        }),
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value="multiple_choice">
                        Multiple Choice
                      </SelectItem>

                      <SelectItem value="scale">
                        Scale
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {form.type ===
                "multiple_choice" ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>
                        Answer Options
                      </Label>

                      <button
                        type="button"
                        className="text-sm font-semibold text-indigo-600 hover:text-indigo-700"
                        onClick={
                          addOption
                        }
                      >
                        + Add option
                      </button>
                    </div>

                    {form.options.map(
                      (
                        option,
                        index,
                      ) => (
                        <div
                          key={
                            index
                          }
                          className="flex items-center gap-2"
                        >
                          <span className="w-6 text-sm font-semibold text-muted-foreground">
                            {String.fromCharCode(
                              65 +
                                index,
                            )}
                          </span>

                          <Input
                            placeholder={`Option ${
                              index +
                              1
                            }`}
                            value={
                              option
                            }
                            onChange={(
                              event,
                            ) =>
                              updateOption(
                                index,
                                event
                                  .target
                                  .value,
                              )
                            }
                          />

                          <button
                            type="button"
                            className="px-2 text-lg text-muted-foreground hover:text-red-600"
                            disabled={
                              form.options.length <=
                              2
                            }
                            onClick={() =>
                              removeOption(
                                index,
                              )
                            }
                          >
                            ×
                          </button>
                        </div>
                      ),
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>
                      Scale Range
                    </Label>

                    <Select
                      value={String(
                        form.scaleMax,
                      )}
                      onValueChange={(
                        value,
                      ) =>
                        setForm(
                          (
                            current,
                          ) => ({
                            ...current,
                            scaleMax:
                              Number(
                                value,
                              ) as
                                | 5
                                | 10,
                          }),
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>

                      <SelectContent>
                        <SelectItem value="5">
                          1 to 5
                        </SelectItem>

                        <SelectItem value="10">
                          1 to 10
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="rounded-xl border bg-slate-50 p-4 dark:bg-slate-950">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Default Results
                  </p>

                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    New questions start with Results on
                    Command. You can change result behavior
                    later from the live Studio.
                  </p>
                </div>

                <Button
                  className="w-full"
                  disabled={
                    isSaving ||
                    !form.text.trim()
                  }
                  onClick={() =>
                    void saveQuestion()
                  }
                >
                  {isSaving
                    ? "Creating..."
                    : "Create Question"}
                </Button>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </main>
  );
}