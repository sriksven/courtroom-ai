import { useState } from 'react'
import { useTrialContext } from '../../context/TrialContext.jsx'
import { useVoice, VOICE_STATES } from '../../hooks/useVoice.js'
import { PHASES } from '../../constants/phases.js'

export default function TrialInputBar() {
  const { phase, isLoading, error, submitDefense, requestHint } = useTrialContext()
  const [inputText, setInputText] = useState('')
  const [hintText, setHintText] = useState(null)
  const [hintLoading, setHintLoading] = useState(false)

  const { voiceState, isAvailable, toggleListening } = useVoice({
    onTranscript: (t) => setInputText(t),
  })

  const isListening = voiceState === VOICE_STATES.LISTENING

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

  function handleKeyDown(e) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    }
  }

  const isClosing = phase === PHASES.CLOSING
  const submitDisabled = !inputText.trim() || isLoading

  return (
    <div style={{ borderTop: '1px solid var(--border)', background: 'var(--bg)', flexShrink: 0 }}>
    <div style={{
      maxWidth: '720px',
      margin: '0 auto',
      padding: '0.75rem 1.25rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem',
    }}>
      {error && (
        <div style={{
          fontSize: '12px',
          color: '#ef4444',
          padding: '0.5rem',
          background: 'var(--prosecutor-bg)',
          borderLeft: '2px solid #ef4444',
        }}>
          {error}
        </div>
      )}

      {hintText && (
        <div style={{
          padding: '0.75rem',
          background: 'var(--judge-bg)',
          borderLeft: '2px solid var(--judge-border)',
          fontSize: '13px',
          fontStyle: 'italic',
          color: 'var(--text)',
          lineHeight: 1.5,
        }}>
          <span style={{ fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', fontStyle: 'normal', color: 'var(--text-muted)' }}>
            Strategic Counsel:{' '}
          </span>
          {hintText}
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
        <textarea
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          placeholder={isClosing ? 'Deliver your closing argument…' : 'Type your defense here…'}
          rows={3}
          style={{
            flex: 1,
            background: 'var(--input-bg)',
            border: '1px solid var(--border)',
            color: 'var(--text)',
            fontFamily: 'Georgia, serif',
            fontSize: '14px',
            padding: '0.65rem 0.85rem',
            resize: 'none',
            outline: 'none',
            minHeight: '72px',
            maxHeight: '160px',
            lineHeight: 1.5,
            transition: 'border-color 0.2s',
            opacity: isLoading ? 0.6 : 1,
          }}
          onFocus={e => e.currentTarget.style.borderColor = 'var(--text-muted)'}
          onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
        />

        {isAvailable && (
          <button
            onClick={toggleListening}
            title={isListening ? 'Stop listening' : 'Start voice input'}
            style={{
              width: '40px',
              height: '40px',
              border: `1px solid ${isListening ? '#ef4444' : 'var(--border)'}`,
              background: isListening ? '#ef4444' : 'var(--bg-card)',
              color: isListening ? '#fff' : 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: isListening ? '13px' : '16px',
              fontFamily: 'Georgia, serif',
              fontWeight: isListening ? 'bold' : 'normal',
              flexShrink: 0,
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isListening ? '■' : '🎙'}
          </button>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button
          onClick={handleHint}
          disabled={isLoading || hintLoading}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            fontFamily: 'Georgia, serif',
            fontSize: '12px',
            fontStyle: 'italic',
            cursor: 'pointer',
            padding: 0,
            opacity: isLoading || hintLoading ? 0.4 : 1,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          {hintLoading ? '…' : '💡'} Get a Hint
        </button>

        <button
          onClick={handleSubmit}
          disabled={submitDisabled}
          style={{
            padding: '0.55rem 1.25rem',
            background: submitDisabled ? 'var(--bg-secondary)' : 'var(--accent)',
            color: submitDisabled ? 'var(--text-muted)' : 'var(--accent-text)',
            border: '1px solid var(--border)',
            fontFamily: 'Georgia, serif',
            fontSize: '11px',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            cursor: submitDisabled ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
          }}
        >
          {isClosing ? 'Closing Argument' : 'Submit Defense'}
        </button>
      </div>

      <div style={{ textAlign: 'right', fontSize: '10px', color: 'var(--text-muted)', opacity: 0.6 }}>
        ⌘↵ to submit
      </div>
    </div>
    </div>
  )
}
