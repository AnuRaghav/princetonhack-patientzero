import "server-only";

import type { CaseDocument } from "@/types/case";

import { buildPatientPromptFacts } from "./patientContext";
import { PATIENT_SYSTEM_TEMPLATE } from "./prompts";
import { PatientLlmReplySchema } from "./structuredOutputs";
import { googleGenerateMultiAttempt } from "./googleGenAi";

function parseJsonReply(raw: string): { reply: string; emotion: string } | null {
  const trimmed = raw.trim();
  const jsonStart = trimmed.indexOf("{");
  const jsonEnd = trimmed.lastIndexOf("}");
  const slice =
    jsonStart >= 0 && jsonEnd > jsonStart ? trimmed.slice(jsonStart, jsonEnd + 1) : trimmed;
  try {
    const parsed = PatientLlmReplySchema.safeParse(JSON.parse(slice));
    if (!parsed.success) return null;
    return {
      reply: parsed.data.reply,
      emotion: parsed.data.emotion ?? "discomfort",
    };
  } catch {
    return null;
  }
}

/**
 * Google Gemini (`gemini-2.5-flash`) via REST as the standardized patient when available.
 * Keys: `GEMINI_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY`, or `GEMMA_API_KEY` (same Studio key).
 */
export async function patientReplyWithGoogleModel(args: {
  caseDoc: CaseDocument;
  revealedFactKeys: string[];
  newlyRevealed: string[];
  studentMessage: string;
}): Promise<{ reply: string; emotion: string } | null> {
  const encounterFacts = buildPatientPromptFacts(args.caseDoc, args.revealedFactKeys);
  const system = PATIENT_SYSTEM_TEMPLATE.replace("{personality}", args.caseDoc.personality)
    .replace("{emotional_profile}", args.caseDoc.emotional_profile)
    .replace("{allowedFacts}", encounterFacts);

  const userPayload = JSON.stringify({
    student_message: args.studentMessage,
    newly_revealed_keys: args.newlyRevealed,
    instruction:
      "Respond as JSON only with keys reply (string) and emotion (string: short label like pain|nausea|anxiety|discomfort).",
  });

  const raw = await googleGenerateMultiAttempt({
    systemInstruction: system,
    userText: userPayload,
    temperature: 0.35,
    maxOutputTokens: 450,
  });

  if (!raw) return null;
  return parseJsonReply(raw);
}
