"use client";

const REGIONS: { id: string; label: string }[] = [
  { id: "head", label: "Head / general appearance" },
  { id: "chest", label: "Chest / lungs" },
  { id: "abdomen", label: "Abdomen" },
  { id: "rlq", label: "Right lower quadrant" },
];

type Props = {
  highlight?: string | null;
};

export function BodyLegend({ highlight }: Props) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white/90 backdrop-blur">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/60">Regions</div>
      <ul className="space-y-1">
        {REGIONS.map((r) => (
          <li
            key={r.id}
            className={highlight === r.id ? "font-semibold text-sky-300" : "text-white/80"}
          >
            {r.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
