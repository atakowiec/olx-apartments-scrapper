import {PropsWithApartment} from "@/components/ApartmentCard.tsx";
import style from "@/style/style.module.scss"

export default function ApartmentButtons({apartment}: PropsWithApartment) {
  return (
    <div className={`bg-gray-800 bg-opacity-80 ${style.apartmentButtonsBox}`}>
      <button className={`bg-red-500 hover:bg-red-700`}>
        Odrzuć
      </button>
      <a className={`bg-blue-500 hover:bg-blue-700`} href={apartment.url} target={"_blank"}>
        Link
      </a>
      <button className={`bg-green-500 hover:bg-green-700`}>
        Zaakceptuj
      </button>
    </div>
  )
}