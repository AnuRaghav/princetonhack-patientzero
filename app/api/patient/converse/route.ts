import { NextResponse } from "next/server";

import { geminiPatientReply } from "@/lib/ai/geminiPatientConversation";
import type { ConversationTurn } from "@/lib/ai/geminiPatientConversation";
import { buildPatientVoiceSystemPrompt } from "@/lib/ai/patientVoicePrompt";
import { PatientConverseRequestSchema, PatientConverseResponseSchema } from "@/lib/api/schemas";
import { loadPatientCaseForVoice } from "@/lib/synthea/patientCaseBuilder";
import { elevenLabsTtsWithDiagnostics } from "@/lib/voice/elevenlabs";

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = PatientConverseRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { patientId, transcript, history, synthesizeAudio, includePatientCase } = parsed.data;

  try {
    const loaded = await loadPatientCaseForVoice(patientId);
    if (!loaded) {
      return NextResponse.json(
        {
          error:
            'No matching active patient. Ensure patients."ACTIVE" is true and at least one patient has observations for the latest encounter.',
        },
        { status: 404 },
      );
    }

    const systemInstruction = buildPatientVoiceSystemPrompt(loaded.snapshot);

    const priorTurns: ConversationTurn[] = (history ?? []).map((h) => ({
      role: h.role === "user" ? "user" : "patient",
      text: h.text,
    }));

    const responseText = await geminiPatientReply({
      systemInstruction,
      priorTurns,
      clinicianUtterance: transcript,
    });

    if (!responseText) {
      return NextResponse.json(
        {
          error:
            "Gemini did not return text. Set GEMINI_API_KEY and optionally GEMINI_CONVERSATION_MODEL (e.g. gemini-2.0-flash).",
        },
        { status: 503 },
      );
    }

    let audioUrl: string | null = null;
    let ttsError: string | undefined;
    const wantAudio = synthesizeAudio !== false;
    if (wantAudio) {
      const tts = await elevenLabsTtsWithDiagnostics(responseText);
      audioUrl = tts.audioUrl;
      if (!tts.audioUrl && tts.error) ttsError = tts.error;
    }

    const p = loaded.snapshot.patient;
    const body = PatientConverseResponseSchema.parse({
      patientId: loaded.patient.Id,
      patient: {
        id: p.id ?? loaded.patient.Id,
        firstName: p.firstName,
        lastName: p.lastName,
      },
      ...(includePatientCase === true ? { patientCase: loaded.snapshot } : {}),
      transcript,
      responseText,
      audioUrl,
      ...(ttsError ? { ttsError } : {}),
    });

    return NextResponse.json(body);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Conversation failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
