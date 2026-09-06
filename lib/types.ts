export type SessionStatus =
  | "draft"
  | "ready"
  | "live"
  | "paused"
  | "completed"
  | "archived";

export type QuestionStatus =
  | "draft"
  | "queued"
  | "active"
  | "closed";

export type QuestionType =
  | "multiple_choice"
  | "scale"
  | "true_false"
  | "numeric"
  | "short_text"
  | "rating";

export type ResultsMode =
  | "live"
  | "on_command"
  | "hidden";

export type ParticipantMode =
  | "anonymous"
  | "identified";

export type SessionEventType =
  | "session_created"
  | "session_started"
  | "session_paused"
  | "session_resumed"
  | "session_completed"
  | "question_created"
  | "question_updated"
  | "question_activated"
  | "question_closed"
  | "results_revealed"
  | "results_hidden"
  | "participant_joined"
  | "participant_left"
  | "response_submitted"
  | "response_updated";

export interface QuizTemplate {
  id: string;
  instructor_id: string;
  title: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuestionConfig {
  allowMultiple?: boolean;
  min?: number;
  max?: number;
  step?: number;
  [key: string]: unknown;
}

export interface Question {
  id: string;
  template_id: string;
  text: string;
  type: QuestionType;
  options: string[];
  config: QuestionConfig;
  position: number;
  status: QuestionStatus;
  results_mode: ResultsMode;
  results_visible: boolean;
  created_at: string;
  updated_at: string;
  activated_at: string | null;
  closed_at: string | null;
}

export interface SessionQuestion {
  id: string;
  session_id: string;
  source_question_id: string | null;
  text: string;
  type: QuestionType;
  options: string[];
  config: QuestionConfig;
  position: number;
  status: QuestionStatus;
  results_mode: ResultsMode;
  results_visible: boolean;
  created_at: string;
  updated_at: string;
  activated_at: string | null;
  closed_at: string | null;
}

export interface Session {
  id: string;
  template_id: string | null;
  instructor_id: string;
  name: string;
  join_code: string;
  status: SessionStatus;
  participant_mode: ParticipantMode;
  results_mode: ResultsMode;
  allow_late_join: boolean;
  allow_answer_change: boolean;
  is_offline: boolean;
  active_question_id: string | null;
  created_at: string;
  started_at: string | null;
  paused_at: string | null;
  ended_at: string | null;
  updated_at: string;
}

export interface Participant {
  id: string;
  quiz_id: string;
  session_token: string;
  name: string | null;
  roll_number: number | null;
  is_anonymous: boolean;
  joined_at: string;
  last_seen_at: string;
  left_at: string | null;
}

export interface PollResponse {
  id: string;
  quiz_id: string;
  question_id: string;
  participant_id: string;
  answer: unknown;
  submitted_at: string;
  updated_at: string;
  response_time_ms: number | null;
}

export interface SessionEvent {
  id: number;
  session_id: string;
  question_id: string | null;
  participant_id: string | null;
  event_type: SessionEventType;
  payload: Record<string, unknown>;
  created_at: string;
}