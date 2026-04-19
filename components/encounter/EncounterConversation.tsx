"use client";

import { useEffect, useState } from "react";

import { Surface } from "@/components/ui";
import { cn } from "@/components/ui/cn";

import { ChatTranscript } from "./ChatTranscript";
import { ConversationTabs } from "./ConversationTabs";
import { TextInputPanel } from "./TextInputPanel";
import { VoiceInputPanel } from "./VoiceInputPanel";
import { useEncounterConversation } from "./hooks/useEncounterConversation";
import { useVoiceConversation, type VoiceSttMode } from "./hooks/useVoiceConversation";
import type {
  DiscoveredFact,
  EncounterBackend,
  EncounterMessage,
  EncounterMode,
} from "./lib/types";

export type EncounterConversationProps = {
  /** Required: Supabase session uuid (chat backend) or external session id (converse backend). */
  sessionId: string;
  /** Default tab. Defaults to `text`. */
  modeDefault?: EncounterMode;
  /** Backend to use for assistant replies. Defaults to `chat` (session-aware, returns discovered facts). */
  backend?: EncounterBackend;
  /** Optional Synthea patient id for the converse backend. Falls back to `sessionId`. */
  patientId?: string;
  /**
   * Game/system prompt context. Stored on the component for future API extension
   * (chat backend does not currently accept a prompt override). Surfaces in the
   * patient-context badge for transparency.
   */
  systemPrompt?: string;
  /** Free-form patient context block (e.g. case bio, demographics). Same caveat as `systemPrompt`. */
  patientContext?: string;
  /** Patient's first line. Rendered immediately, no API call. */
  initialGreeting?: string;
  /** Hydrate the transcript with these messages instead of fetching from /api/sessions. */
  initialMessages?: EncounterMessage[];
  /** Skip transcript hydration even when backend === "chat". */
  disableHydration?: boolean;
  /** ElevenLabs voice id; reserved for future API extension. */
  voiceId?: string;
  /**
   * STT transport. Defaults to `"auto"`:
   *   - tries the browser Web Speech API first (low latency, live partials),
   *   - falls back to MediaRecorder + `/api/voice/stt` (ElevenLabs Scribe) if
   *     the browser path errors out for network reasons (e.g. campus wifi
   *     blocking Google's speech servers).
   */
  voiceSttMode?: VoiceSttMode;

  onTranscriptChange?: (messages: EncounterMessage[]) => void;
  onDiscoveredFactsChange?: (facts: DiscoveredFact[]) => void;
  onAssistantReply?: (
    message: EncounterMessage,
    meta: { audioUrl: string | null; ttsError?: string },
  ) => void;

  className?: string;
  /** Override the title shown in the panel header. */
  title?: string;
};

/**
 * Reusable, single-shared-state patient encounter UI. Renders a transcript
 * plus either a text or voice input panel. Switching tabs never resets state.
 *
 * Backend selection:
 *   - "chat":    POST /api/chat (default). Persists to Supabase, returns findings.
 *   - "converse": POST /api/patient/converse. Gemini direct, no session storage.
 *
 * Voice mode uses the browser Web Speech API for input and ElevenLabs (server-
 * side, via the chosen backend) for assistant audio playback.
 */
export function EncounterConversation({
  sessionId,
  modeDefault = "text",
  backend = "chat",
  patientId,
  systemPrompt,
  patientContext,
  initialGreeting,
  initialMessages,
  disableHydration,
  onTranscriptChange,
  onDiscoveredFactsChange,
  onAssistantReply,
  className,
  title = "Patient encounter",
  voiceSttMode = "auto",
}: EncounterConversationProps) {
  const [mode, setMode] = useState<EncounterMode>(modeDefault);

  const conversation = useEncounterConversation({
    backend,
    sessionId,
    patientId,
    initialMessages,
    initialGreeting,
    autoHydrate: !disableHydration,
    onTranscriptChange,
    onDiscoveredFactsChange,
    onAssistantReply,
  });

  const {
    audioRef,
    isSupported: voiceSupported,
    isListening: voiceListening,
    isSpeaking: voiceSpeaking,
    activeSttTransport,
    startListening,
    stopListening,
    interrupt: voiceInterrupt,
  } = useVoiceConversation({ conversation, sttMode: voiceSttMode });

  // Switching away from voice while listening: gracefully stop the mic so the
  // partial transcript isn't accidentally committed. Audio playback is allowed
  // to continue across tabs (same continuous encounter).
  useEffect(() => {
    if (mode === "voice") return;
    if (voiceListening) stopListening();
    if (conversation.pendingPartial) conversation.clearPartial();
    // Intentionally exhaustive: only react to mode changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const showSystemContext = Boolean(systemPrompt || patientContext);

  return (
    <Surface
      variant="card"
      padding="md"
      radius="lg"
      className={cn("flex flex-col gap-4", className)}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-[var(--color-ink)]">
            {title}
          </span>
          <span className="text-[11px] text-[var(--color-ink-muted)]">
            {backend === "chat" ? "Session-backed" : "Direct Gemini"}
          </span>
        </div>
        <ConversationTabs value={mode} onChange={setMode} />
      </div>

      {showSystemContext ? (
        <details className="group rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-surface-2)] px-3 py-2 text-[11px] text-[var(--color-ink-muted)]">
          <summary className="cursor-pointer select-none font-medium text-[var(--color-ink-soft)]">
            Patient context
          </summary>
          {systemPrompt ? (
            <p className="mt-2 whitespace-pre-wrap">
              <span className="font-semibold text-[var(--color-ink)]">System:</span>{" "}
              {systemPrompt}
            </p>
          ) : null}
          {patientContext ? (
            <p className="mt-2 whitespace-pre-wrap">
              <span className="font-semibold text-[var(--color-ink)]">Context:</span>{" "}
              {patientContext}
            </p>
          ) : null}
        </details>
      ) : null}

      {conversation.lastError ? (
        <div className="rounded-[var(--radius-sm)] border border-[rgba(239,68,68,0.2)] bg-[var(--color-danger-soft)] px-3 py-2 text-[12px] text-[#b91c1c]">
          {conversation.lastError}
        </div>
      ) : null}

      <ChatTranscript
        messages={conversation.messages}
        status={conversation.status}
        pendingPartial={conversation.pendingPartial}
        className="min-h-[280px] max-h-[460px]"
      />

      {mode === "text" ? (
        <TextInputPanel
          status={conversation.status}
          onSend={(text) => conversation.sendMessage(text, { source: "text", synthesizeSpeech: false })}
        />
      ) : (
        <VoiceInputPanel
          status={conversation.status}
          isListening={voiceListening}
          isSpeaking={voiceSpeaking}
          isSupported={voiceSupported}
          pendingPartial={conversation.pendingPartial}
          onStart={startListening}
          onStop={stopListening}
          onInterrupt={voiceInterrupt}
          transport={activeSttTransport}
        />
      )}

      {/* Headless audio sink for assistant replies in voice mode. */}
      <audio ref={audioRef} className="hidden" aria-hidden />
    </Surface>
  );
}
