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
    rec.continuous = false;
    rec.maxAlternatives = 1;

    rec.onstart = () => {
      setIsListening(true);
    };

    rec.onresult = (ev) => {
      let interimText = "";
      let finalText = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const result = ev.results[i];
        if (!result) continue;
        const piece = result[0]?.transcript ?? "";
        if (result.isFinal) finalText += piece;
        else interimText += piece;
      }
      const combined = (finalText + interimText).trim();
      const isFinalChunk = finalText.length > 0 && interimText.length === 0;
      if (combined) {
        callbacksRef.current.onTranscript?.(combined, { isFinal: isFinalChunk });
      }
      if (finalText.trim()) {
        callbacksRef.current.onFinal?.(finalText.trim());
      }
    };

    rec.onerror = (ev) => {
      const error = (ev as unknown as { error?: string }).error ?? "speech-error";
      callbacksRef.current.onError?.(`Speech recognition error: ${error}`);
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
