/** Structured patient snapshot for Gemini voice simulation (latest encounter only). */

export type PatientProfile = {
  id: string;
  firstName: string;
  lastName: string;
  birthDate: string | null;
  gender: string | null;
  race: string | null;
  ethnicity: string | null;
};

export type EncounterSummary = {
  encounterId: string;
  date: string | null;
};

export type DiagnosisEntry = {
  description: string | null;
  code: string | null;
  system: string | null;
  start: string | null;
  stop: string | null;
};

export type SymptomOrMeasureObservation = {
  description: string;
  value: string;
  units: string | null;
  date: string | null;
};

export type QuestionAnswerObservation = {
  question: string;
  answer: string;
  /** Optional shorthand for prompts, e.g. transportation_barrier → yes */
  key?: string;
};

export type DerivedPatientContext = {
  likelyChiefComplaint: string;
  relevantSymptoms: string[];
  relevantBackground: string[];
};

export type BucketedObservations = {
  symptoms: SymptomOrMeasureObservation[];
  vitals: SymptomOrMeasureObservation[];
  labs: SymptomOrMeasureObservation[];
  socialContext: QuestionAnswerObservation[];
  screeningAnswers: QuestionAnswerObservation[];
};

export type PatientCaseSnapshot = {
  patient: PatientProfile;
  encounter: EncounterSummary;
  diagnoses: DiagnosisEntry[];
  observations: BucketedObservations;
  derivedContext: DerivedPatientContext;
};
