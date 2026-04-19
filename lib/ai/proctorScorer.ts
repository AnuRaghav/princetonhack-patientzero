import "server-only";

import OpenAI from "openai";

import type { CaseDocument } from "@/types/case";
import type { ScoreResult } from "@/types/score";

import { proctorSummaryWithGoogleModel } from "./gemmaProctor";
import { PROCTOR_SYSTEM_TEMPLATE } from "./prompts";
import { ProctorLlmSummarySchema } from "./structuredOutputs";
import { computeChecklistProgress } from "@/lib/sim/sessionAssembler";
import { communicationChecklistSatisfied } from "@/lib/sim/reducers";
import type { SessionRow } from "@/types/session";

function deterministicScores(args: {
  caseDoc: CaseDocument;
  session: SessionRow;
  studentLines: string[];
}): Pick<ScoreResult, "checklistScore" | "empathyScore" | "diagnosticScore" | "misses" | "strengths"> {
  const progress = computeChecklistProgress({
    caseDoc: args.caseDoc,
    session: args.session,
    studentTranscriptLines: args.studentLines,
  });

  const empathy = communicationChecklistSatisfied(args.studentLines) ? 82 : 64;

  const keyFacts = [
    "pain_migration",
    "pain_onset",
    "nausea",
    "vomiting",
    "fever",
    "appetite",
    "neg_diarrhea",
    "neg_urinary",
  ];
  const revealed = new Set(args.session.revealed_facts);
  const factHits = keyFacts.filter((k) => revealed.has(k)).length;
  const examHits = args.session.completed_exam_actions.filter((a) =>
    ["palpate_rlq", "rebound_rlq", "auscultate_chest"].includes(a.finding_key),
  ).length;

  const diagnostic = Math.min(
    95,
    Math.round(factHits * 7 + examHits * 10 + (progress.percent > 70 ? 10 : 0)),
  );

  const misses: string[] = [];
  const strengths: string[] = [];

  if (!revealed.has("fever")) misses.push("Fever history not clearly clarified.");
  if (!args.session.completed_exam_actions.some((a) => a.finding_key === "rebound_rlq")) {
    misses.push("Rebound tenderness in RLQ not assessed (or not repeated after initial palpation).");
  }
  if (progress.percent >= 70) strengths.push("Strong overall checklist coverage for a focused encounter.");
  if (revealed.has("pain_migration")) strengths.push("Good exploration of pain migration timeline.");
  if (args.session.completed_exam_actions.some((a) => a.finding_key === "palpate_rlq")) {
    strengths.push("Targeted RLQ exam performed.");
  }

  return {
    checklistScore: progress.percent,
    empathyScore: empathy,
    diagnosticScore: diagnostic,
    misses,
    strengths,
  };
}

function mockSummary(scores: Pick<ScoreResult, "misses" | "strengths" | "checklistScore">): string {
  return `Checklist completion was about ${scores.checklistScore}%. ${
    scores.strengths[0] ?? "Nice work staying focused."
  } ${scores.misses[0] ?? "Continue refining your exam completeness."}`.trim();
}

export async function proctorScorer(args: {
  caseDoc: CaseDocument;
  session: SessionRow;
  studentLines: string[];
  transcriptText: string;
}): Promise<ScoreResult> {
  const base = deterministicScores(args);

  const gemmaSummary = await proctorSummaryWithGoogleModel({
    checklistScore: base.checklistScore,
    misses: base.misses,
    strengths: base.strengths,
    transcriptText: args.transcriptText,
  });
  if (gemmaSummary) {
    return {
      ...base,
      summary: gemmaSummary,
    };
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return {
      ...base,
      summary: mockSummary(base),
    };
  }

  const system = PROCTOR_SYSTEM_TEMPLATE.replace(
    "{checklist_progress}",
    String(base.checklistScore),
  )
    .replace("{misses}", base.misses.join("\n- "))
    .replace("{strengths}", base.strengths.join("\n- "))
    .replace("{transcript}", args.transcriptText.slice(0, 8000));

  const client = new OpenAI({ apiKey });
  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.3,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: "Return JSON { summary: string } only." },
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  const parsed = ProctorLlmSummarySchema.safeParse(JSON.parse(raw));
  return {
    ...base,
    summary: parsed.success ? parsed.data.summary : mockSummary(base),
  };
}
