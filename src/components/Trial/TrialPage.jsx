import { useEffect, useRef } from 'react'
import { useTrialContext } from '../../context/TrialContext.jsx'
import { useVoice } from '../../hooks/useVoice.js'
import { useVoiceMode } from '../../hooks/useVoiceMode.js'
import { useVoicePipeline, SESSION_STATES } from '../../hooks/useVoicePipeline.js'
import { PHASES, getPhaseLabelDynamic, getProgress } from '../../constants/phases.js'
import TrialChatArea from './TrialChatArea.jsx'
import TrialInputBar from './TrialInputBar.jsx'
import VoiceStatus from './VoiceStatus.jsx'
import MicIndicator from './MicIndicator.jsx'

// voiceModeOn: 'off' | 'hybrid' | 'full'
export default function TrialPage({ onVerdict, onBack, voiceModeOn, onVoiceModeChange, theme, onToggleTheme }) {
  const { messages, isLoading, phase, round, rounds, isDynamic, phaseOrder, accusation, submitDefense, verdict } = useTrialContext()

  // Voice input for hybrid mode (STT only — TTS is manual via play buttons)
  const { isAvailable: voiceInputAvailable } = useVoice({ onTranscript: () => {}, enabled: false })

  // Flow 1 full voice orchestration (browser-side TTS+STT loop, no WebRTC)
  const hybridVoice = useVoiceMode({
    messages,
    phase,
    isLoading,
    submitDefense,
    enabled: voiceModeOn === 'hybrid',
  })

  // Flow 2 full voice pipeline (LiveKit WebRTC + server-side STT/TTS)
  const fullVoice = useVoicePipeline({
    accusation,
    phase,
    round,
    messages,
    onProsecutorMessage: (text, msgPhase, msgRound) => {
      // Messages arrive via data channel — useTrial will NOT auto-add them
      // so we need to add them manually here via a direct dispatch workaround.
      // For now, the agent's voiceAgent.js sends 'prosecutor_response' data messages
      // which TrialContext can intercept — handled in the data channel listener below.
    },
    onVerdictReceived: () => onVerdict(),
  })

  // Navigate to verdict page
  useEffect(() => {
    if (phase === PHASES.VERDICT) onVerdict()
  }, [phase])

  const isCross = phase?.startsWith('CROSS_')
  const phaseLabel = getPhaseLabelDynamic(phase, round)
  const progress = getProgress(phase, phaseOrder)

  function handleToggleVoice() {
    if (voiceModeOn === 'off') {
      onVoiceModeChange('hybrid')
    } else if (voiceModeOn === 'hybrid') {
      hybridVoice.stop()
      onVoiceModeChange('full')
      fullVoice.startSession()
    } else {
      hybridVoice.stop()
      fullVoice.endSession()
      onVoiceModeChange('off')
    }
  }

  const voiceLabel = {
    off: null,
    hybrid: '🎙 Auto',
    full: '🎙 Live',
  }[voiceModeOn]

  const isFullVoiceConnecting = voiceModeOn === 'full' &&
    fullVoice.sessionState === SESSION_STATES.CONNECTING

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg)', color: 'var(--text)' }}>

      {/* Charge header */}
      <div style={{ background: 'var(--charge-bg)', color: 'var(--charge-text)', flexShrink: 0, position: 'relative' }}>
        <div style={{
          maxWidth: '720px',
          margin: '0 auto',
          padding: '0.6rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
        }}>
          <button
            onClick={onBack}
            style={{ background: 'none', border: 'none', color: 'var(--charge-text)', cursor: 'pointer', fontSize: '18px', opacity: 0.7, padding: 0, lineHeight: 1, flexShrink: 0 }}
            title="Back"
          >←</button>

          <div style={{
            flex: 1,
            fontFamily: 'Georgia, serif',
            fontSize: '12px',
            fontStyle: 'italic',
            opacity: 0.85,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {accusation}
          </div>

          {/* Voice toggle - only visible when voice is active */}
          {voiceModeOn !== 'off' && (
            <button
              onClick={handleToggleVoice}
              disabled={isFullVoiceConnecting}
              title={voiceModeOn === 'hybrid' ? 'Switch to live voice' : 'Disable voice'}
              style={{
                background: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.3)',
                color: 'var(--charge-text)',
                fontSize: '12px',
                padding: '0.2rem 0.6rem',
                cursor: isFullVoiceConnecting ? 'wait' : 'pointer',
                fontFamily: 'Georgia, serif',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {isFullVoiceConnecting ? '...' : voiceLabel}
            </button>
          )}
        </div>

        {/* Theme toggle - pinned to far right edge */}
        <button
          onClick={onToggleTheme}
          title="Toggle theme"
          style={{
            position: 'absolute',
            right: '1rem',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            color: 'var(--charge-text)',
            fontSize: '16px',
            cursor: 'pointer',
            opacity: 0.7,
            padding: '0 4px',
            lineHeight: 1,
          }}
        >
          {theme === 'light' ? '🌙' : '☀'}
        </button>
      </div>

      {/* Progress bar */}
      <div style={{ height: '2px', background: 'var(--border)', flexShrink: 0 }}>
        <div style={{ height: '100%', width: `${progress}%`, background: 'var(--text-muted)', transition: 'width 0.6s ease' }} />
      </div>

      {/* Phase nav */}
      <div style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg)', flexShrink: 0 }}>
      <div style={{
        maxWidth: '720px', margin: '0 auto',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
        padding: '0.5rem 1.25rem',
      }}>
        <span style={{ fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
          {phaseLabel}{isCross
            ? isDynamic
              ? ` - Round ${round} - Prosecution may continue`
              : ` - Round ${round} of ${rounds}`
            : ''}
        </span>
      </div>
      </div>

      {/* Chat */}
      <TrialChatArea messages={messages} isLoading={isLoading} />

      {/* Bottom bar */}
      {phase !== PHASES.VERDICT && (
        <>
          {voiceModeOn === 'off' && <TrialInputBar />}
          {voiceModeOn === 'hybrid' && (
            <VoiceStatus
              state={hybridVoice.state}
              speakingRole={hybridVoice.speakingRole}
              transcript={hybridVoice.transcript}
              onExit={handleToggleVoice}
            />
          )}
          {voiceModeOn === 'full' && (
            <MicIndicator
              sessionState={fullVoice.sessionState}
              onEnd={handleToggleVoice}
              error={fullVoice.error}
            />
          )}
        </>
      )}
    </div>
  )
}
