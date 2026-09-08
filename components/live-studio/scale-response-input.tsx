"use client";

import type { QuestionConfig } from "@/lib/types";
import { resolveScaleConfig } from "@/lib/scale-config";

interface ScaleResponseInputProps {
    config: QuestionConfig;
    value: string | null;
    onChange: (value: string) => void;
    disabled?: boolean;
}

export function ScaleResponseInput({
    config,
    value,
    onChange,
    disabled = false,
}: ScaleResponseInputProps) {
    const scale = resolveScaleConfig(config);
    const rangeSize = scale.values.length;

    const gridClass =
        rangeSize <= 5
            ? "grid-cols-5"
            : rangeSize <= 10
                ? "grid-cols-5 sm:grid-cols-10"
                : "grid-cols-5 sm:grid-cols-8 lg:grid-cols-10";

    return (
        <div className="space-y-4">
            {(scale.minLabel || scale.maxLabel) && (
                <div className="flex items-start justify-between gap-4 px-1 text-xs font-semibold text-muted-foreground">
                    <span className="max-w-[45%]">
                        {scale.minLabel}
                    </span>
                    <span className="max-w-[45%] text-right">
                        {scale.maxLabel}
                    </span>
                </div>
            )}

            <div className={"grid gap-2 " + gridClass}>
                {scale.values.map((item) => {
                    const stringValue = String(item.value);
                    const isSelected = value === stringValue;

                    return (
                        <button
                            key={stringValue}
                            type="button"
                            disabled={disabled}
                            onClick={() => onChange(stringValue)}
                            aria-pressed={isSelected}
                            className={[
                                "group min-h-[56px] rounded-xl border px-2 py-2 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-60",
                                isSelected
                                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                                    : "border-border bg-background hover:border-primary/50 hover:bg-muted/60",
                            ].join(" ")}
                        >
                            <span className="block text-base font-black leading-none">
                                {item.value}
                            </span>

                            {item.label && (
                                <span
                                    className={[
                                        "mt-1.5 block text-[10px] leading-tight",
                                        isSelected
                                            ? "text-primary-foreground/85"
                                            : "text-muted-foreground",
                                    ].join(" ")}
                                >
                                    {item.label}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {value !== null && value !== "" && (
                <div className="rounded-xl border bg-muted/30 px-3 py-2 text-center text-sm">
                    <span className="text-muted-foreground">
                        Selected:
                    </span>{" "}
                    <span className="font-bold">
                        {value}
                        {scale.values.find(
                            (item) => String(item.value) === value,
                        )?.label
                            ? ` — ${scale.values.find(
                                (item) => String(item.value) === value,
                              )?.label}`
                            : ""}
                    </span>
                </div>
            )}
        </div>
    );
}
