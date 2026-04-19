import { z } from "zod";

/** POST /api/sessions */
export const CreateSessionRequestSchema = z.object({
  caseId: z.string().min(1),
});
export const CreateSessionResponseSchema = z.object({
  sessionId: z.string().uuid(),
  caseId: z.string(),
  status: z.enum(["active", "completed", "archived"]),
});

/** POST /api/chat */
export const ChatRequestSchema = z.object({
  sessionId: z.string().uuid(),
  message: z.string().min(1),
  /** When true and `ELEVENLABS_API_KEY` is set, returns `ttsAudioUrl` for the patient reply. */
  synthesizeSpeech: z.boolean().optional(),
});
export const ChatResponseSchema = z.object({
  reply: z.string(),
  emotion: z.string(),
  revealedFacts: z.array(z.string()),
  /** At most one new fact per message (slow reveal). Null if nothing matched. */
  latestReveal: z
    .object({
      key: z.string(),
      kind: z.enum(["observation", "diagnosis", "other"]),
      text: z.string(),
    })
    .nullable(),
  /** ElevenLabs: `data:audio/mpeg;base64,...` when speech synthesis succeeded. */
  ttsAudioUrl: z.string().nullable().optional(),
  /** Present when speech was requested but TTS did not return audio (e.g. missing API key). */
  ttsError: z.string().optional(),
  /**
   * Latest structured EncounterFindings projection. Schema kept loose
   * here (passthrough) so the projector remains the source of truth.
   */
  findings: z.record(z.string(), z.unknown()).optional(),
});

/** POST /api/exam */
export const ExamRequestSchema = z.object({
  sessionId: z.string().uuid(),
  action: z.enum(["palpate", "auscultate", "inspect"]),
  target: z.enum(["head", "chest", "abdomen", "stomach", "rlq", "arms", "legs", "joints"]),
});
export const ExamResponseSchema = z.object({
  finding: z.string(),
  painDelta: z.number(),
  audioUrl: z.string().nullable(),
  visualCue: z
    .object({
      highlight: z.string(),
      severity: z.enum(["low", "medium", "high"]),
    })
    .nullable(),
  /** Latest structured EncounterFindings projection. */
  findings: z.record(z.string(), z.unknown()).optional(),
});

/** POST /api/diagnosis — student submits a working diagnosis hypothesis. */
export const DiagnosisRequestSchema = z.object({
  sessionId: z.string().uuid(),
  diagnosis: z.string().min(1).max(200),
  confidence: z.number().min(0).max(100).optional(),
  rationale: z.string().max(2000).nullish(),
});
export const DiagnosisResponseSchema = z.object({
  diagnosisHypotheses: z.array(
    z.object({
      diagnosis: z.string(),
      confidence: z.number().optional(),
      rationale: z.string().nullable().optional(),
      submittedAt: z.string(),
    }),
  ),
  findings: z.record(z.string(), z.unknown()),
});

/** POST /api/score */
export const ScoreRequestSchema = z.object({
  sessionId: z.string().uuid(),
});
export const ScoreResponseSchema = z.object({
  checklistScore: z.number(),
  empathyScore: z.number(),
  diagnosticScore: z.number(),
  summary: z.string(),
});

/**
 * STT — accepts either a multipart/form-data upload (preferred — `audio` file
 * field + optional `language`/`mimeType` text fields) OR a JSON body with
 * `audioBase64`. The route handler picks the right path based on `Content-Type`.
 */
export const SttJsonRequestSchema = z.object({
  audioBase64: z.string().min(1),
  mimeType: z.string().min(1),
  language: z.string().optional(),
});
export const SttResponseSchema = z.object({
  text: z.string(),
});

export const TtsRequestSchema = z.object({
  text: z.string().min(1),
  voice: z.string().optional(),
});
export const TtsResponseSchema = z.object({
  audioUrl: z.string().nullable(),
});

export type CreateSessionRequest = z.infer<typeof CreateSessionRequestSchema>;
export type ChatRequest = z.infer<typeof ChatRequestSchema>;
export type ExamRequest = z.infer<typeof ExamRequestSchema>;
export type ScoreRequest = z.infer<typeof ScoreRequestSchema>;
export type DiagnosisRequest = z.infer<typeof DiagnosisRequestSchema>;

/** POST /api/patient/converse — Gemini patient + ElevenLabs TTS */
export const PatientConverseRequestSchema = z.object({
  patientId: z.string().optional(),
  transcript: z.string().min(1),
  /** Prior turns; user = clinician/student, patient = simulated patient */
  history: z
    .array(
      z.object({
        role: z.enum(["user", "patient"]),
        text: z.string(),
      }),
    )
    .optional(),
  synthesizeAudio: z.boolean().optional(),
  /**
   * When true, include full `patientCase` (large). Default is false so the response
   * stays small enough for JSON + base64 audio in one payload.
   */
  includePatientCase: z.boolean().optional(),
});

export const PatientConverseResponseSchema = z.object({
  patientId: z.string(),
  /** Always returned for UI (avoids multi‑MB `patientCase` on every turn). */
  patient: z.object({
    id: z.string(),
    firstName: z.string(),
    lastName: z.string(),
  }),
  /** Only when `includePatientCase: true` in the request. */
  patientCase: z.any().optional(),
  transcript: z.string(),
  responseText: z.string(),
  audioUrl: z.string().nullable(),
  /** Present when audio was requested but synthesis failed or was skipped. */
  ttsError: z.string().optional(),
});

export type PatientConverseRequest = z.infer<typeof PatientConverseRequestSchema>;
export type PatientConverseResponse = z.infer<typeof PatientConverseResponseSchema>;
