"use client";

import { useCallback, useEffect, useRef } from "react";

import type { UseEncounterConversationReturn } from "./useEncounterConversation";
import { useEncounterAudio } from "./useEncounterAudio";
import { useSpeechRecognition } from "./useSpeechRecognition";

export type UseVoiceConversationArgs = {
  conversation: UseEncounterConversationReturn;
  /** Override BCP-47 locale; default `en-US`. */
  lang?: string;
  /** Suppress assistant audio playback (e.g. user toggled "mute"). Default false. */
  mute?: boolean;
};

export type UseVoiceConversationReturn = {
  /** Headless audio element ref — render an `<audio>` and bind this ref. */
  audioRef: React.RefObject<HTMLAudioElement | null>;
  isSupported: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  startListening: () => void;
  stopListening: () => void;
  /** Cancel listening AND any in-flight assistant request + audio. */
  interrupt: () => void;
};

/**
 * Voice mode orchestrator. Wires:
 *   STT (useSpeechRecognition) → conversation.setPartial / commitPartial
 *   conversation.pendingAudio → audio playback (useEncounterAudio)
 *
 * All transcript / status state lives in `conversation` so text and voice
 * tabs stay perfectly in sync.
 */
export function useVoiceConversation({
  conversation,
  lang,
  mute = false,
}: UseVoiceConversationArgs): UseVoiceConversationReturn {
  const conversationRef = useRef(conversation);
  useEffect(() => {
    conversationRef.current = conversation;
  }, [conversation]);

  const audio = useEncounterAudio({
    onPlay: () => {
      conversationRef.current.setStatus("speaking");
    },
    onEnded: () => {
      const pending = conversationRef.current.pendingAudio;
      if (pending) conversationRef.current.acknowledgeAudio(pending.messageId);
      conversationRef.current.setStatus("idle");
    },
    onError: () => {
      const pending = conversationRef.current.pendingAudio;
      if (pending) conversationRef.current.acknowledgeAudio(pending.messageId);
      conversationRef.current.setStatus("idle");
    },
  });

  const speech = useSpeechRecognition({
    lang,
    onTranscript: (text) => {
      conversationRef.current.setPartial(text);
    },
    onFinal: (text) => {
      conversationRef.current.setPartial(text);
      conversationRef.current.setStatus("transcribing");
      void conversationRef.current.commitPartial({
        source: "voice",
        synthesizeSpeech: true,
      });
    },
    onEnd: () => {
      // If status is still 'listening' but we ended without a final
      // (e.g. silence timeout), drop back to idle.
      if (conversationRef.current.status === "listening") {
        conversationRef.current.setStatus("idle");
      }
    },
    onError: () => {
      conversationRef.current.setStatus("idle");
    },
  });

  const startListening = useCallback(() => {
    if (!speech.isSupported) return;
    // Stop any current playback before opening the mic.
    audio.stop();
    conversationRef.current.clearPartial();
    conversationRef.current.setStatus("listening");
    speech.start();
  }, [audio, speech]);

  const stopListening = useCallback(() => {
    speech.stop();
  }, [speech]);

  const interrupt = useCallback(() => {
    speech.abort();
    audio.stop();
    conversationRef.current.interrupt();
    conversationRef.current.clearPartial();
  }, [audio, speech]);

  // Auto-play any newly arrived assistant audio.
  const lastPlayedRef = useRef<string | null>(null);
  useEffect(() => {
    const pending = conversation.pendingAudio;
    if (!pending) return;
    if (lastPlayedRef.current === pending.messageId) return;
    lastPlayedRef.current = pending.messageId;
    if (mute) {
      conversation.acknowledgeAudio(pending.messageId);
      conversation.setStatus("idle");
      return;
    }
    void audio.play(pending.audioUrl);
  }, [audio, conversation, mute]);

  return {
    audioRef: audio.audioRef,
    isSupported: speech.isSupported,
    isListening: speech.isListening,
    isSpeaking: audio.isPlaying,
    startListening,
    stopListening,
    interrupt,
  };
}
