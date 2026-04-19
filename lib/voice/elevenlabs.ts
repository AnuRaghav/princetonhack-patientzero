import "server-only";

/**
 * ElevenLabs text-to-speech → `data:audio/mpeg;base64,...` for playback without storing files.
 *
 * Env:
 * - `ELEVENLABS_API_KEY` (required - without this, TTS returns null)
 * - `ELEVENLABS_VOICE_ID` or `MARIA` (optional voice id; default voice below)
 * - `ELEVENLABS_MODEL_ID` (optional; default eleven_multilingual_v2)
 */
const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // Rachel - clear for demos

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

export type ElevenLabsSttResult = {
  text: string | null;
  /** Set when text is null so callers can surface a reason (never includes the API key). */
  error?: string;
};

/**
 * ElevenLabs Speech-to-Text (`scribe_v1`). Used as a fallback for clients
 * whose network blocks Chrome's Web Speech servers.
 *
 * Env: `ELEVENLABS_API_KEY` (required), optional `ELEVENLABS_STT_MODEL_ID`
 * (defaults to `scribe_v1`).
 */
export async function elevenLabsSttFromBuffer(args: {
  buffer: Buffer;
  mimeType: string;
  fileName?: string;
  language?: string;
}): Promise<ElevenLabsSttResult> {
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
  if (!apiKey) {
    return {
      text: null,
      error:
        "Missing ELEVENLABS_API_KEY. Add it to `.env.local` (server-only) and restart `npm run dev`.",
    };
  }

  const modelId = (process.env.ELEVENLABS_STT_MODEL_ID ?? "scribe_v1").trim();
  const fileName = args.fileName ?? guessFileName(args.mimeType);

  const form = new FormData();
  form.append("model_id", modelId);
  if (args.language) form.append("language_code", args.language);
  form.append(
    "file",
    new Blob([new Uint8Array(args.buffer)], { type: args.mimeType }),
    fileName,
  );

  let res: Response;
  try {
    res = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: { "xi-api-key": apiKey },
      body: form,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Network error";
    console.error("[ElevenLabs STT]", msg);
    return { text: null, error: `ElevenLabs STT request failed: ${msg}` };
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    const snippet = errText.slice(0, 300);
    console.error("[ElevenLabs STT] HTTP", res.status, snippet);
    return {
      text: null,
      error: `ElevenLabs STT HTTP ${res.status}${snippet ? `: ${snippet}` : ""}`,
    };
  }

  let payload: { text?: string } = {};
  try {
    payload = (await res.json()) as { text?: string };
  } catch {
    return { text: null, error: "ElevenLabs STT returned an unparseable response" };
  }
  return { text: (payload.text ?? "").trim() };
}

function guessFileName(mimeType: string): string {
  if (mimeType.includes("webm")) return "audio.webm";
  if (mimeType.includes("ogg")) return "audio.ogg";
  if (mimeType.includes("mp4") || mimeType.includes("m4a")) return "audio.m4a";
  if (mimeType.includes("wav")) return "audio.wav";
  if (mimeType.includes("mpeg") || mimeType.includes("mp3")) return "audio.mp3";
  return "audio.bin";
}
