export default function VerdictStatement({ statement }) {
  if (!statement) return null

  return (
    <div className="w-full border-l-4 border-[#C9A84C] pl-4 py-1 flex flex-col gap-2">
      <h2 className="text-xs font-mono tracking-widest uppercase text-[#C9A84C]">
        The Court's Ruling
      </h2>
      <p className="font-serif italic text-[#F5F0E8] text-lg leading-relaxed">
        {statement}
      </p>
    </div>
  )
}
