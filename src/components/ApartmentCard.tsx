import {DetailsType} from "@/services/apartmentsService.ts";
import style from "@/style/style.module.scss"
import {ReactNode} from "react";

export type PropsWithApartment = {
  apartment: DetailsType
}

export default function ApartmentCard({apartment}: PropsWithApartment) {
  return (
    <div className={`${style.apartmentCard} bg-gray-800 rounded`}>
      <h1>{apartment.title}</h1>
      <div className={style.pricesBox}>
        <div className={style.borderedPrice}>
          Cena: <b>{apartment.price} zł</b>
        </div>
        +
        <div className={style.borderedPrice}>
          Czynsz: <b>{apartment.rent} zł</b>
        </div>
      </div>
      <h3 className={style.totalPrice}>
        Łącznie: <b>{apartment.rent+apartment.price} zł/m-c</b>
      </h3>
      <p className={"bg-gray-700 rounded"}>{mapNewLine(apartment.description)}</p>
      <h1>
        Zdjęcia
      </h1>
      <div className={style.imagesBox}>
        {apartment.images.split("\n").map((url, index) =>
        <img key={url} src={url} alt={`apartment #${index+1}`}/>)}
      </div>
    </div>
  )
}

function mapNewLine(text: string) {
  const elements: ReactNode[] = []

  const splitted = text.split("\n")
  for(let i=0; i<splitted.length; i++) {
    if(i != 0)
      elements.push(<br/>)

    elements.push(splitted[i])
  }

  return <>{...elements}</>
}