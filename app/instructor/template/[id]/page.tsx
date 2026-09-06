"use client";

import { use, useEffect, useMemo, useState } from "react";
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

const emptyForm: FormState = {
  text: "",
  type: "multiple_choice",
  options: ["", ""],
  scaleMax: 5,
};

export default function TemplateEditor({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const resolvedParams = params instanceof Promise ? use(params) : params;
  const templateId = resolvedParams.id;
  const router = useRouter();

  const [template, setTemplate] = useState<QuizTemplate | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

    const { data: templateData, error: templateError } = await supabase
      .from("quiz_templates")
      .select("*")
      .eq("id", templateId)
      .eq("instructor_id", user.id)
      .single();

    if (templateError || !templateData) {
      setError(templateError?.message ?? "Quiz module not found.");
      setIsLoading(false);
      return;
    }

    const { data: questionData, error: questionError } = await supabase
      .from("questions")
      .select("*")
      .eq("template_id", templateId)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true });

    if (questionError) {
      setError(questionError.message);
      setQuestions([]);
    } else {
      setQuestions((questionData ?? []) as Question[]);
    }

    setTemplate(templateData as QuizTemplate);
    setIsLoading(false);
  };

  useEffect(() => {
    void loadData();
  }, [templateId]);

  const questionCountLabel = useMemo(
    () => `${questions.length} ${questions.length === 1 ? "question" : "questions"}`,
    [questions.length],
  );

  const updateOption = (index: number, value: string) => {
    setForm((current) => ({
      ...current,
      options: current.options.map((option, optionIndex) =>
        optionIndex === index ? value : option,
      ),
    }));
  };

  const addOption = () => {
    setForm((current) => ({
      ...current,
      options: [...current.options, ""],
    }));
  };

  const removeOption = (index: number) => {
    setForm((current) => {
      if (current.options.length <= 2) {
        return current;
      }

      return {
        ...current,
        options: current.options.filter(
          (_, optionIndex) => optionIndex !== index,
        ),
      };
    });
  };

  const resetForm = () => {
    setForm(emptyForm);
  };

  const saveQuestion = async () => {
    const text = form.text.trim();

    if (!text) {
      setError("Enter a question.");
      return;
    }

    if (
      form.type === "multiple_choice" &&
      form.options.filter((option) => option.trim()).length < 2
    ) {
      setError("A multiple-choice question needs at least two options.");
      return;
    }

    setIsSaving(true);
    setError(null);

    const nextPosition =
      questions.length === 0
        ? 1
        : Math.max(...questions.map((question) => question.position)) + 1;

    const options =
      form.type === "multiple_choice"
        ? form.options
          .map((option) => option.trim())
          .filter(Boolean)
        : Array.from({ length: form.scaleMax }, (_, index) =>
          String(index + 1),
        );

    const config =
      form.type === "multiple_choice"
        ? {
          allowMultiple: false,
        }
        : {
          min: 1,
          max: form.scaleMax,
          step: 1,
        };

    const { data, error: saveError } = await supabase
      .from("questions")
      .insert({
        template_id: templateId,
        text,
        type: form.type as QuestionType,
        options,
        config,
        position: nextPosition,
        status: "draft",
        results_mode: "on_command",
      })
      .select("*")
      .single();

    if (saveError) {
      setError(saveError.message);
      setIsSaving(false);
      return;
    }

    setQuestions((current) => [...current, data as Question]);
    resetForm();
    setIsSaving(false);
  };

  const deleteQuestion = async (questionId: string) => {
    const confirmed = window.confirm(
      "Delete this question? This cannot be undone.",
    );

    if (!confirmed) {
      return;
    }

    setError(null);

    const { error: deleteError } = await supabase
      .from("questions")
      .delete()
      .eq("id", questionId)
      .eq("template_id", templateId);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setQuestions((current) =>
      current.filter((question) => question.id !== questionId),
    );
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10 dark:bg-slate-950">
        <div className="mx-auto max-w-6xl rounded-2xl border bg-white p-10 text-center text-sm text-muted-foreground shadow-sm dark:bg-slate-900">
          Loading quiz module...
        </div>
      </main>
    );
  }

  if (!template) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10 dark:bg-slate-950">
        <div className="mx-auto max-w-6xl rounded-2xl border border-red-200 bg-red-50 p-10 text-center text-sm text-red-700">
          {error ?? "Quiz module not found."}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-8 flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-indigo-600">
              Quiz Library
            </p>

            <h1 className="text-3xl font-bold tracking-tight">
              {template.title}
            </h1>

            <p className="mt-1 text-sm text-muted-foreground">
              {questionCountLabel}
            </p>
          </div>

          <Button
            variant="outline"
            onClick={() => router.push("/instructor")}
          >
            Back to Command Center
          </Button>
        </header>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Question Bank</h2>
                <p className="text-sm text-muted-foreground">
                  Questions are reusable across future live sessions.
                </p>
              </div>
            </div>

            {questions.length === 0 ? (
              <div className="rounded-2xl border border-dashed bg-white p-12 text-center shadow-sm dark:bg-slate-900">
                <h3 className="text-lg font-semibold">
                  No questions yet
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Create your first question using the composer.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {questions.map((question, index) => (
                  <Card key={question.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
                            Q{index + 1}
                          </p>
                          <CardTitle className="mt-1 text-lg">
                            {question.text}
                          </CardTitle>
                        </div>

                        <Button
                          variant="ghost"
                          className="text-red-600 hover:bg-red-50 hover:text-red-700"
                          onClick={() => void deleteQuestion(question.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium dark:bg-slate-800">
                          {question.type === "multiple_choice"
                            ? "Multiple Choice"
                            : question.type === "scale"
                              ? `Scale 1–${typeof question.config.max === "number"
                                ? question.config.max
                                : question.options.length
                              }`
                              : question.type}
                        </span>

                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium dark:bg-slate-800">
                          {question.results_mode === "live"
                            ? "Live Results"
                            : question.results_mode === "hidden"
                              ? "Hidden Results"
                              : "Results on Command"}
                        </span>

                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium dark:bg-slate-800">
                          {question.status}
                        </span>
                      </div>

                      <div className="grid gap-2 sm:grid-cols-2">
                        {question.options.map((option, optionIndex) => (
                          <div
                            key={`${question.id}-${optionIndex}`}
                            className="rounded-lg border bg-slate-50 px-3 py-2 text-sm dark:bg-slate-950"
                          >
                            {question.type === "multiple_choice" && (
                              <span className="mr-2 font-semibold">
                                {String.fromCharCode(65 + optionIndex)}.
                              </span>
                            )}

                            <span>{String(option)}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>

          <aside className="lg:sticky lg:top-6 lg:self-start">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Create Question</CardTitle>
              </CardHeader>

              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="question-text">
                    Question
                  </Label>

                  <textarea
                    id="question-text"
                    className="min-h-28 w-full resize-none rounded-md border bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                    placeholder="Enter the question you want to ask your class..."
                    value={form.text}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        text: event.target.value,
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Question Type</Label>

                  <Select
                    value={form.type}
                    onValueChange={(value) =>
                      setForm((current) => ({
                        ...current,
                        type: value as FormState["type"],
                        options:
                          value === "multiple_choice"
                            ? current.options.length >= 2
                              ? current.options
                              : ["", ""]
                            : current.options,
                      }))
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

                {form.type === "multiple_choice" ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Answer Options</Label>

                      <button
                        type="button"
                        className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
                        onClick={addOption}
                      >
                        + Add option
                      </button>
                    </div>

                    {form.options.map((option, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2"
                      >
                        <span className="w-6 text-sm font-semibold text-muted-foreground">
                          {String.fromCharCode(65 + index)}
                        </span>

                        <Input
                          placeholder={`Option ${index + 1}`}
                          value={option}
                          onChange={(event) =>
                            updateOption(index, event.target.value)
                          }
                        />

                        <button
                          type="button"
                          className="px-2 text-sm text-muted-foreground hover:text-red-600"
                          disabled={form.options.length <= 2}
                          onClick={() => removeOption(index)}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>Scale Range</Label>

                    <Select
                      value={String(form.scaleMax)}
                      onValueChange={(value) =>
                        setForm((current) => ({
                          ...current,
                          scaleMax: Number(value) as 5 | 10,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>

                      <SelectContent>
                        <SelectItem value="5">1 to 5</SelectItem>
                        <SelectItem value="10">1 to 10</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="rounded-xl border bg-slate-50 p-4 dark:bg-slate-950">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Default Results
                  </p>

                  <p className="mt-1 text-sm">
                    Results will be revealed by the instructor during the
                    live session.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    onClick={resetForm}
                    disabled={isSaving}
                  >
                    Clear
                  </Button>

                  <Button
                    onClick={() => void saveQuestion()}
                    disabled={isSaving}
                  >
                    {isSaving ? "Saving..." : "Save Question"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </main>
  );
}