import type {
  Participant,
  PollResponse,
  QuestionConfig,
  QuestionStatus,
  QuestionType,
  QuizTemplate,
  ResultsMode,
  Session,
  SessionQuestion,
  SessionStatus,
} from "@/lib/types";

/**
 * Tabs available inside Live Studio.
 */
export type StudioTab = |
  "live" |
  "questions" |
  "participants" |
  "analytics";

/**
 * Re-export canonical application types.
 *
 * Live Studio should not maintain duplicate versions of
 * Session, SessionQuestion, Participant, or PollResponse.
 */
export type {
  Participant,
  PollResponse,
  QuestionConfig,
  QuestionStatus,
  QuestionType,
  QuizTemplate,
  ResultsMode,
  Session,
  SessionQuestion,
  SessionStatus,
};

/**
 * Backward-compatible aliases used by Studio components.
 */
export type LiveSession = Session;
export type SessionParticipant = Participant;
export type SessionResponse = PollResponse;
export type Template = QuizTemplate;

/**
 * Where question results are visible.
 */
export type ResultVisibilityTarget =
  | "projector"
  | "students"
  | "both";

/**
 * Analytics for one answer option.
 */
export interface QuestionOptionAnalytics {
  key: string;
  label: string;
  count: number;
  percentage: number;
}

/**
 * Rich analytics for the currently active question.
 */
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
 * Analytics for a question inside the Analytics workspace.
 */
export interface SessionQuestionAnalytics {
  question_id: string;
  total_responses: number;
  response_count: number;
  response_rate: number;
  participation_rate: number;
  
  /**
   * Original question options.
   * Useful when an option has received zero responses.
   */
  options: string[];
  
  distribution: Array < {
    id: string;
    label: string;
    count: number;
    percentage: number;
  } > ;
}

/**
 * Session-level analytics.
 *
 * These names intentionally use the existing snake_case format
 * consumed by the Analytics Studio components.
 */
export interface SessionAnalytics {
  total_participants: number;
  total_responses: number;
  answered_questions: number;
  average_response_rate: number;
  response_rate: number;
  
  questions: SessionQuestionAnalytics[];
}

/**
 * UI-only option used by QuestionEditor.
 */
export interface QuestionFormOption {
  id: string;
  value: string;
}

/**
 * UI-only QuestionEditor state.
 *
 * Scale labels are stored inside SessionQuestion.config.
 * They are temporarily represented here as separate fields
 * for a convenient editing interface.
 */
export interface QuestionFormState {
  question: string;
  questionType: QuestionType;
  options: QuestionFormOption[];
  
  scaleMin: number;
  scaleMax: number;
  
  scaleMinLabel: string;
  scaleMaxLabel: string;
  scaleLabels: Record<string, string>;
  scalePreset:
    | "numeric"
    | "agreement"
    | "satisfaction"
    | "frequency"
    | "quality"
    | "custom";
  
  resultsMode: ResultsMode;
}

/**
 * Generic Studio action state.
 */
export interface LiveStudioActionState {
  isUpdating: boolean;
  isSavingQuestion: boolean;
  isUpdatingParticipants: boolean;
}