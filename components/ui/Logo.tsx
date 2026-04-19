import { cn } from "./cn";

type Props = {
  className?: string;
};

export function Logo({ className }: Props) {
  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <span
        className="grid h-7 w-7 place-items-center rounded-[9px] bg-[linear-gradient(145deg,_var(--color-brand)_0%,_var(--color-accent)_100%)] shadow-[0_4px_12px_-4px_rgba(99,102,241,0.35)]"
        aria-hidden
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path
            d="M5 0h4v5h5v4H9v5H5V9H0V5h5V0z"
            fill="white"
          />
        </svg>
      </span>
      <span className="text-[16px] font-bold tracking-tight text-[var(--color-ink)]">
        Patient<span className="text-[var(--color-brand)]">Zero</span>
      </span>
    </div>
  );
}
