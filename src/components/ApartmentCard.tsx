import type {DetailsType} from "@/services/apartmentsService.ts";
import {apartmentSurface, formatPrice} from "@/types/apartment.ts";
import {ArrowTopRightOnSquareIcon, BanknotesIcon, DocumentTextIcon, HomeModernIcon, PhotoIcon, Square3Stack3DIcon} from "@heroicons/react/24/outline";
import ApartmentGallery from "@/components/ApartmentGallery.tsx";

export type PropsWithApartment = {
  apartment: DetailsType
}

export default function ApartmentCard({apartment}: PropsWithApartment) {
  const surface = apartmentSurface(apartment);
  const images = Array.from(new Set(apartment.images.split("\n").map(url => url.trim()).filter(Boolean)));
  const source = apartment.source === "otodom" ? "Otodom" : "OLX";
  const completePrice = apartment.price != null && apartment.rent != null;

  return <article className="min-w-0 space-y-6 sm:space-y-8">
    <header>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300"><HomeModernIcon className="h-4 w-4" aria-hidden="true"/>Znajdź swoje miejsce</p>
        <a href={apartment.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full border border-gray-500 bg-gray-800/40 px-3 py-2 text-xs text-gray-200 transition hover:border-emerald-300/60 hover:text-emerald-300">Ogłoszenie {source}<ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" aria-hidden="true"/></a>
      </div>
      <h1 className="max-w-5xl break-words text-2xl font-semibold leading-tight tracking-tight sm:text-4xl sm:leading-tight">{apartment.title}</h1>
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-gray-300">
        <span className="inline-flex items-center gap-2"><Square3Stack3DIcon className="h-4 w-4 text-gray-400" aria-hidden="true"/>{surface != null ? `${surface.toLocaleString("pl-PL")} m²` : "Powierzchnia: brak danych"}</span>
        <span className="inline-flex items-center gap-2"><PhotoIcon className="h-4 w-4 text-gray-400" aria-hidden="true"/>Liczba zdjęć: {images.length}</span>
        {apartment.source === "otodom" && <span className="text-amber-200">Podgląd z wyników OLX</span>}
      </div>
    </header>

    <dl className="grid grid-cols-2 gap-3 lg:grid-cols-[1.35fr_1fr_1fr_1fr]">
      <div className="col-span-2 rounded-2xl border border-emerald-300/25 bg-gradient-to-br from-emerald-400/10 to-gray-800 p-5 lg:col-span-1">
        <dt className="text-sm text-emerald-200">{completePrice ? "Łącznie / miesiąc" : "Cena z ogłoszenia"}</dt>
        <dd className="mt-2 text-3xl font-semibold tracking-tight text-white">{completePrice ? formatPrice(apartment.price! + apartment.rent!) : apartment.price != null ? formatPrice(apartment.price) : "Brak danych"}</dd>
        {!completePrice && <p className="mt-2 text-xs text-amber-200">Pełny koszt do sprawdzenia w ogłoszeniu.</p>}
      </div>
      {[{label: "Cena najmu", value: apartment.price != null ? formatPrice(apartment.price) : "Brak danych"},
        {label: "Czynsz dodatkowy", value: apartment.rent != null ? formatPrice(apartment.rent) : "Brak danych"},
        {label: "Powierzchnia", value: surface != null ? `${surface.toLocaleString("pl-PL")} m²` : "Brak danych"}].map(({label, value}, index) =>
        <div key={label} className={`rounded-2xl border border-gray-600 bg-gray-800/70 p-5 ${index === 2 ? "col-span-2 lg:col-span-1" : ""}`}><dt className="text-sm text-gray-400">{label}</dt><dd className="mt-2 text-xl font-semibold text-gray-100 sm:text-2xl">{value}</dd></div>)}
    </dl>

    {apartment.source === "otodom" && <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-amber-300/20 bg-amber-400/5 p-5">
      <p className="max-w-3xl text-sm leading-6 text-gray-300">Dane pochodzą z listy wyników OLX. Pełny opis i pozostałe zdjęcia znajdziesz na Otodom. Po obejrzeniu oferty wróć tutaj, aby zapisać decyzję.</p>
      <a href={apartment.url} target="_blank" rel="noopener noreferrer" className="shrink-0 rounded-xl bg-gray-800 px-4 py-3 text-sm font-medium text-emerald-300 hover:bg-gray-600">Otwórz ogłoszenie na Otodom ↗</a>
    </div>}

    <ApartmentGallery key={apartment.url} images={images} title={apartment.title}/>

    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section className="min-w-0 rounded-2xl border border-gray-600 bg-gray-800 p-5 sm:p-8" aria-label="Opis mieszkania">
        <h2 className="mb-5 flex items-center gap-3 text-xl font-semibold"><DocumentTextIcon className="h-5 w-5 text-emerald-300" aria-hidden="true"/>{apartment.source === "otodom" ? "Informacje z listy wyników" : "Opis mieszkania"}</h2>
        <p className="whitespace-pre-line break-words text-base leading-8 text-gray-200">{apartment.description.trim() || "Brak opisu w zapisanym ogłoszeniu. Sprawdź szczegóły u źródła."}</p>
      </section>
      <aside className="rounded-2xl border border-gray-600 bg-gray-800/60 p-5 sm:p-6" aria-label="Podsumowanie kosztów">
        <h2 className="flex items-center gap-2 font-semibold"><BanknotesIcon className="h-5 w-5 text-emerald-300" aria-hidden="true"/>Koszty w jednym miejscu</h2>
        <dl className="mt-5 space-y-4 text-sm">
          <div className="flex justify-between gap-3"><dt className="text-gray-400">Cena najmu</dt><dd>{apartment.price != null ? formatPrice(apartment.price) : "Brak danych"}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-gray-400">Czynsz dodatkowy</dt><dd>{apartment.rent != null ? formatPrice(apartment.rent) : "Brak danych"}</dd></div>
          <div className="border-t border-gray-600 pt-4"><dt className="text-gray-300">{completePrice ? "Łącznie / miesiąc" : "Łączny koszt"}</dt><dd className="mt-2 text-2xl font-semibold text-emerald-300">{completePrice ? formatPrice(apartment.price! + apartment.rent!) : "Do sprawdzenia"}</dd></div>
        </dl>
        <p className="mt-4 text-xs leading-5 text-gray-400">Kaucję, media i inne opłaty sprawdź w opisie ogłoszenia.</p>
        <a href={apartment.url} target="_blank" rel="noopener noreferrer" className="mt-5 flex items-center justify-center gap-2 rounded-xl border border-gray-500 px-4 py-3 text-sm transition hover:bg-gray-700">Zobacz na {source}<ArrowTopRightOnSquareIcon className="h-4 w-4" aria-hidden="true"/></a>
      </aside>
    </div>
  </article>;
}
