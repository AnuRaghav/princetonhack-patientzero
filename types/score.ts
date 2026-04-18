export type ScoreReportRow = {
  id: string;
  session_id: string;
  checklist_score: number;
  empathy_score: number;
  diagnostic_score: number;
  summary: string;
  misses: string[];
  strengths: string[];
  created_at: string;
};

export type ScoreResult = {
  checklistScore: number;
  empathyScore: number;
  diagnosticScore: number;
  summary: string;
  misses: string[];
  strengths: string[];
};
