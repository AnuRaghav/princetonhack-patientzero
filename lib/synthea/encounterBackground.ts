import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { SyntheaConditionRow, SyntheaObservationRow } from "./types";

/**
 * Mirrors the user's “latest encounter” logic:
 * pick the ENCOUNTER from the row with max("DATE") in observations for this patient,
 * then scope conditions + observations to that ENCOUNTER.
 */
export async function getLatestEncounterId(patientId: string): Promise<string | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("observations")
    .select('"ENCOUNTER","DATE"')
    .eq("PATIENT", patientId)
    .order("DATE", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  const row = data as { ENCOUNTER?: string | null } | null;
  const enc = row?.ENCOUNTER?.trim();
  return enc || null;
}

export async function listConditionsForEncounter(
  patientId: string,
  encounterId: string,
): Promise<SyntheaConditionRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("conditions")
    .select('"START","STOP","PATIENT","ENCOUNTER","SYSTEM","CODE","DESCRIPTION"')
    .eq("PATIENT", patientId)
    .eq("ENCOUNTER", encounterId)
    .order("START", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as SyntheaConditionRow[];
}

export async function listObservationsForEncounter(
  patientId: string,
  encounterId: string,
): Promise<SyntheaObservationRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("observations")
    .select('"DATE","PATIENT","ENCOUNTER","CATEGORY","CODE","DESCRIPTION","VALUE","UNITS","TYPE"')
    .eq("PATIENT", patientId)
    .eq("ENCOUNTER", encounterId)
    .order("DATE", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as SyntheaObservationRow[];
}
