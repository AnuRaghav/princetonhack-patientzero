import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

import { buildCaseDocumentFromSynthea } from "@/lib/synthea/caseDoc";
import {
  getLatestEncounterId,
  listConditionsForEncounter,
  listObservationsForEncounter,
} from "@/lib/synthea/encounterBackground";
import {
  getPatientById,
  listConditionsForPatient,
  listObservationsForPatient,
} from "@/lib/synthea/queries";
import type { CaseDocument } from "@/types/case";
import { CaseDocumentSchema } from "./schemas";

const cache = new Map<string, CaseDocument>();

/**
 * Loads a case document for the sim:
 * 1) **Synthea** — `patients."Id"` + `conditions` / `observations` in Supabase
 * 2) **Disk** — `data/cases/<slug>.json` (local dev / fixtures)
 *
 * The legacy `public.cases` dataset table is not used.
 */
export async function loadCase(caseId: string): Promise<CaseDocument> {
  const key = caseId.trim();
  const hit = cache.get(key);
  if (hit) return hit;

  try {
    const patient = await getPatientById(key);
    if (patient) {
      const encounterId = await getLatestEncounterId(key).catch(() => null);
      const [conditions, observations] =
        encounterId != null && encounterId.length > 0
          ? await Promise.all([
              listConditionsForEncounter(key, encounterId),
              listObservationsForEncounter(key, encounterId),
            ])
          : await Promise.all([
              listConditionsForPatient(key),
              listObservationsForPatient(key, { limit: 200 }),
            ]);
      const doc = CaseDocumentSchema.parse(
        buildCaseDocumentFromSynthea({
          patient,
          conditions,
          observations,
          encounterId,
        }),
      ) as CaseDocument;
      cache.set(key, doc);
      return doc;
    }
  } catch {
    // Missing Supabase env or tables — try disk.
  }

  return loadCaseFromDisk(key);
}

export async function loadCaseFromDisk(caseId: string): Promise<CaseDocument> {
  const key = caseId.trim();
  const diskHit = cache.get(key);
  if (diskHit) return diskHit;

  const filePath = path.join(process.cwd(), "data", "cases", `${key}.json`);
  const raw = await readFile(filePath, "utf8");
  const json = JSON.parse(raw) as unknown;
  const parsed = CaseDocumentSchema.parse(json) as CaseDocument;
  cache.set(key, parsed);
  return parsed;
}

export function parseCaseJson(json: unknown): CaseDocument {
  return CaseDocumentSchema.parse(json) as CaseDocument;
}
