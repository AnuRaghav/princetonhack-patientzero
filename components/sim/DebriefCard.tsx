"use client";

type Props = {
  checklistScore: number;
  empathyScore: number;
  diagnosticScore: number;
  summary: string;
  misses: string[];
  strengths: string[];
};

export function DebriefCard({ checklistScore, empathyScore, diagnosticScore, summary, misses, strengths }: Props) {
  return (
    <div className="space-y-6 rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur">
      <div>
        <h1 className="text-2xl font-bold text-white">Session debrief</h1>
        <p className="mt-2 text-sm text-white/70">Scores blend deterministic checklist coverage with lightweight heuristics.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <ScoreTile label="Checklist" value={checklistScore} />
        <ScoreTile label="Empathy" value={empathyScore} />
        <ScoreTile label="Diagnostic reasoning" value={diagnosticScore} />
      </div>
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-white/60">Summary</h2>
        <p className="mt-2 text-base leading-relaxed text-white/90">{summary}</p>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-rose-300/90">Misses</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-white/80">
            {misses.length ? misses.map((m) => <li key={m}>{m}</li>) : <li>None flagged.</li>}
          </ul>
        </div>
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-emerald-300/90">Strengths</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-white/80">
            {strengths.length ? strengths.map((s) => <li key={s}>{s}</li>) : <li>None highlighted.</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}

function ScoreTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
      <div className="text-xs uppercase tracking-wide text-white/50">{label}</div>
      <div className="mt-2 text-3xl font-bold text-white">{value}</div>
    </div>
  );
}
