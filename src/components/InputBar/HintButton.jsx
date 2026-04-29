export default function HintButton({ onRequestHint, isLoading, disabled }) {
  return (
    <button
      onClick={onRequestHint}
      disabled={disabled || isLoading}
      className="flex items-center gap-1.5 text-sm text-[#C9A84C]/70 hover:text-[#C9A84C] transition-colors disabled:opacity-40 disabled:cursor-not-allowed font-serif italic"
      aria-label="Get a hint"
    >
      {isLoading ? (
        <span className="w-4 h-4 border border-[#C9A84C]/60 border-t-transparent rounded-full animate-spin inline-block" />
      ) : (
        <span>💡</span>
      )}
      Get a Hint
    </button>
  )
}
