"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type MediaRecorderCallbacks = {
  onStart?: () => void;
  /** Fires once a recording is finalized. The blob's `type` includes the codec. */
  onStop?: (blob: Blob) => void;
  onError?: (message: string) => void;
};

export type UseMediaRecorderReturn = {
  isRecording: boolean;
  /** Capability flag — true when `navigator.mediaDevices` and `MediaRecorder` exist. */
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

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      const code = (err as { name?: string })?.name ?? "";
      const msg =
        code === "NotAllowedError" || code === "SecurityError"
          ? "Microphone permission was denied. Allow access to use voice input."
          : code === "NotFoundError"
          ? "No microphone detected. Plug one in and try again."
          : err instanceof Error
          ? err.message
          : "Could not open microphone";
      callbacksRef.current?.onError?.(msg);
      return;
    }
    streamRef.current = stream;

    const mimeType = pickSupportedMime();
    let rec: MediaRecorder;
    try {
      rec = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    } catch (err) {
      releaseStream();
      callbacksRef.current?.onError?.(
        err instanceof Error ? err.message : "Could not create recorder",
      );
      return;
    }
    recorderRef.current = rec;

    rec.addEventListener("dataavailable", (ev) => {
      if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data);
    });
    rec.addEventListener("error", (ev) => {
      const err = (ev as unknown as { error?: { message?: string } }).error;
      callbacksRef.current?.onError?.(err?.message ?? "Recorder error");
    });
    rec.addEventListener("stop", () => {
      const wasAborted = abortedRef.current;
      const blobType = rec.mimeType || mimeType || "audio/webm";
      const blob = new Blob(chunksRef.current, { type: blobType });
      chunksRef.current = [];
      recorderRef.current = null;
      releaseStream();
      setIsRecording(false);
      if (wasAborted) return;
      if (blob.size === 0) {
        callbacksRef.current?.onError?.("No audio captured. Please try again.");
        return;
      }
      callbacksRef.current?.onStop?.(blob);
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
