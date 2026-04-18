import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { toSessionRow, toTranscriptRow } from "@/lib/session/db";

type RouteParams = { params: Promise<{ sessionId: string }> };

export async function GET(_req: Request, ctx: RouteParams) {
  const { sessionId } = await ctx.params;
  const supabase = createAdminClient();

  const { data: session, error } = await supabase.from("sessions").select("*").eq("id", sessionId).single();
  if (error || !session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const { data: turns, error: tErr } = await supabase
    .from("transcript_turns")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (tErr) {
    return NextResponse.json({ error: tErr.message }, { status: 500 });
  }

  return NextResponse.json({
    session: toSessionRow(session),
    transcript: (turns ?? []).map(toTranscriptRow),
  });
}
