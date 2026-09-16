import type {Apartment, ApartmentStatus} from "@/types/apartment.ts";

export async function saveApartmentStatus(id: number, status: ApartmentStatus) {
  const response = await fetch(`/api/apartments/${id}`, {
    method: "PATCH",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({status}),
  });
  if (response.status === 401) window.location.assign("/login");
  if (!response.ok) throw new Error("Nie udało się zapisać statusu. Spróbuj ponownie.");
  return await response.json() as Pick<Apartment, "id" | "status" | "statusSetBy" | "statusSetAt">;
}
