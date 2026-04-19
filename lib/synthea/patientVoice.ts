import type { SyntheaConditionRow, SyntheaObservationRow } from "./types";

/** Patient doesn’t spontaneously know labs, vitals with numbers, imaging pixels, etc. */
export function isClinicianOnlyObservation(o: SyntheaObservationRow): boolean {
  const c = (o.CATEGORY ?? "").toLowerCase();
  return (
    c.includes("vital") ||
    c.includes("laboratory") ||
    c.includes("lab") ||
    c.includes("imaging") ||
    c.includes("procedure")
  );
}

/** Drop LOINC-ish labels like "Glucose [Mass/volume] in Blood", SNOMED clutter, etc. */
export function scrubClinicalCodingText(desc: string): string | null {
  const d = desc.trim();
  if (!d) return null;
  if (/\[[^\]]+\]/.test(d)) return null;
  if (/mass\/volume|presence of\b|#\s*disease|\/mcl\b|\bmm\[hg\]/i.test(d)) return null;
  if (/in (blood|serum|plasma|urine)\s*$/i.test(d) && /^[A-Za-z\s]+$/.test(d.split(/\s+/)[0] ?? "")) {
    return null;
  }
  return d;
}

export function humanizeConditionDescription(desc: string): string {
  return desc
    .replace(/\s*\(disorder\)\s*$/i, "")
    .replace(/\s*\(situation\)\s*$/i, "")
    .replace(/\s*\(finding\)\s*$/i, "")
    .replace(/\s*\(diagnosis\)\s*$/i, "")
    .trim();
}

function ensureSentence(s: string): string {
  return s.endsWith(".") ? s : `${s}.`;
}

function scrubbedDescription(o: SyntheaObservationRow): string | null {
  return scrubClinicalCodingText((o.DESCRIPTION ?? "").trim());
}

function isPreferredCategory(o: SyntheaObservationRow): boolean {
  const cat = (o.CATEGORY ?? "").toLowerCase();
  return cat.includes("survey") || cat.includes("symptom") || cat.includes("social");
}

function firstScrubbedSentence(
  observations: SyntheaObservationRow[],
  predicate?: (o: SyntheaObservationRow) => boolean,
): string | null {
  for (const o of observations) {
    if (predicate && !predicate(o)) continue;
    const s = scrubbedDescription(o);
    if (s) return ensureSentence(s);
  }
  return null;
}

function complaintFromConditions(conditions: SyntheaConditionRow[]): string | null {
  const rawCond = conditions[0]?.DESCRIPTION?.trim();
  if (!rawCond) return null;
  const h = humanizeConditionDescription(rawCond);
  if (!h || /\[[^\]]+\]/.test(h)) return null;
  return `I've been having trouble related to ${h.toLowerCase().replace(/\.$/, "")}.`;
}

/** Lay chief complaint from encounter observations + fallback to condition wording. */
export function pickLayChiefComplaint(
  observations: SyntheaObservationRow[],
  conditions: SyntheaConditionRow[],
): string {
  const usable = observations.filter(
    (o) => !isClinicianOnlyObservation(o) && Boolean(scrubbedDescription(o)),
  );

  return (
    firstScrubbedSentence(usable, isPreferredCategory) ??
    firstScrubbedSentence(usable) ??
    complaintFromConditions(conditions) ??
    "I've been feeling off enough that I wanted to get checked out."
  );
}

/**
 * One patient-spoken sentence for an observation row (no vitals/labs numbers).
 * Returns null when this row shouldn’t become patient dialogue.
 */
export function observationToLayUtterance(o: SyntheaObservationRow): string | null {
  if (isClinicianOnlyObservation(o)) return null;
  const base = scrubClinicalCodingText((o.DESCRIPTION ?? "").trim());
  if (!base) return null;
  return base.endsWith(".") ? base : `${base}.`;
}

export function conditionToLayUtterance(c: SyntheaConditionRow): string | null {
  const raw = (c.DESCRIPTION ?? "").trim();
  if (!raw) return null;
  const h = humanizeConditionDescription(raw);
  if (!h || /\[[^\]]+\]/.test(h)) return null;
  return `My doctors have talked to me about ${h.toLowerCase().replace(/\.$/, "")}.`;
}

/** Grounded follow-up about symptoms / pain (no made-up vitals). */
export function buildSymptomNarrativeUtterance(chiefComplaint: string, symptomLines: string[]): string {
  const first = symptomLines.find((s) => s.trim().length > 10);
  if (first) {
    const t = first.trim();
    const body = t.endsWith(".") ? t.slice(0, -1) : t;
    const lower = body.charAt(0).toLowerCase() + body.slice(1);
    return `Yeah — ${lower}. It comes and goes, but it's been pretty steady overall.`;
  }
  const cc = chiefComplaint.trim();
  const c = cc.endsWith(".") ? cc.slice(0, -1) : cc;
  return `It's the same thing that's been bothering me — ${c}. I can't always point to one perfect spot, but it definitely feels worse in spells through the day.`;
}
