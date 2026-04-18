import { z } from "zod";

export const DemographicsSchema = z.object({
  age: z.number(),
  sex: z.string(),
  occupation: z.string().optional(),
});

export const RevealRuleSchema = z.object({
  id: z.string(),
  match_terms: z.array(z.string()),
  reveals: z.array(z.string()),
});

export const ChecklistItemSchema = z.object({
  id: z.string(),
  text: z.string(),
  category: z.enum(["history", "exam", "communication", "safety"]),
  required_fact_keys: z.array(z.string()).optional(),
  required_exam_keys: z.array(z.string()).optional(),
});

export const PhysicalExamEntrySchema = z.object({
  finding_key: z.string(),
  student_finding: z.string(),
  pain_delta: z.number().optional(),
  visual: z
    .object({
      highlight: z.string(),
      severity: z.enum(["low", "medium", "high"]),
    })
    .optional(),
});

export const CaseDocumentSchema = z.object({
  id: z.string(),
  title: z.string(),
  demographics: DemographicsSchema,
  personality: z.string(),
  chief_complaint: z.string(),
  history_of_present_illness: z.array(z.string()),
  associated_symptoms: z.array(z.string()),
  negatives: z.array(z.string()),
  physical_exam_findings: z.array(PhysicalExamEntrySchema),
  hidden_red_flags: z.array(z.string()),
  emotional_profile: z.string(),
  reveal_rules: z.array(RevealRuleSchema),
  checklist: z.array(ChecklistItemSchema),
  final_diagnosis: z.string(),
  patient_utterances_by_fact: z.record(z.string(), z.string()),
});

export type CaseDocumentParsed = z.infer<typeof CaseDocumentSchema>;
