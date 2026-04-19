import "server-only";

import { getGeminiApiKey, postGeminiGenerateContent } from "./geminiRest";

/**
 * Google AI Studio API key for Gemini REST (`GEMINI_API_KEY`).
 * Model is fixed to `gemini-2.5-flash` in `geminiRest.ts`.
 */
export function getGoogleGenAiCredentials(): { apiKey: string } | null {
  const apiKey = getGeminiApiKey();
  if (!apiKey) return null;
  return { apiKey };
}

/**
 * Try JSON MIME mode first (when supported), then plain text generation.
 * All calls use REST `generateContent` for `gemini-2.5-flash`.
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
    apiKey: cred.apiKey,
    systemInstruction: args.systemInstruction,
    contents,
    generationConfig: {
      temperature,
      maxOutputTokens,
      responseMimeType: "application/json",
    },
  });
  if (jsonAttempt?.trim()) return jsonAttempt;

  return postGeminiGenerateContent({
    apiKey: cred.apiKey,
    systemInstruction: args.systemInstruction,
    contents,
    generationConfig: { temperature, maxOutputTokens },
  });
}
