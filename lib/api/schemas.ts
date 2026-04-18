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
});
export const ChatResponseSchema = z.object({
  reply: z.string(),
  emotion: z.string(),
  revealedFacts: z.array(z.string()),
});

/** POST /api/exam */
export const ExamRequestSchema = z.object({
  sessionId: z.string().uuid(),
  action: z.enum(["palpate", "auscultate", "inspect"]),
  target: z.enum(["head", "chest", "abdomen", "rlq"]),
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

/** Voice stubs */
export const SttRequestSchema = z.object({
  audioBase64: z.string().optional(),
  mimeType: z.string().optional(),
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
