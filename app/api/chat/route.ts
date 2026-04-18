import { NextResponse } from "next/server";

import { patientResponder } from "@/lib/ai/patientResponder";
import { ChatRequestSchema, ChatResponseSchema } from "@/lib/api/schemas";
import { loadCase } from "@/lib/cases/loader";
import { projectFindings } from "@/lib/sim/findingsProjector";
import { applyChatReveal } from "@/lib/sim/reducers";
import { computeNewlyRevealedFacts } from "@/lib/sim/revealRules";
import { transitionEmotionAfterChat, transitionPainAfterChat } from "@/lib/sim/stateMachine";
import { toSessionRow } from "@/lib/session/db";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = ChatRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { sessionId, message } = parsed.data;
  const supabase = createAdminClient();

  const { data: sessionRow, error } = await supabase.from("sessions").select("*").eq("id", sessionId).single();
  if (error || !sessionRow) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const session = toSessionRow(sessionRow);
  const caseDoc = await loadCase(session.case_id);

  const already = new Set(session.revealed_facts);
  const newlyRevealed = computeNewlyRevealedFacts(caseDoc, message, already);
  const nextSession = applyChatReveal(session, newlyRevealed);
  const emotion = transitionEmotionAfterChat(session, newlyRevealed.length);
  const pain = transitionPainAfterChat(nextSession, newlyRevealed.length > 0 ? 0 : 0);

  const mergedFacts = Array.from(new Set([...session.revealed_facts, ...newlyRevealed]));

  await supabase.from("transcript_turns").insert({
    session_id: sessionId,
    speaker: "student",
    message,
    metadata: { newly_revealed: newlyRevealed },
  });

  const response = await patientResponder({
    caseDoc,
    revealedFactKeys: mergedFacts,
    newlyRevealed,
    studentMessage: message,
  });

  await supabase.from("transcript_turns").insert({
    session_id: sessionId,
    speaker: "patient",
    message: response.reply,
    metadata: { emotion: response.emotion, revealedFacts: newlyRevealed },
  });

  const finalEmotion = response.emotion ?? emotion;

  const findings = projectFindings({
    caseDoc,
    revealedFacts: mergedFacts,
    completedExamActions: session.completed_exam_actions,
    emotionalState: finalEmotion,
    painLevel: pain,
    diagnosisHypotheses: session.diagnosis_hypotheses,
  });

  const { error: upErr } = await supabase
    .from("sessions")
    .update({
      revealed_facts: mergedFacts,
      emotional_state: finalEmotion,
      pain_level: pain,
      discovered_findings: findings,
    })
    .eq("id", sessionId);

  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  const body = ChatResponseSchema.parse({
    reply: response.reply,
    emotion: finalEmotion,
    revealedFacts: newlyRevealed,
    findings,
  });
  return NextResponse.json(body);
}
