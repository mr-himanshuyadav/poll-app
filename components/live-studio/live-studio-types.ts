export type SessionStatus =
    | "live"
    | "paused"
    | "completed"
    | "draft"
    | string;

export type QuestionStatus =
    | "draft"
    | "queued"
    | "active"
    | "closed"
    | string;

export type QuestionType =
    | "multiple_choice"
    | "scale"
    | string;

export type ResultsMode =
    | "live"
    | "manual"
    | "hidden"
    | "on_command"
    | string;

export type StudioTab =
    | "live"
    | "questions"
    | "participants"
    | "analytics";

export interface Session {
    id: string;

    join_code: string;

    name?: string | null;

    title?: string | null;

    description?: string | null;

    template_id?: string | null;

    instructor_id?: string | null;

    active_question_id?: string | null;

    status: SessionStatus;

    is_offline?: boolean | null;

    allow_late_join: boolean;

    started_at?: string | null;

    paused_at?: string | null;

    completed_at?: string | null;

    created_at?: string | null;

    updated_at?: string | null;

    [key: string]: unknown;
}

export interface Template {
    id: string;

    title?: string | null;

    name?: string | null;

    description?: string | null;

    [key: string]: unknown;
}

export interface QuestionOption {
    id?: string;

    value?: string;

    label?: string;

    text?: string;

    position?: number;

    is_correct?: boolean;

    [key: string]: unknown;
}

export interface SessionQuestion {
    id: string;

    session_id: string;

    question?: string | null;

    prompt?: string | null;

    title?: string | null;

    description?: string | null;

    question_type?: QuestionType;

    type?: QuestionType;

    options?: QuestionOption[] | null;

    scale_min?: number | null;

    scale_max?: number | null;

    scale_min_label?: string | null;

    scale_max_label?: string | null;

    results_mode?: ResultsMode | null;

    results_visible?: boolean | null;

    status: QuestionStatus;

    position?: number | null;

    activated_at?: string | null;

    closed_at?: string | null;

    created_at?: string | null;

    updated_at?: string | null;

    [key: string]: unknown;
}

export interface SessionResponse {
    id: string;

    session_id: string;

    question_id: string;

    participant_id?: string | null;

    user_id?: string | null;

    answer?: unknown;

    response?: unknown;

    selected_option?: string | null;

    submitted_at?: string | null;

    created_at?: string | null;

    updated_at?: string | null;

    [key: string]: unknown;
}

export interface SessionParticipant {
    id: string;

    session_id: string;

    participant_id?: string | null;

    user_id?: string | null;

    name?: string | null;

    display_name?: string | null;

    joined_at?: string | null;

    last_active_at?: string | null;

    created_at?: string | null;

    updated_at?: string | null;

    [key: string]: unknown;
}

export interface ParticipantSummary {
    total: number;

    active: number;

    inactive: number;
}

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

export interface SessionAnalytics {
    totalQuestions: number;

    totalParticipants: number;

    activeParticipants: number;

    inactiveParticipants: number;

    totalResponses: number;

    uniqueResponders: number;

    overallParticipationRate: number;

    averageResponseTimeMs: number | null;

    medianResponseTimeMs: number | null;
}

export interface QuestionFormOption {
    id: string;

    value: string;
}

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

export interface LiveStudioActionState {
    isUpdating: boolean;

    isSavingQuestion: boolean;

    isUpdatingParticipants: boolean;
}