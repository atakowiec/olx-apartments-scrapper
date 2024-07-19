"use client"

import {useEffect, useState} from "react";
import ApartmentCard from "@/components/ApartmentCard.tsx";
import ApartmentButtons from "@/components/ApartmentButtons.tsx";

export default function Home() {
  const [apartment, setApartment] = useState(null)
  const [pressed, setPressed] = useState(false)
  const [position, setPosition] = useState({x: 0, y: 0})

  useEffect(() => {
    generateRandomApartment()

    function handleMouseUp() {
      setPressed(false)
    }

    window.addEventListener("mouseup", handleMouseUp)

    return () => {
      window.removeEventListener("mouseup", handleMouseUp)
    }
  }, []);

  function generateRandomApartment() {
    fetch("/api/apartments/random")
      .then(res => res.json())
      .then(data => setApartment(data))
  }

  function onMouseMove(event) {
    if (pressed) {
      setPosition(position => ({
        x: position.x + event.movementX,
        y: position.y + event.movementY
      }))
    }
  }

  return (
    <>
      {apartment && <ApartmentCard apartment={apartment}/>}
      {apartment && <ApartmentButtons apartment={apartment}/>}
    </>
  )
}