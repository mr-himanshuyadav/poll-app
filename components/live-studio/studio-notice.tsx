"use client";

import { useEffect, useRef, useState } from "react";
import {
    CheckCircle2,
    Info,
    TriangleAlert,
    X,
} from "lucide-react";

export type StudioNoticeType =
    | "success"
    | "error"
    | "warning"
    | "info";

interface StudioNoticeProps {
    type?: StudioNoticeType;

    title?: string;

    message: string;

    onClose?: () => void;
}

const noticeStyles: Record<
    StudioNoticeType,
    {
        wrapper: string;
        icon: string;
        title: string;
        message: string;
        Icon: typeof Info;
    }
> = {
    success: {
        wrapper:
            "border-emerald-200 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/30",

        icon:
            "text-emerald-600 dark:text-emerald-400",

        title:
            "text-emerald-900 dark:text-emerald-200",

        message:
            "text-emerald-800/80 dark:text-emerald-300/80",

        Icon: CheckCircle2,
    },

    error: {
        wrapper:
            "border-red-200 bg-red-50 dark:border-red-900/60 dark:bg-red-950/30",

        icon:
            "text-red-600 dark:text-red-400",

        title:
            "text-red-900 dark:text-red-200",

        message:
            "text-red-800/80 dark:text-red-300/80",

        Icon: TriangleAlert,
    },

    warning: {
        wrapper:
            "border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/30",

        icon:
            "text-amber-600 dark:text-amber-400",

        title:
            "text-amber-900 dark:text-amber-200",

        message:
            "text-amber-800/80 dark:text-amber-300/80",

        Icon: TriangleAlert,
    },

    info: {
        wrapper:
            "border-blue-200 bg-blue-50 dark:border-blue-900/60 dark:bg-blue-950/30",

        icon:
            "text-blue-600 dark:text-blue-400",

        title:
            "text-blue-900 dark:text-blue-200",

        message:
            "text-blue-800/80 dark:text-blue-300/80",

        Icon: Info,
    },
};

export function StudioNotice({
    type = "info",
    title,
    message,
    onClose,
}: StudioNoticeProps) {
    const styles =
        noticeStyles[type];

    const Icon = styles.Icon;
    const [progress, setProgress] = useState(100);
    const [isHovered, setIsHovered] = useState(false);
    const remainingRef = useRef(5000);
    const lastTickRef = useRef<number | null>(null);

    useEffect(() => {
        remainingRef.current = 5000;
        lastTickRef.current = performance.now();
        setProgress(100);
    }, [message]);

    useEffect(() => {
        if (isHovered) {
            lastTickRef.current = null;
            return;
        }

        lastTickRef.current = performance.now();
        const interval = window.setInterval(() => {
            const now = performance.now();
            const previous = lastTickRef.current ?? now;
            const elapsed = now - previous;
            lastTickRef.current = now;
            remainingRef.current = Math.max(0, remainingRef.current - elapsed);
            setProgress((remainingRef.current / 5000) * 100);
            if (remainingRef.current <= 0) onClose?.();
        }, 50);

        return () => window.clearInterval(interval);
    }, [isHovered, onClose]);

    return (
        <div
            className={[
                "animate-in slide-in-from-right-4 fade-in flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-2xl",
                styles.wrapper,
            ].join(" ")}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            role={
                type === "error"
                    ? "alert"
                    : "status"
            }
        >
            <Icon
                className={[
                    "mt-0.5 h-5 w-5 shrink-0",
                    styles.icon,
                ].join(" ")}
            />

            <div className="min-w-0 flex-1">
                {title ? (
                    <p
                        className={[
                            "text-sm font-bold",
                            styles.title,
                        ].join(" ")}
                    >
                        {title}
                    </p>
                ) : null}

                <p
                    className={[
                        title
                            ? "mt-1"
                            : "",
                        "text-sm leading-5",
                        styles.message,
                    ].join(" ")}
                >
                    {message}
                </p>
            </div>

            {onClose ? (
                <button
                    type="button"
                    onClick={onClose}
                    className={[
                        "rounded-md p-1 transition hover:bg-black/5 dark:hover:bg-white/10",
                        styles.icon,
                    ].join(" ")}
                >
                    <span className="relative flex h-6 w-6 items-center justify-center"><svg className="absolute inset-0 h-6 w-6 -rotate-90" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2"/><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="56.5" strokeDashoffset={56.5 * (1 - progress / 100)} strokeLinecap="round"/></svg><X className="h-3.5 w-3.5" /></span>

                    <span className="sr-only">
                        Dismiss notification
                    </span>
                </button>
            ) : null}
        </div>
    );
}