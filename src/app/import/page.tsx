"use client";

import {FormEvent, useRef, useState} from "react";
import axios from "../../axios/axios.ts";
import Button from "@/components/Button.tsx";
import Modal, {ModalParagraph} from "@/components/Modal.tsx";

export default function Page() {
  const [modalVisible, setModalVisible] = useState(false)
  const urlRef = useRef<HTMLInputElement | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()

    if (!urlRef.current?.value) {
      return
    }

    const url = urlRef.current?.value

    const res = await axios.post('/api/apartments/import', {url})

    console.log(res.data)
  }

  async function clearDatabase() {
    await axios.delete('/api/apartments')
  }

  return (
    <>
      <div className={"text-center mt-12"}>
        <h1>Wczytaj mieszkania</h1>
        <form className={"my-4"} onSubmit={onSubmit}>
          <label htmlFor={"url"} className="block text-gray-200 text-sm font-bold mb-2">
            Podaj url do pierwszej strony z wynikami wyszukiwania mieszkań na olx.pl
          </label>
          <input
            className="shadow appearance-none border border-blue-500 bg-gray-500 rounded py-2 px-3 text-gray-200 leading-tight focus:outline-none focus:shadow-outline my-5"
            type="text"
            id="url"
            ref={urlRef}
            defaultValue={"https://www.olx.pl/nieruchomosci/mieszkania/wynajem/lublin/"}
          />
          <br/>
          <Button>
            Wczytaj
          </Button>
        </form>
        <h4 className={"mt-12 mb-5"}>
          Opcje
        </h4>
        <Button onClick={() => setModalVisible(true)}>
          Wyczyść bazę danych
        </Button>
        <h4 className={"mt-12"}>
          Progress
        </h4>
        *here we will display the progress of the import*
      </div>

      <Modal visible={modalVisible} setVisible={setModalVisible} title={"Clear Database"} onAccept={clearDatabase}>
        <ModalParagraph>
          Are you sure you want to clear the database?
        </ModalParagraph>
      </Modal>
    </>
  )
}