import { NextResponse } from "next/server";

import { SttJsonRequestSchema, SttResponseSchema } from "@/lib/api/schemas";
import { elevenLabsSttFromBuffer } from "@/lib/voice/elevenlabs";

export const runtime = "nodejs";
/** Allow ~25MB audio uploads. Voice turns are tiny (~50–200KB) but be permissive. */
export const maxDuration = 60;

type AudioPayload = {
  buffer: Buffer;
  mimeType: string;
  language?: string;
  fileName?: string;
};

class PayloadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PayloadError";
  }
}

async function parseMultipart(req: Request): Promise<AudioPayload> {
  const form = await req.formData();
  const file = form.get("audio");
  if (!(file instanceof Blob)) {
    throw new PayloadError("Missing `audio` file field");
  }
  const overrideMime = form.get("mimeType");
  const lang = form.get("language");
  const buffer = Buffer.from(await file.arrayBuffer());
  const mimeType =
    (typeof overrideMime === "string" && overrideMime) || file.type || "audio/webm";
  const language = typeof lang === "string" && lang ? lang : undefined;
  const maybeName = (file as Blob & { name?: unknown }).name;
  const fileName = typeof maybeName === "string" ? maybeName : undefined;
  return { buffer, mimeType, language, fileName };
}

async function parseJsonBody(req: Request): Promise<AudioPayload> {
  const json = await req.json().catch(() => ({}));
  const parsed = SttJsonRequestSchema.safeParse(json);
  if (!parsed.success) {
    throw new PayloadError(
      "Invalid body. Expected multipart/form-data or `{audioBase64, mimeType}`",
    );
  }
  return {
    buffer: Buffer.from(parsed.data.audioBase64, "base64"),
    mimeType: parsed.data.mimeType,
    language: parsed.data.language,
  };
}

async function readPayload(req: Request): Promise<AudioPayload> {
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    return parseMultipart(req);
  }
  return parseJsonBody(req);
}

/**
 * POST /api/voice/stt
 *
 * Two ingest formats:
 *   1. multipart/form-data with an `audio` file field. Preferred; lets us avoid
 *      a base64 round-trip and keeps the request body small.
 *      Optional fields: `language` (BCP-47), `mimeType` (override blob type).
 *   2. application/json with `{ audioBase64, mimeType, language? }`.
 *
 * Backed by ElevenLabs `scribe_v1`. Returns `{ text }`.
 */
export async function POST(req: Request) {
  let payload: AudioPayload;
  try {
    payload = await readPayload(req);
  } catch (e) {
    const msg =
      e instanceof PayloadError
        ? e.message
        : e instanceof Error
          ? e.message
          : "Could not read audio payload";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  if (payload.buffer.byteLength === 0) {
    return NextResponse.json({ error: "Empty audio payload" }, { status: 400 });
  }

  const result = await elevenLabsSttFromBuffer(payload);

  if (result.text == null) {
    return NextResponse.json(
      { error: result.error ?? "Speech-to-text failed" },
      { status: 502 },
    );
  }

  const body = SttResponseSchema.parse({ text: result.text });
  return NextResponse.json(body);
}
