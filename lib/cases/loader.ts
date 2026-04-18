import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

import type { CaseDocument } from "@/types/case";
import { CaseDocumentSchema } from "./schemas";

const cache = new Map<string, CaseDocument>();

export async function loadCaseFromDisk(caseId: string): Promise<CaseDocument> {
  const hit = cache.get(caseId);
  if (hit) return hit;

  const filePath = path.join(process.cwd(), "data", "cases", `${caseId}.json`);
  const raw = await readFile(filePath, "utf8");
  const json = JSON.parse(raw) as unknown;
  const parsed = CaseDocumentSchema.parse(json) as CaseDocument;
  cache.set(caseId, parsed);
  return parsed;
}

export function parseCaseJson(json: unknown): CaseDocument {
  return CaseDocumentSchema.parse(json) as CaseDocument;
}
