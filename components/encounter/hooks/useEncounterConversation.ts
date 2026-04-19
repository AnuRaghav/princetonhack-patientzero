"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  hydrateChatTranscript,
  sendEncounterTurn,
} from "../lib/encounterClient";
import { discoveredFactSetsEqual } from "../lib/factMapping";
import type {
  DiscoveredFact,
  EncounterBackend,
  EncounterMessage,
  EncounterMode,
  EncounterStatus,
  NormalizedReply,
} from "../lib/types";

export type SendMessageOptions = {
  source?: EncounterMode;
  synthesizeSpeech?: boolean;
};

export type UseEncounterConversationArgs = {
  backend: EncounterBackend;
  sessionId: string;
  patientId?: string;
  initialMessages?: EncounterMessage[];
  initialGreeting?: string;
  /** Whether to auto-fetch persisted transcript for chat backend on mount. Default true. */
  autoHydrate?: boolean;
  onTranscriptChange?: (messages: EncounterMessage[]) => void;
  onDiscoveredFactsChange?: (facts: DiscoveredFact[]) => void;
  onAssistantReply?: (
    message: EncounterMessage,
    meta: { audioUrl: string | null; ttsError?: string },
  ) => void;
};

export type UseEncounterConversationReturn = {
  messages: EncounterMessage[];
  discoveredFacts: DiscoveredFact[];
  status: EncounterStatus;
  lastError: string | null;
  /** Live partial transcript from STT (not yet committed to `messages`). */
  pendingPartial: string;
  /** True when an assistant reply is currently in flight. */
  isReplying: boolean;
  /** Most recent assistant audio URL (data: or http). Null when none / interrupted. */
  pendingAudio: { messageId: string; audioUrl: string } | null;

  sendMessage: (text: string, opts?: SendMessageOptions) => Promise<void>;
  setPartial: (text: string) => void;
  clearPartial: () => void;
  /**
   * Commit a transcript as a clinician turn and dispatch the assistant call.
   * If `overrideText` is provided, uses it directly (bypasses the stale-state
   * trap where a freshly-set `pendingPartial` hasn't re-rendered yet). Otherwise
   * uses the latest committed `pendingPartial`. No-op when both are empty.
   */
  commitPartial: (opts?: SendMessageOptions & { overrideText?: string }) => Promise<void>;

  /** Mark the assistant audio as consumed (called after playback ends or is cancelled). */
  acknowledgeAudio: (messageId: string) => void;
  /** Update the global state machine status (used by voice/audio orchestrators). */
  setStatus: (status: EncounterStatus) => void;
  /** Surface an error in the shared error banner. Pass `null` to clear. */
  setError: (message: string | null) => void;

  /** Stop in-flight request + flag the session as paused. */
  interrupt: () => void;
  /** Wipe transcript + facts + status. */
  reset: () => void;
  /** Append transcript lines without calling the assistant (e.g. exam choreographed turns). */
  appendMessages: (messages: EncounterMessage[]) => void;
};

const TERMINAL_STATUSES: ReadonlySet<EncounterStatus> = new Set([
  "idle",
  "paused",
  "error",
]);

/**
 * Single source of truth for an encounter — owns transcript, discovered facts,
 * status state machine, in-flight guards, and host callbacks. Mode-specific
 * orchestration (STT, audio playback) lives in sibling hooks but funnels
 * everything through this one.
 */
export function useEncounterConversation(
  args: UseEncounterConversationArgs,
): UseEncounterConversationReturn {
  const {
    backend,
    sessionId,
    patientId,
    initialMessages,
    initialGreeting,
    autoHydrate = true,
    onTranscriptChange,
    onDiscoveredFactsChange,
    onAssistantReply,
  } = args;

  const [messages, setMessages] = useState<EncounterMessage[]>(() => {
    if (initialMessages && initialMessages.length > 0) return initialMessages;
    if (initialGreeting?.trim()) {
      return [
        {
          id: `greeting-${Date.now().toString(36)}`,
          role: "patient",
          text: initialGreeting.trim(),
          source: "text",
          createdAt: Date.now(),
        },
      ];
    }
    return [];
  });
  const [discoveredFacts, setDiscoveredFacts] = useState<DiscoveredFact[]>([]);
  const [status, setStatus] = useState<EncounterStatus>("idle");
  const [lastError, setLastError] = useState<string | null>(null);
  const [pendingPartial, setPendingPartial] = useState("");
  const [pendingAudio, setPendingAudio] = useState<
    { messageId: string; audioUrl: string } | null
  >(null);

  const inFlightRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const hydratedRef = useRef(false);

  // Always-fresh refs for callbacks that we don't want to re-bind sendMessage on.
  const messagesRef = useRef(messages);
  const factsRef = useRef(discoveredFacts);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);
  useEffect(() => {
    factsRef.current = discoveredFacts;
  }, [discoveredFacts]);

  const onTranscriptChangeRef = useRef(onTranscriptChange);
  const onFactsChangeRef = useRef(onDiscoveredFactsChange);
  const onAssistantReplyRef = useRef(onAssistantReply);
  useEffect(() => {
    onTranscriptChangeRef.current = onTranscriptChange;
  }, [onTranscriptChange]);
  useEffect(() => {
    onFactsChangeRef.current = onDiscoveredFactsChange;
  }, [onDiscoveredFactsChange]);
  useEffect(() => {
    onAssistantReplyRef.current = onAssistantReply;
  }, [onAssistantReply]);

  // Fire host callback whenever transcript changes.
  useEffect(() => {
    onTranscriptChangeRef.current?.(messages);
  }, [messages]);

  // Fire host callback whenever facts set changes (by key).
  const lastFactsNotifiedRef = useRef<DiscoveredFact[]>([]);
  useEffect(() => {
    if (!discoveredFactSetsEqual(lastFactsNotifiedRef.current, discoveredFacts)) {
      lastFactsNotifiedRef.current = discoveredFacts;
      onFactsChangeRef.current?.(discoveredFacts);
    }
  }, [discoveredFacts]);

  // One-time hydration from persisted transcript (chat backend).
  useEffect(() => {
    if (!autoHydrate) return;
    if (backend !== "chat") return;
    if (hydratedRef.current) return;
    if ((initialMessages?.length ?? 0) > 0) {
      hydratedRef.current = true;
      return;
    }
    hydratedRef.current = true;
    let cancelled = false;
    void (async () => {
      const turns = await hydrateChatTranscript(sessionId);
      if (cancelled || turns.length === 0) return;
      // Replace either an empty transcript or one containing only the
      // seeded greeting (which we identify by the synthetic `greeting-*` id).
      setMessages((prev) => {
        if (prev.length === 0) return turns;
        if (prev.length === 1 && prev[0]?.id.startsWith("greeting-")) return turns;
        return prev;
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [autoHydrate, backend, initialMessages, sessionId]);

  const setPartial = useCallback((text: string) => {
    setPendingPartial(text);
  }, []);

  const clearPartial = useCallback(() => {
    setPendingPartial("");
  }, []);

  const acknowledgeAudio = useCallback((messageId: string) => {
    setPendingAudio((prev) => (prev?.messageId === messageId ? null : prev));
  }, []);

  const interrupt = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    inFlightRef.current = false;
    setPendingAudio(null);
    setStatus((prev) => (TERMINAL_STATUSES.has(prev) ? prev : "paused"));
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    inFlightRef.current = false;
    setMessages([]);
    setDiscoveredFacts([]);
    setStatus("idle");
    setLastError(null);
    setPendingPartial("");
    setPendingAudio(null);
    hydratedRef.current = false;
  }, []);

  const appendMessages = useCallback((toAppend: EncounterMessage[]) => {
    if (!toAppend.length) return;
    setMessages((prev) => [...prev, ...toAppend]);
  }, []);

  const sendMessage = useCallback(
    async (text: string, opts?: SendMessageOptions) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      if (inFlightRef.current) return;

      const source: EncounterMode = opts?.source ?? "text";
      const synthesizeSpeech = opts?.synthesizeSpeech ?? source === "voice";

      inFlightRef.current = true;
      setLastError(null);

      const userMsg: EncounterMessage = {
        id: makeId("user"),
        role: "clinician",
        text: trimmed,
        source,
        createdAt: Date.now(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setPendingPartial("");
      setStatus("thinking");

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const reply: NormalizedReply = await sendEncounterTurn({
          backend,
          sessionId,
          patientId,
          message: trimmed,
          history: messagesRef.current,
          knownFacts: factsRef.current,
          synthesizeSpeech,
          signal: controller.signal,
        });

        if (controller.signal.aborted) return;

        const assistantMsg: EncounterMessage = {
          id: makeId("patient"),
          role: "patient",
          text: reply.reply,
          source,
          createdAt: Date.now(),
          audioUrl: reply.audioUrl,
        };

        setMessages((prev) => [...prev, assistantMsg]);

        if (reply.discoveredFacts.length > 0) {
          setDiscoveredFacts((prev) => [...prev, ...reply.discoveredFacts]);
        }

        const audioUrl = reply.audioUrl;
        if (audioUrl) {
          setPendingAudio({ messageId: assistantMsg.id, audioUrl });
          // Voice mode pipes this into playback via useVoiceConversation;
          // text mode generally won't request TTS, so audio rarely arrives here.
          setStatus("speaking");
        } else {
          setStatus("idle");
        }

        onAssistantReplyRef.current?.(assistantMsg, {
          audioUrl,
          ttsError: reply.ttsError,
        });
      } catch (err) {
        if (controller.signal.aborted) return;
        const message = err instanceof Error ? err.message : "Request failed";
        setLastError(message);
        setStatus("error");
      } finally {
        inFlightRef.current = false;
        if (abortRef.current === controller) abortRef.current = null;
      }
    },
    [backend, patientId, sessionId],
  );

  // Always-fresh ref so callers can `commitPartial()` immediately after
  // `setPartial()` in the same microtask without hitting a stale closure.
  const pendingPartialRef = useRef(pendingPartial);
  useEffect(() => {
    pendingPartialRef.current = pendingPartial;
  }, [pendingPartial]);

  const commitPartial = useCallback(
    async (opts?: SendMessageOptions & { overrideText?: string }) => {
      const { overrideText, ...sendOpts } = opts ?? {};
      const text = (overrideText ?? pendingPartialRef.current).trim();
      if (!text) return;
      await sendMessage(text, { source: "voice", ...sendOpts });
    },
    [sendMessage],
  );

  // Cleanup any in-flight request on unmount.
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      abortRef.current = null;
    };
  }, []);

  const isReplying = status === "thinking" || status === "transcribing";

  const setError = useCallback((message: string | null) => {
    setLastError(message);
    if (message) setStatus("error");
  }, []);

  return useMemo(
    () => ({
      messages,
      discoveredFacts,
      status,
      lastError,
      pendingPartial,
      isReplying,
      pendingAudio,
      sendMessage,
      setPartial,
      clearPartial,
      commitPartial,
      acknowledgeAudio,
      setStatus,
      setError,
      interrupt,
      reset,
      appendMessages,
    }),
    [
      acknowledgeAudio,
      appendMessages,
      clearPartial,
      commitPartial,
      discoveredFacts,
      interrupt,
      isReplying,
      lastError,
      messages,
      pendingAudio,
      pendingPartial,
      reset,
      sendMessage,
      setError,
      setPartial,
      status,
    ],
  );
}

let idCounter = 0;
function makeId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter.toString(36)}`;
}
