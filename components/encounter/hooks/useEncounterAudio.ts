"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { attachDataUrlToAudioElement } from "@/lib/client/audioFromDataUrl";

export type EncounterAudioCallbacks = {
  onPlay?: () => void;
  onEnded?: () => void;
  onError?: (message: string) => void;
};

export type UseEncounterAudioReturn = {
  /** Headless audio element ref - keep mounted in the component tree. */
  audioRef: React.RefObject<HTMLAudioElement | null>;
  isPlaying: boolean;
  /** Begin playback of an arbitrary audio URL (data: or http). */
  play: (url: string) => Promise<void>;
  /** Pause and clear the current source. */
  stop: () => void;
};

/**
 * Lightweight wrapper around a single, persistent `HTMLAudioElement`. Handles:
 *
 * - Decoding `data:audio/*;base64,...` URLs into Blob URLs (the `<audio>` element
 *   chokes on very long data URLs in many browsers).
 * - Revoking the prior Blob URL on every change and on unmount.
 * - Surface lifecycle events via callbacks so the orchestrator can update status.
 */
export function useEncounterAudio(
  callbacks?: EncounterAudioCallbacks,
): UseEncounterAudioReturn {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const callbacksRef = useRef(callbacks);
  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  const releaseBlob = useCallback(() => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    const el = audioRef.current;
    if (el) {
      try {
        if (!el.paused) el.pause();
        // Only clear `src` if one is currently set - otherwise `load()` on an
        // empty element triggers a spurious `error` event that callers (e.g.
        // status state machines) misinterpret as a playback failure.
        if (el.currentSrc || el.getAttribute("src")) {
          el.removeAttribute("src");
          el.load();
        }
      } catch {
        /* ignore */
      }
    }
    releaseBlob();
    setIsPlaying(false);
  }, [releaseBlob]);

  const play = useCallback(
    async (url: string) => {
      const el = audioRef.current;
      if (!el || !url) return;

      releaseBlob();

      if (url.startsWith("data:")) {
        const blobUrl = attachDataUrlToAudioElement(url, el);
        if (blobUrl) blobUrlRef.current = blobUrl;
      } else {
        el.src = url;
        el.load();
        try {
          await el.play();
        } catch {
          /* autoplay rejection is surfaced via the `error` event */
        }
      }
    },
    [releaseBlob],
  );

  // Bind/unbind audio element listeners exactly once.
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onPlaying = () => {
      setIsPlaying(true);
      callbacksRef.current?.onPlay?.();
    };
    const onEnded = () => {
      setIsPlaying(false);
      callbacksRef.current?.onEnded?.();
    };
    const onPause = () => {
      setIsPlaying(false);
    };
    const onError = () => {
      setIsPlaying(false);
      callbacksRef.current?.onError?.("Audio playback failed");
    };
    el.addEventListener("playing", onPlaying);
    el.addEventListener("ended", onEnded);
    el.addEventListener("pause", onPause);
    el.addEventListener("error", onError);
    return () => {
      el.removeEventListener("playing", onPlaying);
      el.removeEventListener("ended", onEnded);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("error", onError);
    };
  }, []);

  // Cleanup blob URL on unmount.
  useEffect(() => {
    return () => {
      releaseBlob();
    };
  }, [releaseBlob]);

  return { audioRef, isPlaying, play, stop };
}
