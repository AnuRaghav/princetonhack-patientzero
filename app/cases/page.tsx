import { Suspense } from "react";

import { CasesBankClient } from "./CasesBankClient";

export default function CasesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center text-[var(--color-ink-muted)]">
          Loading case bank...
        </div>
      }
    >
      <CasesBankClient />
    </Suspense>
  );
}
