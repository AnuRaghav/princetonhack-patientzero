import "server-only";

import OpenAI from "openai";

import type { CaseDocument } from "@/types/case";

import { PatientLlmReplySchema } from "./structuredOutputs";
import { PATIENT_SYSTEM_TEMPLATE } from "./prompts";

function buildAllowedFacts(caseDoc: CaseDocument, revealedFactKeys: string[]): string {
  const lines: string[] = [];
  lines.push(`Chief complaint: ${caseDoc.chief_complaint}`);
  for (const key of revealedFactKeys) {
    const line = caseDoc.patient_utterances_by_fact[key];
    if (line) lines.push(`${key}: ${line}`);
  }
  return lines.join("\n");
}

function mockReply(caseDoc: CaseDocument, newlyRevealed: string[]): { reply: string; emotion: string } {
  if (newlyRevealed.length === 0) {
    return {
      reply: caseDoc.patient_utterances_by_fact.default,
      emotion: "discomfort",
    };
  }

  const parts = newlyRevealed
    .map((k) => caseDoc.patient_utterances_by_fact[k])
    .filter(Boolean);
  return {
    reply: parts.join(" "),
    emotion: newlyRevealed.some((k) => k.includes("pain") || k.startsWith("pain_"))
      ? "pain"
      : "discomfort",
  };
}

export async function patientResponder(args: {
  caseDoc: CaseDocument;
  revealedFactKeys: string[];
  newlyRevealed: string[];
  studentMessage: string;
}): Promise<{ reply: string; emotion: string }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return mockReply(args.caseDoc, args.newlyRevealed);
  }

  const allowedFacts = buildAllowedFacts(args.caseDoc, args.revealedFactKeys);
  const system = PATIENT_SYSTEM_TEMPLATE.replace("{personality}", args.caseDoc.personality)
    .replace("{emotional_profile}", args.caseDoc.emotional_profile)
    .replace("{allowedFacts}", allowedFacts);

  const client = new OpenAI({ apiKey });
  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.4,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      {
        role: "user",
        content: JSON.stringify({
          student_message: args.studentMessage,
          newly_revealed_keys: args.newlyRevealed,
          instruction:
            "Respond as JSON with keys reply (string) and emotion (string, short label like pain|nausea|anxiety).",
        }),
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  const parsed = PatientLlmReplySchema.safeParse(JSON.parse(raw));
  if (!parsed.success) {
    return mockReply(args.caseDoc, args.newlyRevealed);
  }

  return {
    reply: parsed.data.reply,
    emotion: parsed.data.emotion ?? "discomfort",
  };
}
