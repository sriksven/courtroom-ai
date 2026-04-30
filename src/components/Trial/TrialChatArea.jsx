import React, { useRef, useEffect, useState, useCallback } from 'react'

// ── Playback state: only one bubble plays at a time ──────────────────────────

function useAudioPlayer() {
  const [playingId, setPlayingId] = useState(null)
  const [loadingId, setLoadingId] = useState(null)
  const audioRef = useRef(null)

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
      audioRef.current = null
    }
    setPlayingId(null)
    setLoadingId(null)
  }, [])

  const play = useCallback(async (id, text, voice = 'onyx') => {
    stop()
    setLoadingId(id)
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice }),
      })
      if (!res.ok) throw new Error('TTS failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audioRef.current = audio
      setLoadingId(null)
      setPlayingId(id)
      audio.onended = () => { setPlayingId(null); URL.revokeObjectURL(url) }
      audio.onerror = () => { setPlayingId(null); URL.revokeObjectURL(url) }
      await audio.play()
    } catch {
      setLoadingId(null)
      setPlayingId(null)
    }
  }, [stop])

  const pause = useCallback(() => {
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause()
      setPlayingId(id => id ? `${id}__paused` : null)
    }
  }, [])

  const resume = useCallback(() => {
    if (audioRef.current?.paused) {
      audioRef.current.play()
      setPlayingId(id => id?.replace('__paused', '') ?? null)
    }
  }, [])

  return { playingId, loadingId, play, pause, resume, stop }
}

// ── Play/Pause/Stop control ───────────────────────────────────────────────────

function PlayButton({ msgId, text, voice, player }) {
  const { playingId, loadingId, play, pause, resume, stop } = player
  const isLoading = loadingId === msgId
  const isPlaying = playingId === msgId
  const isPaused = playingId === `${msgId}__paused`
  const isActive = isPlaying || isPaused

  function handleClick() {
    if (isLoading) return
    if (isPlaying) pause()
    else if (isPaused) resume()
    else play(msgId, text, voice)
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px' }}>
      <button
        onClick={handleClick}
        title={isPlaying ? 'Pause' : isPaused ? 'Resume' : 'Play'}
        style={{
          background: 'none',
          border: 'none',
          cursor: isLoading ? 'wait' : 'pointer',
          padding: '2px 4px',
          color: isActive ? 'var(--text)' : 'var(--text-muted)',
          fontSize: '13px',
          lineHeight: 1,
          opacity: isLoading ? 0.5 : 1,
          transition: 'color 0.15s',
        }}
      >
        {isLoading ? '...' : isPlaying ? 'II' : '>'}
      </button>
      {isActive && (
        <button
          onClick={stop}
          title="Stop"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '2px 4px',
            color: 'var(--text-muted)',
            fontSize: '11px',
            lineHeight: 1,
          }}
        >
          stop
        </button>
      )}
    </div>
  )
}

// ── Loading dots ──────────────────────────────────────────────────────────────

/** Some code paths store prosecutor text as stringified `{ "content": "..." }`; show the inner speech only. */
function normalizeMessageContent(raw) {
  if (typeof raw !== 'string' || !raw.trimStart().startsWith('{')) return raw
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed.content === 'string') return parsed.content
  } catch { /* not JSON */ }
  return raw
}

function LoadingDots({ message }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '1rem', justifyContent: 'center' }}>
      <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
        {message || 'The court deliberates'}
      </span>
      {[0, 1, 2].map(i => (
        <span key={i} className="loading-dot" style={{ animationDelay: `${i * 0.15}s` }} />
      ))}
    </div>
  )
}

// ── Chat bubbles ──────────────────────────────────────────────────────────────

function ChatBubble({ message, player }) {
  const { role, content, timestamp } = message
  const displayContent = normalizeMessageContent(content)

  const formatTime = (ts) => {
    if (!ts) return ''
    const d = new Date(ts)
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  if (role === 'system') {
    return (
      <div style={{ textAlign: 'center', padding: '0.5rem', color: 'var(--text-muted)', fontSize: '11px' }}>
        {displayContent}
      </div>
    )
  }

  if (role === 'judge') {
    if (message.isIntervention) {
      return (
        <div className="bubble-in" style={{
          margin: '1.25rem auto',
          maxWidth: '600px',
          padding: '1rem 1.5rem',
          background: 'var(--judge-bg)',
          border: '1px solid var(--judge-border)',
          borderTop: '3px solid var(--text-muted)',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '9px', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 600 }}>
            ⚖ The Court — Order
          </div>
          <p style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: '13px', color: 'var(--text)', margin: '0 0 0.5rem', lineHeight: 1.6 }}>
            {displayContent}
          </p>
          <PlayButton msgId={message.id} text={displayContent} voice="shimmer" player={player} />
        </div>
      )
    }
    return (
      <div className="bubble-in" style={{ textAlign: 'center', padding: '1rem 2rem', margin: '0.5rem 0' }}>
        <div style={{ fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px' }}>
          Judge Constance Virtue
        </div>
        <div style={{
          borderLeft: '2px solid var(--judge-border)',
          borderRight: '2px solid var(--judge-border)',
          padding: '0.5rem 1rem',
          background: 'var(--judge-bg)',
        }}>
          <p style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: '14px', color: 'var(--text)', margin: 0 }}>
            {displayContent}
          </p>
          <PlayButton msgId={message.id} text={displayContent} voice="shimmer" player={player} />
        </div>
      </div>
    )
  }

  if (role === 'prosecutor') {
    return (
      <div className="bubble-in" style={{ maxWidth: '80%', marginBottom: '0.75rem' }}>
        <div style={{ fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--prosecutor-border)', marginBottom: '4px' }}>
          Reginald P. Harrington III
        </div>
        <div style={{
          borderLeft: '2px solid var(--prosecutor-border)',
          background: 'var(--prosecutor-bg)',
          padding: '0.75rem 1rem',
          fontFamily: 'Georgia, serif',
          fontSize: '14px',
          lineHeight: 1.6,
          color: 'var(--text)',
        }}>
          <p style={{ margin: 0 }}>{displayContent}</p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <PlayButton msgId={message.id} text={displayContent} voice="onyx" player={player} />
            {timestamp && (
              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{formatTime(timestamp)}</span>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (role === 'defense') {
    return (
      <div className="bubble-in" style={{ maxWidth: '80%', marginLeft: 'auto', marginBottom: '0.75rem' }}>
        <div style={{ fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--defense-border)', marginBottom: '4px', textAlign: 'right' }}>
          The Defendant
        </div>
        <div style={{
          borderRight: '2px solid var(--defense-border)',
          background: 'var(--defense-bg)',
          padding: '0.75rem 1rem',
          fontFamily: 'Georgia, serif',
          fontSize: '14px',
          lineHeight: 1.6,
          color: 'var(--text)',
        }}>
          <p style={{ margin: 0 }}>{displayContent}</p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexDirection: 'row-reverse' }}>
            <PlayButton msgId={message.id} text={displayContent} voice="alloy" player={player} />
            {timestamp && (
              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{formatTime(timestamp)}</span>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (role === 'prosecution_witness') {
    const profile = message.witnessProfile
    return (
      <div className="bubble-in" style={{ maxWidth: '80%', marginBottom: '0.75rem' }}>
        <div style={{ fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#E8A838', marginBottom: '4px' }}>
          {profile?.name ?? 'Witness'} — Prosecution
        </div>
        <div style={{
          borderLeft: '2px solid #E8A838',
          background: 'var(--bg-card)',
          padding: '0.75rem 1rem',
          fontFamily: 'Georgia, serif',
          fontSize: '14px',
          lineHeight: 1.6,
          color: 'var(--text)',
        }}>
          <p style={{ margin: 0 }}>{displayContent}</p>
        </div>
      </div>
    )
  }

  if (role === 'defense_witness') {
    const profile = message.witnessProfile
    return (
      <div className="bubble-in" style={{ maxWidth: '80%', marginLeft: 'auto', marginBottom: '0.75rem' }}>
        <div style={{ fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#1D9E75', marginBottom: '4px', textAlign: 'right' }}>
          {profile?.name ?? 'Witness'} — Defense
        </div>
        <div style={{
          borderRight: '2px solid #1D9E75',
          background: 'var(--bg-card)',
          padding: '0.75rem 1rem',
          fontFamily: 'Georgia, serif',
          fontSize: '14px',
          lineHeight: 1.6,
          color: 'var(--text)',
        }}>
          <p style={{ margin: 0 }}>{displayContent}</p>
        </div>
      </div>
    )
  }

  return null
}

// ── Main export ───────────────────────────────────────────────────────────────

function PhaseDivider({ phase, round }) {
  let label = ''
  if (phase === 'OPENING') label = 'Opening Statement'
  else if (phase === 'CLOSING') label = 'Closing Arguments'
  else if (phase?.startsWith('CROSS_')) label = `Cross-Examination — Round ${round}`
  else if (phase?.startsWith('PROSECUTION_WITNESS_')) label = `Prosecution Witness ${phase.replace('PROSECUTION_WITNESS_', '')}`
  else if (phase?.startsWith('DEFENSE_WITNESS_')) label = `Defense Witness ${phase.replace('DEFENSE_WITNESS_', '')}`
  else return null
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '0.75rem',
      margin: '1.25rem 0 1rem', opacity: 0.45,
    }}>
      <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
      <span style={{ fontSize: '9px', letterSpacing: '0.25em', textTransform: 'uppercase', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
        {label}
      </span>
      <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
    </div>
  )
}

export default function TrialChatArea({ messages, isLoading, loadingMessage }) {
  const bottomRef = useRef(null)
  const player = useAudioPlayer()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg)' }}>
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '1.25rem 1.5rem' }}>
        {messages.map((msg, i) => {
          const prevPhase = i > 0 ? messages[i - 1].phase : null
          const showDivider = msg.role !== 'system' && msg.phase && msg.phase !== prevPhase
          return (
            <React.Fragment key={msg.id}>
              {showDivider && <PhaseDivider phase={msg.phase} round={msg.round} />}
              <ChatBubble message={msg} player={player} />
            </React.Fragment>
          )
        })}
        {isLoading && <LoadingDots message={loadingMessage} />}
        <div style={{ height: '1rem' }} ref={bottomRef} />
      </div>
    </div>
  )
}
