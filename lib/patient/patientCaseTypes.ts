/** Types for Supabase-derived patient snapshots used by voice prompts and converse API. */

export type SymptomOrMeasureObservation = {
  description: string;
  value: string;
  units: string | null;
  date?: string | null;
};

export type QuestionAnswerObservation = {
  question: string;
  answer: string;
  key?: string;
};

export type BucketedObservations = {
  symptoms: SymptomOrMeasureObservation[];
  vitals: SymptomOrMeasureObservation[];
  labs: SymptomOrMeasureObservation[];
  socialContext: QuestionAnswerObservation[];
  screeningAnswers: QuestionAnswerObservation[];
};

export type DerivedPatientContext = {
  likelyChiefComplaint: string;
  relevantSymptoms: string[];
  relevantBackground: string[];
};

export type DiagnosisEntry = {
  description: string | null;
  code: string | null;
  system: string | null;
  start: string | null;
  stop: string | null;
};

export type EncounterSummary = {
  encounterId: string;
  date: string | null;
};

export type PatientProfile = {
  id: string;
  firstName: string;
  lastName: string;
  birthDate: string | null;
  gender?: string | null;
  race?: string | null;
  ethnicity?: string | null;
};

/** Latest-encounter snapshot for Gemini / ElevenLabs patient simulation. */
export type PatientCaseSnapshot = {
  patient: PatientProfile;
  encounter: EncounterSummary;
  diagnoses: DiagnosisEntry[];
  observations: BucketedObservations;
  derivedContext: DerivedPatientContext;
};
