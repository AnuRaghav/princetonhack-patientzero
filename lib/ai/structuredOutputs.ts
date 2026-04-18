import { z } from "zod";

/** LLM may suggest wording; server still owns canonical revealed fact keys. */
export const PatientLlmReplySchema = z.object({
  reply: z.string(),
  emotion: z.string().optional(),
});

export const ProctorLlmSummarySchema = z.object({
  summary: z.string(),
});
