import { NextResponse } from "next/server";

import { geminiPatientReply } from "@/lib/ai/geminiPatientConversation";
import type { ConversationTurn } from "@/lib/ai/geminiPatientConversation";
import { buildPatientVoiceSystemPrompt } from "@/lib/ai/patientVoicePrompt";
import { PatientConverseRequestSchema, PatientConverseResponseSchema } from "@/lib/api/schemas";
import { loadPatientCaseForVoice } from "@/lib/synthea/patientCaseBuilder";
import { resolveCuratedVoiceId } from "@/lib/voice/curatedVoiceMap";
import { elevenLabsTtsWithDiagnostics } from "@/lib/voice/elevenlabs";

type GeminiErrorResult = Extract<Awaited<ReturnType<typeof geminiPatientReply>>, { ok: false }>;

function mapGeminiErrorStatus(gemini: GeminiErrorResult): number {
  if (gemini.status === 429) return 429;
  if (gemini.status === 401 || gemini.status === 403) return gemini.status;
  return 503;
}

function toPriorTurns(history: { role: string; text: string }[] | undefined): ConversationTurn[] {
  return (history ?? []).map((h) => ({
    role: h.role === "user" ? "user" : "patient",
    text: h.text,
  }));
}

async function synthesizeAudioForReply(
  patientId: string | undefined,
  responseText: string,
): Promise<{ audioUrl: string | null; ttsError?: string }> {
  const voiceId = resolveCuratedVoiceId(patientId);
  const tts = await elevenLabsTtsWithDiagnostics(responseText, voiceId);
  const ttsError = !tts.audioUrl && tts.error ? tts.error : undefined;
  return { audioUrl: tts.audioUrl, ttsError };
}

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

    const gemini = await geminiPatientReply({
      systemInstruction: buildPatientVoiceSystemPrompt(loaded.snapshot),
      priorTurns: toPriorTurns(history),
      clinicianUtterance: transcript,
    });

    if (!gemini.ok) {
      return NextResponse.json({ error: gemini.message }, { status: mapGeminiErrorStatus(gemini) });
    }

    const responseText = gemini.text;
    const { audioUrl, ttsError } =
      synthesizeAudio !== false
        ? await synthesizeAudioForReply(patientId, responseText)
        : { audioUrl: null as string | null, ttsError: undefined };

    const p = loaded.snapshot.patient;
    const body = PatientConverseResponseSchema.parse({
      patientId: loaded.patient.Id,
      patient: {
        id: p.id,
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
