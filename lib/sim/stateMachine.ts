import type { SessionRow } from "@/types/session";

import { adjustPainLevel } from "./reducers";

export function transitionEmotionAfterChat(
  session: SessionRow,
  newlyRevealedCount: number,
): string {
  if (newlyRevealedCount > 0) return "discomfort";
  return session.emotional_state || "anxiety";
}

export function transitionPainAfterChat(session: SessionRow, delta: number): number {
  return adjustPainLevel(session, delta);
}
