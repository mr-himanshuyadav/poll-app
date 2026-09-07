"use client";

interface StudioLoadingStateProps {
    title?: string;

    description?: string;
}

export function StudioLoadingState({
    title = "Loading Live Studio",
    description = "Preparing your session workspace...",
}: StudioLoadingStateProps) {
    return (
        <div className="flex min-h-[70vh] w-full items-center justify-center px-4">
            <div className="flex w-full max-w-md flex-col items-center text-center">
                <div className="relative flex h-16 w-16 items-center justify-center">
                    <div className="absolute inset-0 animate-ping rounded-2xl bg-indigo-200/60 dark:bg-indigo-900/30" />

                    <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 shadow-lg shadow-indigo-500/20">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    </div>
                </div>

                <h1 className="mt-6 text-xl font-bold text-slate-900 dark:text-slate-100">
                    {title}
                </h1>

                <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                    {description}
                </p>

                <div className="mt-8 w-full space-y-3">
                    <div className="h-12 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-900" />

                    <div className="h-32 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-900" />

                    <div className="h-24 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-900" />
                </div>
            </div>
        </div>
    );
}