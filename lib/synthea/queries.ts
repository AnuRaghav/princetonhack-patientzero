import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type {
  SyntheaConditionRow,
  SyntheaObservationRow,
  SyntheaPatientRow,
} from "./types";

const PATIENT_SELECT =
  '"Id","FIRST","LAST","BIRTHDATE","GENDER","RACE","ETHNICITY"' as const;

const CONDITION_SELECT =
  '"START","STOP","PATIENT","ENCOUNTER","SYSTEM","CODE","DESCRIPTION"' as const;

const OBSERVATION_SELECT =
  '"DATE","PATIENT","ENCOUNTER","CATEGORY","CODE","DESCRIPTION","VALUE","UNITS","TYPE"' as const;

export async function listPatients(args: {
  from: number;
  to: number;
  q?: string;
}): Promise<{ patients: SyntheaPatientRow[]; total: number }> {
  const supabase = createAdminClient();

  // NOTE: PostgREST filtering is case-sensitive on column identifiers. We must
  // use the exact column names (e.g. Id, FIRST) matching the quoted PG columns.
  let query = supabase.from("patients").select(PATIENT_SELECT, { count: "exact" });

  const q = (args.q ?? "").trim();
  if (q) {
    const p = `%${q.replaceAll("%", "\\%").replaceAll("_", "\\_")}%`;
    query = query.or(`FIRST.ilike.${p},LAST.ilike.${p},Id.ilike.${p}`);
  }

  const { data, error, count } = await query.order("Id", { ascending: true }).range(args.from, args.to);
  if (error) throw new Error(error.message);
  return { patients: (data ?? []) as SyntheaPatientRow[], total: count ?? 0 };
}

export async function getPatientById(patientId: string): Promise<SyntheaPatientRow | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("patients")
    .select(PATIENT_SELECT)
    .eq("Id", patientId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data ?? null) as SyntheaPatientRow | null;
}

export async function listConditionsForPatient(patientId: string): Promise<SyntheaConditionRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("conditions")
    .select(CONDITION_SELECT)
    .eq("PATIENT", patientId)
    .order("START", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as SyntheaConditionRow[];
}

export async function listObservationsForPatient(
  patientId: string,
  opts?: { limit?: number },
): Promise<SyntheaObservationRow[]> {
  const supabase = createAdminClient();
  let q = supabase
    .from("observations")
    .select(OBSERVATION_SELECT)
    .eq("PATIENT", patientId)
    .order("DATE", { ascending: false });
  if (opts?.limit && opts.limit > 0) q = q.limit(opts.limit);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as SyntheaObservationRow[];
}

export async function pickRandomPatientId(): Promise<string | null> {
  const supabase = createAdminClient();
  const { count, error: countErr } = await supabase.from("patients").select("*", {
    count: "exact",
    head: true,
  });
  if (countErr) throw new Error(countErr.message);
  const n = count ?? 0;
  if (n <= 0) return null;
  const offset = Math.floor(Math.random() * n);
  const { data, error } = await supabase
    .from("patients")
    .select('"Id"')
    .order("Id", { ascending: true })
    .range(offset, offset)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const row = data as { Id?: string } | null;
  return row?.Id ?? null;
}

