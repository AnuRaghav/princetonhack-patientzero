import { NextResponse } from "next/server";

import { TtsRequestSchema, TtsResponseSchema } from "@/lib/api/schemas";

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = TtsRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const body = TtsResponseSchema.parse({ audioUrl: null });
  return NextResponse.json(body);
}
