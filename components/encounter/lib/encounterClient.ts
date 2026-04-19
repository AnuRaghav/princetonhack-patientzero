import type { TranscriptTurnRow } from "@/types/session";

import { mergeChatRevealedFacts } from "./factMapping";
import type {
  DiscoveredFact,
  EncounterBackend,
  EncounterMessage,
  EncounterMode,
  NormalizedReply,
} from "./types";

type SendArgs = {
  backend: EncounterBackend;
  /** Chat backend: Supabase session uuid. Converse backend: optional, may be reused as `patientId`. */
  sessionId: string;
  /** Converse backend: explicit Synthea `patient.Id`. Falls back to `sessionId` when missing. */
  patientId?: string;
  message: string;
  history: ReadonlyArray<EncounterMessage>;
  /** Currently known discovered facts (used as the merge base for chat backend). */
  knownFacts: ReadonlyArray<DiscoveredFact>;
  synthesizeSpeech: boolean;
  signal?: AbortSignal;
};

/** Send a single user turn through the appropriate backend and return a normalized reply. */
export async function sendEncounterTurn(args: SendArgs): Promise<NormalizedReply> {
  if (args.backend === "chat") return sendChatTurn(args);
  return sendConverseTurn(args);
}

async function sendChatTurn(args: SendArgs): Promise<NormalizedReply> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId: args.sessionId,
      message: args.message,
      synthesizeSpeech: args.synthesizeSpeech,
    }),
    signal: args.signal,
  });

  const payload = (await safeJson(res)) as {
    reply?: string;
    revealedFacts?: string[];
    latestReveal?: { key: string; kind: "observation" | "diagnosis" | "other"; text: string } | null;
    ttsAudioUrl?: string | null;
    ttsError?: string;
    findings?: Record<string, unknown>;
    error?: string;
  };

  if (!res.ok) {
    throw new Error(payload?.error ?? `Chat request failed (${res.status})`);
  }

  const now = Date.now();
  const merged = mergeChatRevealedFacts({
    existing: [...args.knownFacts],
    revealedFactKeys: payload.revealedFacts ?? [],
    latestReveal: payload.latestReveal ?? null,
    now,
  });
  const newFacts = merged.slice(args.knownFacts.length);

  return {
    reply: payload.reply ?? "",
    audioUrl: payload.ttsAudioUrl ?? null,
    ttsError: payload.ttsError,
    discoveredFacts: newFacts,
    rawFindings: payload.findings,
  };
}

async function sendConverseTurn(args: SendArgs): Promise<NormalizedReply> {
  const history = args.history
    .filter((m) => m.role === "clinician" || m.role === "patient")
    .map((m) => ({
      role: m.role === "clinician" ? "user" : "patient",
      text: m.text,
    }));

  const res = await fetch("/api/patient/converse", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      patientId: args.patientId ?? args.sessionId,
      transcript: args.message,
      history,
      synthesizeAudio: args.synthesizeSpeech,
      includePatientCase: false,
    }),
    signal: args.signal,
  });

  const payload = (await safeJson(res)) as {
    responseText?: string;
    audioUrl?: string | null;
    ttsError?: string;
    error?: string;
  };

  if (!res.ok) {
    throw new Error(payload?.error ?? `Patient converse request failed (${res.status})`);
  }

  return {
    reply: payload.responseText ?? "",
    audioUrl: payload.audioUrl ?? null,
    ttsError: payload.ttsError,
    discoveredFacts: [],
  };
}

/**
 * Hydrate persisted transcript for the chat backend.
 * Returns an empty array when the session has no prior turns or the request fails softly.
 */
export async function hydrateChatTranscript(sessionId: string): Promise<EncounterMessage[]> {
  try {
    const res = await fetch(`/api/sessions/${encodeURIComponent(sessionId)}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { transcript?: TranscriptTurnRow[] };
    const turns = data.transcript ?? [];
    return turns.map(transcriptRowToMessage);
  } catch {
    return [];
  }
}

function transcriptRowToMessage(row: TranscriptTurnRow): EncounterMessage {
  const source: EncounterMode =
    typeof row.metadata?.source === "string" && row.metadata.source === "voice"
      ? "voice"
      : "text";
  return {
    id: row.id,
    role: row.speaker === "student" ? "clinician" : "patient",
    text: row.message,
    source,
    createdAt: new Date(row.created_at).getTime() || Date.now(),
  };
}

async function safeJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return {};
  }
}
