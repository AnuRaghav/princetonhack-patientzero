import { Suspense } from "react";

import { CasesBankClient } from "./CasesBankClient";

export default function CasesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center bg-[#0f1419] text-zinc-500">
          Loading case bank…
        </div>
      }
    >
      <CasesBankClient />
    </Suspense>
  );
}
