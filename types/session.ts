import type { ExamActionRecord } from "./exam";
import type { DiagnosisHypothesis, EncounterFindings } from "./findings";

export type SessionStatus = "active" | "completed" | "archived";

export type SessionRow = {
  id: string;
  user_id: string | null;
  /** Synthea patient id (`sessions.patient` → `patients."Id"`). Field name kept for API compatibility. */
  case_id: string;
  status: SessionStatus;
  emotional_state: string;
  pain_level: number;
  revealed_facts: string[];
  completed_exam_actions: ExamActionRecord[];
  /**
   * Structured projection of everything the student has discovered so far.
   * Derived deterministically from revealed_facts + completed_exam_actions
   * + pain/emotion + diagnosis_hypotheses. The 3D body model reads from this.
   */
  discovered_findings: EncounterFindings;
  /** Append-only list of diagnoses the student has submitted. */
  diagnosis_hypotheses: DiagnosisHypothesis[];
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
