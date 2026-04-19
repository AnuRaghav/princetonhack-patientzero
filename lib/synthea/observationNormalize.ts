import type { SyntheaObservationRow } from "./types";

/** Classification label for one observation row. */
export type ObservationBucketKind =
  | "symptom"
  | "vital"
  | "lab"
  | "socialContext"
  | "screeningAnswer"
  | "ignore";

function normalizeWhitespace(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function valueToString(v: SyntheaObservationRow["VALUE"]): string {
  if (v == null) return "";
  return typeof v === "number" ? String(v) : String(v).trim();
}

/** Heuristic: numeric measurement vs free-text answer. */
function looksLikeNumericMeasurement(val: string): boolean {
  if (!val) return false;
  return /^-?\d+(\.\d+)?$/.test(val);
}

function isQuestionLikeDescription(desc: string): boolean {
  const d = desc.trim();
  if (!d) return false;
  if (d.includes("?")) return true;
  if (d.length >= 90) return true;
  return /^(has |have you|do you|did you|are you|were you|when |what |how |which |please indicate|during the past|in the past|i would like to ask|rate your|mark if)/i.test(
    d,
  );
}

const VITAL_TERMS =
  /\b(heart rate|pulse|blood pressure|systolic|diastolic|temperature|temp\b|respiratory rate|respiration|oxygen saturation|spo2|o2 sat|weight|height|body mass index|\bbmi\b|pain score|pain severity)\b/i;

const LAB_TERMS =
  /\b(glucose|hemoglobin|creatinine|potassium|sodium|cholesterol|inr|troponin|leukocyte|platelet|hematocrit|inr\b|hba1c|hemoglobin a1c|lipid|ldl|hdl|triglyceride|inr|pt\b|inr\b|inr\/pt)\b/i;

const SYMPTOM_TERMS =
  /\b(pain|ache|hurt|nausea|vomit|cough|fever|chill|shortness|breath|dizz|headache|diarrhea|fatigue|weak|swelling|rash|itch|numb|tingling|cramp|bleed)\b/i;

/** Strong admin / geographic noise - dropped unless overridden by useful SDOH below. */
const ADMIN_JUNK =
  /\b(geocode|latitude|longitude|street address|full address|zip code|postal code|primary care facility|billing|employer id)\b/i;

const IGNORE_INSURANCE_ADMIN =
  /\b(primary insurance|secondary insurance|coverage type|payer|subscriber id|member id)\b/i;

/** Useful lived-context cues we keep as structured Q&A (not symptoms). */
const USEFUL_SOCIAL =
  /\b(transportation|education|schooling|married|employment|occupation|tobacco|smoking|smoker|alcohol|drinking|housing|food insecurity|caregiver|interpreter|language spoken)\b/i;

const SCREENING_SCALE =
  /\b(phq|gad-|gad7|phq-9|phq9|audit|audit-c|screening for|assessment\b|ipv|violence|sdoh|social determinants|depression screening|anxiety screening)\b/i;

/** Derive a stable short key from question text when useful for prompts. */
export function inferQuestionKey(question: string): string | undefined {
  const q = question.toLowerCase();
  if (/transportation/.test(q) && /appointment|medical|kept/.test(q)) return "transportation_barrier";
  if (/highest level of education|education\b/.test(q)) return "education_level";
  if (/smoking|tobacco/.test(q)) return "tobacco_use";
  if (/alcohol|drinking/.test(q)) return "alcohol_use";
  if (/insurance|coverage/.test(q)) return "insurance";
  return undefined;
}

type ClassificationContext = {
  cat: string;
  desc: string;
  descLower: string;
  val: string;
  questionLike: boolean;
  numericAns: boolean;
  typeLower: string;
};

const CHIEF_COMPLAINT_RE = /chief complaint|reason for visit|problem list|concern\b/i;
const PAIN_SCALE_RE = /pain|severity|scale/i;
const SYMPTOM_LOOSE_RE = /complaint|symptom|feeling/i;

function classifyVital(ctx: ClassificationContext): ObservationBucketKind {
  if (ctx.questionLike && !ctx.numericAns && ctx.val) return "screeningAnswer";
  return "vital";
}

function classifyLab(ctx: ClassificationContext): ObservationBucketKind {
  if (ctx.questionLike && !ctx.numericAns) return "screeningAnswer";
  return "lab";
}

function classifyQuestionWithValue(ctx: ClassificationContext): ObservationBucketKind {
  if (IGNORE_INSURANCE_ADMIN.test(ctx.descLower)) return "ignore";
  if (
    SCREENING_SCALE.test(ctx.descLower) ||
    ctx.cat.includes("survey") ||
    ctx.cat.includes("assessment")
  ) {
    return "screeningAnswer";
  }
  if (USEFUL_SOCIAL.test(ctx.descLower)) return "socialContext";
  if (CHIEF_COMPLAINT_RE.test(ctx.descLower)) return "symptom";
  if (ctx.numericAns && (VITAL_TERMS.test(ctx.descLower) || LAB_TERMS.test(ctx.descLower))) {
    return LAB_TERMS.test(ctx.descLower) ? "lab" : "vital";
  }
  // Long anonymous surveys default to screening, not chief complaint.
  if (ctx.desc.length >= 120) return "screeningAnswer";
  return "socialContext";
}

function classifyNumericLike(ctx: ClassificationContext): ObservationBucketKind {
  if (VITAL_TERMS.test(ctx.descLower)) return "vital";
  if (LAB_TERMS.test(ctx.descLower)) return "lab";
  if (PAIN_SCALE_RE.test(ctx.descLower)) return "symptom";
  if (SYMPTOM_TERMS.test(ctx.descLower)) return "symptom";
  return "symptom";
}

export function classifyObservation(row: SyntheaObservationRow): ObservationBucketKind {
  const cat = (row.CATEGORY ?? "").toLowerCase();
  const desc = normalizeWhitespace((row.DESCRIPTION ?? "").trim());
  const descLower = desc.toLowerCase();
  const val = valueToString(row.VALUE);

  if (!desc && !val) return "ignore";
  if (cat.includes("imaging") || cat.includes("procedure")) return "ignore";
  if (ADMIN_JUNK.test(descLower)) return "ignore";

  const ctx: ClassificationContext = {
    cat,
    desc,
    descLower,
    val,
    questionLike: isQuestionLikeDescription(desc),
    numericAns: looksLikeNumericMeasurement(val),
    typeLower: (row.TYPE ?? "").toLowerCase(),
  };

  if (cat.includes("vital") || cat.includes("vital-sign")) return classifyVital(ctx);
  if (cat.includes("laboratory") || cat.includes("lab")) return classifyLab(ctx);
  if (ctx.questionLike && val) return classifyQuestionWithValue(ctx);
  if (ctx.numericAns || ctx.typeLower.includes("quantity")) return classifyNumericLike(ctx);
  if (SYMPTOM_TERMS.test(descLower) || SYMPTOM_LOOSE_RE.test(descLower)) return "symptom";

  return "ignore";
}

export type ClassifiedObservation = {
  raw: SyntheaObservationRow;
  bucket: ObservationBucketKind;
};

export function classifyObservations(rows: SyntheaObservationRow[]): ClassifiedObservation[] {
  return rows.map((raw) => ({ raw, bucket: classifyObservation(raw) }));
}
