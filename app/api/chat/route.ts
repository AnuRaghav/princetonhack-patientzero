import { NextResponse } from "next/server";

import { patientResponder } from "@/lib/ai/patientResponder";
import type { ConversationTurn } from "@/lib/ai/geminiPatientConversation";
import { ChatRequestSchema, ChatResponseSchema } from "@/lib/api/schemas";
import { loadCase } from "@/lib/cases/loader";
import { projectFindings } from "@/lib/sim/findingsProjector";
import { applyChatReveal } from "@/lib/sim/reducers";
import { computeAtMostOneNewReveal } from "@/lib/sim/slowReveal";
import { transitionEmotionAfterChat, transitionPainAfterChat } from "@/lib/sim/stateMachine";
import { toSessionRow } from "@/lib/session/db";
import { createAdminClient } from "@/lib/supabase/admin";
import { elevenLabsTtsWithDiagnostics } from "@/lib/voice/elevenlabs";
import type { CaseDocument } from "@/types/case";

function latestRevealFromDoc(
  caseDoc: CaseDocument,
  revealedKeys: string[],
): { key: string; kind: "observation" | "diagnosis" | "other"; text: string } | null {
  const key = revealedKeys[0];
  if (!key) return null;
  const text = caseDoc.patient_utterances_by_fact[key];
  if (!text) return null;
  let kind: "observation" | "diagnosis" | "other" = "other";
  if (key.includes("_cond_")) kind = "diagnosis";
  else if (key.includes("_obs_")) kind = "observation";
  return { key, kind, text };
}

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = ChatRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { sessionId, message, synthesizeSpeech } = parsed.data;
  const supabase = createAdminClient();

  const { data: sessionRow, error } = await supabase.from("sessions").select("*").eq("id", sessionId).single();
  if (error || !sessionRow) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const session = toSessionRow(sessionRow);
  const caseDoc = await loadCase(session.case_id);

  const already = new Set(session.revealed_facts);
  const newlyRevealed = computeAtMostOneNewReveal(caseDoc, message, already);
  const nextSession = applyChatReveal(session, newlyRevealed);
  const emotion = transitionEmotionAfterChat(session, newlyRevealed.length);
  const pain = transitionPainAfterChat(nextSession, newlyRevealed.length > 0 ? 0 : 0);

  const mergedFacts = Array.from(new Set([...session.revealed_facts, ...newlyRevealed]));

  const { data: priorTurnRows } = await supabase
    .from("transcript_turns")
    .select("speaker, message, created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true })
    .limit(40);

  const priorTurns: ConversationTurn[] = (priorTurnRows ?? [])
    .filter((t): t is { speaker: string; message: string; created_at: string } =>
      Boolean(t && typeof t.message === "string" && t.message.trim()),
    )
    .map((t) => ({
      role: t.speaker === "student" ? "user" : "patient",
      text: t.message,
    }));

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
    priorTurns,
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

  let ttsAudioUrl: string | null = null;
  let ttsError: string | undefined;
  if (synthesizeSpeech) {
    const tts = await elevenLabsTtsWithDiagnostics(response.reply);
    ttsAudioUrl = tts.audioUrl;
    if (!tts.audioUrl && tts.error) ttsError = tts.error;
  }

  const body = ChatResponseSchema.parse({
    reply: response.reply,
    emotion: finalEmotion,
    revealedFacts: newlyRevealed,
    latestReveal: latestRevealFromDoc(caseDoc, newlyRevealed),
    ttsAudioUrl,
    ...(ttsError ? { ttsError } : {}),
    findings,
  });
  return NextResponse.json(body);
}
