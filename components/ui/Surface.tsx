import type { ElementType, ReactNode } from "react";

import { cn } from "./cn";

type Variant = "card" | "muted" | "outline" | "hero" | "hero-2";
type Padding = "none" | "sm" | "md" | "lg" | "xl";
type Radius = "sm" | "md" | "lg" | "xl" | "2xl";

type SurfaceProps = {
  as?: ElementType;
  variant?: Variant;
  padding?: Padding;
  radius?: Radius;
  interactive?: boolean;
  children?: ReactNode;
  className?: string;
} & Record<string, unknown>;

const variantClasses: Record<Variant, string> = {
  card:
    "bg-[var(--color-surface)] border border-[var(--color-line)] shadow-[var(--shadow-card)]",
  muted:
    "bg-[var(--color-surface-2)] border border-[var(--color-line)]",
  outline:
    "bg-transparent border border-[var(--color-line)]",
  hero:
    "on-dark bg-[var(--color-dark)] text-[var(--color-on-dark)] border border-[var(--color-dark-line)] shadow-[var(--shadow-hero)]",
  "hero-2":
    "on-dark bg-[var(--color-dark-2)] text-[var(--color-on-dark)] border border-[var(--color-dark-line)] shadow-[var(--shadow-hero)]",
};

const paddingClasses: Record<Padding, string> = {
  none: "",
  sm: "p-3",
  md: "p-5",
  lg: "p-6",
  xl: "p-8",
};

const radiusClasses: Record<Radius, string> = {
  sm: "rounded-[var(--radius-sm)]",
  md: "rounded-[var(--radius-md)]",
  lg: "rounded-[var(--radius-lg)]",
  xl: "rounded-[var(--radius-xl)]",
  "2xl": "rounded-[var(--radius-2xl)]",
};

export function Surface({
  as,
  variant = "card",
  padding = "md",
  radius = "lg",
  interactive = false,
  className,
  children,
  ...rest
}: SurfaceProps) {
  // Intentionally loosened typing: generic ElementType inference can cause TS
  // to infer `children: never` in some Next/React typecheck configurations.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Component: any = as ?? "div";
  const isDark = variant === "hero" || variant === "hero-2";
  return (
    <Component
      className={cn(
        "relative overflow-hidden smooth",
        variantClasses[variant],
        paddingClasses[padding],
        radiusClasses[radius],
        interactive &&
          (isDark
            ? "cursor-pointer hover:border-[var(--color-dark-line-strong)]"
            : "cursor-pointer hover:shadow-[var(--shadow-card-lg)] hover:border-[var(--color-line-strong)]"),
        className,
      )}
      {...(rest as Record<string, unknown>)}
    >
      {children}
    </Component>
  );
}
