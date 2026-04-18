"use client";

import { cn } from "./cn";

type Item<T extends string> = {
  value: T;
  label: string;
  icon?: React.ReactNode;
};

type Props<T extends string> = {
  value: T;
  items: ReadonlyArray<Item<T>>;
  onChange: (value: T) => void;
  className?: string;
  onDark?: boolean;
};

export function Segmented<T extends string>({
  value,
  items,
  onChange,
  className,
  onDark,
}: Props<T>) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-full p-1",
        onDark
          ? "bg-white/[0.06] border border-white/[0.08]"
          : "bg-[var(--color-surface-2)] border border-[var(--color-line)]",
        className,
      )}
    >
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onChange(item.value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium smooth",
              active
                ? onDark
                  ? "bg-white text-[var(--color-ink)]"
                  : "bg-[var(--color-ink)] text-white"
                : onDark
                ? "text-white/70 hover:text-white hover:bg-white/[0.05]"
                : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-black/[0.03]",
            )}
          >
            {item.icon}
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
