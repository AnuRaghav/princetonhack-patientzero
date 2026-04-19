/**
 * Browser-only: decode a data URL to a Blob URL so `<audio>` can play reliably
 * (very long `data:audio/...;base64,...` strings often fail when set directly on `src`).
 */
export function attachDataUrlToAudioElement(
  dataUrl: string,
  audio: HTMLAudioElement,
): string | null {
  try {
    const match = /^data:([^;]+);base64,([\s\S]+)$/.exec(dataUrl);
    if (match?.[1] && match[2]) {
      const mime = match[1];
      const binary = atob(match[2]);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: mime });
      const objectUrl = URL.createObjectURL(blob);
      audio.src = objectUrl;
      audio.load();
      void audio.play().catch(() => {
        /* autoplay policy */
      });
      return objectUrl;
    }
  } catch {
    /* fallback */
  }

  audio.src = dataUrl;
  audio.load();
  void audio.play().catch(() => {});
  return null;
}
