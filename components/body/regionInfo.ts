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

const HOTSPOT_EXAM_TARGETS: readonly ExamTarget[] = ["head", "chest", "stomach", "arms", "legs", "joints"];

/** Map interview symptom regions to spheres we actually render (abdomen / RLQ → stomach). */
export function mapSymptomRegionsToHotspots(regions: readonly ExamTarget[]): ExamTarget[] {
  const out = new Set<ExamTarget>();
  for (const r of regions) {
    if (HOTSPOT_EXAM_TARGETS.includes(r)) out.add(r);
    else if (r === "abdomen" || r === "rlq") out.add("stomach");
  }
  return [...out];
}
