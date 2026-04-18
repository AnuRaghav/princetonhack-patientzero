/** Shared types for GET /api/cases and the problem bank UI. */

export type CaseListItem = {
  id: string;
  title: string;
  symptomCount: number;
  difficulty: "Easy" | "Medium" | "Hard";
  bucket: string;
};

export type CaseListResponse = {
  cases: CaseListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};
