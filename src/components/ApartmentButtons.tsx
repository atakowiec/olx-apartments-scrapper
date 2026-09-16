"use client"
import type {Apartment, ApartmentStatus} from "@/types/apartment.ts";
import {CheckIcon, QuestionMarkCircleIcon, XMarkIcon} from "@heroicons/react/24/outline";
import {formatPrice} from "@/types/apartment.ts";

export default function ApartmentButtons({apartment, onStatusChange, saving}: {
  apartment: Apartment;
  onStatusChange: (status: ApartmentStatus) => void;
  saving: boolean;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-gray-500/50 bg-gray-900/95 px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_40px_rgba(0,0,0,0.15)] backdrop-blur-xl sm:px-6" aria-busy={saving}>
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6">
        <div className="hidden min-w-0 md:block"><p className="truncate text-sm font-medium text-gray-200">{apartment.title}</p><p className="mt-1 text-xs text-gray-400">{apartment.price != null && apartment.rent != null ? `${formatPrice(apartment.price + apartment.rent)} / miesiąc` : "Sprawdź koszty w ogłoszeniu"}</p></div>
        <div className="grid w-full shrink-0 grid-cols-3 gap-2 sm:gap-3 md:w-auto" role="group" aria-label="Oceń mieszkanie">
          <button disabled={saving} onClick={() => onStatusChange("rejected")} className="flex flex-col items-center justify-center gap-1 rounded-xl sm:flex-row sm:gap-2 border border-rose-300/30 bg-rose-400/10 px-2 py-2.5 text-xs font-semibold sm:py-3.5 sm:text-sm text-rose-300 transition hover:bg-rose-400/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-300 disabled:cursor-wait disabled:opacity-50 sm:px-6"><XMarkIcon className="h-5 w-5 shrink-0" aria-hidden="true"/>Odrzuć</button>
          <button disabled={saving} onClick={() => onStatusChange("maybe")} className="flex flex-col items-center justify-center gap-1 rounded-xl sm:flex-row sm:gap-2 border border-amber-300/30 bg-amber-400/10 px-2 py-2.5 text-xs font-semibold sm:py-3.5 sm:text-sm text-amber-200 transition hover:bg-amber-400/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300 disabled:cursor-wait disabled:opacity-50 sm:px-6"><QuestionMarkCircleIcon className="h-5 w-5 shrink-0" aria-hidden="true"/>Może</button>
          <button disabled={saving} onClick={() => onStatusChange("accepted")} className="flex flex-col items-center justify-center gap-1 rounded-xl sm:flex-row sm:gap-2 border border-emerald-400 bg-emerald-400 px-2 py-2.5 text-xs font-semibold sm:py-3.5 sm:text-sm text-gray-950 transition hover:bg-emerald-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white disabled:cursor-wait disabled:opacity-50 sm:px-6"><CheckIcon className="h-5 w-5 shrink-0" aria-hidden="true"/>Zaakceptuj</button>
        </div>
      </div>
      <span className="sr-only" role="status">{saving ? "Zapisywanie decyzji…" : ""}</span>
    </div>
  )
}
