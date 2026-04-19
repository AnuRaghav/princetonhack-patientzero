import type { ExamAction, ExamTarget } from "@/types/exam";

/** Labels and exam metadata for each body hotspot region (shared by BodyScene + curated UI). */
export const REGION_INFO: Record<
  ExamTarget,
  { label: string; action: ExamAction; detail: string }
> = {
  head: {
    label: "Head / general appearance",
    action: "inspect",
    detail: "General appearance and mental status inspection.",
  },
  chest: {
    label: "Chest / lungs",
    action: "auscultate",
    detail: "Lung and chest auscultation.",
  },
  abdomen: {
    label: "Abdomen",
    action: "palpate",
    detail: "General abdominal palpation.",
  },
  stomach: {
    label: "Stomach / abdomen",
    action: "palpate",
    detail: "Abdominal palpation for tenderness and guarding.",
  },
  rlq: {
    label: "Right lower quadrant",
    action: "palpate",
    detail: "Focused RLQ palpation for appendiceal signs.",
  },
  arms: {
    label: "Arms",
    action: "inspect",
    detail: "Upper extremity inspection for asymmetry and discomfort cues.",
  },
  legs: {
    label: "Legs",
    action: "inspect",
    detail: "Lower extremity inspection for posture and guarding.",
  },
  joints: {
    label: "Joints",
    action: "palpate",
    detail: "Joint-focused palpation for focal tenderness.",
  },
};
