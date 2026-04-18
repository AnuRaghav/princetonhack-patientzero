import "server-only";

import type { CaseDocument, PhysicalExamEntry, RevealRule } from "@/types/case";
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

function pickChiefComplaint(observations: SyntheaObservationRow[]): string {
  // Heuristic: pick the most recent survey/symptom-ish observation.
  for (const o of observations) {
    const cat = (o.CATEGORY ?? "").toLowerCase();
    const desc = (o.DESCRIPTION ?? "").trim();
    if (!desc) continue;
    if (cat.includes("survey") || cat.includes("symptom") || cat.includes("social-history")) {
      return desc.endsWith(".") ? desc : `${desc}.`;
    }
  }
  const best = observations.find((o) => (o.DESCRIPTION ?? "").trim())?.DESCRIPTION?.trim();
  return best ? (best.endsWith(".") ? best : `${best}.`) : "I haven't been feeling well lately.";
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
  conditions: SyntheaConditionRow[];
  observations: SyntheaObservationRow[];
}): { rules: RevealRule[]; utterances: Record<string, string>; symptomLines: string[] } {
  const rules: RevealRule[] = [];
  const utterances: Record<string, string> = {};
  const symptomLines: string[] = [];

  // Observations as symptom-ish facts.
  for (const o of args.observations.slice(0, 80)) {
    const desc = (o.DESCRIPTION ?? "").trim();
    if (!desc) continue;
    const code = (o.CODE ?? "").trim();
    const key = `obs:${code || desc.slice(0, 24).toLowerCase().replaceAll(/\s+/g, "_")}`;
    const value =
      o.VALUE == null
        ? ""
        : typeof o.VALUE === "number"
          ? String(o.VALUE)
          : String(o.VALUE).trim();
    const units = (o.UNITS ?? "").trim();
    const sentence = value
      ? `${desc}: ${value}${units ? ` ${units}` : ""}.`
      : `${desc}.`;

    utterances[key] = sentence;
    symptomLines.push(sentence);

    const terms = stableWords(`${desc} ${code} ${value}`);
    if (terms.length) {
      rules.push({ id: key, match_terms: terms, reveals: [key] });
    }
  }

  // Conditions as diagnosis facts (not necessarily revealed unless asked).
  for (const c of args.conditions.slice(0, 30)) {
    const desc = (c.DESCRIPTION ?? "").trim();
    if (!desc) continue;
    const code = (c.CODE ?? "").trim();
    const key = `cond:${code || desc.slice(0, 24).toLowerCase().replaceAll(/\s+/g, "_")}`;
    utterances[key] = `I was told I have ${desc}.`;
    const terms = stableWords(`${desc} ${code}`);
    if (terms.length) rules.push({ id: key, match_terms: terms, reveals: [key] });
  }

  return { rules, utterances, symptomLines: symptomLines.slice(0, 12) };
}

export function buildCaseDocumentFromSynthea(args: {
  patient: SyntheaPatientRow;
  conditions: SyntheaConditionRow[];
  observations: SyntheaObservationRow[];
}): CaseDocument {
  const name = fmtPatientName(args.patient);
  const age = args.patient.BIRTHDATE ? yearsSince(args.patient.BIRTHDATE) : 0;
  const sex = (args.patient.GENDER ?? "unknown").toLowerCase();
  const chiefComplaint = pickChiefComplaint(args.observations);
  const finalDx =
    (args.conditions[0]?.DESCRIPTION ?? "").trim() ||
    "Undifferentiated chief complaint (synthetic)";

  const { rules, utterances, symptomLines } = buildRevealRulesFromRows({
    conditions: args.conditions,
    observations: args.observations,
  });

  // Provide a safe default reply so the app works without OpenAI.
  utterances.default =
    "I'm not sure how to describe it — I just don't feel like myself. Can you help me figure out what's going on?";

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
    reveal_rules: rules,
    checklist: [
      { id: "hx_open_ended", text: "Ask an open-ended chief complaint question", category: "history" },
      { id: "empathy_acknowledge", text: "Acknowledge the patient’s experience", category: "communication" },
      { id: "exam_abdomen", text: "Perform an abdominal exam", category: "exam", required_exam_keys: ["palpate:abdomen"] },
    ],
    final_diagnosis: finalDx,
    patient_utterances_by_fact: utterances,
  };
}

