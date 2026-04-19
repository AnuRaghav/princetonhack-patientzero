"use client";

type Reveal = {
  key: string;
  kind: "observation" | "diagnosis" | "other";
  text: string;
};

function labelFor(kind: Reveal["kind"]): string {
  switch (kind) {
    case "diagnosis":
      return "Recorded diagnosis (session)";
    case "observation":
      return "Clinical detail unlocked";
    default:
      return "Detail unlocked";
  }
}

export function RevealNudge({ reveal }: { reveal: Reveal | null }) {
  if (!reveal) return null;

  return (
    <output
      key={reveal.key}
      aria-live="polite"
      className="reveal-nudge-enter block rounded-[var(--radius-md)] border border-[rgba(52,210,124,0.35)] bg-[rgba(52,210,124,0.08)] px-3 py-2"
    >
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-accent-strong)]">
        {labelFor(reveal.kind)}
      </div>
      <div className="mt-1 text-[12.5px] leading-snug text-[var(--color-ink-soft)]">{reveal.text}</div>
    </output>
  );
}
