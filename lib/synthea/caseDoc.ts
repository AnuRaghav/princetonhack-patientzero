import "server-only";

import { chiefComplaintToOpeningLine } from "@/lib/ai/patientContext";

import type { CaseDocument, PhysicalExamEntry, RevealRule } from "@/types/case";
import {
  buildSymptomNarrativeUtterance,
  conditionToLayUtterance,
  humanizeConditionDescription,
  observationToLayUtterance,
  pickLayChiefComplaint,
} from "./patientVoice";
import type { SyntheaConditionRow, SyntheaObservationRow, SyntheaPatientRow } from "./types";

function yearsSince(isoDate: string, now = new Date()): number {
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return 0;
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return Math.max(0, age);
}

function stableWords(s: string): string[] {
  return Array.from(
    new Set(
      s
        .toLowerCase()
        .replaceAll(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .map((w) => w.trim())
        .filter((w) => w.length >= 3 && w.length <= 24),
    ),
  ).slice(0, 8);
}

function fmtPatientName(p: SyntheaPatientRow): string {
  const first = (p.FIRST ?? "").trim();
  const last = (p.LAST ?? "").trim();
  const full = `${first} ${last}`.trim();
  return full || `Patient ${p.Id}`;
}

function buildExamFindings(): PhysicalExamEntry[] {
  return [
    {
      finding_key: "palpate_rlq",
      student_finding: "Palpation elicits focal tenderness in the right lower quadrant.",
      pain_delta: 1,
      visual: { highlight: "rlq", severity: "medium" },
    },
    {
      finding_key: "rebound_rlq",
      student_finding:
        "There is mild rebound tenderness in the RLQ with guarding on deeper palpation.",
      pain_delta: 1,
      visual: { highlight: "rlq", severity: "high" },
    },
    {
      finding_key: "palpate_abdomen_general",
      student_finding:
        "The abdomen is soft overall; tenderness is most notable in the lower abdomen without diffuse peritonitis.",
      pain_delta: 0,
      visual: { highlight: "abdomen", severity: "low" },
    },
    {
      finding_key: "auscultate_chest",
      student_finding: "Breath sounds are clear bilaterally without wheezes, rales, or rhonchi.",
    },
    {
      finding_key: "inspect_head",
      student_finding: "The patient appears uncomfortable but in no acute distress. No visible trauma.",
    },
  ];
}

function buildRevealRulesFromRows(args: {
  keyPrefix: string;
  conditions: SyntheaConditionRow[];
  observations: SyntheaObservationRow[];
}): { rules: RevealRule[]; utterances: Record<string, string>; symptomLines: string[] } {
  const rules: RevealRule[] = [];
  const utterances: Record<string, string> = {};
  const symptomLines: string[] = [];
  const p = args.keyPrefix;

  // Observations as symptom-ish facts.
  const obsRows = args.observations.slice(0, 80);
  for (let i = 0; i < obsRows.length; i++) {
    const o = obsRows[i]!;
    const lay = observationToLayUtterance(o);
    if (!lay) continue;

    const code = (o.CODE ?? "").trim();
    const key = `${p}obs_${i}_${(code || "d").replaceAll(/[^a-zA-Z0-9._-]/g, "_")}`;
    utterances[key] = lay;
    symptomLines.push(lay);

    const descPlain = (o.DESCRIPTION ?? "").replace(/\[[^\]]+\]/g, " ").trim();
    const terms = stableWords(`${descPlain} ${code}`);
    if (terms.length) {
      rules.push({ id: key, match_terms: terms, reveals: [key] });
    }
  }

  // Conditions as diagnosis facts (not necessarily revealed unless asked).
  const condRows = args.conditions.slice(0, 30);
  for (let i = 0; i < condRows.length; i++) {
    const c = condRows[i]!;
    const lay = conditionToLayUtterance(c);
    if (!lay) continue;
    const desc = (c.DESCRIPTION ?? "").trim();
    const code = (c.CODE ?? "").trim();
    const key = `${p}cond_${i}_${(code || "d").replaceAll(/[^a-zA-Z0-9._-]/g, "_")}`;
    utterances[key] = lay;
    const terms = stableWords(`${humanizeConditionDescription(desc)} ${code}`);
    if (terms.length) rules.push({ id: key, match_terms: terms, reveals: [key] });
  }

  return { rules, utterances, symptomLines: symptomLines.slice(0, 12) };
}

export function buildCaseDocumentFromSynthea(args: {
  patient: SyntheaPatientRow;
  conditions: SyntheaConditionRow[];
  observations: SyntheaObservationRow[];
  /** Optional: used to namespace fact keys (e.g. latest-encounter scope). */
  encounterId?: string | null;
}): CaseDocument {
  const name = fmtPatientName(args.patient);
  const age = args.patient.BIRTHDATE ? yearsSince(args.patient.BIRTHDATE) : 0;
  const sex = (args.patient.GENDER ?? "unknown").toLowerCase();
  const chiefComplaint = pickLayChiefComplaint(args.observations, args.conditions);
  const rawDx = (args.conditions[0]?.DESCRIPTION ?? "").trim();
  const finalDx = rawDx ? humanizeConditionDescription(rawDx) : "Undifferentiated chief complaint (synthetic)";

  const enc = (args.encounterId ?? "").replaceAll("-", "").slice(0, 8) || "all";
  const keyPrefix = `e${enc}_`;
  const { rules, utterances, symptomLines } = buildRevealRulesFromRows({
    keyPrefix,
    conditions: args.conditions,
    observations: args.observations,
  });

  const openingKey = `${keyPrefix}opening_presenting`;
  utterances[openingKey] = chiefComplaintToOpeningLine(chiefComplaint);

  /** Lets slow-reveal unlock a grounded answer to “what brings you in / what’s your issue” first. */
  const openingRule: RevealRule = {
    id: openingKey,
    match_terms: [
      "what brings",
      "why are you here",
      "why did you come",
      "come in today",
      "what is your issue",
      "your issue",
      "at the moment",
      "main problem",
      "main issue",
      "chief complaint",
      "what is going on",
      "what's going on",
      "whats going on",
      "tell me why",
      "how can i help",
      "what can i do for you",
    ],
    reveals: [openingKey],
  };

  const narrativeKey = `${keyPrefix}symptom_narrative`;
  utterances[narrativeKey] = buildSymptomNarrativeUtterance(chiefComplaint, symptomLines);

  const narrativeRule: RevealRule = {
    id: narrativeKey,
    match_terms: [
      "where does the pain",
      "where is the pain",
      "where does it hurt",
      "where do you feel",
      "describe the pain",
      "what kind of pain",
      "what does it feel like",
      "tell me more",
      "how bad is",
      "how bad does",
      "rate your pain",
      "rate the pain",
      "what exactly is the pain",
      "what exactly is the",
      "pain or anxiety",
      "wanting to check",
    ],
    reveals: [narrativeKey],
  };

  // Provide a safe default reply so the app works without LLM.
  utterances.default = chiefComplaintToOpeningLine(chiefComplaint);

  return {
    id: args.patient.Id,
    title: name,
    demographics: { age, sex },
    personality: "You are cooperative, concise, and answer questions directly.",
    chief_complaint: chiefComplaint,
    history_of_present_illness: symptomLines.length
      ? symptomLines
      : ["Symptoms are not fully characterized yet."],
    associated_symptoms: [],
    negatives: [],
    physical_exam_findings: buildExamFindings(),
    hidden_red_flags: [],
    emotional_profile: "Anxious but composed.",
    reveal_rules: [openingRule, narrativeRule, ...rules],
    checklist: [
      { id: "hx_open_ended", text: "Ask an open-ended chief complaint question", category: "history" },
      { id: "empathy_acknowledge", text: "Acknowledge the patient’s experience", category: "communication" },
      { id: "exam_abdomen", text: "Perform an abdominal exam", category: "exam", required_exam_keys: ["palpate:abdomen"] },
    ],
    final_diagnosis: finalDx,
    patient_utterances_by_fact: utterances,
  };
}

