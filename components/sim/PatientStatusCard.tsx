"use client";

type Props = {
  painLevel: number;
  emotionalState: string;
};

export function PatientStatusCard({ painLevel, emotionalState }: Props) {
  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/80 to-slate-950/80 p-4 backdrop-blur">
      <div className="text-sm font-semibold text-white">Patient status</div>
      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <div>
          <div className="text-xs uppercase tracking-wide text-white/50">Pain (0–10)</div>
          <div className="text-2xl font-bold text-sky-300">{painLevel}</div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-white/50">Affect</div>
          <div className="text-lg font-semibold capitalize text-white">{emotionalState}</div>
        </div>
      </div>
    </div>
  );
}
