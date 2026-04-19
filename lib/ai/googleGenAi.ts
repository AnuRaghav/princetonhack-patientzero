import "server-only";

import { getGeminiApiKey, isGeminiConfigured, postGeminiGenerateContent } from "./geminiRest";

/**
 * Credentials for `generateContent`: AI Studio (`GEMINI_API_KEY`) or Vertex (project + ADC; apiKey null).
 */
export function getGoogleGenAiCredentials(): { apiKey: string | null } | null {
  if (!isGeminiConfigured()) return null;
  return { apiKey: getGeminiApiKey() };
}

/**
 * Try JSON MIME mode first (when supported), then plain text generation.
 * All calls use REST `generateContent` with the resolved model id (see `getGeminiGenerateModelId`).
 */
export async function googleGenerateMultiAttempt(args: {
  systemInstruction: string;
  userText: string;
  temperature?: number;
  maxOutputTokens?: number;
}): Promise<string | null> {
  const cred = getGoogleGenAiCredentials();
  if (!cred) return null;

  const temperature = args.temperature ?? 0.35;
  const maxOutputTokens = args.maxOutputTokens ?? 450;

  const contents = [{ parts: [{ text: args.userText }] }];

  const jsonAttempt = await postGeminiGenerateContent({
    apiKey: cred.apiKey ?? undefined,
    systemInstruction: args.systemInstruction,
    contents,
    generationConfig: {
      temperature,
      maxOutputTokens,
      responseMimeType: "application/json",
    },
  });
  if (jsonAttempt.ok) return jsonAttempt.text;

  const plain = await postGeminiGenerateContent({
    apiKey: cred.apiKey ?? undefined,
    systemInstruction: args.systemInstruction,
    contents,
    generationConfig: { temperature, maxOutputTokens },
  });
  return plain.ok ? plain.text : null;
}
