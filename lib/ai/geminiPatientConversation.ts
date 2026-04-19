import "server-only";

import {
  getGeminiApiKey,
  isGeminiConfigured,
  postGeminiGenerateContent,
  type GeminiGenerateResult,
  type GeminiRestContent,
} from "./geminiRest";

export type ConversationTurn = {
  role: "user" | "patient";
  text: string;
};

/**
 * Patient dialogue via Gemini REST (`generateContent`).
 * Model: `GEMINI_CONVERSATION_MODEL` / `GEMINI_MODEL` or default - see `getGeminiGenerateModelId`.
 */

export async function geminiPatientReply(args: {
  systemInstruction: string;
  priorTurns: ConversationTurn[];
  clinicianUtterance: string;
  temperature?: number;
  maxOutputTokens?: number;
}): Promise<GeminiGenerateResult> {
  if (!isGeminiConfigured()) {
    return {
      ok: false,
      message:
        "Missing Gemini credentials: set GEMINI_API_KEY (Google AI Studio). Optional: GEMINI_MODEL / GEMINI_CONVERSATION_MODEL. Restart the dev server after editing env.",
    };
  }

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
    apiKey: getGeminiApiKey() ?? undefined,
    systemInstruction: args.systemInstruction,
    contents,
    generationConfig: { temperature, maxOutputTokens },
  });
}
