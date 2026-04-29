import Tooltip from '../shared/Tooltip.jsx'
import { VOICE_STATES } from '../../hooks/useVoice.js'

function ButtonInner({ voiceState }) {
  if (voiceState === VOICE_STATES.INITIALIZING) {
    return (
      <span className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin inline-block" />
    )
  }

  if (voiceState === VOICE_STATES.LISTENING) {
    return (
      <span className="relative flex items-center justify-center w-6 h-6">
        <span className="absolute w-6 h-6 rounded-full bg-red-600 animate-ping opacity-70" />
        <span className="relative text-lg">🎤</span>
      </span>
    )
  }

  if (voiceState === VOICE_STATES.PROCESSING) {
    return (
      <span className="flex gap-[3px] items-center">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </span>
    )
  }

  if (voiceState === VOICE_STATES.SPEAKING) {
    return <span className="text-xl">🔊</span>
  }

  if (voiceState === VOICE_STATES.ERROR) {
    return (
      <span className="relative text-xl">
        🎤
        <span className="absolute inset-0 flex items-center justify-center text-red-500 text-2xl font-bold leading-none">✕</span>
      </span>
    )
  }

  // IDLE
  return <span className="text-xl">🎤</span>
}

function stateStyles(voiceState) {
  switch (voiceState) {
    case VOICE_STATES.LISTENING:
      return 'bg-red-700 border-red-500 text-white'
    case VOICE_STATES.SPEAKING:
      return 'bg-[#1a1008] border-[#C9A84C] text-[#C9A84C]'
    case VOICE_STATES.INITIALIZING:
    case VOICE_STATES.PROCESSING:
      return 'bg-[#1a1008] border-gray-500 text-gray-400 cursor-wait'
    case VOICE_STATES.ERROR:
      return 'bg-[#1a1008] border-red-700 text-red-400 cursor-not-allowed opacity-60'
    default:
      return 'bg-[#1a1008] border-[#C9A84C] text-[#C9A84C] hover:bg-[#2a1e0a] transition-colors'
  }
}

export default function VoiceButton({ voiceState, onToggle, isAvailable }) {
  const disabled =
    !isAvailable ||
    voiceState === VOICE_STATES.ERROR ||
    voiceState === VOICE_STATES.INITIALIZING ||
    voiceState === VOICE_STATES.PROCESSING ||
    voiceState === VOICE_STATES.SPEAKING

  const button = (
    <button
      onClick={!disabled ? onToggle : undefined}
      disabled={disabled}
      className={`w-12 h-12 rounded-full border-2 flex items-center justify-center shrink-0 ${stateStyles(voiceState)}`}
      aria-label="Toggle voice input"
    >
      <ButtonInner voiceState={voiceState} />
    </button>
  )

  if (!isAvailable) {
    return (
      <Tooltip text="Voice not available in this browser">
        {button}
      </Tooltip>
    )
  }

  return button
}
