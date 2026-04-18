import { NextResponse } from "next/server";

import { loadCaseFromDisk } from "@/lib/cases/loader";
import { publicCaseSummary } from "@/lib/sim/sessionAssembler";

type RouteParams = { params: Promise<{ caseId: string }> };

export async function GET(_req: Request, ctx: RouteParams) {
  const { caseId } = await ctx.params;
  try {
    const caseDoc = await loadCaseFromDisk(caseId);
    return NextResponse.json({
      ...publicCaseSummary(caseDoc),
      personality: caseDoc.personality,
      emotional_profile: caseDoc.emotional_profile,
    });
  } catch {
    return NextResponse.json({ error: "Case not found" }, { status: 404 });
  }
}
