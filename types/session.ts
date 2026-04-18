import type { ExamActionRecord } from "./exam";

export type SessionStatus = "active" | "completed" | "archived";

export type SessionRow = {
  id: string;
  user_id: string | null;
  case_id: string;
  status: SessionStatus;
  emotional_state: string;
  pain_level: number;
  revealed_facts: string[];
  completed_exam_actions: ExamActionRecord[];
  created_at: string;
  updated_at: string;
};

export type TranscriptSpeaker = "student" | "patient";

export type TranscriptTurnRow = {
  id: string;
  session_id: string;
  speaker: TranscriptSpeaker;
  message: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export type ExamEventRow = {
  id: string;
  session_id: string;
  action_type: string;
  target: string;
  finding_key: string;
  payload: Record<string, unknown> | null;
  created_at: string;
};
