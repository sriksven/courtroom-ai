export default function LoadingDots({ label = 'The court deliberates...' }) {
  return (
    <div className="flex flex-col items-center gap-3 py-4">
      <div className="flex gap-2">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-3 h-3 rounded-full bg-[#C9A84C] inline-block animate-bounce"
            style={{ animationDelay: `${i * 0.18}s` }}
          />
        ))}
      </div>
      {label && (
        <p className="text-sm italic text-[#F5F0E8] opacity-70 font-serif">{label}</p>
      )}
    </div>
  )
}
