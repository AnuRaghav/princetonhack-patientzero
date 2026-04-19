import { NextResponse } from "next/server";

import {
  buildBehavioralPrompt,
  emptyBehavioralResult,
  parseBehavioralModelOutput,
  type BehavioralScoreResult,
} from "@/lib/curated/behavioralScore";
import type { CuratedChallengeTranscriptLine } from "@/lib/curated/challengeResult";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const K2_ENDPOINT = "https://api.k2think.ai/v1/chat/completions";
const K2_MODEL = "MBZUAI-IFM/K2-Think-v2";
/** Hard server timeout to keep the finish flow snappy even if K2 stalls. */
const K2_TIMEOUT_MS = 25_000;

type RequestBody = {
  caseTitle?: unknown;
  patientOneLiner?: unknown;
  transcript?: unknown;
};

function isTranscriptLine(x: unknown): x is CuratedChallengeTranscriptLine {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    (o.role === "clinician" || o.role === "patient" || o.role === "system") &&
    typeof o.text === "string" &&
    typeof o.createdAt === "number"
  );
}

function sanitizeTranscript(value: unknown): CuratedChallengeTranscriptLine[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isTranscriptLine).slice(0, 400);
}

function emptyResponse(reason: string): NextResponse {
  return NextResponse.json({ ...emptyBehavioralResult(), source: "fallback", reason });
}

export async function POST(req: Request) {
  const apiKey = process.env.K2_API_KEY;
  if (!apiKey) return emptyResponse("missing K2_API_KEY");

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const transcript = sanitizeTranscript(body.transcript);
  if (transcript.length === 0) return emptyResponse("empty transcript");

  const caseTitle = typeof body.caseTitle === "string" ? body.caseTitle.slice(0, 200) : "Unknown case";
  const patientOneLiner =
    typeof body.patientOneLiner === "string" ? body.patientOneLiner.slice(0, 600) : "";

  const { system, user } = buildBehavioralPrompt({ transcript, caseTitle, patientOneLiner });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), K2_TIMEOUT_MS);
  let upstream: Response;
  try {
    upstream = await fetch(K2_ENDPOINT, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: K2_MODEL,
        stream: false,
        temperature: 0.2,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
      signal: controller.signal,
    });
  } catch (err) {
    return emptyResponse(err instanceof Error ? `fetch failed: ${err.message}` : "fetch failed");
  } finally {
    clearTimeout(timer);
  }

  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => "");
    return emptyResponse(`k2 status ${upstream.status}${detail ? `: ${detail.slice(0, 200)}` : ""}`);
  }

  let payload: unknown;
  try {
    payload = await upstream.json();
  } catch {
    return emptyResponse("k2 returned non-JSON");
  }

  const content = extractAssistantContent(payload);
  if (!content) return emptyResponse("no assistant content");

  const result: BehavioralScoreResult | null = parseBehavioralModelOutput(content);
  if (!result) return emptyResponse("could not parse rubric JSON");

  return NextResponse.json({ ...result, source: "k2" });
}

/** OpenAI-compatible response: choices[0].message.content (string) - be defensive. */
function extractAssistantContent(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const choices = (payload as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || choices.length === 0) return null;
  const first = choices[0] as { message?: { content?: unknown } };
  const content = first?.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && "text" in part && typeof (part as { text: unknown }).text === "string") {
          return (part as { text: string }).text;
        }
        return "";
      })
      .join("");
  }
  return null;
}
