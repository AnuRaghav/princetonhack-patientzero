import { NextResponse } from "next/server";

import { pickRandomPatientId } from "@/lib/synthea/queries";

/**
 * Pick a random patient (uniform over table size).
 */
export async function GET() {
  try {
    const id = await pickRandomPatientId();
    if (!id) return NextResponse.json({ error: "No patients in database" }, { status: 404 });

    return NextResponse.json({
      id,
      title: `Patient ${id}`,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Random case failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
