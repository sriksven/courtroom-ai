import { useState } from 'react'
import { useTrialContext } from '../../context/TrialContext.jsx'
import { useVoice, VOICE_STATES } from '../../hooks/useVoice.js'
import { PHASES } from '../../constants/phases.js'
import DefenseInput from './DefenseInput.jsx'
import VoiceButton from './VoiceButton.jsx'
import HintButton from './HintButton.jsx'
import ErrorBanner from '../shared/ErrorBanner.jsx'

export default function InputBar() {
  const { phase, isLoading, error, submitDefense, requestHint, resetTrial } = useTrialContext()
  const [inputText, setInputText] = useState('')
  const [hintText, setHintText] = useState(null)
  const [hintLoading, setHintLoading] = useState(false)
  const [localError, setLocalError] = useState(null)

  const { voiceState, isAvailable, toggleListening } = useVoice({
    onTranscript: (t) => setInputText(t),
  })

  async function handleSubmit() {
    if (!inputText.trim() || isLoading) return
    const text = inputText
    setInputText('')
    setHintText(null)
    await submitDefense(text)
  }

  async function handleHint() {
    setHintLoading(true)
    try {
      const hint = await requestHint()
      if (hint) setHintText(hint)
    } finally {
      setHintLoading(false)
    }
  }

  function dismissError() {
    setLocalError(null)
  }

  const isClosing = phase === PHASES.CLOSING
  const submitLabel = isClosing ? 'DELIVER CLOSING ARGUMENT' : 'SUBMIT DEFENSE'
  const submitDisabled = !inputText.trim() || isLoading

  const displayError = error || localError

  return (
    <div className="w-full px-4 pb-4 pt-2 bg-[#1a1008] border-t border-[#C9A84C]/20 flex flex-col gap-2">
      {displayError && (
        <ErrorBanner error={displayError} onDismiss={dismissError} />
      )}

      {hintText && (
        <div className="border border-[#C9A84C]/50 bg-[#0f0a04] rounded px-3 py-2">
          <p className="text-xs font-mono text-[#C9A84C] uppercase tracking-widest mb-1">Strategic Counsel:</p>
          <p className="text-sm font-serif italic text-[#F5F0E8]/80">{hintText}</p>
        </div>
      )}

      <div className="flex gap-2 items-end">
        <DefenseInput
          value={inputText}
          onChange={setInputText}
          onSubmit={handleSubmit}
          disabled={isLoading}
          phase={phase}
        />
        <VoiceButton
          voiceState={voiceState}
          onToggle={toggleListening}
          isAvailable={isAvailable}
        />
      </div>

      <div className="flex items-center justify-between">
        <HintButton
          onRequestHint={handleHint}
          isLoading={hintLoading}
          disabled={isLoading}
        />
        <button
          onClick={handleSubmit}
          disabled={submitDisabled}
          className="px-5 py-2 bg-[#8B1A1A] hover:bg-[#a02020] text-[#F5F0E8] font-serif text-sm tracking-wider uppercase border border-[#8B1A1A] rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {submitLabel}
        </button>
      </div>
    </div>
  )
}
