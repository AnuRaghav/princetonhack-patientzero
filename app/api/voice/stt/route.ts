import { NextResponse } from "next/server";

import { SttRequestSchema, SttResponseSchema } from "@/lib/api/schemas";

export async function POST(req: Request) {
  const json = await req.json().catch(() => ({}));
  const parsed = SttRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const body = SttResponseSchema.parse({ text: "" });
  return NextResponse.json(body);
}
