/**
 * EncounterFindings is the canonical, structured projection of everything
 * the student has *discovered* about the patient during a session.
 *
 * It is intentionally:
 *   - flat-ish and serializable (JSON-safe, lives in Postgres `jsonb`)
 *   - derived deterministically from `revealed_facts` + `completed_exam_actions`
 *     + `pain_level` + `emotional_state` + `diagnosis_hypotheses` on SessionRow
 *   - the single contract the future 3D body model will read from to decide
 *     what regions to highlight, what cues to render, etc.
 *
 * IMPORTANT: never store raw transcript text here. Only structured state.
 */

/** Tri-state for symptoms that can be unknown / asked-and-positive / asked-and-negative. */
export type Tri = boolean | null;

export type BodyRegion =
  | "head"
  | "chest"
  | "abdomen"
  | "rlq"
  | "llq"
  | "ruq"
  | "luq"
  | "periumbilical"
  | "flank"
  | "back"
  | "pelvis";

export type EmotionalAffect = {
  /** Short label, e.g. "anxiety" | "discomfort" | "pain" | "calm". */
  label: string;
  /** Self-reported pain on 0-10. Mirrors SessionRow.pain_level. */
  painLevel: number;
};

export type SymptomMap = {
  abdominalPain: Tri;
  nausea: Tri;
  vomiting: Tri;
  fever: Tri;
  /** Decreased appetite / not eating. */
  anorexia: Tri;
  diarrhea: Tri;
  giBleeding: Tri;
  urinarySymptoms: Tri;
};

export type PainProfile = {
  /** Discovered locations, e.g. ["periumbilical", "rlq"]. */
  location: BodyRegion[];
  /** 0-10. Null if not elicited. */
  severity: number | null;
  /** Free-text qualitative note if elicited (e.g. "started ~18h ago"). */
  onset: string | null;
  /** True if pain has migrated from one region to another. */
  migration: Tri;
  reboundTenderness: Tri;
  aggravatingFactors: string[];
  relievingFactors: string[];
};

/**
 * Per-history-bucket booleans tracking *whether the student has elicited
 * that piece of history yet*. The 3D model can use these to gate its
 * "patient is showing X" affordances.
 */
export type DiscoveredHistory = {
  chiefComplaint: boolean;
  onset: boolean;
  location: boolean;
  progression: boolean;
  associatedSymptoms: boolean;
  pertinentNegatives: boolean;
  aggravatingFactors: boolean;
  relievingFactors: boolean;
};

export type ExamFlags = {
  abdomenPalpated: boolean;
  rlqPalpated: boolean;
  chestAuscultated: boolean;
  headInspected: boolean;
  guarding: boolean;
  rebound: boolean;
};

/**
 * Visualization hints for the 3D body. The 3D layer can subscribe to this
 * sub-object alone and render highlights/cues without needing to understand
 * the rest of the encounter state.
 */
export type BodyVisualizationState = {
  /** Any region the student has touched OR learned is relevant. */
  highlightedRegions: BodyRegion[];
  /** Regions where pain has been elicited or reported. */
  painRegions: BodyRegion[];
  /** Regions the student has actively examined. */
  examTriggeredRegions: BodyRegion[];
  /** Patient cues the model can show animations for, e.g. "guarding", "rebound", "diaphoresis". */
  cues: string[];
};

export type DiagnosisHypothesis = {
  diagnosis: string;
  /** 0-100. Optional. */
  confidence?: number;
  rationale?: string | null;
  submittedAt: string;
};

export type EncounterFindings = {
  chiefComplaint: string | null;
  symptoms: SymptomMap;
  pain: PainProfile;
  discoveredHistory: DiscoveredHistory;
  exam: ExamFlags;
  bodyVisualization: BodyVisualizationState;
  emotionalAffect: EmotionalAffect;
  diagnosisHypotheses: DiagnosisHypothesis[];
};
