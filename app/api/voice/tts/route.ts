import { NextResponse } from "next/server";

import { TtsRequestSchema, TtsResponseSchema } from "@/lib/api/schemas";
import { synthesizeElevenLabsToDataUrl } from "@/lib/voice/elevenlabs";

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = TtsRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  try {
    const dataUrl = await synthesizeElevenLabsToDataUrl(parsed.data.text, parsed.data.voice);
    if (!dataUrl) {
      return NextResponse.json(
        { error: "Missing ELEVENLABS_API_KEY or synthesis failed" },
        { status: 503 },
      );
    }
    const body = TtsResponseSchema.parse({ audioUrl: dataUrl });
    return NextResponse.json(body);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "TTS failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
