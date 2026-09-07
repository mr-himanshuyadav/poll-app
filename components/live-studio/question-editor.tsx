"use client";

import {
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    AlertTriangle,
    BarChart3,
    Plus,
    Save,
    Trash2,
    X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import type {
    QuestionFormOption,
    QuestionFormState,
    QuestionType,
    ResultsMode,
    SessionQuestion,
} from "./live-studio-types";

interface QuestionEditorProps {
    mode: "create" | "edit";

    sessionId: string;

    question?: SessionQuestion | null;

    isSaving?: boolean;

    onSave: (
        question: Partial<SessionQuestion>,
    ) => Promise<void> | void;

    onDelete?: () => Promise<void> | void;

    onCancel?: () => void;
}

const QUESTION_TYPES: Array<{
    value: QuestionType;
    title: string;
    description: string;
}> = [
    {
        value: "multiple_choice",
        title: "Multiple Choice",
        description:
            "Participants choose one option.",
    },
    {
        value: "scale",
        title: "Scale",
        description:
            "Participants select a value from a range.",
    },
];

const RESULTS_MODES: Array<{
    value: ResultsMode;
    title: string;
    description: string;
}> = [
    {
        value: "live",
        title: "Live",
        description:
            "Show results automatically.",
    },
    {
        value: "on_command",
        title: "Manual",
        description:
            "Reveal results when you are ready.",
    },
    {
        value: "hidden",
        title: "Hidden",
        description:
            "Keep results hidden from participants.",
    },
];

function createOption(
    value = "",
): QuestionFormOption {
    return {
        id: crypto.randomUUID(),
        value,
    };
}

function getNumberConfig(
    value: unknown,
    fallback: number,
): number {
    if (
        typeof value === "number" &&
        Number.isFinite(value)
    ) {
        return value;
    }

    if (
        typeof value === "string"
    ) {
        const parsed =
            Number(value);

        if (
            Number.isFinite(parsed)
        ) {
            return parsed;
        }
    }

    return fallback;
}

function getStringConfig(
    value: unknown,
): string {
    return typeof value === "string"
        ? value
        : "";
}

function getInitialFormState(
    question?: SessionQuestion | null,
): QuestionFormState {
    const questionType =
        question?.type ??
        "multiple_choice";

    const options =
        question?.options &&
        question.options.length > 0
            ? question.options.map(
                  (option) =>
                      createOption(option),
              )
            : [
                  createOption(),
                  createOption(),
              ];

    return {
        question:
            question?.text ?? "",

        questionType,

        options,

        scaleMin:
            getNumberConfig(
                question?.config?.min,
                1,
            ),

        scaleMax:
            getNumberConfig(
                question?.config?.max,
                5,
            ),

        scaleMinLabel:
            getStringConfig(
                question?.config?.minLabel,
            ),

        scaleMaxLabel:
            getStringConfig(
                question?.config?.maxLabel,
            ),

        resultsMode:
            question?.results_mode ??
            "on_command",
    };
}

export function QuestionEditor({
    mode,
    sessionId,
    question,
    isSaving = false,
    onSave,
    onDelete,
    onCancel,
}: QuestionEditorProps) {
    const [form, setForm] =
        useState<QuestionFormState>(() =>
            getInitialFormState(question),
        );

    const [
        showDeleteConfirm,
        setShowDeleteConfirm,
    ] = useState(false);

    useEffect(() => {
        setForm(
            getInitialFormState(
                question,
            ),
        );

        setShowDeleteConfirm(false);
    }, [question?.id]);

    const isMultipleChoice =
        form.questionType ===
        "multiple_choice";

    const isScale =
        form.questionType ===
        "scale";

    const validOptions = useMemo(
        () =>
            form.options.filter(
                (option) =>
                    option.value.trim()
                        .length > 0,
            ),
        [form.options],
    );

    const isValid = useMemo(() => {
        if (
            !form.question.trim()
        ) {
            return false;
        }

        if (isMultipleChoice) {
            return (
                validOptions.length >= 2
            );
        }

        if (isScale) {
            return (
                Number.isFinite(
                    form.scaleMin,
                ) &&
                Number.isFinite(
                    form.scaleMax,
                ) &&
                form.scaleMin <
                    form.scaleMax
            );
        }

        return true;
    }, [
        form.question,
        form.scaleMax,
        form.scaleMin,
        isMultipleChoice,
        isScale,
        validOptions.length,
    ]);

    const updateForm = (
        updates: Partial<QuestionFormState>,
    ) => {
        setForm((current) => ({
            ...current,
            ...updates,
        }));
    };

    const handleAddOption = () => {
        updateForm({
            options: [
                ...form.options,
                createOption(),
            ],
        });
    };

    const handleRemoveOption = (
        optionId: string,
    ) => {
        if (
            form.options.length <= 2
        ) {
            return;
        }

        updateForm({
            options:
                form.options.filter(
                    (option) =>
                        option.id !==
                        optionId,
                ),
        });
    };

    const handleUpdateOption = (
        optionId: string,
        value: string,
    ) => {
        updateForm({
            options:
                form.options.map(
                    (option) =>
                        option.id ===
                        optionId
                            ? {
                                  ...option,
                                  value,
                              }
                            : option,
                ),
        });
    };

    const handleQuestionTypeChange = (
        questionType: QuestionType,
    ) => {
        updateForm({
            questionType,
        });
    };

    const handleResultsModeChange = (
        resultsMode: ResultsMode,
    ) => {
        updateForm({
            resultsMode,
        });
    };

    const handleSave = async () => {
        if (!isValid) {
            return;
        }

        const cleanOptions =
            validOptions.map(
                (option) =>
                    option.value.trim(),
            );

        const existingConfig =
            question?.config ?? {};

        const payload: Partial<SessionQuestion> =
            {
                session_id:
                    sessionId,

                text:
                    form.question.trim(),

                type:
                    form.questionType,

                options:
                    isMultipleChoice
                        ? cleanOptions
                        : [],

                config:
                    isScale
                        ? {
                              ...existingConfig,

                              min:
                                  Number(
                                      form.scaleMin,
                                  ),

                              max:
                                  Number(
                                      form.scaleMax,
                                  ),

                              minLabel:
                                  form.scaleMinLabel.trim(),

                              maxLabel:
                                  form.scaleMaxLabel.trim(),
                          }
                        : {
                              ...existingConfig,
                          },

                results_mode:
                    form.resultsMode,
            };

        await onSave(payload);
    };

    const handleDelete = async () => {
        if (!onDelete) {
            return;
        }

        await onDelete();

        setShowDeleteConfirm(false);
    };

    return (
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-5 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                        Question Editor
                    </p>

                    <h2 className="mt-1 text-xl font-bold text-slate-950 dark:text-slate-50">
                        {mode === "create"
                            ? "Create Question"
                            : "Edit Question"}
                    </h2>
                </div>

                <div className="flex flex-wrap gap-2">
                    {mode === "edit" &&
                    onDelete ? (
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isSaving}
                            onClick={() =>
                                setShowDeleteConfirm(
                                    true,
                                )
                            }
                        >
                            <Trash2 className="mr-2 h-4 w-4" />

                            Delete
                        </Button>
                    ) : null}

                    {mode === "create" &&
                    onCancel ? (
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isSaving}
                            onClick={onCancel}
                        >
                            <X className="mr-2 h-4 w-4" />

                            Cancel
                        </Button>
                    ) : null}

                    <Button
                        type="button"
                        size="sm"
                        disabled={
                            !isValid ||
                            isSaving
                        }
                        onClick={handleSave}
                    >
                        <Save className="mr-2 h-4 w-4" />

                        {isSaving
                            ? "Saving..."
                            : mode === "create"
                              ? "Create Question"
                              : "Save Changes"}
                    </Button>
                </div>
            </div>

            <div className="space-y-8 p-5 sm:p-6">
                <div>
                    <Label
                        htmlFor="question-content"
                        className="text-sm font-bold"
                    >
                        Question
                    </Label>

                    <textarea
                        id="question-content"
                        value={form.question}
                        onChange={(event) =>
                            updateForm({
                                question:
                                    event.target
                                        .value,
                            })
                        }
                        placeholder="Write your question..."
                        rows={4}
                        className="mt-2 flex w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-indigo-700 dark:focus:ring-indigo-950"
                    />
                </div>

                <div>
                    <Label className="text-sm font-bold">
                        Question Type
                    </Label>

                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        {QUESTION_TYPES.map(
                            (
                                typeOption,
                            ) => {
                                const isSelected =
                                    form.questionType ===
                                    typeOption.value;

                                return (
                                    <button
                                        key={
                                            typeOption.value
                                        }
                                        type="button"
                                        onClick={() =>
                                            handleQuestionTypeChange(
                                                typeOption.value,
                                            )
                                        }
                                        className={[
                                            "rounded-xl border p-4 text-left transition",
                                            isSelected
                                                ? "border-indigo-400 bg-indigo-50 dark:border-indigo-700 dark:bg-indigo-950/40"
                                                : "border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700",
                                        ].join(
                                            " ",
                                        )}
                                    >
                                        <div className="flex items-center gap-2">
                                            {typeOption.value ===
                                            "scale" ? (
                                                <BarChart3 className="h-4 w-4 text-indigo-500" />
                                            ) : null}

                                            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                                                {
                                                    typeOption.title
                                                }
                                            </p>
                                        </div>

                                        <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                                            {
                                                typeOption.description
                                            }
                                        </p>
                                    </button>
                                );
                            },
                        )}
                    </div>
                </div>

                {isMultipleChoice ? (
                    <div>
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <Label className="text-sm font-bold">
                                    Answer Options
                                </Label>

                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                    Add at least two
                                    options.
                                </p>
                            </div>

                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={
                                    handleAddOption
                                }
                            >
                                <Plus className="mr-1.5 h-4 w-4" />

                                Add Option
                            </Button>
                        </div>

                        <div className="mt-4 space-y-3">
                            {form.options.map(
                                (
                                    option,
                                    index,
                                ) => (
                                    <div
                                        key={
                                            option.id
                                        }
                                        className="flex items-center gap-3"
                                    >
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                                            {String.fromCharCode(
                                                65 +
                                                    index,
                                            )}
                                        </div>

                                        <Input
                                            value={
                                                option.value
                                            }
                                            onChange={(
                                                event,
                                            ) =>
                                                handleUpdateOption(
                                                    option.id,
                                                    event
                                                        .target
                                                        .value,
                                                )
                                            }
                                            placeholder={`Option ${
                                                index +
                                                1
                                            }`}
                                        />

                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            disabled={
                                                form
                                                    .options
                                                    .length <=
                                                2
                                            }
                                            onClick={() =>
                                                handleRemoveOption(
                                                    option.id,
                                                )
                                            }
                                        >
                                            <Trash2 className="h-4 w-4 text-slate-400" />

                                            <span className="sr-only">
                                                Remove
                                                option
                                            </span>
                                        </Button>
                                    </div>
                                ),
                            )}
                        </div>
                    </div>
                ) : null}

                {isScale ? (
                    <div>
                        <Label className="text-sm font-bold">
                            Scale Range
                        </Label>

                        <div className="mt-3 grid gap-4 sm:grid-cols-2">
                            <div>
                                <Label
                                    htmlFor="scale-min"
                                    className="text-xs text-slate-500"
                                >
                                    Minimum
                                </Label>

                                <Input
                                    id="scale-min"
                                    type="number"
                                    value={
                                        form.scaleMin
                                    }
                                    onChange={(
                                        event,
                                    ) =>
                                        updateForm({
                                            scaleMin:
                                                Number(
                                                    event
                                                        .target
                                                        .value,
                                                ),
                                        })
                                    }
                                    className="mt-1.5"
                                />
                            </div>

                            <div>
                                <Label
                                    htmlFor="scale-max"
                                    className="text-xs text-slate-500"
                                >
                                    Maximum
                                </Label>

                                <Input
                                    id="scale-max"
                                    type="number"
                                    value={
                                        form.scaleMax
                                    }
                                    onChange={(
                                        event,
                                    ) =>
                                        updateForm({
                                            scaleMax:
                                                Number(
                                                    event
                                                        .target
                                                        .value,
                                                ),
                                        })
                                    }
                                    className="mt-1.5"
                                />
                            </div>

                            <div>
                                <Label
                                    htmlFor="scale-min-label"
                                    className="text-xs text-slate-500"
                                >
                                    Minimum Label
                                </Label>

                                <Input
                                    id="scale-min-label"
                                    value={
                                        form.scaleMinLabel
                                    }
                                    onChange={(
                                        event,
                                    ) =>
                                        updateForm({
                                            scaleMinLabel:
                                                event
                                                    .target
                                                    .value,
                                        })
                                    }
                                    placeholder="e.g. Strongly disagree"
                                    className="mt-1.5"
                                />
                            </div>

                            <div>
                                <Label
                                    htmlFor="scale-max-label"
                                    className="text-xs text-slate-500"
                                >
                                    Maximum Label
                                </Label>

                                <Input
                                    id="scale-max-label"
                                    value={
                                        form.scaleMaxLabel
                                    }
                                    onChange={(
                                        event,
                                    ) =>
                                        updateForm({
                                            scaleMaxLabel:
                                                event
                                                    .target
                                                    .value,
                                        })
                                    }
                                    placeholder="e.g. Strongly agree"
                                    className="mt-1.5"
                                />
                            </div>
                        </div>
                    </div>
                ) : null}

                <div>
                    <Label className="text-sm font-bold">
                        Results Visibility
                    </Label>

                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                        {RESULTS_MODES.map(
                            (
                                modeOption,
                            ) => {
                                const isSelected =
                                    form.resultsMode ===
                                    modeOption.value;

                                return (
                                    <button
                                        key={
                                            modeOption.value
                                        }
                                        type="button"
                                        onClick={() =>
                                            handleResultsModeChange(
                                                modeOption.value,
                                            )
                                        }
                                        className={[
                                            "rounded-xl border p-3 text-left transition",
                                            isSelected
                                                ? "border-indigo-400 bg-indigo-50 dark:border-indigo-700 dark:bg-indigo-950/40"
                                                : "border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700",
                                        ].join(
                                            " ",
                                        )}
                                    >
                                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                            {
                                                modeOption.title
                                            }
                                        </p>

                                        <p className="mt-1 text-[11px] leading-5 text-slate-500 dark:text-slate-400">
                                            {
                                                modeOption.description
                                            }
                                        </p>
                                    </button>
                                );
                            },
                        )}
                    </div>
                </div>
            </div>

            {showDeleteConfirm ? (
                <div className="border-t border-red-100 bg-red-50/60 p-5 dark:border-red-950/50 dark:bg-red-950/20 sm:p-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex gap-3">
                            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />

                            <div>
                                <p className="text-sm font-bold text-red-800 dark:text-red-300">
                                    Delete this
                                    question?
                                </p>

                                <p className="mt-1 text-xs leading-5 text-red-700/80 dark:text-red-400/80">
                                    This action cannot
                                    be undone.
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                    setShowDeleteConfirm(
                                        false,
                                    )
                                }
                            >
                                Cancel
                            </Button>

                            <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                disabled={
                                    isSaving
                                }
                                onClick={
                                    handleDelete
                                }
                            >
                                <Trash2 className="mr-2 h-4 w-4" />

                                Delete Question
                            </Button>
                        </div>
                    </div>
                </div>
            ) : null}
        </section>
    );
}