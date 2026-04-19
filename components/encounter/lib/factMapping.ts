import type { DiscoveredFact, DiscoveredFactKind } from "./types";

type ChatLatestReveal = {
  key: string;
  kind: DiscoveredFactKind;
  text: string;
} | null;

type MergeArgs = {
  /** Currently known facts (will not be mutated). */
  existing: DiscoveredFact[];
  /** All revealed fact keys returned by `/api/chat` for the latest turn. */
  revealedFactKeys: string[];
  /** The single new reveal surfaced this turn (text + kind), if any. */
  latestReveal: ChatLatestReveal;
  /** Wall-clock when the reply landed. */
  now: number;
};

/**
 * Merge a chat-backend response into the running discoveredFacts list.
 *
 * - Existing fact entries are preserved (so `discoveredAt` stays stable).
 * - New keys from `revealedFactKeys` are appended in order.
 * - When the new key matches `latestReveal.key`, we use that richer text/kind.
 * - Otherwise a placeholder fact is created with `text` falling back to the key
 *   and `kind` defaulting to "observation".
 *
 * Returns the merged array - same reference as `existing` if nothing changed.
 */
export function mergeChatRevealedFacts({
  existing,
  revealedFactKeys,
  latestReveal,
  now,
}: MergeArgs): DiscoveredFact[] {
  const known = new Map(existing.map((f) => [f.key, f]));
  let changed = false;

  const next: DiscoveredFact[] = existing.slice();

  for (const key of revealedFactKeys) {
    if (known.has(key)) continue;
    const reveal = latestReveal && latestReveal.key === key ? latestReveal : null;
    const fact: DiscoveredFact = {
      key,
      text: reveal?.text ?? humanizeKey(key),
      kind: reveal?.kind ?? "observation",
      discoveredAt: now,
    };
    next.push(fact);
    known.set(key, fact);
    changed = true;
  }

  return changed ? next : existing;
}

/** Cheap key → display text fallback (for facts that come back with no `latestReveal` text). */
function humanizeKey(key: string): string {
  const cleaned = key.replace(/[._-]+/g, " ").trim();
  if (!cleaned) return key;
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

/**
 * Shallow set-equality check by `key`. Used to decide whether to fire
 * `onDiscoveredFactsChange` to the host.
 */
export function discoveredFactSetsEqual(
  a: ReadonlyArray<DiscoveredFact>,
  b: ReadonlyArray<DiscoveredFact>,
): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i]?.key !== b[i]?.key) return false;
  }
  return true;
}
