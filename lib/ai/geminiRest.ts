import "server-only";

import { GoogleAuth } from "google-auth-library";

/**
 * Default model id segment in the `:generateContent` URL (both AI Studio & Vertex).
 * Override with `GEMINI_CONVERSATION_MODEL` / `GEMINI_MODEL`.
 */
export const GEMINI_MODEL_ID_DEFAULT = "gemini-2.0-flash";

export type GeminiGenerateResult =
  | { ok: true; text: string }
  | { ok: false; status?: number; message: string };

export type GeminiRestContent = {
  role?: "user" | "model";
  parts: Array<{ text: string }>;
};

function extractGoogleApiErrorMessage(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const err = (data as Record<string, unknown>).error;
  if (!err || typeof err !== "object") return null;
  const msg = (err as Record<string, unknown>).message;
  return typeof msg === "string" && msg.trim() ? msg.trim() : null;
}

/** Concatenate all text parts from the first candidate (some responses use multiple parts). */
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

  const chunks: string[] = [];
  for (const part of parts) {
    if (!part || typeof part !== "object") continue;
    const text = (part as Record<string, unknown>).text;
    if (typeof text === "string" && text.length) chunks.push(text);
  }
  const joined = chunks.join("").trim();
  return joined.length ? joined : null;
}

function describeEmptyResponse(data: unknown): string {
  if (!data || typeof data !== "object") return "Empty response from Gemini.";
  const root = data as Record<string, unknown>;
  const pf = root.promptFeedback;
  if (pf && typeof pf === "object") {
    const block = (pf as Record<string, unknown>).blockReason;
    if (typeof block === "string") return `Gemini blocked the prompt (${block}).`;
  }
  const candidates = root.candidates;
  if (Array.isArray(candidates) && candidates[0] && typeof candidates[0] === "object") {
    const fin = (candidates[0] as Record<string, unknown>).finishReason;
    if (typeof fin === "string") return `Gemini returned no text (finishReason: ${fin}).`;
  }
  return "Gemini returned no usable text in candidates.";
}

/**
 * Vertex: project id (e.g. `patient-zero-493803`).
 * Reads `GEMINI_VERTEX_PROJECT`, then `GOOGLE_CLOUD_PROJECT`, then `GCP_PROJECT`.
 */
export function getVertexProjectId(): string | null {
  const p =
    process.env.GEMINI_VERTEX_PROJECT?.trim() ||
    process.env.GOOGLE_CLOUD_PROJECT?.trim() ||
    process.env.GCP_PROJECT?.trim();
  return p || null;
}

/** Vertex region for `*-aiplatform.googleapis.com` (default `us-central1`). */
export function getVertexLocation(): string {
  return process.env.GEMINI_VERTEX_LOCATION?.trim() || "us-central1";
}

/**
 * Model id for `generateContent` URL (AI Studio and Vertex). Override with `GEMINI_CONVERSATION_MODEL` or `GEMINI_MODEL`.
 */
export function getGeminiGenerateModelId(): string {
  const fromEnv =
    process.env.GEMINI_CONVERSATION_MODEL?.trim() ||
    process.env.GEMINI_MODEL?.trim();
  return fromEnv || GEMINI_MODEL_ID_DEFAULT;
}

/**
 * Google AI Studio / Generative Language API key (`?key=`). Takes precedence over Vertex when set.
 */
export function getGeminiApiKey(): string | null {
  const k =
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() ||
    process.env.GEMMA_API_KEY?.trim();
  return k || null;
}

/** True if AI Studio (API key) or Vertex (project + ADC) can run a request. API key preferred at runtime when set. */
export function isGeminiConfigured(): boolean {
  return Boolean(getGeminiApiKey() || getVertexProjectId());
}

function buildGeminiGeneratePayload(args: {
  contents: GeminiRestContent[];
  systemInstruction?: string;
  generationConfig?: {
    temperature?: number;
    maxOutputTokens?: number;
    responseMimeType?: string;
  };
}): Record<string, unknown> {
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

  return body;
}

function resultFromHttpFailure(
  status: number,
  data: unknown,
  rawText: string,
  logLabel: string,
): GeminiGenerateResult {
  const bodySnippet =
    typeof data === "object" && data !== null ? JSON.stringify(data).slice(0, 2000) : rawText.slice(0, 2000);
  console.error(`[${logLabel}]`, status, bodySnippet);
  const googleMsg = extractGoogleApiErrorMessage(data);
  return {
    ok: false,
    status,
    message:
      googleMsg ??
      (status === 429
        ? "Gemini rate limit or quota exceeded (HTTP 429). Check AI Studio limits, model, or wait — see server logs."
        : `Gemini API error (HTTP ${status}).`),
  };
}

async function postGeminiAiStudioGenerateContent(args: {
  apiKey: string;
  modelId: string;
  payload: Record<string, unknown>;
}): Promise<GeminiGenerateResult> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(args.modelId)}:generateContent?key=${encodeURIComponent(args.apiKey)}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(args.payload),
    });
  } catch (e) {
    console.error("[Gemini AI Studio] fetch failed", e instanceof Error ? e.message : e);
    return {
      ok: false,
      message: `Gemini request failed (${e instanceof Error ? e.message : "network error"}).`,
    };
  }

  const rawText = await res.text();
  let data: unknown = null;
  try {
    data = rawText ? (JSON.parse(rawText) as unknown) : null;
  } catch {
    return {
      ok: false,
      status: res.status,
      message:
        !res.ok && rawText
          ? `Gemini HTTP ${res.status}: ${rawText.slice(0, 500)}`
          : `Gemini HTTP ${res.status}`,
    };
  }

  if (!res.ok) {
    return resultFromHttpFailure(res.status, data, rawText, "Gemini AI Studio");
  }

  const text = extractCandidateText(data);
  if (!text?.trim()) {
    const snippet =
      typeof data === "object" && data !== null ? JSON.stringify(data).slice(0, 1200) : "";
    console.warn("[Gemini AI Studio] no text in candidates", snippet);
    return {
      ok: false,
      message: describeEmptyResponse(data),
    };
  }

  return { ok: true, text: text.trim() };
}

async function postGeminiVertexGenerateContent(args: {
  project: string;
  location: string;
  modelId: string;
  payload: Record<string, unknown>;
}): Promise<GeminiGenerateResult> {
  const auth = new GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });
  const client = await auth.getClient();

  const url = `https://${args.location}-aiplatform.googleapis.com/v1/projects/${encodeURIComponent(args.project)}/locations/${encodeURIComponent(args.location)}/publishers/google/models/${encodeURIComponent(args.modelId)}:generateContent`;

  try {
    const response = await client.request<unknown>({
      url,
      method: "POST",
      data: args.payload,
    });

    const data = response.data as unknown;
    const text = extractCandidateText(data);
    if (!text?.trim()) {
      const snippet =
        typeof data === "object" && data !== null ? JSON.stringify(data).slice(0, 1200) : "";
      console.warn("[Gemini Vertex] no text in candidates", snippet);
      return {
        ok: false,
        message: describeEmptyResponse(data),
      };
    }

    return { ok: true, text: text.trim() };
  } catch (e: unknown) {
    const gx = e as {
      response?: { status?: number; data?: unknown };
      message?: string;
    };
    const status = gx.response?.status;
    const data = gx.response?.data;
    const msg =
      extractGoogleApiErrorMessage(data) ??
      (typeof gx.message === "string" ? gx.message : null) ??
      "Vertex AI generateContent failed.";
    console.error("[Gemini Vertex]", status ?? "", data ?? e);
    return {
      ok: false,
      status,
      message:
        msg +
        (status === 401 || status === 403
          ? " Ensure GOOGLE_APPLICATION_CREDENTIALS points to your service account JSON and the account has Vertex AI User (or broader) on this project."
          : ""),
    };
  }
}

/**
 * Gemini `generateContent`:
 * - **Google AI (API key)** first — `GEMINI_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY`, or `GEMMA_API_KEY`
 *   → `generativelanguage.googleapis.com` (same payload as before).
 * - **Vertex AI** only if no API key is set but `GEMINI_VERTEX_PROJECT` / `GOOGLE_CLOUD_PROJECT` / `GCP_PROJECT`
 *   is set — uses Application Default Credentials (`GOOGLE_APPLICATION_CREDENTIALS`).
 */
export async function postGeminiGenerateContent(args: {
  /** Overrides env; used with AI Studio when set. */
  apiKey?: string | null;
  /** Overrides env default for this request only. */
  modelId?: string;
  systemInstruction?: string;
  contents: GeminiRestContent[];
  generationConfig?: {
    temperature?: number;
    maxOutputTokens?: number;
    responseMimeType?: string;
  };
}): Promise<GeminiGenerateResult> {
  const modelId = args.modelId?.trim() || getGeminiGenerateModelId();
  const payload = buildGeminiGeneratePayload({
    contents: args.contents,
    systemInstruction: args.systemInstruction,
    generationConfig: args.generationConfig,
  });

  const apiKey = args.apiKey?.trim() || getGeminiApiKey();
  if (apiKey) {
    return postGeminiAiStudioGenerateContent({
      apiKey,
      modelId,
      payload,
    });
  }

  const project = getVertexProjectId();
  if (project) {
    const location = getVertexLocation();
    return postGeminiVertexGenerateContent({
      project,
      location,
      modelId,
      payload,
    });
  }

  return {
    ok: false,
    message:
      "No Gemini credentials: set GEMINI_API_KEY (Google AI Studio), or for Vertex AI set GEMINI_VERTEX_PROJECT (or GOOGLE_CLOUD_PROJECT) and GOOGLE_APPLICATION_CREDENTIALS.",
  };
}
