export type ImportProgress = {
  phase: "discovery" | "search" | "details";
  pagesTotal: number;
  pagesProcessed: number;
  pagesFailed: number;
  urlsFound: number;
  existing: number;
  apartmentsTotal: number;
  apartmentsProcessed: number;
  saved: number;
  apartmentsFailed: number;
  attempt: number;
  lastError: {message: string; url: string; attempt: number} | null;
};

export type ImportJob = ImportProgress & {
  id: string;
  url: string;
  status: "running" | "completed" | "failed";
  error: string | null;
  startedAt: string;
  finishedAt: string | null;
};

export const initialImportProgress: ImportProgress = {
  phase: "discovery", pagesTotal: 0, pagesProcessed: 0, pagesFailed: 0,
  urlsFound: 0, existing: 0, apartmentsTotal: 0, apartmentsProcessed: 0,
  saved: 0, apartmentsFailed: 0, attempt: 0, lastError: null,
};
