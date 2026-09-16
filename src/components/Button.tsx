import type {ButtonHTMLAttributes} from "react";

export default function Button(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-full transition-colors duration-150 ${props.className}`}
      onClick={props.onClick}>
      {props.children}
    </button>
  )
}
