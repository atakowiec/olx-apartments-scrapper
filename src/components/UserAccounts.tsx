"use client";

import {useState, type FormEvent} from "react";

type User = {id: string; username: string; role: string; createdAt: string};

export default function UserAccounts({initialUsers}: {initialUsers: User[]}) {
  const [users, setUsers] = useState(initialUsers);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true); setError(""); setSuccess("");
    try {
      const response = await fetch("/api/users", {method: "POST", headers: {"Content-Type": "application/json"},
        body: JSON.stringify({username: data.get("username"), password: data.get("password")})});
      if (response.status === 401) {window.location.assign("/login"); return;}
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Nie udało się utworzyć konta.");
      setUsers(current => [...current, result]);
      setSuccess(`Utworzono konto ${result.username}. Przekaż użytkownikowi login i hasło.`);
      form.reset();
    } catch (error) {setError(error instanceof Error ? error.message : "Nie można połączyć się z serwerem.");}
    finally {setBusy(false);}
  }

  return <main className="mx-auto max-w-5xl px-4 py-10 sm:px-8">
    <p className="text-xs font-semibold uppercase tracking-widest text-emerald-300">Administracja</p>
    <h1 className="mt-2 text-3xl font-semibold">Konta użytkowników</h1>
    <p className="mt-3 text-gray-300">Użytkownicy mogą przeglądać mieszkania, zmieniać statusy i sprawdzać statystyki.</p>
    <form onSubmit={create} className="my-8 space-y-5 rounded-2xl border border-gray-600 bg-gray-800 p-6">
      <h2 className="text-xl font-medium">Utwórz konto</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <label>Login<input name="username" autoComplete="off" required minLength={3} maxLength={50} pattern="[a-zA-Z0-9_.\-]+" className="mt-2 block w-full rounded-lg bg-gray-700 p-3"/>
          <span className="mt-1 block text-xs text-gray-400">3–50 znaków: litery, cyfry, kropka, myślnik lub _.</span></label>
        <label>Hasło<input name="password" type="password" autoComplete="new-password" required minLength={12} maxLength={256} className="mt-2 block w-full rounded-lg bg-gray-700 p-3"/>
          <span className="mt-1 block text-xs text-gray-400">Minimum 12 znaków.</span></label>
      </div>
      {error && <p role="alert" className="text-rose-300">{error}</p>}
      {success && <p role="status" className="text-emerald-300">{success}</p>}
      <button disabled={busy} className="rounded-lg bg-emerald-400 px-5 py-3 font-semibold text-gray-950 disabled:opacity-50">{busy ? "Tworzenie…" : "Utwórz użytkownika"}</button>
    </form>
    <div className="overflow-x-auto rounded-2xl border border-gray-600 bg-gray-800">
      <table className="w-full text-left text-sm"><caption className="p-5 text-left text-lg font-medium">Wszystkie konta ({users.length})</caption>
        <thead className="bg-gray-900/50 text-gray-300"><tr><th className="p-4" scope="col">Login</th><th className="p-4" scope="col">Uprawnienia</th><th className="p-4" scope="col">Utworzono</th></tr></thead>
        <tbody>{users.map(user => <tr key={user.id} className="border-t border-gray-700"><th scope="row" className="p-4 font-medium">{user.username}</th><td className="p-4">{user.role === "admin" ? "Administrator" : "Użytkownik"}</td><td className="p-4">{new Date(user.createdAt).toLocaleDateString("pl-PL", {timeZone: "Europe/Warsaw"})}</td></tr>)}</tbody>
      </table>
    </div>
  </main>;
}
