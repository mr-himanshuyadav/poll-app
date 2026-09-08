import type { ResultsMode, Session } from "@/lib/types";

/** Resolve a question's effective result mode against its session. */
export function resolveResultMode(
  questionMode: ResultsMode | null | undefined,
  sessionMode: ResultsMode,
): ResultsMode {
  return !questionMode || questionMode === "default"
    ? sessionMode
    : questionMode;
}

export function isResultsSuppressed(
  questionMode: ResultsMode | null | undefined,
  session: Pick<Session, "results_mode">,
): boolean {
  return resolveResultMode(questionMode, session.results_mode) === "hidden";
}
