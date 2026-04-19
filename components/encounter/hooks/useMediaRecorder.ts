"use client";

import type { MutableRefObject } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

export type MediaRecorderCallbacks = {
  onStart?: () => void;
  /** Fires once a recording is finalized. The blob's `type` includes the codec. */
  onStop?: (blob: Blob) => void;
  onError?: (message: string) => void;
};

export type UseMediaRecorderReturn = {
  isRecording: boolean;
  /** Capability flag - true when `navigator.mediaDevices` and `MediaRecorder` exist. */
  isSupported: boolean;
  start: () => Promise<void>;
  stop: () => void;
  /** Throw away in-flight recording without firing `onStop`. */
  abort: () => void;
};

/**
 * Wraps `MediaRecorder` for short voice turns. Picks the first MIME type the
 * browser supports out of a small preferred list, and finalizes a single Blob
 * via the `onStop` callback.
 */
export function useMediaRecorder(
  callbacks?: MediaRecorderCallbacks,
): UseMediaRecorderReturn {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const abortedRef = useRef(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  const callbacksRef = useRef(callbacks);
  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  useEffect(() => {
    // Capability detection deferred to client; gracefully no-ops on SSR.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsSupported(
      typeof window !== "undefined" &&
        typeof navigator !== "undefined" &&
        Boolean(navigator.mediaDevices?.getUserMedia) &&
        typeof window.MediaRecorder !== "undefined",
    );
  }, []);

  const releaseStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => {
      try {
        t.stop();
      } catch {
        /* ignore */
      }
    });
    streamRef.current = null;
  }, []);

  const start = useCallback(async () => {
    if (!isSupported) {
      callbacksRef.current?.onError?.("Audio recording is not supported in this browser.");
      return;
    }
    if (recorderRef.current) {
      // already recording
      return;
    }
    abortedRef.current = false;
    chunksRef.current = [];

    const stream = await acquireMicrophone(callbacksRef.current?.onError);
    if (!stream) return;
    streamRef.current = stream;

    const mimeType = pickSupportedMime();
    const rec = createRecorder(stream, mimeType, callbacksRef.current?.onError);
    if (!rec) {
      releaseStream();
      return;
    }
    recorderRef.current = rec;

    attachRecorderListeners(rec, mimeType, {
      chunksRef,
      abortedRef,
      callbacksRef,
      releaseStream,
      setIsRecording,
      recorderRef,
    });

    try {
      rec.start();
      setIsRecording(true);
      callbacksRef.current?.onStart?.();
    } catch (err) {
      releaseStream();
      recorderRef.current = null;
      callbacksRef.current?.onError?.(
        err instanceof Error ? err.message : "Could not start recording",
      );
    }
  }, [isSupported, releaseStream]);

  const stop = useCallback(() => {
    const rec = recorderRef.current;
    if (!rec) return;
    if (rec.state !== "inactive") {
      try {
        rec.stop();
      } catch {
        /* fall through to cleanup via stop event */
      }
    }
  }, []);

  const abort = useCallback(() => {
    abortedRef.current = true;
    stop();
  }, [stop]);

  useEffect(() => {
    return () => {
      abortedRef.current = true;
      try {
        recorderRef.current?.stop();
      } catch {
        /* ignore */
      }
      recorderRef.current = null;
      releaseStream();
    };
  }, [releaseStream]);

  return { isRecording, isSupported, start, stop, abort };
}

const PREFERRED_MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4;codecs=mp4a.40.2",
  "audio/mp4",
  "audio/ogg;codecs=opus",
];

function pickSupportedMime(): string | undefined {
  if (typeof window === "undefined" || typeof window.MediaRecorder === "undefined") {
    return undefined;
  }
  for (const candidate of PREFERRED_MIME_TYPES) {
    try {
      if (MediaRecorder.isTypeSupported(candidate)) return candidate;
    } catch {
      /* ignore */
    }
  }
  return undefined;
}

function describeGetUserMediaError(err: unknown): string {
  const code = (err as { name?: string })?.name ?? "";
  if (code === "NotAllowedError" || code === "SecurityError") {
    return "Microphone permission was denied. Allow access to use voice input.";
  }
  if (code === "NotFoundError") {
    return "No microphone detected. Plug one in and try again.";
  }
  if (err instanceof Error) return err.message;
  return "Could not open microphone";
}

async function acquireMicrophone(
  onError: ((message: string) => void) | undefined,
): Promise<MediaStream | null> {
  try {
    return await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (err) {
    onError?.(describeGetUserMediaError(err));
    return null;
  }
}

function createRecorder(
  stream: MediaStream,
  mimeType: string | undefined,
  onError: ((message: string) => void) | undefined,
): MediaRecorder | null {
  try {
    return mimeType
      ? new MediaRecorder(stream, { mimeType })
      : new MediaRecorder(stream);
  } catch (err) {
    onError?.(err instanceof Error ? err.message : "Could not create recorder");
    return null;
  }
}

type RecorderRefs = {
  chunksRef: MutableRefObject<Blob[]>;
  abortedRef: MutableRefObject<boolean>;
  callbacksRef: MutableRefObject<MediaRecorderCallbacks | undefined>;
  recorderRef: MutableRefObject<MediaRecorder | null>;
  releaseStream: () => void;
  setIsRecording: (v: boolean) => void;
};

function attachRecorderListeners(
  rec: MediaRecorder,
  mimeType: string | undefined,
  refs: RecorderRefs,
): void {
  rec.addEventListener("dataavailable", (ev) => {
    if (ev.data && ev.data.size > 0) refs.chunksRef.current.push(ev.data);
  });
  rec.addEventListener("error", (ev) => {
    const err = (ev as unknown as { error?: { message?: string } }).error;
    refs.callbacksRef.current?.onError?.(err?.message ?? "Recorder error");
  });
  rec.addEventListener("stop", () => {
    const wasAborted = refs.abortedRef.current;
    const blobType = rec.mimeType || mimeType || "audio/webm";
    const blob = new Blob(refs.chunksRef.current, { type: blobType });
    refs.chunksRef.current = [];
    refs.recorderRef.current = null;
    refs.releaseStream();
    refs.setIsRecording(false);
    if (wasAborted) return;
    if (blob.size === 0) {
      refs.callbacksRef.current?.onError?.("No audio captured. Please try again.");
      return;
    }
    refs.callbacksRef.current?.onStop?.(blob);
  });
}
