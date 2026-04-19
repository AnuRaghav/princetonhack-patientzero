import "server-only";

/**
 * Maps a curated case identifier (slug or UUID) to the env var that holds the
 * ElevenLabs voice id for that patient. Kept in lock-step with the slug/UUID
 * pairs in `lib/curated/curatedCaseVoiceSnapshot.ts`.
 *
 * Add new curated cases here whenever a new voice is recorded.
 */
const SLUG_TO_VOICE_ENV: Record<string, string> = {
  "maria-wolf": "MARIA",
  "jason-mehta": "JASON",
};

const UUID_TO_VOICE_ENV: Record<string, string> = {
  "4e009ce1-7815-4712-a345-a73779d64ad4": "MARIA",
  "bb88c0d7-c32c-4586-aa4e-092d46ac4367": "JASON",
};

/**
 * Resolve the per-case ElevenLabs voice id from a curated `patientId`
 * (accepts either the URL slug or the UUID embedded in the curated JSON).
 *
 * Returns `undefined` when the patient is not curated or the env var is unset,
 * so callers can keep falling back to the default voice resolution chain in
 * `lib/voice/elevenlabs.ts`.
 */
export function resolveCuratedVoiceId(patientId?: string | null): string | undefined {
  if (!patientId) return undefined;
  const k = patientId.trim();
  if (!k) return undefined;
  const envName = SLUG_TO_VOICE_ENV[k] ?? UUID_TO_VOICE_ENV[k];
  if (!envName) return undefined;
  const v = process.env[envName]?.trim();
  return v && v.length > 0 ? v : undefined;
}
