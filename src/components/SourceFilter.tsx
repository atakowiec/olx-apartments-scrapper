export default function SourceFilter({value, onChange, disabled = false, includeAll = false}: {
  value: string;
  onChange: (value: "olx" | "otodom" | "all") => void;
  disabled?: boolean;
  includeAll?: boolean;
}) {
  const options = includeAll ? ["all", "olx", "otodom"] as const : ["olx", "otodom"] as const;
  return <div className="my-5 flex flex-wrap justify-center gap-2" role="group" aria-label="Źródło ogłoszeń">
    {options.map(source => <button key={source} disabled={disabled} aria-pressed={value === source}
      onClick={() => onChange(source)}
      className={`rounded-xl border px-5 py-2.5 text-sm disabled:opacity-50 ${value === source ? "border-emerald-300 bg-emerald-400/15 text-emerald-200" : "border-gray-600 bg-gray-800 text-gray-300 hover:bg-gray-700"}`}>
      {source === "all" ? "Wszystkie źródła" : source === "olx" ? "OLX" : "Otodom · podgląd z OLX"}
    </button>)}
  </div>;
}
