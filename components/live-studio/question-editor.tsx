"use client";

import {
    resolveScaleConfig,
    SCALE_PRESET_LABELS,
    type ScalePreset,
} from "@/lib/scale-config";

import {
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    BarChart3,
    Plus,
    Save,
    Trash2,
    X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import type { QuestionConfig } from "@/lib/types";

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
    sessionResultsMode?: Exclude<ResultsMode, "default">;
    onSave: (question: Partial<SessionQuestion>) => Promise<void> | void;
    onDelete?: () => Promise<void> | void;
    onCancel?: () => void;
}

const QUESTION_TYPES: Array<{ value: QuestionType; title: string; description: string }> = [
    { value: "multiple_choice", title: "Multiple Choice", description: "Participants choose one option." },
    { value: "scale", title: "Scale", description: "Participants select a value from a range." },
];

function createOption(value = ""): QuestionFormOption {
    return { id: crypto.randomUUID(), value };
}
function getNumberConfig(value: unknown, fallback: number): number {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") { const parsed = Number(value); if (Number.isFinite(parsed)) return parsed; }
    return fallback;
}
function getStringConfig(value: unknown): string { return typeof value === "string" ? value : ""; }
function getInitialFormState(question?: SessionQuestion | null): QuestionFormState {
    return {
        question: question?.text ?? "",
        questionType: question?.type ?? "multiple_choice",
        options: question?.options?.length ? question.options.map((option) => createOption(option)) : [createOption(), createOption()],
        scaleMin: getNumberConfig(question?.config?.min, 1),
        scaleMax: getNumberConfig(question?.config?.max, 5),
        scaleMinLabel: getStringConfig(question?.config?.minLabel),
        scaleMaxLabel: getStringConfig(question?.config?.maxLabel),
        scaleLabels: (question?.config?.scaleLabels as Record<string, string> | undefined) ?? {},
        scalePreset: (question?.config?.scalePreset as QuestionFormState["scalePreset"] | undefined) ?? "numeric",
        resultsMode: "default",
    };
}

const SCALE_PRESETS = SCALE_PRESET_LABELS;
const SCALE_PRESET_OPTIONS: Array<{ value: ScalePreset; title: string; description: string }> = [
    { value: "numeric", title: "Numeric range", description: "Use values such as 1–5 or 1–10 without meanings." },
    { value: "agreement", title: "Agreement", description: "Strongly disagree → Strongly agree." },
    { value: "satisfaction", title: "Satisfaction", description: "Very dissatisfied → Very satisfied." },
    { value: "frequency", title: "Frequency", description: "Never → Always." },
    { value: "quality", title: "Quality", description: "Very poor → Excellent." },
    { value: "custom", title: "Custom labels", description: "Define the meaning of every value yourself." },
];

export function QuestionEditor({ mode, sessionId, question, isSaving = false, sessionResultsMode = "on_command", onSave, onDelete, onCancel }: QuestionEditorProps) {
    const [form, setForm] = useState<QuestionFormState>(() => getInitialFormState(question));
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    useEffect(() => { setForm(getInitialFormState(question)); setShowDeleteConfirm(false); }, [question?.id]);
    const isMultipleChoice = form.questionType === "multiple_choice";
    const isScale = form.questionType === "scale";
    const validOptions = useMemo(() => form.options.filter((option) => option.value.trim().length > 0), [form.options]);
    const scalePreview = useMemo(() => resolveScaleConfig({ min: form.scaleMin, max: form.scaleMax, minLabel: form.scaleMinLabel, maxLabel: form.scaleMaxLabel, scaleLabels: form.scaleLabels, scalePreset: form.scalePreset } as QuestionConfig), [form.scaleLabels, form.scaleMax, form.scaleMaxLabel, form.scaleMin, form.scaleMinLabel, form.scalePreset]);
    const isValid = useMemo(() => !!form.question.trim() && (!isMultipleChoice ? (!isScale || (Number.isFinite(form.scaleMin) && Number.isFinite(form.scaleMax) && form.scaleMin < form.scaleMax)) : validOptions.length >= 2), [form.question, form.scaleMax, form.scaleMin, isMultipleChoice, isScale, validOptions.length]);
    const updateForm = (updates: Partial<QuestionFormState>) => setForm((current) => ({ ...current, ...updates }));
    const applyPreset = (preset: ScalePreset) => updateForm({ scalePreset: preset, scaleMin: preset === "numeric" ? form.scaleMin : 1, scaleMax: preset === "numeric" ? form.scaleMax : 5, scaleLabels: preset === "custom" ? form.scaleLabels : { ...SCALE_PRESETS[preset] } });
    const handleSave = async () => {
        if (!isValid) return;
        const existingConfig = question?.config ?? {};
        await onSave({ session_id: sessionId, text: form.question.trim(), type: form.questionType, options: isMultipleChoice ? validOptions.map((option) => option.value.trim()) : [], config: isScale ? { ...existingConfig, min: Number(form.scaleMin), max: Number(form.scaleMax), minLabel: form.scaleMinLabel.trim(), maxLabel: form.scaleMaxLabel.trim(), scaleLabels: form.scaleLabels, scalePreset: form.scalePreset } : { ...existingConfig }, results_mode: "default" });
    };

    return (
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-5 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div><p className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Question Editor</p><h2 className="mt-1 text-xl font-bold text-slate-950 dark:text-slate-50">{mode === "create" ? "Create Question" : "Edit Question"}</h2></div>
                <div className="flex flex-wrap gap-2">
                    {mode === "edit" && onDelete ? <Button type="button" variant="outline" size="sm" disabled={isSaving} onClick={() => setShowDeleteConfirm(true)}><Trash2 className="mr-2 h-4 w-4" />Delete</Button> : null}
                    {mode === "create" && onCancel ? <Button type="button" variant="outline" size="sm" disabled={isSaving} onClick={onCancel}><X className="mr-2 h-4 w-4" />Cancel</Button> : null}
                    <Button type="button" size="sm" disabled={!isValid || isSaving} onClick={handleSave}><Save className="mr-2 h-4 w-4" />{isSaving ? "Saving..." : mode === "create" ? "Create Question" : "Save Changes"}</Button>
                </div>
            </div>

            <div className="space-y-8 p-5 sm:p-6">
                <div><Label htmlFor="question-content" className="text-sm font-bold">Question</Label><textarea id="question-content" value={form.question} onChange={(e) => updateForm({ question: e.target.value })} rows={4} className="mt-2 flex w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-indigo-700 dark:focus:ring-indigo-950" placeholder="Write your question..." /></div>

                <div><Label className="text-sm font-bold">Question Type</Label><div className="mt-3 grid gap-3 sm:grid-cols-2">{QUESTION_TYPES.map((item) => <button key={item.value} type="button" onClick={() => updateForm({ questionType: item.value })} className={["rounded-xl border p-4 text-left transition", form.questionType === item.value ? "border-indigo-400 bg-indigo-50 dark:border-indigo-700 dark:bg-indigo-950/40" : "border-slate-200 hover:border-slate-300 dark:border-slate-800"].join(" ")}><div className="flex items-center gap-2">{item.value === "scale" ? <BarChart3 className="h-4 w-4 text-indigo-500" /> : null}<p className="text-sm font-bold">{item.title}</p></div><p className="mt-1 text-xs leading-5 text-slate-500">{item.description}</p></button>)}</div></div>

                {isMultipleChoice ? <div><Label className="text-sm font-bold">Answer Options</Label><div className="mt-4 space-y-3">{form.options.map((option, index) => <div key={option.id} className="flex gap-2"><Input value={option.value} onChange={(e) => updateForm({ options: form.options.map((item) => item.id === option.id ? { ...item, value: e.target.value } : item) })} placeholder={`Option ${index + 1}`} />{form.options.length > 2 ? <Button type="button" variant="ghost" size="icon" onClick={() => updateForm({ options: form.options.filter((item) => item.id !== option.id) })}><Trash2 className="h-4 w-4" /></Button> : null}</div>)}</div><Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => updateForm({ options: [...form.options, createOption()] })}><Plus className="mr-1 h-4 w-4" />Add Option</Button></div> : null}

                {isScale ? <div className="space-y-5 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/30"><div><Label className="text-sm font-bold">Scale Configuration</Label><p className="mt-1 text-xs text-slate-500">Configure numeric values separately from their participant-facing meaning.</p></div><div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{SCALE_PRESET_OPTIONS.map((preset) => <button key={preset.value} type="button" onClick={() => applyPreset(preset.value)} className={["rounded-xl border p-3 text-left transition", form.scalePreset === preset.value ? "border-indigo-400 bg-indigo-50 text-indigo-700 dark:border-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300" : "border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"].join(" ")}><span className="block text-xs font-bold">{preset.title}</span><span className="mt-1 block text-[11px] leading-4 opacity-70">{preset.description}</span></button>)}</div><div className="grid gap-4 sm:grid-cols-2"><div><Label>Minimum value</Label><Input type="number" value={form.scaleMin} onChange={(e) => updateForm({ scaleMin: Number(e.target.value), scalePreset: "custom" })} className="mt-1.5" /></div><div><Label>Maximum value</Label><Input type="number" value={form.scaleMax} onChange={(e) => updateForm({ scaleMax: Number(e.target.value), scalePreset: "custom" })} className="mt-1.5" /></div></div>{scalePreview.values.length <= 20 ? <div><div className="mb-3 flex items-center justify-between"><Label className="text-sm font-bold">Value labels</Label><span className="text-xs text-slate-500">Optional</span></div><div className="grid gap-2 sm:grid-cols-2">{scalePreview.values.map((item) => <div key={item.value} className="flex items-center gap-3"><span className="flex h-9 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-200 text-xs font-black text-slate-600 dark:bg-slate-800 dark:text-slate-300">{item.value}</span><Input value={form.scaleLabels[String(item.value)] ?? ""} placeholder={item.label ?? "Optional label"} onChange={(e) => updateForm({ scalePreset: "custom", scaleLabels: { ...form.scaleLabels, [String(item.value)]: e.target.value } })} /></div>)}</div></div> : null}</div> : null}

                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900/30 dark:text-slate-300">
                    Result display always follows the session setting.
                </div>

            </div>
        </section>
    );
}