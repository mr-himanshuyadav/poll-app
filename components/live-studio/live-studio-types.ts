import type {
    QuestionConfig,
    QuestionStatus,
    QuestionType,
    ResultsMode,
    Session,
    SessionQuestion,
    SessionStatus,
    Participant,
    PollResponse,
    QuizTemplate
} from "@/lib/types";

/**
 * Tabs available inside Live Studio.
 */
export type StudioTab =
    | "live"
    | "questions"
    | "participants"
    | "analytics";

/**
 * Re-export the application's canonical domain types so
 * Live Studio uses the same schema as the rest of the app.
 */
export type {
    QuestionConfig,
    QuestionStatus,
    QuestionType,
    ResultsMode,
    Session,
    SessionQuestion,
    SessionStatus,
    Participant,
    PollResponse,
};

/**
 * Backwards-compatible aliases used by existing Studio components.
 */
export type LiveSession = Session;
export type SessionParticipant = Participant;
export type SessionResponse = PollResponse;
export type Template = QuizTemplate;

/**
 * Analytics for a single question.
 */
export interface QuestionOptionAnalytics {
    key: string;
    label: string;
    count: number;
    percentage: number;
}

export interface QuestionAnalytics {
    questionId: string;
    totalResponses: number;
    uniqueResponders: number;
    participationRate: number;
    averageResponseTimeMs: number | null;
    medianResponseTimeMs: number | null;
    dominantOption: string | null;
    dominantOptionPercentage: number;
    optionDistribution: QuestionOptionAnalytics[];
}

/**
 * Session-level analytics.
 *
 * The first group uses camelCase for the Studio's richer analytics model.
 * The optional snake_case fields are retained because the current
 * Analytics UI reads these names.
 */
export interface SessionAnalytics {
    total_participants: number;

    total_responses: number;

    answered_questions: number;

    average_response_rate: number;

    response_rate: number;

    questions: Array<{
        question_id: string;

        total_responses: number;

        response_count: number;

        response_rate: number;

        participation_rate: number;

        options?: string[];

        distribution?: Array<{
            id?: string;

            label?: string;

            option?: string;

            text?: string;

            count?: number;

            responses?: number;

            percentage?: number;
        }>;
    }>;
}

/**
 * UI-only option shape used by QuestionEditor.
 */
export interface QuestionFormOption {
    id: string;
    value: string;
}

/**
 * UI-only state used by QuestionEditor.
 */
export interface QuestionFormState {
    question: string;
    questionType: QuestionType;
    options: QuestionFormOption[];
    scaleMin: number;
    scaleMax: number;
    scaleMinLabel: string;
    scaleMaxLabel: string;
    resultsMode: ResultsMode;
}

/**
 * UI action state.
 */
export interface LiveStudioActionState {
    isUpdating: boolean;
    isSavingQuestion: boolean;
    isUpdatingParticipants: boolean;
}