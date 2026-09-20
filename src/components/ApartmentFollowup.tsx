"use client";

import {useRef, useState} from "react";
import {CalendarDaysIcon, ChatBubbleLeftRightIcon, PencilSquareIcon} from "@heroicons/react/24/outline";
import type {Apartment, ApartmentFollowup as Followup} from "@/types/apartment.ts";
import {saveApartmentFollowup} from "@/util/apartmentClient.ts";

export default function ApartmentFollowup({apartment, onChange}: {
  apartment: Apartment;
  onChange: (result: {id: number} & Partial<Followup>) => void;
}) {
  const [notes, setNotes] = useState(apartment.notes ?? "");
  const [savedNotes, setSavedNotes] = useState(apartment.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const savingRef = useRef(false);
  const dirty = notes !== savedNotes;

  async function save(data: Partial<Followup>) {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setError("");
    setFeedback("");
    try {
      const result = await saveApartmentFollowup(apartment.id, data);
      if (result.notes !== undefined) setSavedNotes(result.notes);
      onChange(result);
      setFeedback(data.notes !== undefined ? "Notatka zapisana" : "Flaga zapisana");
    } catch {setError("Nie udało się zapisać zmian. Spróbuj ponownie.");}
    finally {savingRef.current = false; setSaving(false);}
  }

  return <section className="border-t border-gray-700 bg-gray-900/30 p-4 sm:p-5" aria-label={`Kontakt i notatka: ${apartment.title}`}>
    <h3 className="mb-3 text-sm font-semibold text-gray-200">Kontakt i oglądanie</h3>
    <div className="flex flex-wrap gap-2" role="group" aria-label="Flagi mieszkania">
      {([{key: "messageSent", label: "Wiadomość wysłana", Icon: ChatBubbleLeftRightIcon},
        {key: "viewingScheduled", label: "Umówione na oglądanie", Icon: CalendarDaysIcon}] as const).map(({key, label, Icon}) =>
        <button key={key} type="button" disabled={saving} aria-pressed={apartment[key]} onClick={() => void save({[key]: !apartment[key]})}
          className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white ${apartment[key] ? key === "viewingScheduled" ? "border-violet-300/60 bg-violet-400/20 text-violet-100" : "border-sky-300/60 bg-sky-400/20 text-sky-100" : "border-gray-600 text-gray-400 hover:bg-gray-700"}`}>
          <Icon className="h-4 w-4" aria-hidden="true"/>{apartment[key] ? "✓ " : "+ "}{label}
        </button>)}
    </div>
    <div className="mt-4">
      <label htmlFor={`notes-${apartment.id}`} className="mb-2 flex items-center gap-2 text-sm font-medium"><PencilSquareIcon className="h-4 w-4 text-gray-400" aria-hidden="true"/>Notatka</label>
      <textarea id={`notes-${apartment.id}`} rows={2} maxLength={5000} value={notes}
        onChange={event => {setNotes(event.target.value); setFeedback("");}}
        placeholder="Np. oglądanie w czwartek o 18:00, zapytać o miejsce parkingowe…"
        className="w-full resize-y rounded-xl border border-gray-600 bg-gray-900/60 p-3 text-sm leading-6 text-gray-100 placeholder:text-gray-500 focus:border-emerald-300 focus:outline-none"/>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-gray-400" role="status">{saving ? "Zapisywanie…" : dirty ? "Niezapisane zmiany w notatce" : feedback || "Flagi zapisują się od razu. Notatkę zapisz przyciskiem."}</p>
        <button type="button" disabled={saving || !dirty} onClick={() => void save({notes})}
          className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium hover:bg-emerald-600 disabled:opacity-40">Zapisz notatkę</button>
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-rose-300">{error}</p>}
    </div>
  </section>;
}
