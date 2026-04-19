import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

const DAYS = 7 * 12; // 12 weeks

function dayKey(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Returns a daily histogram of how many sessions were started across the case bank
 * over the last `DAYS` days, plus a few summary stats. Used by the "Case-solving
 * activity" heatmap on the cases hero.
 */
export async function GET() {
  try {
    const supabase = createAdminClient();

    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);
    since.setUTCDate(since.getUTCDate() - (DAYS - 1));

    const { data, error } = await supabase
      .from("sessions")
      .select("id, status, created_at, patient")
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = (data ?? []) as Array<{
      id: string;
      status: string | null;
      created_at: string;
      patient: string | null;
    }>;

    const counts = new Map<string, number>();
    const uniqueCases = new Set<string>();
    let completed = 0;
    for (const r of rows) {
      const k = dayKey(new Date(r.created_at));
      counts.set(k, (counts.get(k) ?? 0) + 1);
      if (r.patient) uniqueCases.add(r.patient);
      if (r.status === "completed") completed += 1;
    }

    const buckets: { date: string; count: number }[] = [];
    for (let i = 0; i < DAYS; i++) {
      const d = new Date(since);
      d.setUTCDate(since.getUTCDate() + i);
      const k = dayKey(d);
      buckets.push({ date: k, count: counts.get(k) ?? 0 });
    }

    let streak = 0;
    for (let i = buckets.length - 1; i >= 0; i--) {
      if ((buckets[i]?.count ?? 0) > 0) streak += 1;
      else break;
    }

    let bestDay = { date: buckets[0]?.date ?? dayKey(new Date()), count: 0 };
    for (const b of buckets) {
      if (b.count > bestDay.count) bestDay = b;
    }

    return NextResponse.json({
      buckets,
      total: rows.length,
      completed,
      uniqueCases: uniqueCases.size,
      streak,
      bestDay,
      windowDays: DAYS,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load activity";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
