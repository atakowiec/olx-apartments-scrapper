import Link from "next/link";
import {authenticatedPage} from "@/util/pageAuth.ts";
import {getStatistics} from "@/services/statistics.ts";
import {apartmentStatuses, isApartmentStatus, statusLabels} from "@/types/apartment.ts";

const colors = {accepted: "bg-emerald-400", maybe: "bg-amber-300", rejected: "bg-rose-400"};
const label = (status: string) => isApartmentStatus(status) ? statusLabels[status] : "Oczekujące";

export default async function StatsPage(props: {searchParams: Promise<{page?: string}>}) {
  const searchParams = await props.searchParams;
  await authenticatedPage();
  const {summary, history, total, page, pages, unattributed} = await getStatistics(Number(searchParams.page ?? 1));
  const maximum = Math.max(1, ...summary.map(row => row.total));
  return <main className="mx-auto max-w-6xl px-4 py-10 sm:px-8">
    <p className="text-xs font-semibold uppercase tracking-widest text-emerald-300">Aktywność zespołu</p>
    <h1 className="mt-2 text-3xl font-semibold">Statystyki statusów</h1>
    <p className="mt-3 max-w-3xl leading-7 text-gray-300">Każda zmiana statusu liczy się jako jedna decyzja. Wykres pokazuje wszystkie zapisane zmiany według użytkownika i nadanego statusu. Ponowne zapisanie tego samego statusu nie zwiększa wyniku.</p>
    <div className="my-7 grid grid-cols-2 gap-4">
      <div className="rounded-2xl border border-gray-600 bg-gray-800 p-5"><p className="text-sm text-gray-300">Zapisane zmiany</p><p className="mt-2 text-3xl font-semibold">{total}</p></div>
      <div className="rounded-2xl border border-gray-600 bg-gray-800 p-5"><p className="text-sm text-gray-300">Aktywni użytkownicy</p><p className="mt-2 text-3xl font-semibold">{summary.filter(row => row.total > 0).length}</p></div>
    </div>
    {unattributed > 0 && <p className="mb-6 rounded-xl border border-amber-300/30 bg-amber-300/5 p-4 text-sm text-amber-100">Starsze decyzje bez informacji o autorze: {unattributed}. Nie są uwzględnione w statystykach użytkowników.</p>}
    <section className="rounded-2xl border border-gray-600 bg-gray-800 p-5 sm:p-7" aria-labelledby="chart-heading">
      <h2 id="chart-heading" className="text-xl font-semibold">Liczba zmian według użytkownika</h2>
      <div className="my-5 flex flex-wrap gap-4 text-sm">{apartmentStatuses.map(status => <span key={status} className="flex items-center gap-2"><span className={`h-3 w-3 rounded-sm ${colors[status]}`} aria-hidden="true"/>{statusLabels[status]}</span>)}</div>
      {total === 0 && <p role="status" className="mb-5 text-gray-300">Brak zapisanych zmian. Nadaj status mieszkaniu, aby zobaczyć pierwsze wyniki.</p>}
      <div className="space-y-4" role="img" aria-label="Skumulowany wykres słupkowy liczby zmian statusów. Dokładne wartości znajdują się w tabeli podsumowania poniżej.">
        {summary.map(row => <div key={row.id} className="grid grid-cols-[90px_minmax(0,1fr)_36px] items-center gap-3 sm:grid-cols-[160px_minmax(0,1fr)_48px]">
          <span className="truncate text-sm" title={row.username}>{row.username}</span>
          <div className="flex h-9 overflow-hidden rounded-md bg-gray-900/60">
            {apartmentStatuses.map(status => row[status] > 0 && <div key={status} style={{width: `${row[status] / maximum * 100}%`}}
              title={`${row.username}: ${statusLabels[status]} — ${row[status]}`} className={`flex items-center justify-center overflow-hidden text-xs font-bold text-gray-950 ${colors[status]}`}>
              {row[status] / maximum > 0.07 ? row[status] : null}
            </div>)}
          </div><span className="text-right text-sm tabular-nums">{row.total}</span>
        </div>)}
      </div>
      <p className="mt-5 text-xs text-gray-400">Wspólna skala: 0–{maximum} zmian. Czas w tabeli: Europe/Warsaw.</p>
    </section>
    <div className="mt-7 overflow-x-auto rounded-2xl border border-gray-600 bg-gray-800">
      <table className="w-full text-left text-sm"><caption className="p-5 text-left text-xl font-semibold">Podsumowanie użytkowników</caption>
        <thead className="bg-gray-900/50 text-gray-300"><tr><th scope="col" className="p-4">Użytkownik</th>{apartmentStatuses.map(status => <th scope="col" key={status} className="p-4 text-right">{statusLabels[status]}</th>)}<th scope="col" className="p-4 text-right">Razem</th></tr></thead>
        <tbody>{summary.map(row => <tr key={row.id} className="border-t border-gray-700"><th scope="row" className="p-4 font-medium">{row.username}</th>{apartmentStatuses.map(status => <td key={status} className="p-4 text-right tabular-nums">{row[status]}</td>)}<td className="p-4 text-right font-semibold tabular-nums">{row.total}</td></tr>)}</tbody>
      </table>
    </div>
    <div className="mt-7 overflow-x-auto rounded-2xl border border-gray-600 bg-gray-800">
      <table className="w-full text-left text-sm"><caption className="p-5 text-left text-xl font-semibold">Historia zmian ({total})</caption>
        <thead className="bg-gray-900/50 text-gray-300"><tr>{["Data", "Użytkownik", "Mieszkanie", "Poprzedni status", "Nowy status"].map(heading => <th scope="col" key={heading} className="p-4">{heading}</th>)}</tr></thead>
        <tbody>{history.map(change => <tr key={change.id} className="border-t border-gray-700">
          <td className="whitespace-nowrap p-4"><time dateTime={change.createdAt.toISOString()}>{change.createdAt.toLocaleString("pl-PL", {timeZone: "Europe/Warsaw"})}</time></td>
          <td className="p-4">{change.user.username}</td><td className="min-w-48 p-4"><a href={change.apartmentUrl} target="_blank" rel="noopener noreferrer" className="text-emerald-300 underline">{change.apartmentTitle}</a>{change.apartmentId === null && <span className="block text-xs text-gray-400">Usunięte z aplikacji</span>}</td>
          <td className="p-4">{label(change.fromStatus)}</td><td className="p-4">{label(change.toStatus)}</td>
        </tr>)}{history.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-gray-400">Brak historii zmian.</td></tr>}</tbody>
      </table>
    </div>
    <nav aria-label="Strony historii" className="mt-5 flex items-center justify-between text-sm">
      {page > 1 ? <Link className="text-emerald-300 underline" href={`/stats?page=${page - 1}`}>← Poprzednia</Link> : <span/>}
      <span>Strona {page} z {pages}</span>
      {page < pages ? <Link className="text-emerald-300 underline" href={`/stats?page=${page + 1}`}>Następna →</Link> : <span/>}
    </nav>
  </main>;
}
