import type {Apartment} from "@/types/apartment.ts";

export default function StatusAttribution({apartment}: {apartment: Pick<Apartment, "status" | "statusSetBy" | "statusSetAt">}) {
  if (apartment.status === "pending") return null;
  return <p className="mt-3 text-xs leading-5 text-gray-300">
    Status ustawił(a): <span className="font-semibold">{apartment.statusSetBy?.username ?? "Nieznany autor (starszy zapis)"}</span>
    {apartment.statusSetAt && <> · <time dateTime={apartment.statusSetAt}>{new Date(apartment.statusSetAt).toLocaleString("pl-PL", {timeZone: "Europe/Warsaw"})}</time></>}
  </p>;
}
