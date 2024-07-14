"use client";

import {FormEvent, useRef} from "react";
import axios from "../../axios/axios.ts";

export default function Page() {
  const urlRef = useRef<HTMLInputElement | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()

    if (!urlRef.current?.value) {
      return
    }

    const url = urlRef.current?.value

    await axios.post('/apartments/import', {url})
  }

  async function clearDatabase() {
    await axios.delete('/apartments')
  }

  return (
    <div className={"text-center col-12 mt-5"}>
      <h1>Wczytaj mieszkania</h1>
      <p className={"mt-5"}>
        Podaj url do pierwszej strony z wynikami wyszukiwania mieszkań na olx.pl
      </p>
      <form className={"col-11 col-md-6 col-xxl-3 mx-auto"} onSubmit={onSubmit}>
        <input type={"text"} ref={urlRef}/>
        <button className={"btn btn-primary mt-3"}>Wczytaj</button>
      </form>
      <h4 className={"mt-5"}>
        Opcje
      </h4>
      <button className={"btn btn-outline-primary mt-3"} onClick={clearDatabase}>Wyczyść bazę danych</button>
      <h4 className={"mt-5"}>
        Progress
      </h4>
      *here we will display the progress of the import*
    </div>
  )
}