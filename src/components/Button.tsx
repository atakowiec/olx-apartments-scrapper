import {ButtonProps} from "@headlessui/react";

export default function Button(props: ButtonProps) {
  return (
    <button
      className={`mt-5 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-full transition-colors duration-150 ${props.className}`}
      onClick={props.onClick}>
      {props.children}
    </button>
  )
}