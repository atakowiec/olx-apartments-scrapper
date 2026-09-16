"use client"

import {useEffect, useRef, useState} from "react";
import ApartmentCard from "@/components/ApartmentCard.tsx";
import ApartmentButtons from "@/components/ApartmentButtons.tsx";
import type {Apartment, ApartmentStatus} from "@/types/apartment.ts";
import {saveApartmentStatus} from "@/util/apartmentClient.ts";
import SourceFilter from "@/components/SourceFilter.tsx";

export default function Home() {
  const [apartment, setApartment] = useState<Apartment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [revision, setRevision] = useState(0);
  const [source, setSource] = useState<"olx" | "otodom">("olx");
  const savingRef = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    async function loadApartment() {
      try {
        const response = await fetch(`/api/apartments/random?source=${source}`, {signal: controller.signal, cache: "no-store"});
        if (response.status === 401) {window.location.assign("/login"); return;}
        if (response.status === 404) {if (!controller.signal.aborted) setApartment(null); return;}
        if (!response.ok) throw new Error("Failed to load apartment");
        const data = await response.json();
        if (!data || !Number.isSafeInteger(data.id) || typeof data.description !== "string" || typeof data.images !== "string" ||
            typeof data.title !== "string" || typeof data.url !== "string" ||
            (data.price !== null && typeof data.price !== "number") || (data.rent !== null && typeof data.rent !== "number")) {
          throw new Error("Invalid apartment response");
        }
        if (!controller.signal.aborted) setApartment(data);
      } catch {
        if (!controller.signal.aborted) setError("Nie udało się wczytać mieszkania. Spróbuj odświeżyć stronę.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void loadApartment();
    return () => controller.abort();
  }, [revision, source]);

  async function changeStatus(status: ApartmentStatus) {
    if (!apartment || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setSaveError("");
    try {
      await saveApartmentStatus(apartment.id, status);
      setApartment(null);
      setLoading(true);
      setRevision(value => value + 1);
      window.scrollTo({top: 0});
    } catch {
      setSaveError("Nie udało się zapisać statusu. Spróbuj ponownie.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  return <><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 pt-7 sm:px-8 [&>div]:my-0"><p className="text-sm font-medium text-gray-300">Przeglądaj mieszkania</p><SourceFilter value={source} disabled={saving} onChange={value => {
    if (value === "all" || value === source || savingRef.current) return;
    setApartment(null);
    setLoading(true);
    setSaveError("");
    setSource(value);
  }}/></div>
    {loading ? <p className="text-center mt-12" role="status">Wczytywanie mieszkań…</p>
      : error ? <p className="text-center mt-12" role="alert">{error} <button className="underline" onClick={() => setRevision(value => value + 1)}>Spróbuj ponownie</button></p>
      : !apartment ? <><p className="text-center mt-12">Brak mieszkań {source === "otodom" ? "Otodom" : "OLX"} do przejrzenia. Wybierz inne źródło lub poproś administratora o import kolejnych ofert.</p><p className="text-center mt-4"><a href="/apartments" className="text-emerald-300 underline">Zobacz zapisane mieszkania →</a></p></>
      : <><main className="mx-auto max-w-7xl px-4 pt-4 pb-32 sm:px-8 sm:pt-6"><ApartmentCard apartment={apartment}/></main>
    {saveError && <p role="alert" className="fixed bottom-20 inset-x-4 z-30 rounded-lg bg-rose-950 p-3 text-center text-rose-100">{saveError}</p>}
    <ApartmentButtons apartment={apartment} onStatusChange={changeStatus} saving={saving}/></>}</>;
}
