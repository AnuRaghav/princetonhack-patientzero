import { NextResponse } from "next/server";

import { SttJsonRequestSchema, SttResponseSchema } from "@/lib/api/schemas";
import { elevenLabsSttFromBuffer } from "@/lib/voice/elevenlabs";

export const runtime = "nodejs";
/** Allow ~25MB audio uploads. Voice turns are tiny (~50–200KB) but be permissive. */
export const maxDuration = 60;

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
  const contentType = req.headers.get("content-type") ?? "";

  let buffer: Buffer;
  let mimeType: string;
  let language: string | undefined;
  let fileName: string | undefined;

  try {
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("audio");
      if (!(file instanceof Blob)) {
        return NextResponse.json(
          { error: "Missing `audio` file field" },
          { status: 400 },
        );
      }
      const overrideMime = form.get("mimeType");
      const lang = form.get("language");
      const arrayBuf = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuf);
      mimeType =
        (typeof overrideMime === "string" && overrideMime) ||
        file.type ||
        "audio/webm";
      language = typeof lang === "string" && lang ? lang : undefined;
      fileName = "name" in file && typeof file.name === "string" ? file.name : undefined;
    } else {
      const json = await req.json().catch(() => ({}));
      const parsed = SttJsonRequestSchema.safeParse(json);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Invalid body. Expected multipart/form-data or `{audioBase64, mimeType}`" },
          { status: 400 },
        );
      }
      buffer = Buffer.from(parsed.data.audioBase64, "base64");
      mimeType = parsed.data.mimeType;
      language = parsed.data.language;
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not read audio payload";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  if (buffer.byteLength === 0) {
    return NextResponse.json({ error: "Empty audio payload" }, { status: 400 });
  }

  const result = await elevenLabsSttFromBuffer({
    buffer,
    mimeType,
    fileName,
    language,
  });

  if (result.text == null) {
    return NextResponse.json(
      { error: result.error ?? "Speech-to-text failed" },
      { status: 502 },
    );
  }

  const body = SttResponseSchema.parse({ text: result.text });
  return NextResponse.json(body);
}
