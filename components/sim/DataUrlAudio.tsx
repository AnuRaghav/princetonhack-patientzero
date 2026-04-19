"use client";

import { useEffect, useRef } from "react";

import { attachDataUrlToAudioElement } from "@/lib/client/audioFromDataUrl";

type Props = {
  src: string;
  className?: string;
};

/** Plays TTS data URLs or remote URLs; revokes intermediate blob URLs on change/unmount. */
export function DataUrlAudio({ src, className }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blobRef = useRef<string | null>(null);

  useEffect(() => {
    const el = audioRef.current;
    if (!el || !src) return;

    if (blobRef.current) {
      URL.revokeObjectURL(blobRef.current);
      blobRef.current = null;
    }

    if (src.startsWith("data:")) {
      blobRef.current = attachDataUrlToAudioElement(src, el);
    } else {
      el.src = src;
      el.load();
      void el.play().catch(() => {});
    }

    return () => {
      if (blobRef.current) {
        URL.revokeObjectURL(blobRef.current);
        blobRef.current = null;
      }
    };
  }, [src]);

  return (
    <audio
      ref={audioRef}
      controls
      className={className}
      onError={(e) => {
        console.warn("Audio element error", e.currentTarget.error);
      }}
    />
  );
}
