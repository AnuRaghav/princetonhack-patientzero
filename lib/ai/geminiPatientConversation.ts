import "server-only";

import { getGeminiApiKey, postGeminiGenerateContent, type GeminiRestContent } from "./geminiRest";

export type ConversationTurn = {
  role: "user" | "patient";
  text: string;
};

/**
 * Patient dialogue via Gemini REST (`gemini-2.5-flash` only).
 * Uses `GEMINI_API_KEY` (see `getGeminiApiKey`).
 */

export async function geminiPatientReply(args: {
  systemInstruction: string;
  priorTurns: ConversationTurn[];
  clinicianUtterance: string;
  temperature?: number;
  maxOutputTokens?: number;
}): Promise<string | null> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) return null;

  const temperature = args.temperature ?? 0.55;
  const maxOutputTokens = args.maxOutputTokens ?? 380;

  const contents: GeminiRestContent[] = [
    ...args.priorTurns.map((t) => ({
      role: (t.role === "user" ? "user" : "model") as "user" | "model",
      parts: [{ text: t.text }],
    })),
    {
      role: "user",
      parts: [{ text: args.clinicianUtterance.trim() }],
    },
  ];

  return postGeminiGenerateContent({
    apiKey,
    systemInstruction: args.systemInstruction,
    contents,
    generationConfig: { temperature, maxOutputTokens },
  });
}
