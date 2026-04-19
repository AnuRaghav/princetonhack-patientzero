"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { UseEncounterConversationReturn } from "./useEncounterConversation";
import { useEncounterAudio } from "./useEncounterAudio";
import { useMediaRecorder } from "./useMediaRecorder";
import { useSpeechRecognition } from "./useSpeechRecognition";

export type VoiceSttMode =
  /** Try browser Web Speech first; fall back to server STT on network errors. */
  | "auto"
  /** Force browser Web Speech (Chrome/Edge). */
  | "browser"
  /** Force MediaRecorder + server STT (works on any network with mic permission). */
  | "server";

export type UseVoiceConversationArgs = {
  conversation: UseEncounterConversationReturn;
  /** Override BCP-47 locale; default `en-US`. */
  lang?: string;
  /** Suppress assistant audio playback (e.g. user toggled "mute"). Default false. */
  mute?: boolean;
  /** STT transport strategy. Default `"auto"`. */
  sttMode?: VoiceSttMode;
};

export type UseVoiceConversationReturn = {
  /** Headless audio element ref - render an `<audio>` and bind this ref. */
  audioRef: React.RefObject<HTMLAudioElement | null>;
  /** True when at least one STT transport is usable in this browser. */
  isSupported: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  /** Which STT path is currently selected (live; reflects auto-fallback). */
  activeSttTransport: "browser" | "server";
  startListening: () => void;
  stopListening: () => void;
  /** Cancel listening AND any in-flight assistant request + audio. */
  interrupt: () => void;
};

/**
 * Voice mode orchestrator. Wires:
 *   STT (browser or server) → conversation.setPartial / commitPartial
 *   conversation.pendingAudio → audio playback (useEncounterAudio)
 *
 * STT transports:
 *   - `browser` - Web Speech API. Streams interim text. Requires unrestricted
 *     access to Google's speech servers (blocked on some campus / corp networks).
 *   - `server`  - MediaRecorder → POST /api/voice/stt → ElevenLabs Scribe. No
 *     interim transcript, but works on any network. Used as auto-fallback when
 *     browser STT reports a `network` error.
 *
 * All transcript / status state lives in `conversation` so text and voice
 * tabs stay perfectly in sync.
 */
export function useVoiceConversation({
  conversation,
  lang,
  mute = false,
  sttMode = "auto",
}: UseVoiceConversationArgs): UseVoiceConversationReturn {
  const conversationRef = useRef(conversation);
  useEffect(() => {
    conversationRef.current = conversation;
  }, [conversation]);

  // Tracks whether we should route through the server (either explicitly or
  // because browser STT failed with a network error during this session).
  const [useServerStt, setUseServerStt] = useState(() => sttMode === "server");
  const useServerSttRef = useRef(useServerStt);
  useEffect(() => {
    useServerSttRef.current = useServerStt;
  }, [useServerStt]);

  // If the caller flips sttMode, honor it.
  useEffect(() => {
    if (sttMode === "server") setUseServerStt(true);
    else if (sttMode === "browser") setUseServerStt(false);
  }, [sttMode]);

  const audio = useEncounterAudio({
    onPlay: () => {
      conversationRef.current.setStatus("speaking");
    },
    onEnded: () => {
      // Only react if we were actually speaking - audio "ended" events also
      // fire when src is cleared, which happens on interrupt/new turn.
      if (conversationRef.current.status !== "speaking") return;
      const pending = conversationRef.current.pendingAudio;
      if (pending) conversationRef.current.acknowledgeAudio(pending.messageId);
      conversationRef.current.setStatus("idle");
    },
    onError: () => {
      if (conversationRef.current.status !== "speaking") return;
      const pending = conversationRef.current.pendingAudio;
      if (pending) conversationRef.current.acknowledgeAudio(pending.messageId);
      conversationRef.current.setStatus("idle");
    },
  });

  const speech = useSpeechRecognition({
    lang,
    onStart: () => {
      conversationRef.current.setStatus("listening");
    },
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
      if (conversationRef.current.status === "listening") {
        conversationRef.current.setStatus("idle");
      }
    },
    onError: (message) => {
      // Auto-fallback: if browser STT errors out for *network* reasons and the
      // caller is in `auto` mode, transparently retry the same turn via the
      // server transport instead of showing the user a banner.
      if (
        sttMode === "auto" &&
        !useServerSttRef.current &&
        message.toLowerCase().includes("network")
      ) {
        setUseServerStt(true);
        useServerSttRef.current = true;
        conversationRef.current.setError(null);
        // Kick off the server path immediately so the user just sees a brief
        // "Listening..." beat and keeps talking.
        void recorder.start();
        return;
      }
      conversationRef.current.setError(message);
    },
  });

  const recorder = useMediaRecorder({
    onStart: () => {
      conversationRef.current.setStatus("listening");
    },
    onStop: async (blob) => {
      // Brief "transcribing" beat while the audio uploads + Scribe runs;
      // sendMessage() below flips us to "thinking" the moment we hand off
      // the transcript to Gemini, so the user only sees one phase per stage.
      conversationRef.current.setStatus("transcribing");
      try {
        const form = new FormData();
        form.append("audio", blob, fileNameForBlob(blob));
        if (lang) form.append("language", isoFromBcp47(lang));
        if (blob.type) form.append("mimeType", blob.type);
        const res = await fetch("/api/voice/stt", { method: "POST", body: form });
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          let detail = "";
          try {
            detail = (JSON.parse(text) as { error?: string }).error ?? "";
          } catch {
            detail = text;
          }
          throw new Error(detail || `Transcription failed (HTTP ${res.status})`);
        }
        const json = (await res.json()) as { text?: string };
        const transcript = (json.text ?? "").trim();
        if (!transcript) {
          conversationRef.current.setError(
            "No speech detected. Try again and speak a little louder.",
          );
          conversationRef.current.setStatus("idle");
          conversationRef.current.clearPartial();
          return;
        }
        // Hand off straight to sendMessage with the transcript we just got.
        // Going through setPartial → commitPartial would race React's render
        // cycle (commitPartial would read a stale empty partial in this
        // microtask) and silently no-op, leaving the user stuck on
        // "Transcribing...".
        conversationRef.current.clearPartial();
        await conversationRef.current.sendMessage(transcript, {
          source: "voice",
          synthesizeSpeech: true,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Transcription failed";
        conversationRef.current.setError(msg);
        conversationRef.current.setStatus("idle");
      }
    },
    onError: (message) => {
      conversationRef.current.setError(message);
      if (
        conversationRef.current.status === "listening" ||
        conversationRef.current.status === "transcribing"
      ) {
        conversationRef.current.setStatus("idle");
      }
    },
  });

  const startListening = useCallback(() => {
    audio.stop();
    conversationRef.current.clearPartial();
    conversationRef.current.setError(null);

    if (useServerSttRef.current) {
      if (!recorder.isSupported) {
        conversationRef.current.setError(
          "Audio recording is not supported in this browser.",
        );
        return;
      }
      conversationRef.current.setStatus("listening");
      void recorder.start();
      return;
    }

    if (!speech.isSupported) {
      // Fall through to server STT if the browser doesn't even ship Web Speech.
      if (recorder.isSupported && sttMode !== "browser") {
        setUseServerStt(true);
        useServerSttRef.current = true;
        conversationRef.current.setStatus("listening");
        void recorder.start();
        return;
      }
      conversationRef.current.setError(
        "Voice input isn't supported in this browser. Use the Text tab or try Chrome.",
      );
      return;
    }
    conversationRef.current.setStatus("listening");
    speech.start();
  }, [audio, recorder, speech, sttMode]);

  const stopListening = useCallback(() => {
    if (useServerSttRef.current) recorder.stop();
    else speech.stop();
  }, [recorder, speech]);

  const interrupt = useCallback(() => {
    if (useServerSttRef.current) recorder.abort();
    else speech.abort();
    audio.stop();
    conversationRef.current.interrupt();
    conversationRef.current.clearPartial();
  }, [audio, recorder, speech]);

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

  const isSupported =
    sttMode === "server"
      ? recorder.isSupported
      : sttMode === "browser"
      ? speech.isSupported
      : speech.isSupported || recorder.isSupported;

  return {
    audioRef: audio.audioRef,
    isSupported,
    isListening: useServerStt ? recorder.isRecording : speech.isListening,
    isSpeaking: audio.isPlaying,
    activeSttTransport: useServerStt ? "server" : "browser",
    startListening,
    stopListening,
    interrupt,
  };
}

function fileNameForBlob(blob: Blob): string {
  const t = blob.type.toLowerCase();
  if (t.includes("webm")) return "turn.webm";
  if (t.includes("ogg")) return "turn.ogg";
  if (t.includes("mp4") || t.includes("m4a")) return "turn.m4a";
  if (t.includes("wav")) return "turn.wav";
  if (t.includes("mpeg") || t.includes("mp3")) return "turn.mp3";
  return "turn.bin";
}

function isoFromBcp47(tag: string): string {
  return tag.split("-")[0] ?? tag;
}
