import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

import { createAdminClient } from "@/lib/supabase/admin";
import type { CaseDocument } from "@/types/case";
import {
  DATASET_CASE_SELECT,
  buildCaseDocumentFromDatasetRow,
  coalesceDatasetRow,
} from "./datasetCase";
import { CaseDocumentSchema } from "./schemas";

const cache = new Map<string, CaseDocument>();

function isNumericCaseId(caseId: string): boolean {
  return /^\d+$/.test(caseId.trim());
}

/**
 * Loads a case: **dataset rows** in `public.cases` (bigint `id`, Disease, Symptom_1…17),
 * else **legacy** `content jsonb` row (if your project still uses it),
 * else **disk** `data/cases/<slug>.json`.
 */
export async function loadCase(caseId: string): Promise<CaseDocument> {
  const key = caseId.trim();
  const hit = cache.get(key);
  if (hit) return hit;

  try {
    const supabase = createAdminClient();

    // 1) New dataset table: numeric PK
    if (isNumericCaseId(key)) {
      const numericId = Number(key);
      const { data, error } = await supabase
        .from("cases")
        .select(DATASET_CASE_SELECT)
        .eq("id", numericId)
        .maybeSingle();

      if (!error && data && typeof data === "object") {
        const row = coalesceDatasetRow(data as Record<string, unknown>);
        if (row) {
          const doc = CaseDocumentSchema.parse(buildCaseDocumentFromDatasetRow(row)) as CaseDocument;
          cache.set(key, doc);
          return doc;
        }
      }
    }

    // 2) Legacy: content jsonb + text id (older seeds / demos)
    if (!isNumericCaseId(key)) {
      const { data: legacy, error: legErr } = await supabase
        .from("cases")
        .select("content")
        .eq("id", key)
        .maybeSingle();
      if (!legErr && legacy && legacy.content != null) {
        const parsed = parseCaseJson(legacy.content);
        cache.set(key, parsed);
        return parsed;
      }
    }
  } catch {
    // Missing Supabase env — try disk.
  }

  return loadCaseFromDisk(key);
}

export async function loadCaseFromDisk(caseId: string): Promise<CaseDocument> {
  const key = caseId.trim();
  const hit = cache.get(key);
  if (hit) return hit;

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
