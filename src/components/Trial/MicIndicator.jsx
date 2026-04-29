import { SESSION_STATES } from '../../hooks/useVoicePipeline.js'

const STATE_CONFIG = {
  [SESSION_STATES.CONNECTING]:     { label: 'Connecting to court…',    color: 'var(--text-muted)', bars: false, pulse: false },
  [SESSION_STATES.AGENT_READY]:    { label: 'Court is in session',     color: 'var(--text-muted)', bars: false, pulse: true },
  [SESSION_STATES.AGENT_SPEAKING]: { label: 'Prosecution is speaking', color: 'var(--prosecutor-border)', bars: true,  pulse: false },
  [SESSION_STATES.USER_TURN]:      { label: 'Your turn — speak now',   color: 'var(--defense-border)', bars: false, pulse: true },
  [SESSION_STATES.USER_SPEAKING]:  { label: 'You are speaking…',       color: 'var(--defense-border)', bars: true,  pulse: false },
  [SESSION_STATES.PROCESSING]:     { label: 'Transcribing…',           color: 'var(--text-muted)', bars: false, pulse: false },
  [SESSION_STATES.VERDICT]:        { label: 'Verdict delivered',        color: 'var(--text)',       bars: false, pulse: false },
  [SESSION_STATES.ERROR]:          { label: 'Connection error',         color: '#ef4444',           bars: false, pulse: false },
  [SESSION_STATES.IDLE]:           { label: 'Voice mode',               color: 'var(--text-muted)', bars: false, pulse: false },
}

export default function MicIndicator({ sessionState, onEnd, error }) {
  const cfg = STATE_CONFIG[sessionState] || STATE_CONFIG[SESSION_STATES.IDLE]
  const isUserTurn = sessionState === SESSION_STATES.USER_TURN || sessionState === SESSION_STATES.USER_SPEAKING
  const isAgentTurn = sessionState === SESSION_STATES.AGENT_SPEAKING

  return (
    <div style={{
      borderTop: '1px solid var(--border)',
      background: 'var(--bg)',
      padding: '1.25rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.75rem',
      flexShrink: 0,
    }}>
      {error && (
        <div style={{ fontSize: '12px', color: '#ef4444', padding: '0.5rem', background: 'var(--prosecutor-bg)', borderLeft: '2px solid #ef4444' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>

        {/* Status icon */}
        <div style={{
          width: '40px',
          height: '40px',
          border: `1.5px solid ${cfg.color}`,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '18px',
          flexShrink: 0,
          animation: cfg.pulse ? 'pulseDot 1.2s infinite' : 'none',
          color: cfg.color,
        }}>
          {isAgentTurn ? '◉' : isUserTurn ? '🎙' : '○'}
        </div>

        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: '13px',
            fontFamily: 'Georgia, serif',
            color: 'var(--text)',
            fontStyle: isUserTurn ? 'italic' : 'normal',
          }}>
            {cfg.label}
          </div>
          {sessionState === SESSION_STATES.USER_TURN && (
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Speak your defense. Silence ends your turn.
            </div>
          )}
        </div>

        <button
          onClick={onEnd}
          style={{
            background: 'none',
            border: '1px solid var(--border)',
            color: 'var(--text-muted)',
            fontSize: '11px',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            padding: '0.35rem 0.75rem',
            cursor: 'pointer',
            fontFamily: 'Georgia, serif',
          }}
        >
          Exit
        </button>
      </div>

      {/* Waveform — shown when either side is speaking */}
      {cfg.bars && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px', height: '24px' }}>
          {Array.from({ length: 14 }).map((_, i) => (
            <div
              key={i}
              style={{
                width: '3px',
                background: cfg.color,
                borderRadius: '2px',
                animation: `waveBar${(i % 4) + 1} ${0.55 + (i % 3) * 0.12}s ease-in-out infinite alternate`,
                height: `${8 + Math.abs(Math.sin(i * 0.9)) * 10}px`,
                opacity: 0.6 + (i % 3) * 0.13,
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
