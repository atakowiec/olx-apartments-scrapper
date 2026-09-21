import {randomUUID} from "node:crypto";
import {handleImportUrl} from "@/services/apartmentsService.ts";
import {initialImportProgress, type ImportJob} from "@/types/importProgress.ts";
import loggerFactory from "@/util/winstonLogger.ts";
import prisma from "@/util/prisma.ts";
import {errorMessage} from "@/util/errorMessage.ts";

const logger = loggerFactory("IMPORT");
// One scraper per Node process; persisted progress survives a process restart.
const state = globalThis as typeof globalThis & {
  olxImportJob?: ImportJob;
  olxImportRestore?: Promise<void>;
};

async function saveJob(job: ImportJob) {
  const snapshot = JSON.stringify(job);
  await prisma.importState.upsert({where: {id: 1}, create: {id: 1, snapshot}, update: {snapshot}});
}

export async function getImportJob(): Promise<ImportJob | null> {
  if (!state.olxImportRestore) {
    state.olxImportRestore = (async () => {
      if (state.olxImportJob) return;
      const saved = await prisma.importState.findUnique({where: {id: 1}});
      if (!saved) return;
      const job = JSON.parse(saved.snapshot) as ImportJob;
      if (job.status === "running") {
        job.status = "failed";
        job.error = "Import został przerwany przez zatrzymanie lub restart serwera. Zachowano ostatni zapisany postęp. Uruchom import ponownie, aby kontynuować pobieranie nowych ofert.";
        job.finishedAt = new Date().toISOString();
        await saveJob(job);
      }
      state.olxImportJob = job;
    })().catch(error => {state.olxImportRestore = undefined; throw error;});
  }
  await state.olxImportRestore;
  return state.olxImportJob ? {...state.olxImportJob} : null;
}

export async function startImport(url: string): Promise<{started: boolean; job: ImportJob}> {
  await getImportJob();
  if (state.olxImportJob?.status === "running") {
    return {started: false, job: {...state.olxImportJob}};
  }
  const previous = state.olxImportJob;
  const job: ImportJob = {
    ...initialImportProgress, id: randomUUID(), url, status: "running",
    error: null, startedAt: new Date().toISOString(), finishedAt: null,
  };
  state.olxImportJob = job;
  try {await saveJob(job);}
  catch (error) {state.olxImportJob = previous; throw error;}
  void runImport(job);
  return {started: true, job: {...job}};
}

async function runImport(job: ImportJob) {
  let failure: string | null = null;
  try {
    await handleImportUrl(job.url, async progress => {
      Object.assign(job, progress);
      await saveJob(job);
    });
    logger.info(`Imported data from ${job.url}`);
  } catch (error) {
    failure = errorMessage(error);
    logger.error(`Import failed for ${job.url}`, error);
  }
  const finalJob: ImportJob = {...job, status: failure === null ? "completed" : "failed",
    error: failure, finishedAt: new Date().toISOString()};
  // Keep the lock until the final write, so it cannot overwrite a newer import.
  try {await saveJob(finalJob);}
  catch (error) {
    finalJob.status = "failed";
    finalJob.error = [failure, `Nie udało się zapisać postępu: ${errorMessage(error)}`].filter(Boolean).join("\n");
    logger.error("Failed to persist import result", error);
  }
  Object.assign(job, finalJob);
}
