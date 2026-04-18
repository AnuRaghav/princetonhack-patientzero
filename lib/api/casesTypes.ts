/** Shared types for GET /api/cases and the problem bank UI. */

export type CaseListItem = {
  id: string;
  title: string;
  symptomCount: number;
  difficulty: "Easy" | "Medium" | "Hard";
  bucket: string;
  /** Short, de-spoilered "chief complaint" string built from the first few symptoms.
   *  Safe to show in the UI — never contains the disease name. */
  chiefComplaintPreview: string;
};

export type CaseListResponse = {
  cases: CaseListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};
