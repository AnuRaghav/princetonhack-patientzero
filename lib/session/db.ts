import type { ExamActionRecord } from "@/types/exam";
import type { DiagnosisHypothesis, EncounterFindings } from "@/types/findings";
import type { SessionRow, SessionStatus, TranscriptTurnRow } from "@/types/session";

import { emptyFindings } from "@/lib/sim/findingsProjector";

type SessionDbRow = {
  id: string;
  user_id: string | null;
  /** Canonical: `sessions.patient` → `patients."Id"` (Synthea). */
  patient?: string | number | null;
  /** Legacy alternates if DB was migrated differently. */
  patient_id?: string | number | null;
  case_id?: string | number | null;
  status: string;
  emotional_state: string;
  pain_level: number;
  revealed_facts: unknown;
  completed_exam_actions: unknown;
  discovered_findings?: unknown;
  diagnosis_hypotheses?: unknown;
  created_at: string;
  updated_at: string;
};

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function toSessionRow(row: SessionDbRow): SessionRow {
  const findings =
    isPlainObject(row.discovered_findings) &&
    Object.keys(row.discovered_findings).length > 0
      ? (row.discovered_findings as EncounterFindings)
      : emptyFindings();

  const patientKey =
    row.patient != null && String(row.patient).length > 0
      ? String(row.patient)
      : row.patient_id != null
        ? String(row.patient_id)
        : row.case_id != null
          ? String(row.case_id)
          : "";

  return {
    id: row.id,
    user_id: row.user_id,
    case_id: patientKey,
    status: row.status as SessionStatus,
    emotional_state: row.emotional_state,
    pain_level: row.pain_level,
    revealed_facts: (row.revealed_facts as string[]) ?? [],
    completed_exam_actions: (row.completed_exam_actions as ExamActionRecord[]) ?? [],
    discovered_findings: findings,
    diagnosis_hypotheses: (row.diagnosis_hypotheses as DiagnosisHypothesis[]) ?? [],
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function toTranscriptRow(row: {
  id: string;
  session_id: string;
  speaker: string;
  message: string;
  metadata: unknown;
  created_at: string;
}): TranscriptTurnRow {
  return {
    id: row.id,
    session_id: row.session_id,
    speaker: row.speaker as TranscriptTurnRow["speaker"],
    message: row.message,
    metadata: (row.metadata as Record<string, unknown> | null) ?? null,
    created_at: row.created_at,
  };
}
