import "server-only";

import OpenAI from "openai";

import type { CaseDocument } from "@/types/case";

import { patientReplyWithGoogleModel } from "./gemmaPatient";
import {
  buildPatientPromptFacts,
  craftChiefConcernReply,
  identityDemographicsReply,
  looksLikeChiefBreadthQuestion,
  looksLikeIdentityOrDemographicsQuestion,
  looksLikeSymptomFollowUp,
  symptomFollowUpReply,
} from "./patientContext";
import { PatientLlmReplySchema } from "./structuredOutputs";
import { PATIENT_SYSTEM_TEMPLATE } from "./prompts";

/** Deterministic filler lines when the student asks about nothing in the grounded fact sheet (no Gemma/OpenAI yet). */
const GENERIC_UNK = [
  "I'm not sure — nobody's gone over that with me.",
  "I don't really know how to answer that.",
  "That's not something I've been told.",
  "Sorry, I can't help with that part.",
  "Hmm. I hadn't really thought about it that way.",
];

function hashPick(strings: readonly string[], seed: string): string {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const idx = Math.abs(h) % strings.length;
  return strings[idx] ?? strings[0]!;
}

function mockReply(args: {
  caseDoc: CaseDocument;
  newlyRevealed: string[];
  studentMessage: string;
}): { reply: string; emotion: string } {
  const { caseDoc, newlyRevealed, studentMessage } = args;

  if (newlyRevealed.length === 0) {
    if (looksLikeChiefBreadthQuestion(studentMessage)) {
      return {
        reply: craftChiefConcernReply(caseDoc),
        emotion: "discomfort",
      };
    }
    if (looksLikeIdentityOrDemographicsQuestion(studentMessage)) {
      return {
        reply: identityDemographicsReply(caseDoc, studentMessage),
        emotion: "discomfort",
      };
    }
    if (looksLikeSymptomFollowUp(studentMessage)) {
      return {
        reply: symptomFollowUpReply(caseDoc),
        emotion: "discomfort",
      };
    }
    return {
      reply: hashPick(GENERIC_UNK, studentMessage.trim().toLowerCase()),
      emotion: "discomfort",
    };
  }

  const k = newlyRevealed[0]!;
  const raw = caseDoc.patient_utterances_by_fact[k]?.trim();
  const line =
    raw ??
    hashPick(GENERIC_UNK, studentMessage);

  const lead = hashPick(["Well… ", "Um… ", "I guess ", ""], `${k}:${studentMessage}`);
  const reply = `${lead}${line.endsWith(".") ? line : `${line}.`}`;

  const lower = reply.toLowerCase();
  const emotion =
    lower.includes("pain") || lower.includes("hurt") || lower.includes("ache")
      ? "pain"
      : lower.includes("worried") || lower.includes("scared") || lower.includes("anxious")
        ? "anxiety"
        : "discomfort";

  return { reply: reply.trim(), emotion };
}

export async function patientResponder(args: {
  caseDoc: CaseDocument;
  revealedFactKeys: string[];
  newlyRevealed: string[];
  studentMessage: string;
}): Promise<{ reply: string; emotion: string }> {
  const gemma = await patientReplyWithGoogleModel(args);
  if (gemma) return gemma;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return mockReply(args);
  }

  const encounterFacts = buildPatientPromptFacts(args.caseDoc, args.revealedFactKeys);
  const system = PATIENT_SYSTEM_TEMPLATE.replace("{personality}", args.caseDoc.personality)
    .replace("{emotional_profile}", args.caseDoc.emotional_profile)
    .replace("{allowedFacts}", encounterFacts);

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
    return mockReply(args);
  }

  return {
    reply: parsed.data.reply,
    emotion: parsed.data.emotion ?? "discomfort",
  };
}
