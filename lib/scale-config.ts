import type { QuestionConfig } from "@/lib/types";

export type ScalePreset =
    | "numeric"
    | "agreement"
    | "satisfaction"
    | "frequency"
    | "quality"
    | "custom";

export interface ScaleValue {
    value: number;
    label?: string;
}

export interface ResolvedScaleConfig {
    min: number;
    max: number;
    preset: ScalePreset;
    values: ScaleValue[];
    minLabel?: string;
    maxLabel?: string;
}

export const SCALE_PRESET_LABELS: Record<
    Exclude<ScalePreset, "custom">,
    Record<string, string>
> = {
    numeric: {},
    agreement: {
        "1": "Strongly disagree",
        "2": "Disagree",
        "3": "Neither agree nor disagree",
        "4": "Agree",
        "5": "Strongly agree",
    },
    satisfaction: {
        "1": "Very dissatisfied",
        "2": "Dissatisfied",
        "3": "Neutral",
        "4": "Satisfied",
        "5": "Very satisfied",
    },
    frequency: {
        "1": "Never",
        "2": "Rarely",
        "3": "Sometimes",
        "4": "Often",
        "5": "Always",
    },
    quality: {
        "1": "Very poor",
        "2": "Poor",
        "3": "Average",
        "4": "Good",
        "5": "Excellent",
    },
};

function toFiniteNumber(
    value: unknown,
    fallback: number,
): number {
    const number = Number(value);

    return Number.isFinite(number)
        ? number
        : fallback;
}

/**
 * Resolves every legacy and new scale configuration into one
 * predictable structure. Numeric values remain the response data;
 * labels are presentation metadata only.
 */
export function resolveScaleConfig(
    config: QuestionConfig | undefined | null,
): ResolvedScaleConfig {
    const source = config ?? {};

    let min = toFiniteNumber(source.min, 1);
    let max = toFiniteNumber(source.max, 5);

    if (max < min) {
        [min, max] = [max, min];
    }

    const preset =
        source.scalePreset === "agreement" ||
        source.scalePreset === "satisfaction" ||
        source.scalePreset === "frequency" ||
        source.scalePreset === "quality" ||
        source.scalePreset === "custom" ||
        source.scalePreset === "numeric"
            ? source.scalePreset
            : "numeric";

    const configuredLabels =
        source.scaleLabels &&
        typeof source.scaleLabels === "object"
            ? source.scaleLabels as Record<string, string>
            : {};

    const presetLabels =
        preset === "custom"
            ? {}
            : SCALE_PRESET_LABELS[preset];

    const labels = {
        ...presetLabels,
        ...configuredLabels,
    };

    const values = Array.from(
        { length: Math.min(101, Math.max(1, max - min + 1)) },
        (_, index) => {
            const value = min + index;
            const label = labels[String(value)]?.trim();

            return {
                value,
                ...(label ? { label } : {}),
            };
        },
    );

    return {
        min,
        max,
        preset,
        values,
        minLabel:
            source.minLabel?.trim() ||
            values[0]?.label,
        maxLabel:
            source.maxLabel?.trim() ||
            values.at(-1)?.label,
    };
}
