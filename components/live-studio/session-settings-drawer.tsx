"use client";

import {
    useEffect,
    useState,
} from "react";

import {
    Copy,
    ExternalLink,
    Save,
    Settings2,
    X,
} from "lucide-react";

import {
    Button,
} from "@/components/ui/button";

import {
    Input,
} from "@/components/ui/input";

import {
    Label,
} from "@/components/ui/label";

import type {
    LiveSession,
    ResultsMode,
} from "./live-studio-types";

interface SessionSettingsDrawerProps {
    open: boolean;

    session: LiveSession | null;

    isSaving?: boolean;

    onClose: () => void;

    onSave: (
        updates: Partial<LiveSession>,
    ) => Promise<void> | void;
}

export function SessionSettingsDrawer({
    open,
    session,
    isSaving = false,
    onClose,
    onSave,
}: SessionSettingsDrawerProps) {
    const [name, setName] =
        useState("");

    const [copied, setCopied] =
        useState(false);

    const [resultsMode, setResultsMode] =
        useState<ResultsMode>("on_command");

    useEffect(() => {
        if (!session) {
            setName("");
            setResultsMode("on_command");

            return;
        }

        setName(
            session.name ?? "",
        );

        setResultsMode(
            session.results_mode ?? "on_command",
        );
    }, [session]);

    useEffect(() => {
        if (!open) {
            setCopied(false);
        }
    }, [open]);

    if (!open) {
        return null;
    }

    const sessionCode =
        session?.join_code ?? "";

    const participantUrl =
        typeof window !== "undefined" &&
        sessionCode
            ? `${window.location.origin}/session/${sessionCode}`
            : "";

    const handleCopyLink =
        async () => {
            if (!participantUrl) {
                return;
            }

            try {
                await navigator.clipboard.writeText(
                    participantUrl,
                );

                setCopied(true);

                window.setTimeout(() => {
                    setCopied(false);
                }, 2000);
            } catch {
                setCopied(false);
            }
        };

    const handleSave =
        async () => {
            const trimmedName =
                name.trim();

            if (!trimmedName) {
                return;
            }

            await onSave({
                name: trimmedName,
                results_mode: resultsMode,
            });
        };

    return (
        <>
            <div
                className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-[2px]"
                onClick={onClose}
            />

            <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-5 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
                            <Settings2 className="h-5 w-5" />
                        </div>

                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                                Session
                            </p>

                            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                                Settings
                            </h2>
                        </div>
                    </div>

                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                    >
                        <X className="h-5 w-5" />

                        <span className="sr-only">
                            Close settings
                        </span>
                    </Button>
                </div>

                <div className="flex-1 space-y-7 overflow-y-auto p-5">
                    <div>
                        <Label
                            htmlFor="session-name"
                            className="text-sm font-bold"
                        >
                            Session Name
                        </Label>

                        <Input
                            id="session-name"
                            value={name}
                            onChange={(event) =>
                                setName(
                                    event.target
                                        .value,
                                )
                            }
                            placeholder="Enter session name"
                            className="mt-2"
                        />

                        <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                            This name is used to
                            identify the session
                            inside the instructor
                            workspace.
                        </p>
                    </div>

                    <div>
                        <Label
                            htmlFor="session-results-mode"
                            className="text-sm font-bold"
                        >
                            Default Results Mode
                        </Label>

                        <select
                            id="session-results-mode"
                            value={resultsMode}
                            onChange={(event) =>
                                setResultsMode(
                                    event.target.value as ResultsMode,
                                )
                            }
                            className="mt-2 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring"
                        >
                            <option value="on_command">
                                On command
                            </option>
                            <option value="live">
                                Show live
                            </option>
                            <option value="hidden">
                                Hidden
                            </option>
                        </select>

                        <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                            Sets the default results behavior for this live session.
                            Individual question settings can override this default.
                        </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/40">
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                            Participant Link
                        </p>

                        <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                            Share this link with
                            participants so they
                            can join the live
                            session.
                        </p>

                        <div className="mt-4 flex gap-2">
                            <Input
                                value={
                                    participantUrl
                                }
                                readOnly
                                className="min-w-0 bg-white text-xs dark:bg-slate-950"
                            />

                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={
                                    handleCopyLink
                                }
                                disabled={
                                    !participantUrl
                                }
                            >
                                <Copy className="h-4 w-4" />

                                <span className="sr-only">
                                    Copy participant
                                    link
                                </span>
                            </Button>

                            {participantUrl ? (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={() =>
                                        window.open(
                                            participantUrl,
                                            "_blank",
                                            "noopener,noreferrer",
                                        )
                                    }
                                >
                                    <ExternalLink className="h-4 w-4" />

                                    <span className="sr-only">
                                        Open participant
                                        link
                                    </span>
                                </Button>
                            ) : null}
                        </div>

                        {copied ? (
                            <p className="mt-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                                Link copied to
                                clipboard.
                            </p>
                        ) : null}
                    </div>

                    <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            Session Code
                        </p>

                        <p className="mt-2 font-mono text-lg font-bold tracking-wide text-slate-800 dark:text-slate-200">
                            {sessionCode || "—"}
                        </p>
                    </div>
                </div>

                <div className="flex gap-3 border-t border-slate-200 p-5 dark:border-slate-800">
                    <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        disabled={isSaving}
                        onClick={onClose}
                    >
                        Cancel
                    </Button>

                    <Button
                        type="button"
                        className="flex-1"
                        disabled={
                            isSaving ||
                            !name.trim()
                        }
                        onClick={handleSave}
                    >
                        <Save className="mr-2 h-4 w-4" />

                        {isSaving
                            ? "Saving..."
                            : "Save Changes"}
                    </Button>
                </div>
            </aside>
        </>
    );
}