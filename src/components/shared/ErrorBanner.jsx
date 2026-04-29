export default function ErrorBanner({ error, onDismiss }) {
  if (!error) return null

  return (
    <div className="w-full border border-red-600 bg-red-950/60 text-[#F5F0E8] px-4 py-3 flex items-start justify-between gap-3 rounded">
      <p className="font-serif text-sm leading-snug flex-1">{error}</p>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-red-400 hover:text-red-200 text-lg leading-none shrink-0 transition-colors"
          aria-label="Dismiss error"
        >
          ✕
        </button>
      )}
    </div>
  )
}
