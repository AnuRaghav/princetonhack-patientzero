import "server-only";

/**
 * ElevenLabs text-to-speech → `data:audio/mpeg;base64,...` for playback without storing files.
 *
 * Env:
 * - `ELEVENLABS_API_KEY` (required — without this, TTS returns null)
 * - `ELEVENLABS_VOICE_ID` or `MARIA` (optional voice id; default voice below)
 * - `ELEVENLABS_MODEL_ID` (optional; default eleven_multilingual_v2)
 */
const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // Rachel — clear for demos

export type ElevenLabsTtsResult = {
  audioUrl: string | null;
  /** Set when audioUrl is null so callers can surface a reason (never includes the API key). */
  error?: string;
};

/**
 * Same HTTP call as `synthesizeElevenLabsToDataUrl`, but returns why synthesis failed instead of throwing.
 */
export async function elevenLabsTtsWithDiagnostics(
  text: string,
  voiceId?: string,
): Promise<ElevenLabsTtsResult> {
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
  if (!apiKey) {
    return {
      audioUrl: null,
      error:
        "Missing ELEVENLABS_API_KEY. Add it to `.env.local` (server-only) and restart `npm run dev`.",
    };
  }

  const vid = (voiceId ?? process.env.ELEVENLABS_VOICE_ID ?? process.env.MARIA ?? DEFAULT_VOICE_ID).trim();
  const modelId = (process.env.ELEVENLABS_MODEL_ID ?? "eleven_multilingual_v2").trim();

  let res: Response;
  try {
    res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${vid}`, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: modelId,
      }),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Network error";
    console.error("[ElevenLabs]", msg);
    return { audioUrl: null, error: `ElevenLabs request failed: ${msg}` };
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    const snippet = errText.slice(0, 300);
    console.error("[ElevenLabs] HTTP", res.status, snippet);
    return {
      audioUrl: null,
      error: `ElevenLabs HTTP ${res.status}${snippet ? `: ${snippet}` : ""}`,
    };
  }

  const buf = Buffer.from(await res.arrayBuffer());
  const b64 = buf.toString("base64");
  return { audioUrl: `data:audio/mpeg;base64,${b64}` };
}

export async function synthesizeElevenLabsToDataUrl(text: string, voiceId?: string): Promise<string | null> {
  const { audioUrl } = await elevenLabsTtsWithDiagnostics(text, voiceId);
  return audioUrl;
}
