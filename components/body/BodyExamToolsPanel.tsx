"use client";

import { Icon } from "@/components/ui";

export type VitalExamToolId = "stethoscope" | "bp";

type Props = {
  /** Fired when the learner runs a vital-sign action (transcript lines are appended by the host). */
  onPerform: (tool: VitalExamToolId) => void;
};

/**
 * Compact actions for stethoscope / BP - paired transcript lines are injected by {@link CuratedCaseShell}.
 */
export function BodyExamToolsPanel({ onPerform }: Props) {
  return (
    <div className="pointer-events-auto w-[min(220px,min(92vw,260px))] rounded-[var(--radius-md)] border border-white/[0.08] bg-white/[0.04] p-3 text-[12px] text-white backdrop-blur-md">
      <div className="mb-2 text-[11px] font-semibold text-white">Vital signs</div>
      <p className="mb-2.5 text-[10px] leading-snug text-white/45">
        Record to transcript - results appear as structured vitals.
      </p>
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => onPerform("stethoscope")}
          className="flex w-full items-start gap-2 rounded-[var(--radius-sm)] border border-white/12 bg-white/[0.03] px-2.5 py-2 text-left smooth hover:bg-white/[0.07] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/35"
        >
          <Icon.Stethoscope size={15} className="mt-0.5 shrink-0 text-sky-300" />
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-semibold leading-tight">Stethoscope</span>
            <span className="mt-0.5 block text-[9px] leading-tight text-white/50">
              Heart rate & sounds
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => onPerform("bp")}
          className="flex w-full items-start gap-2 rounded-[var(--radius-sm)] border border-white/12 bg-white/[0.03] px-2.5 py-2 text-left smooth hover:bg-white/[0.07] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/35"
        >
          <Icon.Activity size={15} className="mt-0.5 shrink-0 text-rose-300" />
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-semibold leading-tight">BP cuff</span>
            <span className="mt-0.5 block text-[9px] leading-tight text-white/50">
              Sphygmomanometer
            </span>
          </span>
        </button>
      </div>
    </div>
  );
}
