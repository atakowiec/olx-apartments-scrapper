import type {ImportJob} from "@/types/importProgress.ts";
import {ArrowRightIcon, CheckIcon, CircleStackIcon, ExclamationTriangleIcon, MagnifyingGlassIcon, PhotoIcon} from "@heroicons/react/24/outline";

export default function ImportProgress({job}: {job: ImportJob | null}) {
  if (!job) return <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-gray-500/70 bg-gray-800/30 px-6 py-10 text-center sm:flex-row sm:px-8 sm:text-left">
    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-gray-600 bg-gray-800 text-gray-400"><CircleStackIcon className="h-7 w-7" aria-hidden="true"/></span>
    <div><p className="font-medium text-gray-200">Brak aktywnego importu.</p><p className="mt-1 text-sm leading-6 text-gray-400">Wklej link powyżej. Tutaj zobaczysz postęp i podsumowanie pobranych ofert.</p></div>
  </div>;
  const searching = job.phase === "search";
  const total = searching ? job.pagesTotal : job.apartmentsTotal;
  const processed = searching ? job.pagesProcessed : job.apartmentsProcessed;
  const warnings = job.pagesFailed + job.apartmentsFailed;
  const title = job.status === "failed" ? "Import przerwany" : job.status === "completed"
    ? (warnings ? "Import zakończony z błędami" : "Import zakończony")
    : job.phase === "discovery" ? "Sprawdzanie liczby stron…"
    : searching ? "Wczytywanie wyników wyszukiwania" : "Wczytywanie mieszkań";
  const percent = total > 0 ? Math.min(100, Math.round(processed / total * 100)) : 0;
  const phaseIndex = ["discovery", "search", "details"].indexOf(job.phase);
  const completed = job.status === "completed";
  const attention = job.status === "failed" || warnings > 0;
  const StatusIcon = attention ? ExclamationTriangleIcon : completed ? CheckIcon : ArrowRightIcon;

  return <section className="overflow-hidden rounded-2xl border border-gray-600 bg-gray-800" aria-label="Postęp importu">
    <div className="p-5 sm:p-7">
      <div className="flex items-start gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${attention ? "bg-amber-400/10 text-amber-300" : "bg-emerald-400/10 text-emerald-300"}`}><StatusIcon className="h-5 w-5" aria-hidden="true"/></span>
        <div className="min-w-0 flex-1"><p role="status" className="font-semibold">{title}</p><p className="mt-1 break-all text-xs leading-5 text-gray-400">{job.url}</p></div>
      </div>
      <ol className="my-6 grid grid-cols-3 gap-2 sm:gap-4" aria-label="Etapy importu">
        {[{label: "Sprawdzanie", icon: MagnifyingGlassIcon}, {label: "Wyszukiwanie", icon: PhotoIcon}, {label: "Zapisywanie", icon: CircleStackIcon}].map(({label, icon: Icon}, index) => {
          const done = completed || index < phaseIndex;
          const active = !completed && index === phaseIndex;
          return <li key={label} aria-current={active ? "step" : undefined} className={`flex flex-col items-center gap-2 rounded-xl border px-2 py-3 text-[11px] sm:flex-row sm:justify-center sm:text-sm ${done ? "border-emerald-300/20 bg-emerald-400/5 text-emerald-300" : active ? "border-gray-500 bg-gray-700/60 text-gray-100" : "border-gray-700 text-gray-500"}`}>
            {done ? <CheckIcon className="h-4 w-4 shrink-0" aria-hidden="true"/> : <Icon className="h-4 w-4 shrink-0" aria-hidden="true"/>}{label}
          </li>;
        })}
      </ol>
    {job.status === "running" && <>
      {job.phase === "discovery" ? <progress className="h-2 w-full overflow-hidden rounded-full accent-emerald-400" aria-label={title}/> :
        <><div className="mb-2 flex justify-between text-xs text-gray-400"><p>{searching ? "Strony" : "Mieszkania"}: {processed} / {total}</p><span className="font-semibold text-emerald-300">{percent}%</span></div>
          <progress className="block h-2 w-full overflow-hidden rounded-full accent-emerald-400 [&::-webkit-progress-bar]:bg-gray-700 [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-emerald-400 [&::-moz-progress-bar]:bg-emerald-400" aria-label={title} max={Math.max(total, 1)} value={processed}/></>}
      {job.attempt > 1 && <p className="mt-3 text-xs text-amber-300">Ponowna próba: {job.attempt} / 5</p>}
    </>}
    <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {[{label: "Znalezione ogłoszenia", value: job.urlsFound}, {label: "Już w bazie", value: job.existing}, {label: "Zapisane mieszkania", value: job.saved, highlight: true}, {label: "Pominięte (błędy)", value: warnings}].map(({label, value, highlight}) =>
        <div key={label} className={`rounded-xl border p-4 ${highlight ? "border-emerald-300/20 bg-emerald-400/5" : "border-gray-700 bg-gray-900/30"}`}><dt className="text-xs leading-5 text-gray-400">{label}</dt><dd className={`mt-2 text-2xl font-semibold tabular-nums ${highlight ? "text-emerald-300" : "text-gray-100"}`}>{value}</dd></div>)}
    </dl>
    <dl className="mt-5 grid gap-x-8 gap-y-2 text-xs text-gray-400 sm:grid-cols-2">
      <div className="flex justify-between gap-4"><dt>Sprawdzone strony</dt><dd className="tabular-nums text-gray-300">{job.pagesProcessed} / {job.pagesTotal}</dd></div>
      <div className="flex justify-between gap-4"><dt>Sprawdzone nowe mieszkania</dt><dd className="tabular-nums text-gray-300">{job.apartmentsProcessed} / {job.apartmentsTotal}</dd></div>
      {warnings > 0 && <><div className="flex justify-between gap-4"><dt>Pominięte strony (błędy)</dt><dd className="text-amber-300">{job.pagesFailed}</dd></div><div className="flex justify-between gap-4"><dt>Pominięte mieszkania (błędy)</dt><dd className="text-amber-300">{job.apartmentsFailed}</dd></div></>}
    </dl>
    {job.error && <p role="alert" className="mt-5 rounded-xl border border-rose-300/20 bg-rose-400/10 p-4 text-sm text-rose-300">{job.error}</p>}
    </div>
    {job.status === "completed" && job.saved > 0 &&
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-gray-700 bg-gray-900/20 px-5 py-4 sm:px-7"><p className="text-sm text-gray-300">Nowe oferty czekają na Twoją decyzję.</p><a href="/" className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-gray-950 transition hover:bg-emerald-300">Przejrzyj mieszkania<ArrowRightIcon className="h-4 w-4" aria-hidden="true"/></a></div>}
  </section>;
}
