"use client";

import {useState} from "react";
import {Dialog, DialogBackdrop, DialogPanel, DialogTitle} from "@headlessui/react";
import {ArrowsPointingOutIcon, ChevronLeftIcon, ChevronRightIcon, PhotoIcon, XMarkIcon} from "@heroicons/react/24/outline";

export default function ApartmentGallery({images, title}: {images: string[]; title: string}) {
  const [active, setActive] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const move = (offset: number) => setActive(index => (index + offset + images.length) % images.length);

  if (!images.length) return <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-gray-500 bg-gray-800/50 text-gray-400"><PhotoIcon className="h-10 w-10" aria-hidden="true"/><p>Brak zdjęć w tym ogłoszeniu</p></div>;

  return <section aria-label="Zdjęcia mieszkania" className="min-w-0">
    <div className="relative overflow-hidden rounded-2xl border border-gray-600 bg-gray-950 shadow-xl shadow-gray-950/10 sm:rounded-3xl">
      <button type="button" onClick={() => setExpanded(true)} aria-label={`Powiększ zdjęcie ${active + 1}`} className="block w-full cursor-zoom-in focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-emerald-300">
        <GalleryImage key={images[active]} src={images[active]} alt={`${title} — zdjęcie ${active + 1}`} className="h-[360px] w-full object-contain sm:h-[560px] xl:h-[680px]"/>
      </button>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-gray-950/90 to-transparent px-4 pb-4 pt-14 sm:px-6 sm:pb-6">
        <span className="flex items-center gap-2 rounded-full border border-white/15 bg-gray-950/60 px-3 py-2 text-xs text-white backdrop-blur"><PhotoIcon className="h-4 w-4" aria-hidden="true"/><span aria-live="polite">{active + 1} / {images.length}</span></span>
        <button type="button" onClick={() => setExpanded(true)} className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-white/20 bg-gray-950/60 px-3 py-2 text-xs text-white backdrop-blur transition hover:bg-gray-700"><ArrowsPointingOutIcon className="h-4 w-4" aria-hidden="true"/>Powiększ</button>
      </div>
      {images.length > 1 && <>
        <button type="button" onClick={() => move(-1)} aria-label="Poprzednie zdjęcie" className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full border border-white/20 bg-gray-950/70 p-2.5 text-white backdrop-blur transition hover:bg-gray-700 sm:left-5 sm:p-3"><ChevronLeftIcon className="h-5 w-5"/></button>
        <button type="button" onClick={() => move(1)} aria-label="Następne zdjęcie" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-white/20 bg-gray-950/70 p-2.5 text-white backdrop-blur transition hover:bg-gray-700 sm:right-5 sm:p-3"><ChevronRightIcon className="h-5 w-5"/></button>
      </>}
    </div>
    {images.length > 1 && <div className="mt-3 flex gap-3 overflow-x-auto p-1 pb-3" aria-label="Wybierz zdjęcie">
      {images.map((src, index) => <button type="button" key={`${src}-${index}`} onClick={() => setActive(index)} aria-label={`Pokaż zdjęcie ${index + 1}`} aria-pressed={active === index}
        className={`relative h-20 w-28 shrink-0 overflow-hidden rounded-xl border-2 transition sm:h-24 sm:w-36 ${active === index ? "border-emerald-300 ring-2 ring-emerald-300/20" : "border-transparent opacity-60 hover:opacity-100"}`}>
        <img src={src} alt="" loading="lazy" className="h-full w-full object-cover"/><span className="absolute bottom-1 right-1 rounded bg-gray-950/80 px-1.5 py-0.5 text-[10px] text-white">{index + 1}</span>
      </button>)}
    </div>}

    <Dialog open={expanded} onClose={setExpanded} className="relative z-50" onKeyDown={event => {
      if (event.key === "ArrowLeft") {event.preventDefault(); move(-1);}
      if (event.key === "ArrowRight") {event.preventDefault(); move(1);}
    }}>
      <DialogBackdrop className="fixed inset-0 bg-gray-950/95 backdrop-blur"/>
      <div className="fixed inset-0 flex items-center justify-center p-2 sm:p-6">
        <DialogPanel className="flex h-full w-full max-w-[1800px] flex-col">
          <div className="flex shrink-0 items-center justify-between gap-4 px-2 py-3 text-white">
            <div className="min-w-0"><DialogTitle className="truncate text-sm font-medium">{title}</DialogTitle><p className="mt-1 text-xs text-gray-400" aria-live="polite">Zdjęcie {active + 1} z {images.length}</p></div>
            <button type="button" onClick={() => setExpanded(false)} aria-label="Zamknij galerię" className="rounded-full bg-white/10 p-3 transition hover:bg-white/20"><XMarkIcon className="h-6 w-6"/></button>
          </div>
          <div className="flex min-h-0 flex-1 items-center justify-center">
            <GalleryImage key={images[active]} src={images[active]} alt={`${title} — zdjęcie ${active + 1}`} className="h-full w-full object-contain"/>
          </div>
          <div className="flex shrink-0 items-center justify-center gap-5 py-4 text-white">
            {images.length > 1 && <button type="button" onClick={() => move(-1)} aria-label="Poprzednie zdjęcie" className="rounded-full border border-gray-600 p-3 hover:bg-gray-800"><ChevronLeftIcon className="h-5 w-5"/></button>}
            <a href={images[active]} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-300 underline underline-offset-4">Otwórz oryginalne zdjęcie ↗</a>
            {images.length > 1 && <button type="button" onClick={() => move(1)} aria-label="Następne zdjęcie" className="rounded-full border border-gray-600 p-3 hover:bg-gray-800"><ChevronRightIcon className="h-5 w-5"/></button>}
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  </section>;
}

function GalleryImage({src, alt, className}: {src: string; alt: string; className: string}) {
  const [failed, setFailed] = useState(false);
  return failed ? <div className={`${className} flex flex-col items-center justify-center gap-3 text-gray-400`}><PhotoIcon className="h-10 w-10" aria-hidden="true"/><span className="text-sm">Nie udało się wczytać zdjęcia.</span></div>
    : <img src={src} alt={alt} className={className} onError={() => setFailed(true)}/>;
}
