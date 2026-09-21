"use client";

import {FormEvent, useEffect, useRef, useState} from "react";
import axios from "@/axios/axios.ts";
import {Dialog, DialogBackdrop, DialogPanel, DialogTitle} from "@headlessui/react";
import {ArrowDownTrayIcon, ArrowRightIcon, CheckIcon, LinkIcon, MagnifyingGlassIcon, Squares2X2Icon, TrashIcon, XMarkIcon} from "@heroicons/react/24/outline";
import ImportProgress from "@/components/ImportProgress.tsx";
import type {ImportJob} from "@/types/importProgress.ts";
import {requestErrorMessage} from "@/util/errorMessage.ts";

export default function Page() {
  const [modalVisible, setModalVisible] = useState(false)
  const [message, setMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const urlRef = useRef<HTMLInputElement | null>(null)
  const [job, setJob] = useState<ImportJob | null>(null);
  const [starting, setStarting] = useState(false);
  const [statusReady, setStatusReady] = useState(false);
  const [progressError, setProgressError] = useState("");
  const revision = useRef(0);
  const submitting = useRef(false);
  const busy = starting || job?.status === "running";

  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      const requestRevision = revision.current;
      try {
        if (submitting.current) return;
        const response = await axios.get<{job: ImportJob | null}>("/api/apartments/import", {signal: controller.signal});
        if (!controller.signal.aborted && requestRevision === revision.current) {
          // A transient empty response must not erase a result already shown.
          if (response.data.job) setJob(response.data.job);
          setStatusReady(true);
          setProgressError("");
        }
      } catch (error) {
        if (!controller.signal.aborted && requestRevision === revision.current) {
          setProgressError(`Nie można odczytać postępu. Ponawiam połączenie…\n${requestErrorMessage(error)}`);
          setStatusReady(false);
        }
      } finally {
        if (!controller.signal.aborted) timer = setTimeout(poll, 2000);
      }
    }
    void poll();
    return () => {controller.abort(); clearTimeout(timer);};
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault()

    if (!urlRef.current?.value || busy || submitting.current || !statusReady) {
      return
    }

    const url = urlRef.current?.value
    submitting.current = true;
    revision.current++;
    setStarting(true);
    setMessage("");
    setActionError("");

    try {
      const response = await axios.post<{job: ImportJob}>('/api/apartments/import', {url}, {
        validateStatus: status => status === 202 || status === 409
      });
      setJob(response.data.job);
      setProgressError("");
      if (response.status === 409) setMessage("Import już trwa. Poniżej widzisz jego postęp.");
    } catch (error) {
      setActionError(`Nie udało się rozpocząć importu.\n${requestErrorMessage(error)}`);
    } finally {
      submitting.current = false;
      setStarting(false);
    }
  }

  async function clearDatabase() {
    setMessage("");
    setActionError("");
    try {
      await axios.delete('/api/apartments');
      setMessage("Baza danych została wyczyszczona.");
    } catch (error) {
      setActionError(`Nie udało się wyczyścić bazy.\n${requestErrorMessage(error)}`);
    }
  }

  return (
    <>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-8 sm:py-12">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">Więcej ofert. Więcej możliwości.</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Dodaj mieszkania</h1>
            <p className="mt-3 max-w-xl text-gray-300">Przenieś wyniki wyszukiwania z OLX i znajdź miejsce dla siebie.</p>
          </div>
          <a href="/apartments" className="inline-flex items-center gap-2 rounded-xl border border-gray-500 px-4 py-2.5 text-sm transition hover:bg-gray-600">
            <Squares2X2Icon className="h-4 w-4" aria-hidden="true"/>Zapisane mieszkania
          </a>
        </div>

        <section aria-labelledby="import-heading" className="relative overflow-hidden rounded-3xl border border-emerald-300/20 bg-gray-800 shadow-xl shadow-gray-950/10">
          <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-36 h-96 w-96 rounded-full bg-emerald-400/10 blur-3xl"/>
          <div className="relative grid lg:grid-cols-[1.4fr_1fr]">
            <div className="p-6 sm:p-8">
              <span className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-300/20 bg-emerald-400/10 text-emerald-300"><ArrowDownTrayIcon className="h-6 w-6" aria-hidden="true"/></span>
              <h2 id="import-heading" className="text-xl font-semibold sm:text-2xl">Jedno wyszukiwanie, wszystkie oferty</h2>
              <p className="mt-2 text-sm leading-6 text-gray-400">Wklej link do wyników wyszukiwania. Pobierzemy opisy, zdjęcia i ceny mieszkań, żeby łatwiej je porównać.</p>
              <form className="mt-7" onSubmit={onSubmit}>
                <label htmlFor="url" className="mb-2 block text-sm font-medium text-gray-200">Link do wyszukiwania na OLX</label>
                <div className="relative">
                  <LinkIcon className="pointer-events-none absolute left-4 top-4 h-5 w-5 text-gray-500" aria-hidden="true"/>
                  <input className="w-full min-w-0 rounded-xl border border-gray-600 bg-gray-900/70 py-4 pl-12 pr-4 text-sm text-gray-100 outline-none transition placeholder:text-gray-500 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 disabled:opacity-50"
                    type="url" id="url" ref={urlRef} required aria-describedby="url-hint" disabled={busy || !statusReady}
                    defaultValue="https://www.olx.pl/nieruchomosci/mieszkania/wynajem/lublin/"/>
                </div>
                <p id="url-hint" className="mt-2 text-xs leading-5 text-gray-400">Użyj pierwszej strony wyników z wybranym miastem i filtrami.</p>
                <button type="submit" disabled={busy || !statusReady} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-5 py-3.5 text-sm font-semibold text-gray-950 shadow-lg shadow-emerald-950/20 transition hover:bg-emerald-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-300 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">
                  <ArrowDownTrayIcon className="h-5 w-5" aria-hidden="true"/>
                  {starting ? "Uruchamianie…" : job?.status === "running" ? "Import w toku…" : "Wczytaj mieszkania"}
                  {!busy && <ArrowRightIcon className="ml-2 h-4 w-4" aria-hidden="true"/>}
                </button>
              </form>
              {message && <p role="status" className="mt-5 rounded-xl border border-gray-600 bg-gray-700/50 p-4 text-sm leading-6 text-gray-200">{message}</p>}
              {actionError && <p role="alert" className="mt-5 whitespace-pre-wrap break-words rounded-xl border border-rose-300/30 bg-rose-400/10 p-4 text-sm leading-6 text-rose-200">{actionError}</p>}
            </div>
            <aside className="border-t border-gray-700 bg-gray-900/25 p-6 sm:p-8 lg:border-l lg:border-t-0" aria-label="Jak dodać mieszkania">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Od wyszukiwania do decyzji</p>
              <ol className="mt-7 space-y-7">
                {[
                  {icon: MagnifyingGlassIcon, title: "Wybierz swoje kryteria", text: "Na OLX ustaw lokalizację, budżet i pozostałe filtry."},
                  {icon: LinkIcon, title: "Wklej link i rozpocznij import", text: "Skopiuj adres wyników. Postęp zobaczysz na bieżąco poniżej."},
                  {icon: CheckIcon, title: "Zdecyduj, co zostaje", text: "Przeglądaj mieszkania i wybieraj: Zaakceptuj, Może lub Odrzuć."},
                ].map(({icon: Icon, title, text}, index) => <li key={title} className="flex gap-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-600 bg-gray-800 text-emerald-300"><Icon className="h-5 w-5" aria-hidden="true"/></span>
                  <div><h3 className="text-sm font-medium"><span className="mr-2 text-gray-500">0{index + 1}</span>{title}</h3><p className="mt-1.5 text-sm leading-6 text-gray-400">{text}</p></div>
                </li>)}
              </ol>
              <p className="mt-8 flex items-center gap-2 border-t border-gray-700 pt-5 text-xs text-gray-400"><CheckIcon className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true"/>Oferty już zapisane w bazie pomijamy.</p>
            </aside>
          </div>
        </section>

        <section className="mt-9" aria-labelledby="progress-heading">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 id="progress-heading" className="text-lg font-semibold">Postęp importu</h2>
            <span className="flex items-center gap-2 text-xs text-gray-400"><span className={`h-1.5 w-1.5 rounded-full ${busy ? "bg-emerald-400 motion-safe:animate-pulse" : "bg-gray-500"}`}/>{busy ? "Aktualizowany na żywo" : "Twoja ostatnia aktywność"}</span>
          </div>
          {progressError && <p role="alert" className="mb-4 whitespace-pre-wrap break-words rounded-xl border border-rose-300/30 bg-rose-400/10 p-4 text-sm text-rose-200">{progressError}</p>}
          {!statusReady && !progressError && <p role="status" className="rounded-2xl border border-gray-600 bg-gray-800/50 p-8 text-center text-sm text-gray-400">Odczytywanie stanu importu…</p>}
          {(statusReady || job) && <ImportProgress job={job}/>}
        </section>

        <section className="mt-9 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-gray-600/70 px-5 py-5 sm:px-6" aria-labelledby="database-heading">
          <div><h2 id="database-heading" className="text-sm font-medium text-gray-200">Zacznij od nowa</h2><p className="mt-1 text-xs leading-5 text-gray-400">Usuń wszystkie mieszkania i zapisane decyzje z bazy.</p></div>
          <button type="button" disabled={busy || !statusReady} onClick={() => setModalVisible(true)} className="inline-flex items-center gap-2 rounded-lg border border-rose-300/20 px-4 py-2.5 text-xs font-medium text-rose-300 transition hover:border-rose-300/40 hover:bg-rose-400/10 disabled:cursor-not-allowed disabled:opacity-40"><TrashIcon className="h-4 w-4" aria-hidden="true"/>Wyczyść bazę danych</button>
        </section>
      </main>

      <Dialog open={modalVisible} onClose={setModalVisible} className="relative z-50">
        <DialogBackdrop className="fixed inset-0 bg-gray-950/80 backdrop-blur-sm"/>
        <div className="fixed inset-0 flex items-center justify-center overflow-y-auto p-4">
          <DialogPanel className="relative w-full max-w-md rounded-2xl border border-gray-600 bg-gray-800 p-6 shadow-2xl">
            <button onClick={() => setModalVisible(false)} aria-label="Zamknij" className="absolute right-4 top-4 rounded-lg p-2 text-gray-400 hover:bg-gray-700 hover:text-white"><XMarkIcon className="h-5 w-5"/></button>
            <span className="mb-5 inline-flex rounded-xl bg-rose-400/10 p-3 text-rose-300"><TrashIcon className="h-6 w-6" aria-hidden="true"/></span>
            <DialogTitle className="text-xl font-semibold">Wyczyścić bazę danych?</DialogTitle>
            <p className="mt-3 text-sm leading-6 text-gray-300">Wszystkie mieszkania i ich statusy zostaną usunięte. Tej operacji nie można cofnąć.</p>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button data-autofocus onClick={() => setModalVisible(false)} className="rounded-xl border border-gray-500 px-4 py-2.5 text-sm hover:bg-gray-700">Anuluj</button>
              <button onClick={() => {setModalVisible(false); void clearDatabase();}} className="rounded-xl bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-600">Usuń mieszkania</button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </>
  )
}
