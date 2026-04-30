import { useEffect, useState } from 'react'
import { useTrialContext } from '../../context/TrialContext.jsx'
import { useScoring } from '../../hooks/useScoring.js'

function ScoreItem({ label, value, description, delay }) {
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setShown(true), delay)
    return () => clearTimeout(t)
  }, [delay])

  return (
    <div style={{
      padding: '1.25rem',
      border: '1px solid var(--border)',
      background: 'var(--bg-card)',
      opacity: shown ? 1 : 0,
      transform: shown ? 'translateY(0)' : 'translateY(8px)',
      transition: 'opacity 0.4s ease, transform 0.4s ease',
    }}>
      <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
        {label}
      </div>
      <div style={{ fontSize: '2.5rem', fontFamily: 'Georgia, serif', color: 'var(--text)', lineHeight: 1 }}>
        {value}
        <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/10</span>
      </div>
      <div style={{ fontSize: '11px', fontStyle: 'italic', color: 'var(--text-muted)', marginTop: '0.4rem', lineHeight: 1.4 }}>
        {description}
      </div>
    </div>
  )
}

export default function VerdictPage({ onNewCase, voiceModeOn }) {
  const { verdict, fallacies, dynamicRoundReasons, resetTrial } = useTrialContext()
  const { total, percentage, grade, breakdown, ready: scoresReady } = useScoring(verdict?.scores)
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 100)
    return () => clearTimeout(t)
  }, [])

  // Auto-speak verdict in voice mode
  useEffect(() => {
    if (!voiceModeOn || !verdict?.verdict_statement) return
    const text = `${verdict.guilty ? 'Guilty.' : 'Not Guilty.'} ${verdict.verdict_statement}`
    fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice: 'shimmer' }),
    }).then(r => r.blob()).then(blob => {
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audio.onended = () => URL.revokeObjectURL(url)
      audio.play().catch(() => {})
    }).catch(() => {})
  }, [voiceModeOn, verdict])

  function handleNewCase() {
    resetTrial()
    onNewCase()
  }

  const isGuilty = verdict?.guilty === true
  const allFallacies = fallacies ?? verdict?.fallacies ?? []

  return (
    <div style={{ background: 'var(--bg)', color: 'var(--text)', minHeight: '100%', padding: '4rem 2rem' }}>
      <div style={{ maxWidth: '640px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '3rem' }}>

        {/* Verdict headline */}
        <div className="verdict-reveal" style={{
          textAlign: 'center',
          borderTop: `3px solid ${isGuilty ? '#ef4444' : 'var(--text)'}`,
          paddingTop: '2rem',
          opacity: revealed ? 1 : 0,
          animation: revealed ? 'verdictIn 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards' : 'none',
        }}>
          <h1 style={{
            fontFamily: 'Georgia, serif',
            fontSize: 'clamp(3rem, 12vw, 6rem)',
            fontWeight: 400,
            letterSpacing: '-0.02em',
            color: isGuilty ? '#ef4444' : 'var(--text)',
            margin: '0 0 0.75rem',
            lineHeight: 1,
          }}>
            {isGuilty ? 'Guilty.' : 'Not Guilty.'}
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
            {isGuilty
              ? 'The court has found you guilty as charged.'
              : 'The court finds in favor of the defendant.'}
          </p>
        </div>

        {/* Judge's statement */}
        {verdict?.verdict_statement && (
          <div style={{
            borderLeft: '2px solid var(--border)',
            paddingLeft: '1.25rem',
          }}>
            <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
              The Court's Ruling
            </div>
            <p style={{
              fontFamily: 'Georgia, serif',
              fontStyle: 'italic',
              fontSize: '15px',
              lineHeight: 1.7,
              color: 'var(--text)',
              margin: 0,
            }}>
              {verdict.verdict_statement}
            </p>
          </div>
        )}

        {/* Scores — all reveal at once with stagger */}
        <div>
          <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Defense Performance
          </div>
          {!scoresReady ? (
            <div style={{
              padding: '1.5rem',
              border: '1px solid var(--border)',
              background: 'var(--bg-card)',
              fontSize: '13px',
              fontStyle: 'italic',
              color: 'var(--text-muted)',
              textAlign: 'center',
            }}>
              Calculating scores...
            </div>
          ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '1px',
            background: 'var(--border)',
            border: '1px solid var(--border)',
            marginBottom: '1px',
          }}>
            {breakdown.map((item, i) => (
              <ScoreItem
                key={item.label}
                label={item.label}
                value={item.value}
                description={item.description}
                delay={revealed ? i * 80 : 9999}
              />
            ))}
          </div>
          )}

          {/* Total bar */}
          {scoresReady && <div style={{
            padding: '1rem',
            border: '1px solid var(--border)',
            background: 'var(--bg-card)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                Total Score
              </span>
              <span style={{ fontFamily: 'Georgia, serif', fontSize: '1.4rem', color: 'var(--text)' }}>
                {total}<span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>/40</span>
                <span style={{ marginLeft: '0.75rem', fontSize: '12px', fontStyle: 'italic', color: 'var(--text-muted)' }}>
                  {grade}
                </span>
              </span>
            </div>
            <div style={{ height: '3px', background: 'var(--border)' }}>
              <div style={{
                height: '100%',
                width: `${percentage}%`,
                background: 'var(--text)',
                transition: 'width 1s ease 0.3s',
              }} />
            </div>
          </div>}
        </div>

        {/* Dynamic round reasons */}
        {dynamicRoundReasons?.length > 0 && (
          <div>
            <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Why the Prosecution Extended
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {dynamicRoundReasons.map((reason, i) => (
                <div key={i} style={{
                  padding: '0.6rem 1rem',
                  borderLeft: '2px solid var(--border)',
                  background: 'var(--bg-card)',
                  fontSize: '12px',
                  fontStyle: 'italic',
                  color: 'var(--text-muted)',
                  lineHeight: 1.5,
                }}>
                  Round {i + 2}: {reason}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Fallacies */}
        {allFallacies.length > 0 && (
          <div>
            <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Logical Fallacies Detected
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {allFallacies.map((f, i) => (
                <div key={i} style={{
                  padding: '0.75rem 1rem',
                  borderLeft: '2px solid var(--prosecutor-border)',
                  background: 'var(--prosecutor-bg)',
                  fontSize: '13px',
                  fontStyle: 'italic',
                  color: 'var(--text)',
                  lineHeight: 1.5,
                  display: 'flex',
                  gap: '0.5rem',
                }}>
                  <span style={{ flexShrink: 0 }}>!</span>
                  {f}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* New case */}
        <div style={{ textAlign: 'center', paddingBottom: '2rem' }}>
          <button
            onClick={handleNewCase}
            style={{
              padding: '0.85rem 2.5rem',
              background: 'var(--accent)',
              color: 'var(--accent-text)',
              border: 'none',
              fontFamily: 'Georgia, serif',
              fontSize: '13px',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            New Case
          </button>
        </div>
      </div>
    </div>
  )
}
