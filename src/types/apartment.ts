export const apartmentStatuses = ["accepted", "maybe", "rejected"] as const;
export type ApartmentStatus = typeof apartmentStatuses[number];

export const statusLabels: Record<ApartmentStatus, string> = {
  accepted: "Zaakceptowane",
  maybe: "Może",
  rejected: "Odrzucone",
};

export type Apartment = {
  id: number;
  title: string;
  description: string;
  images: string;
  url: string;
  price: number | null;
  rent: number | null;
  source: "olx" | "otodom";
  loaded: boolean;
  surfaceArea: number | null;
  status: "pending" | ApartmentStatus;
  messageSent: boolean;
  viewingScheduled: boolean;
  notes: string;
  statusSetBy?: {id: string; username: string} | null;
  statusSetAt?: string | null;
};

export type ApartmentFollowup = Pick<Apartment, "messageSent" | "viewingScheduled" | "notes">;

export function compareApartmentFollowup(a: Apartment, b: Apartment): number {
  return Number(b.viewingScheduled) - Number(a.viewingScheduled) ||
    Number(b.messageSent) - Number(a.messageSent) || b.id - a.id;
}

export function isApartmentStatus(value: unknown): value is ApartmentStatus {
  return typeof value === "string" && apartmentStatuses.some(status => status === value);
}

export function extractSurfaceArea(text: string): number | null {
  const match = text.match(/(?:powierzchnia\s*:?\s*)?(\d+(?:[.,]\d+)?)\s*m(?:²|2|\^2)(?!\w)/i);
  const area = match ? Number(match[1].replace(",", ".")) : NaN;
  return Number.isFinite(area) && area > 0 ? area : null;
}

export function apartmentSurface(apartment: {surfaceArea?: number | null; title: string; description: string}) {
  return apartment.surfaceArea ?? extractSurfaceArea(`${apartment.title}\n${apartment.description}`);
}

export const formatPrice = (price: number) => new Intl.NumberFormat("pl-PL", {
  style: "currency", currency: "PLN", maximumFractionDigits: 0,
}).format(price);
