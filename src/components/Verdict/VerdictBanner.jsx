export default function VerdictBanner({ guilty }) {
  const isGuilty = guilty === true

  return (
    <div
      className={`w-full border-t-8 ${isGuilty ? 'border-[#8B1A1A]' : 'border-[#C9A84C]'} pt-8 pb-6 flex flex-col items-center text-center`}
    >
      <h1
        className={`text-8xl font-serif font-bold tracking-wider ${isGuilty ? 'text-[#8B1A1A]' : 'text-[#C9A84C]'}`}
        style={{
          textShadow: isGuilty
            ? '0 0 40px rgba(139,26,26,0.6), 0 0 80px rgba(139,26,26,0.3)'
            : '0 0 40px rgba(201,168,76,0.5), 0 0 80px rgba(201,168,76,0.2)',
        }}
      >
        {isGuilty ? 'GUILTY' : 'NOT GUILTY'}
      </h1>
      <p className="mt-4 text-lg font-serif italic text-[#F5F0E8]/70 max-w-md">
        {isGuilty
          ? 'The court has found you GUILTY as charged.'
          : 'The court finds in favor of the defendant.'}
      </p>
    </div>
  )
}
