"use client";

import {
    AlertTriangle,
    ArrowLeft,
    RefreshCw,
} from "lucide-react";

import { Button } from "@/components/ui/button";

interface StudioErrorStateProps {
    title?: string;

    message?: string;

    error?: unknown;

    onRetry?: () => void;

    onBack?: () => void;
}

function getErrorMessage(
    error: unknown,
): string | null {
    if (!error) {
        return null;
    }

    if (
        typeof error === "string"
    ) {
        return error;
    }

    if (
        error instanceof Error
    ) {
        return error.message;
    }

    if (
        typeof error === "object" &&
        error !== null &&
        "message" in error &&
        typeof (
            error as {
                message?: unknown;
            }
        ).message === "string"
    ) {
        return (
            error as {
                message: string;
            }
        ).message;
    }

    return null;
}

export function StudioErrorState({
    title = "Unable to load Live Studio",
    message = "Something went wrong while loading this session. Please try again.",
    error,
    onRetry,
    onBack,
}: StudioErrorStateProps) {
    const errorMessage =
        getErrorMessage(error);

    return (
        <div className="flex min-h-[70vh] w-full items-center justify-center px-4">
            <div className="w-full max-w-lg rounded-2xl border border-red-100 bg-white p-6 text-center shadow-sm dark:border-red-950/50 dark:bg-slate-950 sm:p-8">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400">
                    <AlertTriangle className="h-8 w-8" />
                </div>

                <h1 className="mt-6 text-xl font-bold text-slate-900 dark:text-slate-100">
                    {title}
                </h1>

                <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                    {errorMessage ||
                        message}
                </p>

                <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
                    {onRetry ? (
                        <Button
                            type="button"
                            onClick={onRetry}
                        >
                            <RefreshCw className="mr-2 h-4 w-4" />

                            Try Again
                        </Button>
                    ) : null}

                    {onBack ? (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onBack}
                        >
                            <ArrowLeft className="mr-2 h-4 w-4" />

                            Go Back
                        </Button>
                    ) : null}
                </div>
            </div>
        </div>
    );
}