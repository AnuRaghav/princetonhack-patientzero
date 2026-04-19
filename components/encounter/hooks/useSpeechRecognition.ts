"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Minimal local typings for the Web Speech API. The platform `lib.dom`
 * does not always include these (Safari/Firefox) so we re-declare the
 * exact subset we use.
 */
interface MinimalSpeechRecognition extends EventTarget {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((ev: SpeechRecognitionEventLike) => void) | null;
  onerror: ((ev: Event) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

interface SpeechRecognitionConstructor {
  new (): MinimalSpeechRecognition;
}

interface SpeechRecognitionEventLike extends Event {
  readonly resultIndex: number;
  readonly results: ArrayLike<{
    isFinal: boolean;
    [index: number]: { transcript: string };
  }>;
}

function getSpeechRecognitionCtor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export type SpeechRecognitionCallbacks = {
  /** Called when the browser confirms the mic is open and recognition has started. */
  onStart?: () => void;
  /** Called on every result (interim + final). `isFinal` reflects the most recent chunk. */
  onTranscript?: (text: string, meta: { isFinal: boolean }) => void;
  /** Called only when a final result has been delivered. */
  onFinal?: (text: string) => void;
  /** Called when recognition stops naturally (timeout, mic released). */
  onEnd?: () => void;
  onError?: (message: string) => void;
};

export type UseSpeechRecognitionArgs = {
  lang?: string;
} & SpeechRecognitionCallbacks;

export type UseSpeechRecognitionReturn = {
  isSupported: boolean;
  isListening: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

/**
 * Thin React wrapper around the browser SpeechRecognition API. Designed for
 * push-to-talk: `continuous = false`, `interimResults = true`. Capability-
 * detected so callers can render a graceful fallback when unsupported.
 */
export function useSpeechRecognition(
  args: UseSpeechRecognitionArgs = {},
): UseSpeechRecognitionReturn {
  const { lang = "en-US" } = args;
  const recognitionRef = useRef<MinimalSpeechRecognition | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  const callbacksRef = useRef<SpeechRecognitionCallbacks>(args);
  useEffect(() => {
    callbacksRef.current = args;
  }, [args]);

  useEffect(() => {
    // Capability detection is intentionally deferred until after mount so the
    // server-rendered HTML matches the client (which can't access `window`).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsSupported(getSpeechRecognitionCtor() !== null);
  }, []);

  const stop = useCallback(() => {
    try {
      recognitionRef.current?.stop();
    } catch {
      /* ignore */
    }
  }, []);

  const abort = useCallback(() => {
    try {
      recognitionRef.current?.abort();
    } catch {
      /* ignore */
    }
    setIsListening(false);
  }, []);

  const start = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      callbacksRef.current.onError?.("Speech recognition is not supported in this browser.");
      return;
    }
    if (recognitionRef.current) {
      // Clean up any prior instance before starting a new one.
      try {
        recognitionRef.current.abort();
      } catch {
        /* ignore */
      }
      recognitionRef.current = null;
    }

    const rec = new Ctor();
    rec.lang = lang;
    rec.interimResults = true;
    // Keep the mic open across short pauses so users can phrase questions
    // naturally. We explicitly stop it ourselves after a final result lands.
    rec.continuous = true;
    rec.maxAlternatives = 1;

    rec.onstart = () => {
      setIsListening(true);
      callbacksRef.current.onStart?.();
    };

    let finalAccum = "";
    rec.onresult = (ev) => {
      let interimText = "";
      let newFinalText = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const result = ev.results[i];
        if (!result) continue;
        const piece = result[0]?.transcript ?? "";
        if (result.isFinal) newFinalText += piece;
        else interimText += piece;
      }
      if (newFinalText) finalAccum += (finalAccum ? " " : "") + newFinalText.trim();
      const combined = `${finalAccum}${interimText ? ` ${interimText}` : ""}`.trim();
      if (combined) {
        callbacksRef.current.onTranscript?.(combined, {
          isFinal: newFinalText.length > 0 && interimText.length === 0,
        });
      }
      // When a final segment arrives and the speaker has stopped (no interim
      // tail), commit and close the mic. This gives a "press once, speak,
      // pause, send" rhythm without forcing the user to tap Stop.
      if (newFinalText && !interimText) {
        const toCommit = finalAccum.trim();
        if (toCommit) {
          callbacksRef.current.onFinal?.(toCommit);
          finalAccum = "";
          try {
            rec.stop();
          } catch {
            /* ignore */
          }
        }
      }
    };

    rec.onerror = (ev) => {
      const error = (ev as unknown as { error?: string }).error ?? "speech-error";
      // `no-speech` and `aborted` are routine — surface them as info-level
      // hints rather than blocking errors so the UI doesn't keep showing
      // the user a scary banner every time they pause too long.
      if (error === "no-speech" || error === "aborted") {
        callbacksRef.current.onEnd?.();
        return;
      }
      callbacksRef.current.onError?.(humanizeSpeechError(error));
    };

    rec.onend = () => {
      setIsListening(false);
      callbacksRef.current.onEnd?.();
    };

    recognitionRef.current = rec;
    try {
      rec.start();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not start microphone";
      callbacksRef.current.onError?.(message);
      setIsListening(false);
    }
  }, [lang]);

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.abort();
      } catch {
        /* ignore */
      }
      recognitionRef.current = null;
    };
  }, []);

  return { isSupported, isListening, start, stop, abort };
}

function humanizeSpeechError(code: string): string {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
      return "Microphone permission was denied. Allow access to use voice input.";
    case "audio-capture":
      return "No microphone detected. Plug one in and try again.";
    case "network":
      return "Speech recognition needs a network connection.";
    case "language-not-supported":
      return "This language isn't supported by your browser's speech recognition.";
    default:
      return `Speech recognition error: ${code}`;
  }
}
