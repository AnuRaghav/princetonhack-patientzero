import "server-only";

import type { CaseDocument } from "@/types/case";

/**
 * Sim-flavored patient voice prompt for Gemini conversational replies.
 *
 * Mirrors the structure used by the curated voice flow
 * (`lib/ai/patientVoicePrompt.ts` / `lib/curated/curatedCaseVoiceSnapshot.ts`)
 * but is built from the sim `CaseDocument` shape instead of `PatientCaseSnapshot`.
 *
 * Keep this file standalone - the curated voice path is untouched.
 */

function fmtName(title: string): string {
  const t = title.trim();
  return t || "this patient";
}

function bulletList(label: string, items: readonly string[], max = 12): string {
  const cleaned = items.map((s) => s.trim()).filter(Boolean).slice(0, max);
  if (!cleaned.length) return "";
  return `${label}:\n${cleaned.map((s) => `- ${s}`).join("\n")}\n`;
}

function describeFindings(findings: CaseDocument["physical_exam_findings"], max = 10): string {
  if (!findings.length) return "";
  const lines = findings.slice(0, max).map((f) => {
    const sev = f.visual?.severity ? ` [${f.visual.severity}]` : "";
    return `- ${f.student_finding}${sev}`;
  });
  return `Things a clinician might find on exam (paraphrase only - you're not the doctor):\n${lines.join("\n")}\n`;
}

function describeRevealedUtterances(
  utterancesByFact: Record<string, string>,
  revealedFactKeys: readonly string[],
  max = 14,
): string {
  if (!revealedFactKeys.length) {
    return "Reveals so far this encounter: (none - first questions are fine.)\n";
  }
  const lines: string[] = [];
  for (const key of revealedFactKeys) {
    if (key === "default") continue;
    const u = utterancesByFact[key]?.trim();
    if (!u) continue;
    lines.push(`- ${key}: ${u}`);
    if (lines.length >= max) break;
  }
  if (!lines.length) return "Reveals so far this encounter: (none - first questions are fine.)\n";
  return `Reveals already discussed (stay consistent if topic comes up again):\n${lines.join("\n")}\n`;
}

function describeAvailableUtterances(
  utterancesByFact: Record<string, string>,
  revealedFactKeys: readonly string[],
  max = 16,
): string {
  const seen = new Set(revealedFactKeys);
  const entries = Object.entries(utterancesByFact)
    .filter(([k, v]) => k !== "default" && !!v?.trim() && !seen.has(k))
    .slice(0, max);
  if (!entries.length) return "";
  const lines = entries.map(([k, v]) => `- ${k}: ${v.trim()}`);
  return `Other things you could share if asked the right question (do not volunteer unprompted):\n${lines.join("\n")}\n`;
}

/**
 * Builds the conversational system prompt for the patient persona.
 * Designed to be paired with `geminiPatientReply` (free-form text reply).
 */
export function buildSimPatientVoicePrompt(args: {
  caseDoc: CaseDocument;
  revealedFactKeys: readonly string[];
}): string {
  const { caseDoc, revealedFactKeys } = args;
  const name = fmtName(caseDoc.title);
  const { age, sex, occupation } = caseDoc.demographics;

  const demo = [
    `Name (what you call yourself): ${name}`,
    `Approximate age: ${age}`,
    sex ? `Gender: ${sex}` : null,
    occupation ? `Occupation: ${occupation}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const personality = caseDoc.personality?.trim()
    ? `Personality: ${caseDoc.personality.trim()}`
    : "";
  const emotionalProfile = caseDoc.emotional_profile?.trim()
    ? `Emotional baseline: ${caseDoc.emotional_profile.trim()}`
    : "";

  const chief = caseDoc.chief_complaint?.trim()
    ? `Main reason you came in (chief concern): ${caseDoc.chief_complaint.trim()}`
    : "";

  const hpi = bulletList(
    "Today's story / symptom details you can use when asked",
    caseDoc.history_of_present_illness,
    14,
  );
  const associated = bulletList(
    "Other symptoms you've noticed (mention if asked)",
    caseDoc.associated_symptoms,
    10,
  );
  const negatives = bulletList(
    "Things you have NOT noticed (only say if asked directly)",
    caseDoc.negatives,
    10,
  );
  const findings = describeFindings(caseDoc.physical_exam_findings);
  const reveals = describeRevealedUtterances(
    caseDoc.patient_utterances_by_fact,
    revealedFactKeys,
  );
  const moreToShare = describeAvailableUtterances(
    caseDoc.patient_utterances_by_fact,
    revealedFactKeys,
  );

  return `You are ${name}, a real person in a clinical encounter simulation - not an AI assistant.

ROLE & VOICE
- Speak only in first person as the patient.
- Sound natural, conversational, and emotionally plausible.
- Keep replies short to medium (about 1-4 sentences) unless the clinician asks you to elaborate.
- You only know what a patient would know: your story, how you feel, everyday life context, and what clinicians have told you in plain language.
- Never mention "JSON", "database", "Synthea", "Supabase", "Gemini", "fact key", or internal labels.
- Never read fact keys, IDs, or bracketed codes out loud.

KNOWLEDGE SOURCES (how to use them)
- The chief concern and HPI are what you came in for - answer broad "what's going on?" questions with these.
- Associated symptoms / negatives are things to share when asked the right question.
- Reveals already discussed are topics you've already brought up - stay consistent if they come up again.
- Things you could share if asked are extra detail; do NOT volunteer them unprompted.

GUARDRAILS
- Do not dump your medical record as a monologue.
- Do not spontaneously announce formal diagnoses or ICD codes unless the clinician asks what you were told.
- If the clinician asks something you genuinely wouldn't know as a patient, say you're not sure or weren't told.

${demo}

${personality}
${emotionalProfile}

${chief}

${hpi}
${associated}
${negatives}
${findings}
${reveals}
${moreToShare}

Stay in character for every turn.`;
}

/** Lightweight emotion heuristic - replaces the structured-JSON emotion field. */
export function inferEmotionFromReply(reply: string, fallback = "discomfort"): string {
  const lower = reply.toLowerCase();
  if (/\b(pain|hurt|ache|aching|sore|throb)/.test(lower)) return "pain";
  if (/\b(nause|queasy|throw up|vomit)/.test(lower)) return "nausea";
  if (/\b(scared|afraid|worried|anxious|nervous|frightened)/.test(lower)) return "anxiety";
  if (/\b(dizzy|lighthead|faint)/.test(lower)) return "dizziness";
  if (/\b(tired|exhausted|fatigue|wiped|drained)/.test(lower)) return "fatigue";
  if (/\b(sad|down|hopeless|depress)/.test(lower)) return "sadness";
  return fallback;
}
