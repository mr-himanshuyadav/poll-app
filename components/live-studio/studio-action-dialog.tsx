"use client";

import { AlertTriangle, HelpCircle, MonitorPlay } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export type StudioActionDialogVariant = "warning" | "danger" | "info";

interface StudioActionDialogProps {
    open: boolean;
    title: string;
    description: string;
    confirmLabel: string;
    cancelLabel?: string;
    variant?: StudioActionDialogVariant;
    isLoading?: boolean;
    onCancel: () => void;
    onConfirm: () => void | Promise<void>;
}

const variantConfig = {
    warning: {
        icon: AlertTriangle,
        iconClass: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
        buttonVariant: "default" as const,
    },
    danger: {
        icon: AlertTriangle,
        iconClass: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300",
        buttonVariant: "destructive" as const,
    },
    info: {
        icon: MonitorPlay,
        iconClass: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300",
        buttonVariant: "default" as const,
    },
};

export function StudioActionDialog({
    open,
    title,
    description,
    confirmLabel,
    cancelLabel = "Cancel",
    variant = "warning",
    isLoading = false,
    onCancel,
    onConfirm,
}: StudioActionDialogProps) {
    const config = variantConfig[variant];
    const Icon = config.icon;

    return (
        <AlertDialog open={open} onOpenChange={(nextOpen) => !nextOpen && onCancel()}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <div className="flex items-start gap-3 pr-8">
                        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${config.iconClass}`}>
                            <Icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                            <AlertDialogTitle>{title}</AlertDialogTitle>
                            <AlertDialogDescription className="mt-2">
                                {description}
                            </AlertDialogDescription>
                        </div>
                    </div>
                </AlertDialogHeader>

                <AlertDialogFooter>
                    <Button type="button" variant="outline" disabled={isLoading} onClick={onCancel}>
                        {cancelLabel}
                    </Button>
                    <Button
                        type="button"
                        variant={config.buttonVariant}
                        disabled={isLoading}
                        onClick={() => void onConfirm()}
                    >
                        {isLoading ? "Working..." : confirmLabel}
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
