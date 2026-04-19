import "server-only";

/** Single supported Gemini model for this app (REST path segment). */
export const GEMINI_MODEL_ID = "gemini-2.5-flash";

const GENERATE_CONTENT_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL_ID}:generateContent`;

export type GeminiRestContent = {
  role?: "user" | "model";
  parts: Array<{ text: string }>;
};

function extractCandidateText(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const root = data as Record<string, unknown>;
  const candidates = root.candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) return null;

  const first = candidates[0];
  if (!first || typeof first !== "object") return null;
  const c = first as Record<string, unknown>;

  const content = c.content;
  if (!content || typeof content !== "object") return null;
  const contentObj = content as Record<string, unknown>;

  const parts = contentObj.parts;
  if (!Array.isArray(parts) || parts.length === 0) return null;

  const p0 = parts[0];
  if (!p0 || typeof p0 !== "object") return null;
  const text = (p0 as Record<string, unknown>).text;
  return typeof text === "string" ? text : null;
}

/**
 * API key for `?key=` — prefers `GEMINI_API_KEY` as required for Gemini REST calls.
 */
export function getGeminiApiKey(): string | null {
  const k =
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() ||
    process.env.GEMMA_API_KEY?.trim();
  return k || null;
}

/**
 * POST `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=...`
 * Reads text from `candidates[0].content.parts[0].text`.
 */
export async function postGeminiGenerateContent(args: {
  apiKey: string;
  systemInstruction?: string;
  contents: GeminiRestContent[];
  generationConfig?: {
    temperature?: number;
    maxOutputTokens?: number;
    responseMimeType?: string;
  };
}): Promise<string | null> {
  const url = `${GENERATE_CONTENT_URL}?key=${encodeURIComponent(args.apiKey)}`;

  const body: Record<string, unknown> = {
    contents: args.contents.map((c) => {
      const row: Record<string, unknown> = {
        parts: c.parts.map((p) => ({ text: p.text })),
      };
      if (c.role) row.role = c.role;
      return row;
    }),
  };

  if (args.systemInstruction?.trim()) {
    body.systemInstruction = { parts: [{ text: args.systemInstruction }] };
  }

  if (args.generationConfig) {
    const gc: Record<string, unknown> = {};
    if (args.generationConfig.temperature !== undefined) gc.temperature = args.generationConfig.temperature;
    if (args.generationConfig.maxOutputTokens !== undefined) {
      gc.maxOutputTokens = args.generationConfig.maxOutputTokens;
    }
    if (args.generationConfig.responseMimeType) {
      gc.responseMimeType = args.generationConfig.responseMimeType;
    }
    if (Object.keys(gc).length > 0) body.generationConfig = gc;
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (e) {
    console.error("[Gemini REST] fetch failed", e instanceof Error ? e.message : e);
    return null;
  }

  const rawText = await res.text();
  let data: unknown = null;
  try {
    data = rawText ? (JSON.parse(rawText) as unknown) : null;
  } catch {
    if (!res.ok) {
      console.error("[Gemini REST]", res.status, rawText.slice(0, 2000));
    }
    return null;
  }

  if (!res.ok) {
    const bodySnippet =
      typeof data === "object" && data !== null ? JSON.stringify(data).slice(0, 2000) : rawText.slice(0, 2000);
    console.error("[Gemini REST]", res.status, bodySnippet);
    return null;
  }

  const text = extractCandidateText(data);
  if (!text?.trim()) {
    const snippet =
      typeof data === "object" && data !== null ? JSON.stringify(data).slice(0, 1200) : "";
    console.warn("[Gemini REST] missing candidates[0].content.parts[0].text", snippet);
    return null;
  }

  return text.trim();
}
