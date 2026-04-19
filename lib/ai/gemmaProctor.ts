import "server-only";

import { PROCTOR_SYSTEM_TEMPLATE } from "./prompts";
import { ProctorLlmSummarySchema } from "./structuredOutputs";
import { googleGenerateMultiAttempt } from "./googleGenAi";

function parseSummaryJson(raw: string): string | null {
  const trimmed = raw.trim();
  const jsonStart = trimmed.indexOf("{");
  const jsonEnd = trimmed.lastIndexOf("}");
  const slice =
    jsonStart >= 0 && jsonEnd > jsonStart ? trimmed.slice(jsonStart, jsonEnd + 1) : trimmed;
  try {
    const parsed = ProctorLlmSummarySchema.safeParse(JSON.parse(slice));
    return parsed.success ? parsed.data.summary : null;
  } catch {
    return null;
  }
}

/** Debrief summary wording via Gemini REST (`gemini-2.5-flash`) before falling back to OpenAI. */
export async function proctorSummaryWithGoogleModel(args: {
  checklistScore: number;
  misses: string[];
  strengths: string[];
  transcriptText: string;
}): Promise<string | null> {
  const system = PROCTOR_SYSTEM_TEMPLATE.replace("{checklist_progress}", String(args.checklistScore))
    .replace("{misses}", args.misses.join("\n- "))
    .replace("{strengths}", args.strengths.join("\n- "))
    .replace("{transcript}", args.transcriptText.slice(0, 8000));

  const user =
    'Return ONLY valid JSON with a single key "summary" (string): 2-4 sentences for the student debrief.';

  const raw = await googleGenerateMultiAttempt({
    systemInstruction: system,
    userText: user,
    temperature: 0.3,
    maxOutputTokens: 700,
  });

  if (!raw) return null;
  return parseSummaryJson(raw);
}
