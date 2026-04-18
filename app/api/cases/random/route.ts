import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Pick a random case row (uniform over current table size).
 */
export async function GET() {
  try {
    const supabase = createAdminClient();
    const { count, error: countErr } = await supabase.from("cases").select("*", {
      count: "exact",
      head: true,
    });
    if (countErr) {
      return NextResponse.json({ error: countErr.message }, { status: 500 });
    }
    const n = count ?? 0;
    if (n === 0) {
      return NextResponse.json({ error: "No cases in database" }, { status: 404 });
    }

    const offset = Math.floor(Math.random() * n);
    const { data, error } = await supabase
      .from("cases")
      .select("id, Disease")
      .order("id", { ascending: true })
      .range(offset, offset)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data || data.id == null) {
      return NextResponse.json({ error: "Random pick failed" }, { status: 500 });
    }

    const title = typeof data.Disease === "string" && data.Disease.trim()
      ? data.Disease.trim()
      : `Case ${data.id}`;

    return NextResponse.json({
      id: String(data.id),
      title,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Random case failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
