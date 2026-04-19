import "server-only";

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

import { createAdminClient } from "@/lib/supabase/admin";

import { getLatestEncounterId } from "./encounterBackground";
import {
  classifyObservations,
  inferQuestionKey,
  type ClassifiedObservation,
} from "./observationNormalize";
import { pickLayChiefComplaint } from "./patientVoice";
import type { SyntheaConditionRow, SyntheaObservationRow, SyntheaPatientRow } from "./types";

const ACTIVE_PATIENT_SELECT =
  '"Id","FIRST","LAST","BIRTHDATE","GENDER","RACE","ETHNICITY","ACTIVE"' as const;

function scrubDesc(d: string): string {
  return d.replace(/\[[^\]]+\]/g, " ").replace(/\s+/g, " ").trim();
}

function truncate(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function observationKey(o: SymptomOrMeasureObservation | QuestionAnswerObservation): string {
  if ("question" in o) return `qa:${o.question}:${o.answer}`;
  return `m:${o.description}:${o.value}:${o.date ?? ""}`;
}

function dedupeMeasurements(list: SymptomOrMeasureObservation[]): SymptomOrMeasureObservation[] {
  const seen = new Set<string>();
  const out: SymptomOrMeasureObservation[] = [];
  for (const item of list) {
    const k = observationKey(item);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(item);
  }
  return out;
}

function dedupeQA(list: QuestionAnswerObservation[]): QuestionAnswerObservation[] {
  const seen = new Set<string>();
  const out: QuestionAnswerObservation[] = [];
  for (const item of list) {
    const k = observationKey(item);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(item);
  }
  return out;
}

function rowToMeasurement(row: SyntheaObservationRow): SymptomOrMeasureObservation {
  const desc = scrubDesc((row.DESCRIPTION ?? "").trim()) || "(unspecified)";
  const valRaw = row.VALUE;
  const val =
    valRaw == null || String(valRaw).trim() === ""
      ? "—"
      : typeof valRaw === "number"
        ? String(valRaw)
        : String(valRaw).trim();
  return {
    description: truncate(desc, 280),
    value: truncate(val, 120),
    units: row.UNITS?.trim() ?? null,
    date: row.DATE?.trim() ?? null,
  };
}

function rowToQA(row: SyntheaObservationRow): QuestionAnswerObservation {
  const q = truncate(scrubDesc((row.DESCRIPTION ?? "").trim()), 320);
  const vRaw = row.VALUE;
  const answer =
    vRaw == null ? "" : typeof vRaw === "number" ? String(vRaw) : String(vRaw).trim();
  const key = inferQuestionKey(q);
  return {
    question: q,
    answer: truncate(answer, 400),
    ...(key ? { key } : {}),
  };
}

function bucketClassified(rows: ClassifiedObservation[]): BucketedObservations {
  const symptoms: SymptomOrMeasureObservation[] = [];
  const vitals: SymptomOrMeasureObservation[] = [];
  const labs: SymptomOrMeasureObservation[] = [];
  const socialContext: QuestionAnswerObservation[] = [];
  const screeningAnswers: QuestionAnswerObservation[] = [];

  for (const { raw, bucket } of rows) {
    if (bucket === "ignore") continue;
    if (bucket === "symptom") symptoms.push(rowToMeasurement(raw));
    else if (bucket === "vital") vitals.push(rowToMeasurement(raw));
    else if (bucket === "lab") labs.push(rowToMeasurement(raw));
    else if (bucket === "socialContext") socialContext.push(rowToQA(raw));
    else if (bucket === "screeningAnswer") screeningAnswers.push(rowToQA(raw));
  }

  return {
    symptoms: dedupeMeasurements(symptoms),
    vitals: dedupeMeasurements(vitals),
    labs: dedupeMeasurements(labs),
    socialContext: dedupeQA(socialContext),
    screeningAnswers: dedupeQA(screeningAnswers),
  };
}

function buildDerived(
  obs: BucketedObservations,
  rawObs: SyntheaObservationRow[],
  conditions: SyntheaConditionRow[],
): DerivedPatientContext {
  const likelyChiefComplaint = pickLayChiefComplaint(rawObs, conditions);

  const relevantSymptoms: string[] = [];
  for (const s of obs.symptoms.slice(0, 12)) {
    if (s.value && s.value !== "—") relevantSymptoms.push(`${s.description}: ${s.value}`);
    else relevantSymptoms.push(s.description);
  }

  const relevantBackground: string[] = [];
  for (const qa of obs.socialContext.slice(0, 10)) {
    const label = qa.key ?? qa.question.slice(0, 72);
    relevantBackground.push(`${label}: ${qa.answer}`);
  }
  for (const qa of obs.screeningAnswers.slice(0, 8)) {
    relevantBackground.push(`Screening — ${truncate(qa.question, 72)}: ${qa.answer}`);
  }

  return {
    likelyChiefComplaint,
    relevantSymptoms: relevantSymptoms.slice(0, 12),
    relevantBackground: relevantBackground.slice(0, 14),
  };
}

function mapPatient(row: SyntheaPatientRow): PatientProfile {
  return {
    id: row.Id,
    firstName: (row.FIRST ?? "").trim(),
    lastName: (row.LAST ?? "").trim(),
    birthDate: row.BIRTHDATE?.trim() ?? null,
    gender: row.GENDER?.trim() ?? null,
    race: row.RACE?.trim() ?? null,
    ethnicity: row.ETHNICITY?.trim() ?? null,
  };
}

function mapDiagnoses(rows: SyntheaConditionRow[]): DiagnosisEntry[] {
  return rows.map((r) => ({
    description: r.DESCRIPTION?.trim() ?? null,
    code: r.CODE?.trim() ?? null,
    system: r.SYSTEM?.trim() ?? null,
    start: r.START?.trim() ?? null,
    stop: r.STOP?.trim() ?? null,
  }));
}

export async function getActivePatientById(patientId: string): Promise<SyntheaPatientRow | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("patients")
    .select(ACTIVE_PATIENT_SELECT)
    .eq("Id", patientId)
    .eq("ACTIVE", true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data ?? null) as SyntheaPatientRow | null;
}

export async function pickRandomActivePatientId(): Promise<string | null> {
  const supabase = createAdminClient();
  const { count, error: countErr } = await supabase
    .from("patients")
    .select("*", { count: "exact", head: true })
    .eq("ACTIVE", true);
  if (countErr) throw new Error(countErr.message);
  const n = count ?? 0;
  if (n <= 0) return null;
  const offset = Math.floor(Math.random() * n);
  const { data, error } = await supabase
    .from("patients")
    .select('"Id"')
    .eq("ACTIVE", true)
    .order("Id", { ascending: true })
    .range(offset, offset)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const row = data as { Id?: string } | null;
  return row?.Id ?? null;
}

async function encounterLatestObservationDate(
  patientId: string,
  encounterId: string,
): Promise<string | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("observations")
    .select('"DATE"')
    .eq("PATIENT", patientId)
    .eq("ENCOUNTER", encounterId)
    .order("DATE", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const row = data as { DATE?: string | null } | null;
  return row?.DATE?.trim() ?? null;
}

async function listConditionsEncounter(
  patientId: string,
  encounterId: string,
): Promise<SyntheaConditionRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("conditions")
    .select('"START","STOP","PATIENT","ENCOUNTER","SYSTEM","CODE","DESCRIPTION"')
    .eq("PATIENT", patientId)
    .eq("ENCOUNTER", encounterId)
    .order("START", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as SyntheaConditionRow[];
}

async function listObservationsEncounter(
  patientId: string,
  encounterId: string,
): Promise<SyntheaObservationRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("observations")
    .select('"DATE","PATIENT","ENCOUNTER","CATEGORY","CODE","DESCRIPTION","VALUE","UNITS","TYPE"')
    .eq("PATIENT", patientId)
    .eq("ENCOUNTER", encounterId)
    .order("DATE", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as SyntheaObservationRow[];
}

/**
 * Builds a coherent latest-encounter snapshot for conversational simulation.
 * Requires `patients."ACTIVE" = true` for the given id (caller must enforce).
 */
export async function buildPatientCaseSnapshot(patientRow: SyntheaPatientRow): Promise<PatientCaseSnapshot | null> {
  const patientId = patientRow.Id;
  const encounterId = await getLatestEncounterId(patientId);
  if (!encounterId) return null;

  const [conditions, observations, encounterDate] = await Promise.all([
    listConditionsEncounter(patientId, encounterId),
    listObservationsEncounter(patientId, encounterId),
    encounterLatestObservationDate(patientId, encounterId),
  ]);

  const classified = classifyObservations(observations);
  const observationsBucketed = bucketClassified(classified);
  const derivedContext = buildDerived(observationsBucketed, observations, conditions);

  const encounter: EncounterSummary = {
    encounterId,
    date: encounterDate,
  };

  return {
    patient: mapPatient(patientRow),
    encounter,
    diagnoses: mapDiagnoses(conditions),
    observations: observationsBucketed,
    derivedContext,
  };
}

export async function loadPatientCaseForVoice(patientId?: string | null): Promise<{
  patient: SyntheaPatientRow;
  snapshot: PatientCaseSnapshot;
} | null> {
  const id =
    patientId?.trim() ||
    (await pickRandomActivePatientId());

  if (!id) return null;

  const row = await getActivePatientById(id);
  if (!row) return null;

  const snapshot = await buildPatientCaseSnapshot(row);
  if (!snapshot) return null;

  return { patient: row, snapshot };
}
