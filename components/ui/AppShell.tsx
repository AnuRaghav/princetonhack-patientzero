"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { Badge } from "./Badge";
import { Icon } from "./Icon";
import { Logo } from "./Logo";
import { cn } from "./cn";

type NavItem = {
  label: string;
  href: string;
  icon: ReactNode;
  matchPrefix: string;
};

const NAV: ReadonlyArray<NavItem> = [
  { label: "Console", href: "/", icon: <Icon.Layers size={14} />, matchPrefix: "/" },
  { label: "Encounter", href: "/sim", icon: <Icon.Stethoscope size={14} />, matchPrefix: "/sim" },
  { label: "Debrief", href: "/debrief", icon: <Icon.Pulse size={14} />, matchPrefix: "/debrief" },
  { label: "Library", href: "/library", icon: <Icon.Layers size={14} />, matchPrefix: "/library" },
];

type Props = {
  children: ReactNode;
  rightSlot?: ReactNode;
};

export function AppShell({ children, rightSlot }: Props) {
  const pathname = usePathname() ?? "/";

  return (
    <div className="min-h-screen w-full bg-[var(--color-page)] p-3 md:p-5">
      <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-[1440px] flex-col overflow-hidden rounded-[var(--radius-2xl)] bg-[var(--color-app)] shadow-[var(--shadow-app)]">
        {/* TOP BAR — Logo · Pill nav · Controls */}
        <header className="flex items-center justify-between gap-4 px-5 py-4 md:px-7 md:py-5">
          <Link href="/" className="shrink-0">
            <Logo />
          </Link>

          <nav className="hidden items-center gap-1 rounded-full border border-[var(--color-line)] bg-[var(--color-surface-2)] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] md:inline-flex">
            {NAV.map((item) => {
              const active =
                item.matchPrefix === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.matchPrefix);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium smooth",
                    active
                      ? "bg-[var(--color-ink)] text-white shadow-[0_4px_12px_-4px_rgba(15,17,22,0.35)]"
                      : "text-[var(--color-ink-muted)] hover:bg-black/[0.04] hover:text-[var(--color-ink)]",
                  )}
                >
                  <span className={active ? "text-white" : "text-[var(--color-ink-faint)]"}>
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            {rightSlot}
            <Badge tone="accent" dot pulse className="hidden sm:inline-flex">
              Engine online
            </Badge>
            <button
              type="button"
              aria-label="Notifications"
              className="grid h-9 w-9 place-items-center rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-ink-soft)] smooth hover:bg-[var(--color-surface-2)] hover:text-[var(--color-ink)]"
            >
              <Icon.Bell size={15} />
            </button>
            <div
              className="grid h-9 w-9 place-items-center rounded-full bg-[linear-gradient(135deg,_#1f2937,_#0a0b0d)] text-[12px] font-semibold text-white"
              aria-label="Account"
            >
              MD
            </div>
          </div>
        </header>

        {/* CONTENT */}
        <main className="flex-1 px-3 pb-3 md:px-5 md:pb-5">{children}</main>
      </div>
    </div>
  );
}
