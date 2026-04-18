"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "./cn";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "on-dark";
type Size = "sm" | "md" | "lg";

type Props = {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  children?: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>;

const sizeClasses: Record<Size, string> = {
  sm: "h-8 px-3 text-[12px] gap-1.5 rounded-full",
  md: "h-10 px-4 text-[13px] gap-2 rounded-full",
  lg: "h-12 px-6 text-[14px] gap-2.5 rounded-full",
};

const variantClasses: Record<Variant, string> = {
  primary: cn(
    "bg-[var(--color-ink)] text-white font-semibold",
    "shadow-[0_1px_0_rgba(255,255,255,0.10)_inset,_0_8px_18px_-10px_rgba(15,17,22,0.45)]",
    "hover:bg-[#1a1c20] active:bg-[#000]",
  ),
  secondary: cn(
    "bg-[var(--color-surface)] text-[var(--color-ink)] font-medium",
    "border border-[var(--color-line-strong)]",
    "hover:bg-[var(--color-surface-2)]",
  ),
  ghost: cn(
    "bg-transparent text-[var(--color-ink-soft)] font-medium",
    "border border-transparent",
    "hover:bg-black/[0.04] hover:text-[var(--color-ink)]",
  ),
  danger: cn(
    "bg-[var(--color-danger-soft)] text-[var(--color-danger)] font-semibold",
    "border border-[rgba(239,68,68,0.18)]",
    "hover:bg-[rgba(239,68,68,0.16)]",
  ),
  "on-dark": cn(
    "bg-white text-[var(--color-ink)] font-semibold",
    "shadow-[0_1px_0_rgba(15,17,22,0.10)_inset]",
    "hover:bg-[#f5f5f7]",
  ),
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  leadingIcon,
  trailingIcon,
  className,
  children,
  ...rest
}: Props) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap smooth",
        "disabled:cursor-not-allowed disabled:opacity-50",
        sizeClasses[size],
        variantClasses[variant],
        className,
      )}
      {...rest}
    >
      {loading ? (
        <span
          className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent"
          aria-hidden
        />
      ) : (
        leadingIcon
      )}
      {children}
      {!loading && trailingIcon ? trailingIcon : null}
    </button>
  );
}
