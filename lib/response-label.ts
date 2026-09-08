import { resolveScaleConfig } from "@/lib/scale-config";
import type { SessionQuestion } from "@/lib/types";

export function getResponseDisplayLabel(
  question: Pick<SessionQuestion, "type" | "config"> | null | undefined,
  answer: unknown,
): string {
  const raw =
    typeof answer === "string" || typeof answer === "number" || typeof answer === "boolean"
      ? String(answer)
      : Array.isArray(answer)
        ? answer.map(String).join(", ")
        : answer == null
          ? ""
          : JSON.stringify(answer);

  if (!question || (question.type !== "scale" && question.type !== "rating")) return raw;

  const value = Number(raw);
  const scaleValue = resolveScaleConfig(question.config).values.find((item) => item.value === value);
  return scaleValue?.label ? `${raw} — ${scaleValue.label}` : raw;
}
