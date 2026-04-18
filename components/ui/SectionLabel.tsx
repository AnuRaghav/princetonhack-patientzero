import type { ReactNode } from "react";

import { cn } from "./cn";

type Props = {
  children: ReactNode;
  className?: string;
  trailing?: ReactNode;
  size?: "sm" | "md" | "lg";
};

export function SectionLabel({ children, className, trailing, size = "sm" }: Props) {
  const sizeClass =
    size === "lg"
      ? "text-[15px] font-semibold tracking-tight"
      : size === "md"
      ? "text-sm font-semibold tracking-tight"
      : "text-[13px] font-semibold tracking-tight";

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 text-[var(--color-ink)]",
        sizeClass,
        className,
      )}
    >
      <span>{children}</span>
      {trailing}
    </div>
  );
}
