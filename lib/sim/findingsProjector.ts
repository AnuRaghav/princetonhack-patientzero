import type { CaseDocument } from "@/types/case";
import type { ExamActionRecord } from "@/types/exam";
import type {
  BodyRegion,
  DiagnosisHypothesis,
  EncounterFindings,
} from "@/types/findings";

/**
 * Pure, deterministic projector that turns the flat session row
 * (revealed_facts[], completed_exam_actions[], pain_level, emotional_state)
 * into the structured EncounterFindings the 3D model + scoring layer consume.
 *
 * No LLM, no I/O. This is the single source of truth for "what has the
 * student discovered so far".
 */

export function emptyFindings(): EncounterFindings {
  return {
    chiefComplaint: null,
    symptoms: {
      abdominalPain: null,
      nausea: null,
      vomiting: null,
      fever: null,
      anorexia: null,
      diarrhea: null,
      giBleeding: null,
      urinarySymptoms: null,
    },
    pain: {
      location: [],
      severity: null,
      onset: null,
      migration: null,
      reboundTenderness: null,
      aggravatingFactors: [],
      relievingFactors: [],
    },
    discoveredHistory: {
      chiefComplaint: false,
      onset: false,
      location: false,
      progression: false,
      associatedSymptoms: false,
      pertinentNegatives: false,
      aggravatingFactors: false,
      relievingFactors: false,
    },
    exam: {
      abdomenPalpated: false,
      rlqPalpated: false,
      chestAuscultated: false,
      headInspected: false,
      guarding: false,
      rebound: false,
    },
    bodyVisualization: {
      highlightedRegions: [],
      painRegions: [],
      examTriggeredRegions: [],
      cues: [],
    },
    emotionalAffect: {
      label: "anxiety",
      painLevel: 0,
    },
    diagnosisHypotheses: [],
  };
}

function addUnique<T>(list: T[], value: T): void {
  if (!list.includes(value)) list.push(value);
}

function addRegions(list: BodyRegion[], values: BodyRegion[]): void {
  for (const v of values) addUnique(list, v);
}

/**
 * Mapping of `revealed_fact` keys → mutations on findings.
 * Adding a new fact key here is the only place you need to edit
 * to teach the projector about a new piece of patient history.
 */
const FACT_MUTATIONS: Record<string, (f: EncounterFindings) => void> = {
  pain_location: (f) => {
    f.discoveredHistory.location = true;
    f.symptoms.abdominalPain = true;
    addRegions(f.pain.location, ["rlq"]);
    addRegions(f.bodyVisualization.painRegions, ["rlq"]);
    addRegions(f.bodyVisualization.highlightedRegions, ["rlq", "abdomen"]);
  },
  pain_migration: (f) => {
    f.pain.migration = true;
    f.symptoms.abdominalPain = true;
    f.discoveredHistory.progression = true;
    f.discoveredHistory.location = true;
    addRegions(f.pain.location, ["periumbilical", "rlq"]);
    addRegions(f.bodyVisualization.painRegions, ["periumbilical", "rlq"]);
    addRegions(f.bodyVisualization.highlightedRegions, [
      "periumbilical",
      "rlq",
      "abdomen",
    ]);
  },
  pain_onset: (f) => {
    f.pain.onset = "Approximately 18 hours ago, progressively worsening.";
    f.discoveredHistory.onset = true;
  },
  nausea: (f) => {
    f.symptoms.nausea = true;
    f.discoveredHistory.associatedSymptoms = true;
  },
  vomiting: (f) => {
    f.symptoms.vomiting = true;
    f.discoveredHistory.associatedSymptoms = true;
  },
  fever: (f) => {
    f.symptoms.fever = true;
    f.discoveredHistory.associatedSymptoms = true;
  },
  appetite: (f) => {
    f.symptoms.anorexia = true;
    f.discoveredHistory.associatedSymptoms = true;
  },
  neg_diarrhea: (f) => {
    f.symptoms.diarrhea = false;
    f.discoveredHistory.pertinentNegatives = true;
  },
  neg_gi_bleed: (f) => {
    f.symptoms.giBleeding = false;
    f.discoveredHistory.pertinentNegatives = true;
  },
  neg_urinary: (f) => {
    f.symptoms.urinarySymptoms = false;
    f.discoveredHistory.pertinentNegatives = true;
  },
};

/**
 * Mapping of exam `finding_key` values → mutations on findings.
 * Keep keys aligned with `data/cases/*.json` `physical_exam_findings[].finding_key`.
 */
const EXAM_FINDING_MUTATIONS: Record<string, (f: EncounterFindings) => void> = {
  palpate_rlq: (f) => {
    f.exam.abdomenPalpated = true;
    f.exam.rlqPalpated = true;
    f.symptoms.abdominalPain = true;
    addRegions(f.bodyVisualization.examTriggeredRegions, ["abdomen", "rlq"]);
    addRegions(f.bodyVisualization.highlightedRegions, ["abdomen", "rlq"]);
    addRegions(f.bodyVisualization.painRegions, ["rlq"]);
    addUnique(f.bodyVisualization.cues, "tenderness");
  },
  palpate_abdomen_general: (f) => {
    f.exam.abdomenPalpated = true;
    f.symptoms.abdominalPain = true;
    addRegions(f.bodyVisualization.examTriggeredRegions, ["abdomen"]);
    addRegions(f.bodyVisualization.highlightedRegions, ["abdomen"]);
    addRegions(f.bodyVisualization.painRegions, ["abdomen", "rlq"]);
    addUnique(f.bodyVisualization.cues, "diffuse_tenderness");
  },
  rebound_rlq: (f) => {
    f.exam.rebound = true;
    f.exam.rlqPalpated = true;
    f.exam.abdomenPalpated = true;
    f.pain.reboundTenderness = true;
    addRegions(f.bodyVisualization.examTriggeredRegions, ["rlq"]);
    addRegions(f.bodyVisualization.highlightedRegions, ["rlq"]);
    addRegions(f.bodyVisualization.painRegions, ["rlq"]);
    addUnique(f.bodyVisualization.cues, "rebound");
  },
  guarding_rlq: (f) => {
    f.exam.guarding = true;
    addRegions(f.bodyVisualization.painRegions, ["rlq"]);
    addUnique(f.bodyVisualization.cues, "guarding");
  },
  auscultate_chest: (f) => {
    f.exam.chestAuscultated = true;
    addRegions(f.bodyVisualization.examTriggeredRegions, ["chest"]);
    addRegions(f.bodyVisualization.highlightedRegions, ["chest"]);
  },
  inspect_head: (f) => {
    f.exam.headInspected = true;
    addRegions(f.bodyVisualization.examTriggeredRegions, ["head"]);
    addRegions(f.bodyVisualization.highlightedRegions, ["head"]);
    addUnique(f.bodyVisualization.cues, "diaphoresis");
  },
};

export type ProjectFindingsArgs = {
  caseDoc: CaseDocument;
  revealedFacts: string[];
  completedExamActions: ExamActionRecord[];
  emotionalState: string;
  painLevel: number;
  diagnosisHypotheses?: DiagnosisHypothesis[];
};

export function projectFindings(args: ProjectFindingsArgs): EncounterFindings {
  const f = emptyFindings();

  f.chiefComplaint = args.caseDoc.chief_complaint || null;
  if (f.chiefComplaint) f.discoveredHistory.chiefComplaint = true;

  f.emotionalAffect = {
    label: args.emotionalState || "anxiety",
    painLevel: args.painLevel ?? 0,
  };

  // Patient self-reports current pain level even before pin-pointing location.
  if (args.painLevel > 0) f.pain.severity = args.painLevel;

  for (const factKey of args.revealedFacts) {
    const m = FACT_MUTATIONS[factKey];
    if (m) m(f);
  }

  for (const action of args.completedExamActions) {
    const m = EXAM_FINDING_MUTATIONS[action.finding_key];
    if (m) m(f);
    // Always log the targeted region as exam-triggered so the 3D layer
    // can react even to no-op exam taps.
    addRegions(f.bodyVisualization.examTriggeredRegions, [
      action.target as BodyRegion,
    ]);
    addRegions(f.bodyVisualization.highlightedRegions, [
      action.target as BodyRegion,
    ]);
  }

  f.diagnosisHypotheses = args.diagnosisHypotheses ?? [];

  return f;
}

/** Append a hypothesis without losing prior entries. */
export function appendDiagnosisHypothesis(
  prior: DiagnosisHypothesis[],
  next: Omit<DiagnosisHypothesis, "submittedAt"> & { submittedAt?: string },
): DiagnosisHypothesis[] {
  return [
    ...prior,
    {
      diagnosis: next.diagnosis,
      confidence: next.confidence,
      rationale: next.rationale ?? null,
      submittedAt: next.submittedAt ?? new Date().toISOString(),
    },
  ];
}
