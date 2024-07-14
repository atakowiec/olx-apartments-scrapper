"use client";

import {FormEvent, useRef} from "react";
import axios from "../../axios/axios.ts";
import Button from "@/components/Button.tsx";

export default function Page() {
  const urlRef = useRef<HTMLInputElement | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()

    if (!urlRef.current?.value) {
      return
    }

    const url = urlRef.current?.value

    const res = await axios.post('/api/import', {url})

    console.log(res.data)
  }

  async function clearDatabase() {
    await axios.delete('/apartments')
  }

  return (
    <div className={"text-center mt-12"}>
      <h1>Wczytaj mieszkania</h1>
      <form className={"my-4"} onSubmit={onSubmit}>
        <label htmlFor={"url"} className="block text-gray-700 text-sm font-bold mb-2">
          Podaj url do pierwszej strony z wynikami wyszukiwania mieszkań na olx.pl
        </label>
        <input
          className="shadow appearance-none border border-red-500 rounded py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline mt-5"
          type="text"
          id="url"
          ref={urlRef}
        />
        <br/>
        <Button>
          Wczytaj
        </Button>
      </form>
      <h4 className={"mt-12"}>
        Opcje
      </h4>
      <Button onClick={clearDatabase}>
        Wyczyść bazę danych
      </Button>
      <h4 className={"mt-12"}>
        Progress
      </h4>
      *here we will display the progress of the import*
    </div>
  )
}