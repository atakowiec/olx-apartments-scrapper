import {formatPrice} from "@/types/apartment.ts";

export default function ApartmentPrices({apartment}: {apartment: {price: number | null; rent: number | null; source?: string}}) {
  const {price, rent} = apartment;
  const complete = price != null && rent != null;
  return <div className="my-4">
    <p className="text-xl font-semibold">{complete ? `${formatPrice(price + rent)} / miesiąc`
      : price != null ? `${formatPrice(price)} · cena z ogłoszenia` : "Cena: brak danych"}</p>
    <p className="mt-1 text-sm text-gray-400">Cena {price != null ? formatPrice(price) : "nieznana"} + czynsz {rent != null ? formatPrice(rent) : "nieznany"}</p>
    {!complete && <p className="mt-1 text-sm text-amber-200">Pełny koszt miesięczny do sprawdzenia w ogłoszeniu.</p>}
  </div>;
}
