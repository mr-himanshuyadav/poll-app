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
  ResultVisibilityTarget,
} from "@/lib/types";

export type StudioTab = |
  "live" |
  "questions" |
  "participants" |
  "analytics";

export type {
  Participant,
  PollResponse,
  QuestionConfig,
  QuestionStatus,
  QuestionType,
  QuizTemplate,
  ResultsMode,
  ResultVisibilityTarget,
  Session,
  SessionQuestion,
  SessionStatus,
};

export type LiveSession = Session;
export type SessionParticipant = Participant;
export type SessionResponse = PollResponse;
export type Template = QuizTemplate;

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

export interface SessionQuestionAnalytics {
  question_id: string;
  total_responses: number;
  response_count: number;
  response_rate: number;
  participation_rate: number;
  options: string[];
  distribution: Array<{
    id: string;
    label: string;
    count: number;
    percentage: number;
  }>;
}

export interface SessionAnalytics {
  total_participants: number;
  total_responses: number;
  answered_questions: number;
  average_response_rate: number;
  response_rate: number;
  questions: SessionQuestionAnalytics[];
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

export interface LiveStudioActionState {
  isUpdating: boolean;
  isSavingQuestion: boolean;
  isUpdatingParticipants: boolean;
}