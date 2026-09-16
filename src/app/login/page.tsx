"use client";

import {useState, type FormEvent} from "react";

export default function Login() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {method: "POST", headers: {"Content-Type": "application/json"},
        body: JSON.stringify({username: data.get("username"), password: data.get("password")})});
      if (!response.ok) {
        const body = await response.json();
        setError(body.error ?? "Logowanie nie powiodło się.");
      } else window.location.assign("/");
    } catch {setError("Nie można połączyć się z serwerem.");}
    finally {setBusy(false);}
  }
  return <main className="mx-auto mt-20 max-w-sm rounded bg-gray-800 p-8">
    <h1 className="mb-3 text-2xl font-bold">Zaloguj się</h1>
    <p className="mb-6 text-sm text-gray-300">Użyj konta otrzymanego od administratora.</p>
    <form onSubmit={login} className="space-y-4">
      <label className="block">Login<input name="username" autoComplete="username" required maxLength={200}
        className="mt-1 w-full rounded bg-gray-600 p-2"/></label>
      <label className="block">Hasło<input name="password" type="password" autoComplete="current-password" required maxLength={1000}
        className="mt-1 w-full rounded bg-gray-600 p-2"/></label>
      {error && <p role="alert" className="text-red-300">{error}</p>}
      <button disabled={busy} className="w-full rounded bg-blue-600 p-2 disabled:opacity-50">{busy ? "Logowanie…" : "Zaloguj się"}</button>
    </form>
  </main>;
}
