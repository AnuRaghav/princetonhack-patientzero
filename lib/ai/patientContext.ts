import type { CaseDocument } from "@/types/case";

import { buildSymptomNarrativeUtterance } from "@/lib/synthea/patientVoice";

/** Natural first-person line from chief-complaint text (before a full CaseDocument exists). */
export function chiefComplaintToOpeningLine(chiefComplaint: string): string {
  const c = chiefComplaint.trim();
  if (!c) return "I've been worried enough about my symptoms that I wanted to get checked out.";
  const lower = c.toLowerCase();
  if (/^(i(\s|'|')?ve|i am|i'm|i'm)\b/.test(lower)) {
    return c.endsWith(".") ? c : `${c}.`;
  }
  const body = c.endsWith(".") ? c.slice(0, -1) : c;
  return `Honestly, I'm here mostly because ${body}.`;
}

/** Same grounding line when a CaseDocument is already built. */
export function craftChiefConcernReply(caseDoc: CaseDocument): string {
  return chiefComplaintToOpeningLine(caseDoc.chief_complaint);
}

/**
 * Everything Supabase-derived that the patient "knows" - for model grounding only.
 * The simulator still tracks `revealed_facts` for UX; you instruct the model to answer when asked,
 * not to data-dump.
 */
export function buildFullPatientBackground(caseDoc: CaseDocument): string {
  const lines: string[] = [];
  lines.push(`Legal/record name as you know it: ${caseDoc.title}`);
  lines.push(`Age and sex: ${caseDoc.demographics.age} years old; ${caseDoc.demographics.sex}`);
  lines.push("");
  lines.push(`Main reason you came in (chief concern): ${caseDoc.chief_complaint}`);
  if (caseDoc.history_of_present_illness.length) {
    lines.push("Story / symptom details you can use when asked:");
    for (const h of caseDoc.history_of_present_illness) {
      if (h.trim()) lines.push(`- ${h}`);
    }
  }
  lines.push("");
  lines.push("Optional phrases tied to topics (answer naturally when relevant - do not read IDs aloud):");
  for (const [key, text] of Object.entries(caseDoc.patient_utterances_by_fact).sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    if (key === "default") continue;
    if (text?.trim()) lines.push(`- ${key}: ${text}`);
  }
  return lines.join("\n");
}

/**
 * Grounding block for Gemma/OpenAI: full background so the model understands the case;
 * conversation "reveals" are metadata for the app, not a hard wall on what you know.
 */
export function buildPatientPromptFacts(caseDoc: CaseDocument, revealedFactKeys: readonly string[]): string {
  const lines: string[] = [];
  lines.push(
    "VOICE: Talk like a person, not a database. Do not recite LOINC/lab panel names, text in [brackets], or your own exact heart rate / blood pressure / lab numbers as if you know them by heart (you are the patient, not the EHR).",
  );
  lines.push(`DISPLAY_NAME: ${caseDoc.title}`);
  lines.push(`AGE_SEX: ${caseDoc.demographics.age} years old; ${caseDoc.demographics.sex}`);
  lines.push("");
  lines.push(
    `CHIEF_CONCERN (you MAY and SHOULD use this when the clinician asks broadly why you came in, what's wrong, your main issue, etc.): ${caseDoc.chief_complaint}`,
  );
  lines.push("");
  lines.push(
    "FOLLOW_UPS: If the clinician asks normal questions about your symptoms - where it bothers you, what it feels like, how it comes and goes - answer in plain, everyday language using CHIEF_CONCERN and COMPLETE_CASE_BACKGROUND. Do not refuse with 'I don't know' unless the question is truly unrelated to why you came in.",
  );
  lines.push("");
  lines.push(
    "SESSION_REVEALS (what the simulation has already marked as discussed - stay consistent if you repeat yourself):",
  );
  const revealed = revealedFactKeys.filter((k) => caseDoc.patient_utterances_by_fact[k]);
  if (revealed.length === 0) {
    lines.push("(none recorded yet - first questions are fine.)");
  } else {
    for (const key of revealed) {
      const line = caseDoc.patient_utterances_by_fact[key];
      if (line) lines.push(`- ${key}: ${line}`);
    }
  }
  lines.push("");
  lines.push(
    "COMPLETE_CASE_BACKGROUND (all facts you hold as this patient - use to answer questions when asked; do not recite this whole block unprompted or list fact keys):",
  );
  lines.push(buildFullPatientBackground(caseDoc));
  return lines.join("\n");
}

/** Used only by deterministic fallback when Gemma/OpenAI are unavailable. */
export function looksLikeChiefBreadthQuestion(studentMessage: string): boolean {
  const m = studentMessage.toLowerCase();
  return (
    /\bwhat brings\b/.test(m) ||
    /\bwhy (are you here|did you come in|come in today)\b/.test(m) ||
    /\bwhat'?s (going on|wrong)\b/.test(m) ||
    /\b(main|chief)\s+(problem|concern|issue)\b/.test(m) ||
    /\bwhat (is|'s)\s+your\s+(issue|problem|concern)\b/.test(m) ||
    /\byour\s+issue\b/.test(m) ||
    /\bat the moment\b/.test(m) ||
    /\bhow can i help\b/.test(m) ||
    /\btell me (about )?(why|what)\b/.test(m)
  );
}

/** Pain / symptom follow-ups that should get a real answer, not generic deflection. */
export function looksLikeSymptomFollowUp(studentMessage: string): boolean {
  const m = studentMessage.toLowerCase();
  return (
    /where.*(pain|hurt|ache)/.test(m) ||
    /\bwhere is (the |your )?pain\b/.test(m) ||
    /\bwhere does (the )?pain\b/.test(m) ||
    /\bwhere does it hurt\b/.test(m) ||
    /describe (the |your )?pain/.test(m) ||
    /what kind of pain/.test(m) ||
    /what does it feel like/.test(m) ||
    /tell me more\b/.test(m) ||
    /how bad (is|does)/.test(m) ||
    /rate (your |the )?pain\b/.test(m) ||
    /what exactly.*(pain|wrong|bothering|anxiety)/.test(m) ||
    /\bpain or anxiety\b/.test(m)
  );
}

export function symptomFollowUpReply(caseDoc: CaseDocument): string {
  return buildSymptomNarrativeUtterance(caseDoc.chief_complaint, caseDoc.history_of_present_illness);
}

/** Name, age, and similar - always answer in mock fallback. */
export function looksLikeIdentityOrDemographicsQuestion(studentMessage: string): boolean {
  const m = studentMessage.toLowerCase();
  return (
    /\bwhat('?s| is) (your |ur )?name\b/.test(m) ||
    /\bwho are you\b/.test(m) ||
    /\byour name\b/.test(m) ||
    /\bdo i have your name\b/.test(m) ||
    /\bhow old are you\b/.test(m) ||
    /\bwhat('?s| is) your age\b/.test(m) ||
    /\bmale or female\b/.test(m) ||
    /\bwhat sex\b/.test(m) ||
    /\byour (sex|gender)\b/.test(m) ||
    /\bgender\b/.test(m)
  );
}

export function identityDemographicsReply(caseDoc: CaseDocument, studentMessage: string): string {
  const name = caseDoc.title.trim();
  const first = name.split(/\s+/)[0] ?? name;
  const { age } = caseDoc.demographics;
  const sex = caseDoc.demographics.sex.trim() || "not sure how to phrase it";
  const m = studentMessage.toLowerCase();
  const asksName =
    /\bwhat('?s| is) (your |ur )?name\b/.test(m) ||
    /\byour name\b/.test(m) ||
    /\bdo i have your name\b/.test(m);
  const asksAge = /\bhow old\b/.test(m) || /\bwhat('?s| is) your age\b/.test(m);
  const asksSex =
    /\bmale or female\b/.test(m) || /\bwhat sex\b/.test(m) || /\byour (sex|gender)\b/.test(m) || /\bgender\b/.test(m);

  if (asksName && !asksAge && !asksSex) {
    return name.includes(" ") ? `My name is ${name}.` : `I'm ${first}.`;
  }
  return `I'm ${first}. I'm ${age}, ${sex}.`;
}
