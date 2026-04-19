/**
 * Public types for the EncounterConversation component family.
 *
 * These are the shared, normalized shapes used by every hook and subcomponent -
 * regardless of which backend (`/api/chat` or `/api/patient/converse`) is
 * powering the underlying assistant call.
 */

export type EncounterBackend = "chat" | "converse";

export type EncounterMode = "text" | "voice";

/** All possible UI / state-machine states for a single shared session. */
export type EncounterStatus =
  | "idle"
  | "listening"
  | "transcribing"
  | "thinking"
  | "speaking"
  | "paused"
  | "error";

export type EncounterRole = "patient" | "clinician" | "system";

export type EncounterMessage = {
  id: string;
  role: EncounterRole;
  text: string;
  /** Which input mode produced this turn (assistant replies inherit from the user turn). */
  source: EncounterMode;
  createdAt: number;
  /** ElevenLabs audio for assistant replies, when synthesis ran successfully. */
  audioUrl?: string | null;
};

export type DiscoveredFactKind = "observation" | "diagnosis" | "other";

export type DiscoveredFact = {
  /** Stable identifier - for `chat` backend, this is the canonical fact key from the server. */
  key: string;
  /** Human-readable description of the fact. */
  text: string;
  kind: DiscoveredFactKind;
  /** Epoch ms when this fact was first surfaced in the session. */
  discoveredAt: number;
};

/** Normalized adapter response - both backends collapse into this shape. */
export type NormalizedReply = {
  reply: string;
  audioUrl: string | null;
  ttsError?: string;
  /** New facts extracted from this turn (may be empty for the converse backend). */
  discoveredFacts: DiscoveredFact[];
  /** Optional structured findings projection (currently only chat backend). */
  rawFindings?: Record<string, unknown>;
};
