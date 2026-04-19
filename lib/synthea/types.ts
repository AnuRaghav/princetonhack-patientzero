export type SyntheaPatientRow = {
  Id: string;
  FIRST?: string | null;
  LAST?: string | null;
  BIRTHDATE?: string | null;
  GENDER?: string | null;
  RACE?: string | null;
  ETHNICITY?: string | null;
  /** When present in Supabase, only `true` rows are selectable for voice sim. */
  ACTIVE?: boolean | null;
};

export type SyntheaConditionRow = {
  START?: string | null;
  STOP?: string | null;
  PATIENT: string;
  ENCOUNTER?: string | null;
  SYSTEM?: string | null;
  CODE?: string | null;
  DESCRIPTION?: string | null;
};

export type SyntheaObservationRow = {
  DATE?: string | null;
  PATIENT: string;
  ENCOUNTER?: string | null;
  CATEGORY?: string | null;
  CODE?: string | null;
  DESCRIPTION?: string | null;
  VALUE?: string | number | null;
  UNITS?: string | null;
  TYPE?: string | null;
};

