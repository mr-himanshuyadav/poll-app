import type {
    QuestionStatus,
    ResultsMode,
    SessionQuestion,
    SessionStatus,
} from "./live-studio-types";

export function formatPercentage(
    value: number | null | undefined,
): string {
    if (
        value === null ||
        value === undefined ||
        Number.isNaN(value)
    ) {
        return "0%";
    }

    return `${Math.round(value)}%`;
}

export function formatDurationMs(
    value: number | null | undefined,
): string {
    if (
        value === null ||
        value === undefined ||
        Number.isNaN(value) ||
        value < 0
    ) {
        return "—";
    }

    if (value < 1000) {
        return `${Math.round(value)}ms`;
    }

    const seconds = value / 1000;

    if (seconds < 60) {
        return `${seconds.toFixed(
            seconds >= 10 ? 1 : 2,
        )}s`;
    }

    const minutes = Math.floor(seconds / 60);

    const remainingSeconds = Math.round(
        seconds % 60,
    );

    return `${minutes}m ${remainingSeconds}s`;
}

export function formatRelativeTime(
    value: string | null | undefined,
): string {
    if (!value) {
        return "—";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "—";
    }

    const now = Date.now();

    const difference = Math.max(
        0,
        now - date.getTime(),
    );

    const seconds = Math.floor(
        difference / 1000,
    );

    if (seconds < 10) {
        return "just now";
    }

    if (seconds < 60) {
        return `${seconds}s ago`;
    }

    const minutes = Math.floor(seconds / 60);

    if (minutes < 60) {
        return `${minutes}m ago`;
    }

    const hours = Math.floor(minutes / 60);

    if (hours < 24) {
        return `${hours}h ago`;
    }

    const days = Math.floor(hours / 24);

    return `${days}d ago`;
}

export function getQuestionPrompt(
    question: SessionQuestion | null | undefined,
): string {
    if (!question) {
        return "";
    }

    return (
        question.question ??
        question.prompt ??
        question.title ??
        "Untitled question"
    );
}

export function getQuestionTypeLabel(
    question: SessionQuestion | null | undefined,
): string {
    if (!question) {
        return "Question";
    }

    const type =
        question.question_type ??
        question.type ??
        "";

    switch (type) {
        case "multiple_choice":
            return "Multiple Choice";

        case "scale":
            return "Scale";

        default:
            if (!type) {
                return "Question";
            }

            return type
                .split("_")
                .map(
                    (word) =>
                        word.charAt(0).toUpperCase() +
                        word.slice(1),
                )
                .join(" ");
    }
}

export function getQuestionStatusLabel(
    status: QuestionStatus | null | undefined,
): string {
    switch (status) {
        case "active":
            return "Live";

        case "closed":
            return "Completed";

        case "draft":
            return "Draft";

        case "queued":
            return "Ready";

        default:
            return "Ready";
    }
}

export function getQuestionStatusClassName(
    status: QuestionStatus | null | undefined,
): string {
    switch (status) {
        case "active":
            return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300";

        case "closed":
            return "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300";

        case "draft":
            return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300";

        case "queued":
        default:
            return "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/30 dark:text-indigo-300";
    }
}

export function getSessionStatusLabel(
    status: SessionStatus | null | undefined,
): string {
    switch (status) {
        case "live":
            return "Live";

        case "paused":
            return "Paused";

        case "completed":
            return "Completed";

        case "draft":
            return "Draft";

        default:
            return "Live";
    }
}

export function getSessionStatusClassName(
    status: SessionStatus | null | undefined,
): string {
    switch (status) {
        case "live":
            return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300";

        case "paused":
            return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300";

        case "completed":
            return "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300";

        case "draft":
        default:
            return "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/30 dark:text-indigo-300";
    }
}

export function getResultsModeLabel(
    mode: ResultsMode | null | undefined,
): string {
    switch (mode) {
        case "live":
            return "Live Results";

        case "manual":
        case "on_command":
            return "Reveal Manually";

        case "hidden":
            return "Instructor Only";

        default:
            return "Reveal Manually";
    }
}

export function getResultsModeDescription(
    mode: ResultsMode | null | undefined,
): string {
    switch (mode) {
        case "live":
            return "Students see results immediately.";

        case "manual":
        case "on_command":
            return "You decide when students see results.";

        case "hidden":
            return "Results remain hidden from students.";

        default:
            return "You decide when students see results.";
    }
}

export function calculateProgressPercentage(
    completed: number,
    total: number,
): number {
    if (total <= 0) {
        return 0;
    }

    return Math.min(
        100,
        Math.max(
            0,
            (completed / total) * 100,
        ),
    );
}

export function getQuestionPosition(
    question: SessionQuestion,
    questions: SessionQuestion[],
): number {
    const index = questions.findIndex(
        (item) => item.id === question.id,
    );

    return index >= 0
        ? index + 1
        : 0;
}

export function getNextQuestion(
    questions: SessionQuestion[],
    activeQuestion: SessionQuestion | null,
): SessionQuestion | null {
    if (questions.length === 0) {
        return null;
    }

    const sortedQuestions = [...questions].sort(
        (a, b) =>
            (a.position ?? 0) -
            (b.position ?? 0),
    );

    if (!activeQuestion) {
        return (
            sortedQuestions.find(
                (question) =>
                    question.status !== "closed",
            ) ?? null
        );
    }

    const activeIndex =
        sortedQuestions.findIndex(
            (question) =>
                question.id === activeQuestion.id,
        );

    if (activeIndex < 0) {
        return null;
    }

    return (
        sortedQuestions
            .slice(activeIndex + 1)
            .find(
                (question) =>
                    question.status !== "closed",
            ) ?? null
    );
}

export function getPreviousQuestion(
    questions: SessionQuestion[],
    activeQuestion: SessionQuestion | null,
): SessionQuestion | null {
    if (
        !activeQuestion ||
        questions.length === 0
    ) {
        return null;
    }

    const sortedQuestions = [...questions].sort(
        (a, b) =>
            (a.position ?? 0) -
            (b.position ?? 0),
    );

    const activeIndex =
        sortedQuestions.findIndex(
            (question) =>
                question.id === activeQuestion.id,
        );

    if (activeIndex <= 0) {
        return null;
    }

    return (
        sortedQuestions
            .slice(0, activeIndex)
            .reverse()
            .find(
                (question) =>
                    question.status === "closed" ||
                    question.status === "queued" ||
                    question.status === "draft",
            ) ?? null
    );
}

export function getQuestionOptionLabel(
    index: number,
): string {
    return String.fromCharCode(
        65 + index,
    );
}

export function getInitials(
    value: string | null | undefined,
): string {
    if (!value) {
        return "?";
    }

    const words = value
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    if (words.length === 0) {
        return "?";
    }

    if (words.length === 1) {
        return words[0]
            .slice(0, 2)
            .toUpperCase();
    }

    return `${words[0][0]}${
        words[1][0]
    }`.toUpperCase();
}