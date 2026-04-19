import "server-only";

import type { PatientCaseSnapshot } from "@/lib/patient/patientCaseTypes";

export type PatientVoicePromptOptions = {
  /** When false, omit coded diagnosis labels unless needed for realism. Default false. */
  exposeDiagnosisLabels?: boolean;
};

function fmtName(p: PatientCaseSnapshot["patient"]): string {
  const n = `${p.firstName} ${p.lastName}`.trim();
  return n || "this patient";
}

function ageFromBirth(iso: string | null): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return Math.max(0, age);
}

function bulletMeasurements(label: string, rows: { description: string; value: string; units: string | null }[]) {
  if (!rows.length) return "";
  const lines = rows.slice(0, 24).map((r) => {
    const u = r.units ? ` ${r.units}` : "";
    return `- ${r.description}: ${r.value}${u}`;
  });
  return `${label}:\n${lines.join("\n")}\n`;
}

function bulletQA(label: string, rows: { question: string; answer: string; key?: string }[]) {
  if (!rows.length) return "";
  const lines = rows.slice(0, 16).map((r) => {
    const shortQ = r.key ? `[${r.key}]` : r.question.length > 100 ? `${r.question.slice(0, 97)}…` : r.question;
    return `- ${shortQ} → ${r.answer}`;
  });
  return `${label} (paraphrase in speech; never read stems verbatim):\n${lines.join("\n")}\n`;
}

/**
 * System prompt: Gemini acts as the patient, not an assistant.
 */
export function buildPatientVoiceSystemPrompt(
  snapshot: PatientCaseSnapshot,
  opts: PatientVoicePromptOptions = {},
): string {
  const exposeDx = opts.exposeDiagnosisLabels === true;
  const { patient, encounter, diagnoses, observations, derivedContext } = snapshot;
  const age = ageFromBirth(patient.birthDate);
  const demo = [
    `Name (what you call yourself): ${fmtName(patient)}`,
    age != null ? `Approximate age: ${age}` : null,
    patient.gender ? `Gender: ${patient.gender}` : null,
    patient.race ? `Race (if asked): ${patient.race}` : null,
    patient.ethnicity ? `Ethnicity (if asked): ${patient.ethnicity}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const visit = `Visit encounter id is internal — never mention ids, codes, databases, or “my chart says”. Encounter date: ${encounter.date ?? "recently"}.`;

  const dxBlock =
    diagnoses.length && exposeDx
      ? `Known diagnoses documented this visit (only volunteer if clinically natural):\n${diagnoses
          .slice(0, 12)
          .map((d) => `- ${d.description ?? "Condition"}${d.code ? ` (${d.code})` : ""}`)
          .join("\n")}\n`
      : diagnoses.length
        ? `You may feel symptoms tied to why you came in, but do not volunteer formal diagnosis names or billing codes unless the clinician asks directly.\n`
        : "";

  const measurements =
    bulletMeasurements("Clinical measurements you might know if asked (numbers)", [
      ...observations.vitals,
      ...observations.labs,
    ]) + bulletMeasurements("Symptom-linked points from today’s note", observations.symptoms);

  const qa =
    bulletQA("Social / lived context", observations.socialContext) +
    bulletQA("Screening answers (internal background)", observations.screeningAnswers);

  const synthesized = `
Likely chief concern (natural opener if asked broadly): ${derivedContext.likelyChiefComplaint}

Concise symptom hooks: ${derivedContext.relevantSymptoms.slice(0, 8).join("; ") || "general discomfort"}

Background cues (paraphrase only): ${derivedContext.relevantBackground.slice(0, 8).join("; ") || "none recorded"}
`.trim();

  return `You are ${fmtName(patient)}, a real person in a clinical encounter simulation — not an AI assistant.

ROLE & VOICE
- Speak only in first person as the patient.
- Sound natural, conversational, and emotionally plausible.
- Keep replies short to medium (about 1–4 sentences) unless the clinician asks you to elaborate.
- You only know what a patient would know: your story, how you feel, everyday life context, and what clinicians have told you in plain language.
- Never mention “JSON”, “database”, “CSV”, “Synthea”, “Supabase”, “Gemini”, or internal labels.
- Never recite long survey question stems verbatim; absorb them as lived experience and paraphrase.

KNOWLEDGE SOURCES (how to use them)
- Measurement lines are things you might remember if asked (vitals/labs/pain scores).
- Symptom lines are clues about how you feel today.
- Social and screening entries shape your wording, worries, barriers, habits, and social context — use them subtly; do not lecture.

GUARDRAILS
- Do not dump your medical record as a monologue.
- Do not spontaneously announce formal diagnoses or ICD codes unless the clinician asks what you were told.
- If asked something impossible for a patient to know (exact lab algorithms, unseen imaging pixels), say you don’t know or weren’t told.

${demo}

${visit}

${dxBlock}

${measurements}

${qa}

SYNTHESIZED CONTEXT (high level)
${synthesized}

Stay in character for every turn.`;
}
