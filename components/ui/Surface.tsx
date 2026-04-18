import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";

import { cn } from "./cn";

type Variant = "card" | "muted" | "outline" | "hero" | "hero-2";
type Padding = "none" | "sm" | "md" | "lg" | "xl";
type Radius = "sm" | "md" | "lg" | "xl" | "2xl";

type SurfaceProps<T extends ElementType> = {
  as?: T;
  variant?: Variant;
  padding?: Padding;
  radius?: Radius;
  interactive?: boolean;
  children?: ReactNode;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "children">;

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

export function Surface<T extends ElementType = "div">({
  as,
  variant = "card",
  padding = "md",
  radius = "lg",
  interactive = false,
  className,
  children,
  ...rest
}: SurfaceProps<T>) {
  const Component = (as ?? "div") as ElementType;
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
      {...rest}
    >
      {children}
    </Component>
  );
}
