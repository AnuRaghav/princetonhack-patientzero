export type ExamAction = "palpate" | "auscultate" | "inspect";
export type ExamTarget =
  | "head"
  | "chest"
  | "abdomen"
  | "stomach"
  | "rlq"
  | "arms"
  | "legs"
  | "joints";

export type ExamActionRecord = {
  action: ExamAction;
  target: ExamTarget;
  finding_key: string;
  completed_at?: string;
};

export type VisualCue = {
  highlight: string;
  severity: "low" | "medium" | "high";
};

export type ExamEngineResult = {
  finding_key: string;
  finding: string;
  painDelta: number;
  audioUrl: string | null;
  visualCue: VisualCue | null;
};
