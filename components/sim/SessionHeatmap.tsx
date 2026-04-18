"use client";

import { useMemo } from "react";

import { cn } from "@/components/ui";

export type HeatmapBucket = { date: string; count: number };

type SessionHeatmapProps = {
  buckets: HeatmapBucket[];
  className?: string;
  /** Caps the color scale so a single huge day doesn't wash everything out. */
  intensityCap?: number;
};

type Cell = HeatmapBucket | null;

/**
 * GitHub-style contribution heatmap. 7 rows (Sun→Sat) × N week columns.
 * Renders as a responsive CSS grid that fills the parent width — cells stay square
 * so the whole thing scales nicely from narrow sidebars to wide hero panels.
 */
export function SessionHeatmap({
  buckets,
  className,
  intensityCap = 5,
}: SessionHeatmapProps) {
  const { columns, monthLabels } = useMemo(() => {
    if (buckets.length === 0) {
      return {
        columns: [] as Cell[][],
        monthLabels: [] as { col: number; label: string }[],
      };
    }

    const first = new Date(`${buckets[0].date}T00:00:00Z`);
    const firstWeekday = first.getUTCDay();
    const padded: Cell[] = [
      ...Array.from<Cell>({ length: firstWeekday }).fill(null),
      ...buckets,
    ];
    while (padded.length % 7 !== 0) padded.push(null);

    const cols: Cell[][] = [];
    for (let i = 0; i < padded.length; i += 7) {
      cols.push(padded.slice(i, i + 7));
    }

    const labels: { col: number; label: string }[] = [];
    let lastMonth = -1;
    cols.forEach((week, idx) => {
      const firstReal = week.find((c): c is HeatmapBucket => c !== null);
      if (!firstReal) return;
      const m = new Date(`${firstReal.date}T00:00:00Z`).getUTCMonth();
      if (m === lastMonth) return;
      // Avoid stamping a month label right next to the previous one (collision guard)
      const last = labels[labels.length - 1];
      if (last && idx - last.col < 3) return;
      labels.push({
        col: idx,
        label: new Date(`${firstReal.date}T00:00:00Z`).toLocaleString("en", {
          month: "short",
        }),
      });
      lastMonth = m;
    });

    return { columns: cols, monthLabels: labels };
  }, [buckets]);

  const ncols = columns.length;

  const intensity = (count: number): number => {
    if (count <= 0) return 0;
    const lvl = Math.ceil((count / intensityCap) * 4);
    return Math.min(4, Math.max(1, lvl));
  };

  const cellClass = (count: number) => {
    switch (intensity(count)) {
      case 0:
        return "bg-white/[0.05] ring-1 ring-inset ring-white/[0.04]";
      case 1:
        return "bg-[rgba(255,138,61,0.28)]";
      case 2:
        return "bg-[rgba(255,138,61,0.55)]";
      case 3:
        return "bg-[rgba(255,138,61,0.80)]";
      default:
        return "bg-[#34d27c]";
    }
  };

  const gridStyle = {
    gridTemplateColumns: `repeat(${ncols || 1}, minmax(0, 1fr))`,
  } as const;

  return (
    <div className={cn("flex w-full min-w-0 flex-col gap-1.5", className)}>
      {/* month label strip — uses identical column grid so labels sit above their week */}
      {ncols > 0 ? (
        <div
          className="grid h-3 w-full text-[9px] uppercase tracking-[0.16em] text-white/35"
          style={gridStyle}
        >
          {Array.from({ length: ncols }).map((_, ci) => {
            const lbl = monthLabels.find((m) => m.col === ci);
            return (
              <span
                key={ci}
                className="overflow-hidden whitespace-nowrap leading-none"
              >
                {lbl?.label ?? ""}
              </span>
            );
          })}
        </div>
      ) : null}

      {/* weekday rail + heatmap grid */}
      <div className="flex w-full min-w-0 items-stretch gap-2">
        <div className="flex flex-col justify-between py-[1px] text-[9px] uppercase tracking-[0.16em] text-white/35">
          <span>Mon</span>
          <span>Wed</span>
          <span>Fri</span>
        </div>

        <div
          className="grid w-full min-w-0 gap-[3px]"
          style={gridStyle}
        >
          {columns.map((week, ci) => (
            <div key={ci} className="grid grid-rows-7 gap-[3px]">
              {week.map((cell, ri) => {
                if (!cell) {
                  return <div key={ri} className="aspect-square w-full" />;
                }
                const label = `${cell.count} session${cell.count === 1 ? "" : "s"} on ${cell.date}`;
                return (
                  <div
                    key={ri}
                    title={label}
                    aria-label={label}
                    className={cn(
                      "aspect-square w-full rounded-[2px] smooth hover:ring-1 hover:ring-white/40",
                      cellClass(cell.count),
                    )}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* legend */}
      <div className="mt-1 flex items-center justify-between gap-2 text-[9px] uppercase tracking-[0.16em] text-white/35">
        <span>last {Math.max(1, Math.round(buckets.length / 7))} weeks</span>
        <div className="flex items-center gap-1.5">
          <span>less</span>
          <span className="h-[10px] w-[10px] rounded-[2px] bg-white/[0.05] ring-1 ring-inset ring-white/[0.04]" />
          <span className="h-[10px] w-[10px] rounded-[2px] bg-[rgba(255,138,61,0.28)]" />
          <span className="h-[10px] w-[10px] rounded-[2px] bg-[rgba(255,138,61,0.55)]" />
          <span className="h-[10px] w-[10px] rounded-[2px] bg-[rgba(255,138,61,0.80)]" />
          <span className="h-[10px] w-[10px] rounded-[2px] bg-[#34d27c]" />
          <span>more</span>
        </div>
      </div>
    </div>
  );
}
