export default function FallacyList({ fallacies }) {
  return (
    <div className="w-full flex flex-col gap-3">
      <h2 className="text-sm font-mono tracking-widest uppercase text-[#C9A84C]">
        Logical Fallacies Detected
      </h2>

      {!fallacies || fallacies.length === 0 ? (
        <p className="font-serif italic text-[#F5F0E8]/60 text-sm">
          No logical fallacies were detected.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {fallacies.map((fallacy, i) => (
            <li
              key={i}
              className="flex gap-3 items-start bg-[#0f0a04] border-l-4 border-red-700/60 rounded-r px-3 py-2"
            >
              <span className="text-yellow-500 mt-0.5 shrink-0">!</span>
              <p className="text-sm font-serif text-[#F5F0E8]/80 leading-snug">{fallacy}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
