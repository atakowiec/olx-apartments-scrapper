import {randomUUID} from "node:crypto";
import {handleImportUrl} from "@/services/apartmentsService.ts";
import {initialImportProgress, type ImportJob} from "@/types/importProgress.ts";
import loggerFactory from "@/util/winstonLogger.ts";

const logger = loggerFactory("IMPORT");
// Shared across route module reloads in the single Node server running the scraper.
const state = globalThis as typeof globalThis & {olxImportJob?: ImportJob};

export function getImportJob(): ImportJob | null {
  return state.olxImportJob ? {...state.olxImportJob} : null;
}

export function startImport(url: string): {started: boolean; job: ImportJob} {
  if (state.olxImportJob?.status === "running") {
    return {started: false, job: {...state.olxImportJob}};
  }
  const job: ImportJob = {
    ...initialImportProgress, id: randomUUID(), url, status: "running",
    error: null, startedAt: new Date().toISOString(), finishedAt: null,
  };
  state.olxImportJob = job;
  void handleImportUrl(url, progress => Object.assign(job, progress))
    .then(() => {
      job.status = "completed";
      logger.info(`Imported data from ${url}`);
    })
    .catch(error => {
      job.status = "failed";
      job.error = "Import nie powiódł się. Sprawdź konfigurację i logi serwera, a następnie spróbuj ponownie.";
      logger.error(`Import failed for ${url}`, error);
    })
    .finally(() => {job.finishedAt = new Date().toISOString();});
  return {started: true, job: {...job}};
}
