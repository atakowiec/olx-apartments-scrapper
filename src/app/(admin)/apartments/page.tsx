"use client"

import {useEffect, useRef, useState} from "react";
import Link from "next/link";
import {CheckIcon, QuestionMarkCircleIcon, XMarkIcon, HomeModernIcon} from "@heroicons/react/24/outline";
import ApartmentCard from "@/components/ApartmentCard.tsx";
import {apartmentStatuses, apartmentSurface, compareApartmentFollowup, statusLabels, type Apartment, type ApartmentStatus, type ApartmentFollowup as Followup} from "@/types/apartment.ts";
import ApartmentPrices from "@/components/ApartmentPrices.tsx";
import SourceFilter from "@/components/SourceFilter.tsx";
import {saveApartmentStatus} from "@/util/apartmentClient.ts";
import StatusAttribution from "@/components/StatusAttribution.tsx";
import ApartmentFollowup from "@/components/ApartmentFollowup.tsx";

const statusStyles = {
  accepted: "border-emerald-400/40 bg-emerald-400/15 text-emerald-300",
  maybe: "border-amber-400/40 bg-amber-400/15 text-amber-200",
  rejected: "border-rose-400/40 bg-rose-400/15 text-rose-300",
};
const statusIcons = {accepted: CheckIcon, maybe: QuestionMarkCircleIcon, rejected: XMarkIcon};

export default function ApartmentsPage() {
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [filter, setFilter] = useState<"all" | ApartmentStatus>("accepted");
  const [counts, setCounts] = useState({all: 0, accepted: 0, maybe: 0, rejected: 0});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [announcement, setAnnouncement] = useState("");
  const [source, setSource] = useState<"all" | "olx" | "otodom">("all");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    async function load() {
      try {
        const response = await fetch(`/api/apartments?status=${filter}&source=${source}`, {signal: controller.signal, cache: "no-store"});
        if (response.status === 401) {window.location.assign("/login"); return;}
        if (!response.ok) throw new Error();
        const data = await response.json();
        if (!Array.isArray(data.apartments) || !data.counts) throw new Error();
        if (!controller.signal.aborted) {setApartments(data.apartments); setCounts(data.counts);}
      } catch {
        if (!controller.signal.aborted) setError("Nie udało się wczytać zapisanych mieszkań.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [revision, filter, source]);

  const bySource = apartments.filter(apartment => source === "all" || apartment.source === source);
  const visible = bySource.filter(apartment => filter === "all" || apartment.status === filter).sort(compareApartmentFollowup);
  function updateStatus(result: Awaited<ReturnType<typeof saveApartmentStatus>>) {
    const previous = apartments.find(apartment => apartment.id === result.id)?.status;
    if (previous && previous !== "pending" && result.status !== "pending" && previous !== result.status) {
      setCounts(current => ({...current, [previous]: current[previous] - 1, [result.status]: current[result.status as ApartmentStatus] + 1}));
    }
    setApartments(current => current.map(apartment => apartment.id === result.id ? {...apartment, ...result} : apartment));
    setAnnouncement(`Zapisano status: ${statusLabels[result.status as ApartmentStatus]}.`);
  }

  function updateFollowup(result: {id: number} & Partial<Followup>) {
    setApartments(current => current.map(apartment => apartment.id === result.id ? {...apartment, ...result} : apartment));
  }

  return <main className="mx-auto max-w-6xl px-4 py-8 sm:px-8 sm:py-12">
    <div className="flex flex-wrap items-end justify-between gap-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">Twoje poszukiwania</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Zapisane mieszkania</h1>
        <p className="mt-3 text-gray-300">Wszystkie decyzje w jednym miejscu. Porównuj oferty i zmieniaj zdanie.</p>
      </div>
      <Link href="/" className="rounded-xl border border-gray-500 px-4 py-2.5 text-sm transition hover:bg-gray-600">Przeglądaj kolejne →</Link>
    </div>

    <SourceFilter value={source} onChange={value => {if (value !== source) {setLoading(true); setSource(value);}}} includeAll/>
    <div className="my-8 grid grid-cols-2 gap-2 rounded-2xl border border-gray-600 bg-gray-900/40 p-2 sm:flex sm:flex-wrap" role="group" aria-label="Filtruj według statusu">
      {(["all", ...apartmentStatuses] as const).map(status => {
        const count = counts[status];
        const Icon = status === "all" ? HomeModernIcon : statusIcons[status];
        return <button key={status} onClick={() => {if (status !== filter) {setLoading(true); setFilter(status);}}} aria-pressed={filter === status}
          className={`flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border px-2 py-3 text-xs font-medium transition sm:gap-2 sm:px-4 sm:text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${filter === status ? status === "all" ? "border-gray-400 bg-gray-600 text-white shadow" : statusStyles[status] : "border-transparent text-gray-300 hover:bg-gray-700"}`}>
          <Icon className="h-4 w-4" aria-hidden="true"/>
          {status === "all" ? "Wszystkie" : statusLabels[status]}
          <span className="rounded-md bg-black/20 px-2 py-0.5 text-xs">{loading ? "—" : count}</span>
        </button>;
      })}
    </div>

    <p className="sr-only" role="status">{announcement}</p>
    {loading ? <p role="status" className="py-16 text-center text-gray-300">Wczytywanie mieszkań…</p>
      : error ? <div role="alert" className="rounded-2xl border border-rose-400/30 bg-rose-950/30 p-6 text-center">{error} <button onClick={() => setRevision(value => value + 1)} className="ml-2 underline">Spróbuj ponownie</button></div>
      : visible.length === 0 ? <div className="rounded-2xl border border-dashed border-gray-500 p-12 text-center">
        <HomeModernIcon className="mx-auto mb-4 h-10 w-10 text-gray-400" aria-hidden="true"/>
        <h2 className="text-xl font-medium">Brak mieszkań dla wybranych filtrów</h2>
        <p className="mt-2 text-gray-300">Wybierz inny status lub źródło. Podczas przeglądania możesz zapisać kolejne mieszkania.</p>
        <Link href="/" className="mt-6 inline-block text-emerald-300 underline underline-offset-4">Przejdź do przeglądania</Link>
      </div>
      : <><p className="mb-3 text-sm text-gray-400" role="status">Liczba ofert: {visible.length} · Kolejność: umówione oglądanie → wiadomość wysłana → pozostałe</p>
        <ul className="space-y-4">{visible.map(apartment => <ApartmentRow key={apartment.id} apartment={apartment} onStatusChange={updateStatus} onFollowupChange={updateFollowup}/>)}</ul></>}
  </main>;
}

function ApartmentRow({apartment, onStatusChange, onFollowupChange}: {apartment: Apartment; onStatusChange: (result: Awaited<ReturnType<typeof saveApartmentStatus>>) => void; onFollowupChange: (result: {id: number} & Partial<Followup>) => void}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [failedImage, setFailedImage] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const savingRef = useRef(false);
  const image = apartment.images.split("\n").map(url => url.trim()).find(Boolean);
  const surface = apartmentSurface(apartment);

  async function changeStatus(status: ApartmentStatus) {
    if (savingRef.current || status === apartment.status) return;
    savingRef.current = true;
    setSaving(true);
    setError("");
    try {
      const result = await saveApartmentStatus(apartment.id, status);
      onStatusChange(result);
    } catch {
      setError("Nie udało się zapisać statusu. Spróbuj ponownie.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  return <li className="overflow-hidden rounded-2xl border border-gray-600 bg-gray-800 shadow-sm">
    <article>
      <div className="grid grid-cols-1 gap-5 p-4 sm:grid-cols-[160px_minmax(0,1fr)] sm:p-5 lg:grid-cols-[160px_minmax(0,1fr)_auto] lg:items-center">
        <div className="flex h-44 items-center justify-center overflow-hidden rounded-xl bg-gray-700 sm:h-32">
          {image && !failedImage ? <img src={image} alt={apartment.title} loading="lazy" onError={() => setFailedImage(true)} className="h-full w-full object-cover"/>
            : <span className="text-sm text-gray-400">Brak zdjęcia</span>}
        </div>
        <div className="min-w-0">
          <p className="mb-1 text-xs font-semibold text-emerald-300">{apartment.source === "otodom" ? "Otodom · podgląd z OLX" : "OLX"}</p>
          <h2 className="text-lg font-semibold leading-snug">{apartment.title}</h2>
          <p className="mt-2 text-sm text-gray-300">{surface != null ? `${surface.toLocaleString("pl-PL")} m²` : "Powierzchnia: brak danych"}</p>
          <ApartmentPrices apartment={apartment}/>
          <a href={apartment.url} target="_blank" rel="noopener noreferrer" className="text-sm text-emerald-300 underline">Otwórz na {apartment.source === "otodom" ? "Otodom" : "OLX"} ↗</a>
        </div>
        <div className="sm:col-start-2 lg:col-start-auto">
          <p className="mb-2 text-xs text-gray-400" aria-live="polite">{saving ? "Zapisywanie…" : "Status mieszkania"}</p>
          <div role="group" aria-label={`Status: ${apartment.title}`} aria-busy={saving} className="grid grid-cols-3 gap-1 rounded-xl bg-gray-900/60 p-1 lg:flex">
            {apartmentStatuses.map(status => {
              const Icon = statusIcons[status];
              return <button key={status} disabled={saving} aria-pressed={apartment.status === status} onClick={() => changeStatus(status)}
                className={`flex flex-col items-center justify-center gap-1 rounded-lg border px-1 py-2 text-[11px] font-medium transition lg:flex-row lg:px-2.5 lg:text-xs disabled:cursor-wait disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white ${apartment.status === status ? statusStyles[status] : "border-transparent text-gray-400 hover:bg-gray-700 hover:text-white"}`}>
                <Icon className="h-4 w-4" aria-hidden="true"/>{statusLabels[status]}
              </button>;
            })}
          </div>
          {error && <p role="alert" className="mt-2 max-w-xs text-sm text-rose-300">{error}</p>}
          <StatusAttribution apartment={apartment}/>
        </div>
      </div>
      <ApartmentFollowup apartment={apartment} onChange={onFollowupChange}/>
      <details className="border-t border-gray-700" onToggle={event => setExpanded(event.currentTarget.open)}>
        <summary className="cursor-pointer px-5 py-3 text-sm font-medium text-emerald-300 transition hover:bg-gray-700/50">Zobacz wszystkie szczegóły</summary>
        {expanded && <div className="px-2 pb-4 sm:px-5 [&>div]:!m-0 [&>div]:!w-full [&>div]:!p-3">
          <ApartmentCard apartment={apartment}/>
          <a href={apartment.url} target="_blank" rel="noopener noreferrer" className="mx-3 inline-block rounded-lg bg-gray-700 px-4 py-2 text-sm hover:bg-gray-600">Otwórz ogłoszenie na {apartment.source === "otodom" ? "Otodom" : "OLX"} ↗</a>
        </div>}
      </details>
    </article>
  </li>;
}
