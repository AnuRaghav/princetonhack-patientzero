import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

import type {
  BucketedObservations,
  DerivedPatientContext,
  DiagnosisEntry,
  EncounterSummary,
  PatientCaseSnapshot,
  PatientProfile,
  QuestionAnswerObservation,
  SymptomOrMeasureObservation,
} from "@/lib/patient/patientCaseTypes";
import type { SyntheaPatientRow } from "@/lib/synthea/types";

/** Curated case URL slug → JSON filename under `lib/`. */
export const CURATED_VOICE_SLUG_TO_FILE: Record<string, string> = {
  "maria-wolf": "Maria.json",
  "jason-mehta": "Jason.json",
};

/** Known UUIDs from those JSON files (allows older clients that still send Id). */
const CURATED_VOICE_ID_TO_FILE: Record<string, string> = {
  "4e009ce1-7815-4712-a345-a73779d64ad4": "Maria.json",
  "bb88c0d7-c32c-4586-aa4e-092d46ac4367": "Jason.json",
};

type CuratedCaseJsonRow = {
  id: string;
  slug?: string;
  patient_first_name?: string;
  patient_last_name?: string;
  age?: number;
  sex?: string;
  occupation?: string;
  setting?: string;
  chief_complaint?: string;
  opening_statement?: string;
  personality_summary?: string;
  history_present_illness?: unknown;
  past_medical_history?: unknown;
  medications?: unknown;
  allergies?: unknown;
  social_history?: unknown;
  vitals?: Record<string, unknown>;
  physical_exam?: unknown;
  hidden_clues?: string[];
};

const cache = new Map<string, PatientCaseSnapshot>();
const rowCache = new Map<string, CuratedCaseJsonRow>();

function resolveCuratedFilename(patientId: string): string | null {
  const k = patientId.trim();
  if (!k) return null;
  if (CURATED_VOICE_SLUG_TO_FILE[k]) return CURATED_VOICE_SLUG_TO_FILE[k];
  if (CURATED_VOICE_ID_TO_FILE[k]) return CURATED_VOICE_ID_TO_FILE[k];
  return null;
}

async function loadCuratedRow(fileName: string): Promise<CuratedCaseJsonRow | null> {
  const hit = rowCache.get(fileName);
  if (hit) return hit;

  const filePath = path.join(process.cwd(), "lib", fileName);
  const raw = await readFile(filePath, "utf8");
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed) || parsed.length === 0) return null;
  const row = parsed[0];
  if (!row || typeof row !== "object") return null;
  const typed = row as CuratedCaseJsonRow;
  if (!typed.id || typeof typed.id !== "string") return null;

  rowCache.set(fileName, typed);
  return typed;
}

function approximateBirthDate(age?: number): string | null {
  if (age == null || !Number.isFinite(age)) return null;
  const y = new Date().getFullYear() - Math.floor(age);
  return `${y}-06-15`;
}

function stringifyLeaf(key: string, value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "boolean") return `${key}: ${value ? "yes" : "no"}`;
  if (typeof value === "number" || typeof value === "string") {
    const s = String(value).trim();
    if (!s) return null;
    return `${key}: ${s}`;
  }
  return null;
}

/** Flattens nested objects/arrays into short symptom-style lines for the model. */
function flattenHistory(obj: unknown, maxDepth = 5): string[] {
  if (maxDepth <= 0) return [];
  if (obj == null) return [];

  if (Array.isArray(obj)) {
    if (obj.every((x) => typeof x === "string")) {
      return obj.map((x) => String(x).trim()).filter(Boolean);
    }
    return obj.flatMap((item, i) => flattenHistory(item, maxDepth - 1).map((s) => `[${i}] ${s}`));
  }

  if (typeof obj !== "object") return [];

  const out: string[] = [];
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const leaf = stringifyLeaf(k, v);
    if (leaf) {
      out.push(leaf);
      continue;
    }
    if (typeof v === "object" && v !== null) {
      out.push(...flattenHistory(v, maxDepth - 1).map((s) => `${k} - ${s}`));
    }
  }
  return out;
}

function vitalsToRows(vitals: Record<string, unknown> | undefined): SymptomOrMeasureObservation[] {
  if (!vitals) return [];
  const labels: Record<string, string> = {
    heart_rate: "Heart rate",
    spo2_percent: "SpO₂",
    temperature_f: "Temperature (°F)",
    blood_pressure: "Blood pressure",
    respiratory_rate: "Respiratory rate",
  };
  const rows: SymptomOrMeasureObservation[] = [];
  for (const [key, raw] of Object.entries(vitals)) {
    const label = labels[key] ?? key.replace(/_/g, " ");
    const value = raw == null ? "-" : typeof raw === "number" ? String(raw) : String(raw).trim() || "-";
    rows.push({
      description: label,
      value,
      units: null,
      date: null,
    });
  }
  return rows;
}

function examToRows(exam: unknown): SymptomOrMeasureObservation[] {
  if (!exam || typeof exam !== "object") return [];
  return flattenHistory(exam).map((text) => ({
    description: "Exam",
    value: text,
    units: null,
    date: null,
  }));
}

function toMedicationQa(meds: unknown): QuestionAnswerObservation[] {
  if (!Array.isArray(meds) || meds.length === 0) return [];
  const lines = meds
    .map((m) => {
      if (!m || typeof m !== "object") return null;
      const o = m as Record<string, unknown>;
      const name = typeof o.name === "string" ? o.name : null;
      if (!name) return null;
      const dose = typeof o.dose === "string" ? o.dose : "";
      const freq = typeof o.frequency === "string" ? o.frequency : "";
      const rest = [dose, freq].filter(Boolean).join(" · ");
      return rest ? `${name} (${rest})` : name;
    })
    .filter((x): x is string => Boolean(x));
  if (!lines.length) return [];
  return [{ question: "Medications you take", answer: lines.join("; "), key: "meds" }];
}

function toAllergyQa(allergies: unknown): QuestionAnswerObservation[] {
  if (!Array.isArray(allergies) || allergies.length === 0) return [];
  const lines = allergies
    .map((a) => {
      if (!a || typeof a !== "object") return null;
      const o = a as Record<string, unknown>;
      const sub = typeof o.substance === "string" ? o.substance : null;
      const rx = typeof o.reaction === "string" ? o.reaction : null;
      if (!sub && !rx) return null;
      return rx && sub ? `${sub}: ${rx}` : sub ?? rx ?? null;
    })
    .filter((x): x is string => Boolean(x));
  if (!lines.length) return [];
  return [{ question: "Allergies", answer: lines.join("; "), key: "allergy" }];
}

function socialAndPastToQa(social: unknown, pmh: unknown): QuestionAnswerObservation[] {
  const out: QuestionAnswerObservation[] = [];

  if (pmh && typeof pmh === "object") {
    const flat = flattenHistory(pmh).slice(0, 8);
    if (flat.length) {
      out.push({
        question: "Past medical history",
        answer: flat.join("; "),
        key: "pmh",
      });
    }
  }

  if (social && typeof social === "object") {
    const lines = flattenHistory(social).slice(0, 14);
    if (lines.length) {
      out.push({
        question: "Social / lifestyle context",
        answer: lines.join("; "),
        key: "social",
      });
    }
  }

  return out;
}

function buildDerived(row: CuratedCaseJsonRow): DerivedPatientContext {
  const likely = row.chief_complaint?.trim() || "Feeling unwell";

  const fromHpi = flattenHistory(row.history_present_illness).slice(0, 14);
  const chiefSymptomsExtra: string[] = [];
  const hpi = row.history_present_illness;
  if (hpi && typeof hpi === "object" && !Array.isArray(hpi)) {
    const chief = (hpi as Record<string, unknown>).chief_symptoms;
    if (Array.isArray(chief) && chief.every((x) => typeof x === "string")) {
      chiefSymptomsExtra.push(...chief.map((x) => String(x)));
    }
  }

  const relevantSymptoms = [...new Set([...chiefSymptomsExtra, ...fromHpi])].slice(0, 12);

  const bg: string[] = [];
  if (row.personality_summary?.trim()) bg.push(row.personality_summary.trim());
  if (row.occupation?.trim()) bg.push(`Works as ${row.occupation}`);
  if (row.setting?.trim()) bg.push(`Setting: ${row.setting}`);
  const extraSocial = flattenHistory(row.social_history).slice(0, 10);
  bg.push(...extraSocial);

  return {
    likelyChiefComplaint: likely,
    relevantSymptoms: relevantSymptoms.length ? relevantSymptoms : [likely],
    relevantBackground: bg.slice(0, 14),
  };
}

function buildObservations(row: CuratedCaseJsonRow): BucketedObservations {
  const vitals = vitalsToRows(row.vitals);
  const exam = examToRows(row.physical_exam);
  const hpiLines = flattenHistory(row.history_present_illness).map((text) => ({
    description: "Today's story",
    value: text,
    units: null as string | null,
    date: null as string | null,
  }));

  const medications = toMedicationQa(row.medications);
  const allergies = toAllergyQa(row.allergies);
  const socialPast = socialAndPastToQa(row.social_history, row.past_medical_history);

  const screeningAnswers: QuestionAnswerObservation[] = [...medications, ...allergies];
  const clues = row.hidden_clues?.filter(Boolean) ?? [];
  if (clues.length) {
    screeningAnswers.push({
      question: "Details you might recall if prompted",
      answer: clues.slice(0, 12).join("; "),
      key: "details",
    });
  }

  return {
    symptoms: [...hpiLines, ...exam].slice(0, 28),
    vitals,
    labs: [],
    socialContext: socialPast,
    screeningAnswers,
  };
}

function rowToSnapshot(row: CuratedCaseJsonRow): PatientCaseSnapshot {
  const hit = cache.get(row.id);
  if (hit) return hit;

  const patient: PatientProfile = {
    id: row.id,
    firstName: (row.patient_first_name ?? "").trim() || "Patient",
    lastName: (row.patient_last_name ?? "").trim() || "",
    birthDate: approximateBirthDate(row.age),
    gender: row.sex?.trim() ?? null,
    race: null,
    ethnicity: null,
  };

  const encounter: EncounterSummary = {
    encounterId: row.slug ? `curated-${row.slug}` : `curated-${row.id}`,
    date: null,
  };

  const diagnoses: DiagnosisEntry[] = [];

  const observations = buildObservations(row);
  const derivedContext = buildDerived(row);

  const snapshot: PatientCaseSnapshot = {
    patient,
    encounter,
    diagnoses,
    observations,
    derivedContext,
  };

  cache.set(row.id, snapshot);
  return snapshot;
}

function rowToSyntheaPatient(row: CuratedCaseJsonRow): SyntheaPatientRow {
  return {
    Id: row.id,
    FIRST: row.patient_first_name ?? "",
    LAST: row.patient_last_name ?? "",
    BIRTHDATE: approximateBirthDate(row.age),
    GENDER: row.sex ?? null,
    RACE: null,
    ETHNICITY: null,
    ACTIVE: true,
  };
}

/**
 * Loads a curated case from `lib/Maria.json` / `lib/Jason.json` when `patientId`
 * is the case slug (`maria-wolf`, `jason-mehta`) or the UUID embedded in JSON.
 */
export async function tryLoadCuratedPatientCaseForVoice(patientId: string): Promise<{
  patient: SyntheaPatientRow;
  snapshot: PatientCaseSnapshot;
} | null> {
  const file = resolveCuratedFilename(patientId);
  if (!file) return null;

  const row = await loadCuratedRow(file);
  if (!row) return null;

  return {
    patient: rowToSyntheaPatient(row),
    snapshot: rowToSnapshot(row),
  };
}
