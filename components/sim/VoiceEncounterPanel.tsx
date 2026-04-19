"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Button, Icon, Surface } from "@/components/ui";
import { attachDataUrlToAudioElement } from "@/lib/client/audioFromDataUrl";

type Turn = { role: "user" | "patient"; text: string };

type Props = {
  /** Synthea patient id — typically `session.case_id` */
  patientId?: string;
  disabled?: boolean;
};

function getSpeechRecognition(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function VoiceEncounterPanel({ patientId, disabled }: Props) {
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [sending, setSending] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [patientLabel, setPatientLabel] = useState<string | null>(null);
  const [lastAudioUrl, setLastAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioObjectUrlRef = useRef<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      if (audioObjectUrlRef.current) {
        URL.revokeObjectURL(audioObjectUrlRef.current);
        audioObjectUrlRef.current = null;
      }
    };
  }, []);

  const sendUtterance = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || sending || disabled) return;

      setSending(true);
      setBanner(null);
      setLastAudioUrl(null);

      const history = turns.flatMap((t) => ({
        role: t.role,
        text: t.text,
      }));

      try {
        const res = await fetch("/api/patient/converse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            patientId,
            transcript: trimmed,
            history,
            synthesizeAudio: true,
            includePatientCase: false,
          }),
        });

        const payload = (await res.json()) as {
          error?: string;
          patient?: { id?: string; firstName?: string; lastName?: string };
          patientId?: string;
          responseText?: string;
          audioUrl?: string | null;
          ttsError?: string;
        };

        if (!res.ok) {
          throw new Error(payload.error ?? "Conversation request failed");
        }

        if (payload.ttsError) {
          setBanner(payload.ttsError);
        }

        const p = payload.patient;
        if (p) {
          const name = `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim();
          setPatientLabel(name || (payload.patientId ? payload.patientId.slice(0, 12) : null));
        }

        setTurns((prev) => [
          ...prev,
          { role: "user", text: trimmed },
          { role: "patient", text: payload.responseText ?? "" },
        ]);
        setInput("");

        const url = payload.audioUrl ?? null;
        setLastAudioUrl(url);
        const audioEl = audioRef.current;
        if (url && audioEl) {
          if (audioObjectUrlRef.current) {
            URL.revokeObjectURL(audioObjectUrlRef.current);
            audioObjectUrlRef.current = null;
          }
          if (url.startsWith("data:")) {
            const blobUrl = attachDataUrlToAudioElement(url, audioEl);
            if (blobUrl) audioObjectUrlRef.current = blobUrl;
          } else {
            audioEl.src = url;
            audioEl.load();
            void audioEl.play().catch(() => {});
          }
        }
      } catch (e) {
        setBanner(e instanceof Error ? e.message : "Request failed");
      } finally {
        setSending(false);
      }
    },
    [disabled, patientId, sending, turns],
  );

  const toggleListen = useCallback(() => {
    const SR = getSpeechRecognition();
    if (!SR) {
      setBanner("Speech recognition is not supported in this browser. Type your message instead.");
      return;
    }

    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    setBanner(null);
    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;

    rec.onresult = (ev: SpeechRecognitionEvent) => {
      let finalText = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const piece = ev.results[i]?.[0]?.transcript ?? "";
        if (ev.results[i]?.isFinal) finalText += piece;
      }
      if (finalText.trim()) setInput((prev) => `${prev ? `${prev.trim()} ` : ""}${finalText.trim()}`);
    };

    rec.onerror = () => {
      setListening(false);
    };

    rec.onend = () => {
      setListening(false);
    };

    recognitionRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      setBanner("Could not start microphone listening.");
      setListening(false);
    }
  }, [listening]);

  return (
    <Surface variant="card" padding="md" radius="lg">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="text-[13px] font-semibold text-[var(--color-ink)]">
          Voice encounter (Gemini + ElevenLabs)
        </div>
        {patientLabel ? (
          <span className="text-[11px] text-[var(--color-ink-muted)]">
            Patient · {patientLabel}
          </span>
        ) : patientId ? (
          <span className="num-mono text-[11px] text-[var(--color-ink-faint)]">{patientId}</span>
        ) : null}
      </div>

      <p className="mb-3 text-[12px] leading-relaxed text-[var(--color-ink-muted)]">
        Uses the browser speech-to-text when available; the server runs Gemini as the patient and ElevenLabs for speech playback. Keys stay on the server.
      </p>

      {banner ? (
        <div className="mb-3 rounded-[var(--radius-md)] border border-[rgba(239,68,68,0.2)] bg-[var(--color-danger-soft)] px-3 py-2 text-[12px] text-[#b91c1c]">
          {banner}
        </div>
      ) : null}

      <div className="mb-3 max-h-40 space-y-2 overflow-y-auto rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface-2)] p-2 text-[12px]">
        {turns.length === 0 ? (
          <div className="text-[var(--color-ink-muted)]">No turns yet.</div>
        ) : (
          turns.map((t, i) => (
            <div
              key={`${i}-${t.role}`}
              className={
                t.role === "user"
                  ? "text-[var(--color-ink)]"
                  : "border-l-2 border-[var(--color-accent)] pl-2 text-[var(--color-ink-soft)]"
              }
            >
              <span className="font-semibold">{t.role === "user" ? "You" : "Patient"}:</span>{" "}
              {t.text}
            </div>
          ))
        )}
      </div>

      <textarea
        className="mb-2 h-20 w-full resize-none rounded-[var(--radius-md)] border border-[var(--color-line-strong)] bg-[var(--color-surface)] p-3 text-[13px] text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)] outline-none smooth focus:border-[var(--color-ink)]"
        placeholder="Speak (mic) or type what you want to ask the patient…"
        value={input}
        disabled={disabled || sending}
        onChange={(e) => setInput(e.target.value)}
      />

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="ghost"
          disabled={disabled || sending}
          onClick={() => toggleListen()}
          leadingIcon={<Icon.Mic size={14} />}
        >
          {listening ? "Stop mic" : "Speak"}
        </Button>
        <Button
          size="sm"
          loading={sending}
          disabled={disabled || !input.trim()}
          onClick={() => void sendUtterance(input)}
          trailingIcon={<Icon.Send size={12} />}
        >
          Send to patient
        </Button>
      </div>

      <audio
        ref={audioRef}
        className="mt-3 h-9 w-full"
        controls
        onError={() =>
          setBanner((prev) =>
            prev ??
            "Audio failed to load. If you see text but no sound, press play on the control above.",
          )
        }
      />
      {lastAudioUrl ? (
        <p className="mt-1 text-[11px] text-[var(--color-ink-faint)]">
          Latest reply synthesized as audio above.
        </p>
      ) : null}
    </Surface>
  );
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognition;
}

interface SpeechRecognition extends EventTarget {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((ev: Event) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
}
