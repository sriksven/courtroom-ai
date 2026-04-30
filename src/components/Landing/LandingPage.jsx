import { useState, useRef } from 'react'
import CASES from '../../constants/cases.js'
import { useTrialContext } from '../../context/TrialContext.jsx'

export default function LandingPage({ onStart }) {
  const { startTrial, isLoading } = useTrialContext()
  const [selectedId, setSelectedId] = useState(null)
  const [customText, setCustomText] = useState('')
  const [mode, setMode] = useState('off') // 'off' | 'hybrid'
  const [selectedRounds, setSelectedRounds] = useState(3)
  const [isDynamic, setIsDynamic] = useState(false)
  const [difficulty, setDifficulty] = useState('normal')
  const [topicInput, setTopicInput] = useState('')
  const [generatingCharge, setGeneratingCharge] = useState(false)
  const casesRef = useRef(null)

  const activeAccusation = customText.trim()
    ? customText.trim()
    : selectedId
    ? CASES.find(c => c.id === selectedId)?.accusation ?? ''
    : ''

  const canStart = activeAccusation.length > 0

  async function handleStart() {
    if (!canStart || isLoading) return
    const rounds = isDynamic ? 'dynamic' : selectedRounds
    await startTrial(activeAccusation, rounds, difficulty)
    onStart(mode)
  }

  async function handleGenerateCharge() {
    if (!topicInput.trim() || generatingCharge) return
    setGeneratingCharge(true)
    try {
      const res = await fetch('/api/generate-charge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topicInput.trim() }),
      })
      const data = await res.json()
      if (data.charge) {
        setCustomText(data.charge)
        setSelectedId(null)
      }
    } catch { /* ignore */ } finally {
      setGeneratingCharge(false)
    }
  }

  function scrollToCases() {
    casesRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div style={{ background: 'var(--bg)', color: 'var(--text)', minHeight: '100%' }}>

      {/* Hero */}
      <section style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        textAlign: 'center',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ marginBottom: '0.5rem', fontSize: '11px', letterSpacing: '0.3em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
          All Rise
        </div>
        <h1 style={{
          fontFamily: 'Georgia, serif',
          fontSize: 'clamp(3rem, 10vw, 7rem)',
          fontWeight: 400,
          lineHeight: 1,
          letterSpacing: '-0.02em',
          margin: '0 0 1.5rem',
          color: 'var(--text)',
        }}>
          Defend Yourself.
        </h1>
        <p style={{
          fontSize: 'clamp(1rem, 2vw, 1.2rem)',
          color: 'var(--text-muted)',
          maxWidth: '480px',
          lineHeight: 1.6,
          margin: '0 0 3rem',
          fontStyle: 'italic',
        }}>
          A courtroom of questionable justice. Three AI agents. One very confused defendant.
        </p>
        <button
          onClick={scrollToCases}
          style={{
            padding: '0.85rem 2rem',
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
          Select Your Charge
        </button>
      </section>

      {/* Cases */}
      <section ref={casesRef} style={{ padding: '5rem 2rem', maxWidth: '900px', margin: '0 auto' }}>
        <div style={{
          fontSize: '10px',
          letterSpacing: '0.3em',
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          marginBottom: '2rem',
        }}>
          Choose a charge
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '1px',
          background: 'var(--border)',
          border: '1px solid var(--border)',
        }}>
          {CASES.map(c => (
            <button
              key={c.id}
              onClick={() => { setSelectedId(c.id); setCustomText('') }}
              style={{
                padding: '1.25rem',
                background: selectedId === c.id ? 'var(--accent)' : 'var(--bg)',
                color: selectedId === c.id ? 'var(--accent-text)' : 'var(--text)',
                border: 'none',
                textAlign: 'left',
                cursor: 'pointer',
                fontFamily: 'Georgia, serif',
                fontSize: '13px',
                lineHeight: 1.4,
                transition: 'background 0.15s, color 0.15s',
              }}
              onMouseEnter={e => {
                if (selectedId !== c.id) e.currentTarget.style.background = 'var(--bg-secondary)'
              }}
              onMouseLeave={e => {
                if (selectedId !== c.id) e.currentTarget.style.background = 'var(--bg)'
              }}
            >
              <div>{c.title}</div>
              {c.subtitle && (
                <div style={{ fontSize: '11px', opacity: 0.65, marginTop: '3px', fontStyle: 'italic', lineHeight: 1.3 }}>
                  {c.subtitle}
                </div>
              )}
            </button>
          ))}
        </div>

        {/* AI charge generator */}
        <div style={{ margin: '3rem 0 0' }}>
          <div style={{ fontSize: '10px', letterSpacing: '0.3em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
            Or generate a charge from a topic
          </div>
          <div style={{ display: 'flex', gap: '1px', background: 'var(--border)', border: '1px solid var(--border)' }}>
            <input
              value={topicInput}
              onChange={e => setTopicInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleGenerateCharge()}
              placeholder="e.g. coffee, parking, group chats..."
              style={{
                flex: 1,
                padding: '0.75rem 1rem',
                background: 'var(--bg-card)',
                border: 'none',
                color: 'var(--text)',
                fontFamily: 'Georgia, serif',
                fontSize: '14px',
                outline: 'none',
              }}
            />
            <button
              onClick={handleGenerateCharge}
              disabled={!topicInput.trim() || generatingCharge}
              style={{
                padding: '0.75rem 1.25rem',
                background: topicInput.trim() && !generatingCharge ? 'var(--accent)' : 'var(--bg-secondary)',
                color: topicInput.trim() && !generatingCharge ? 'var(--accent-text)' : 'var(--text-muted)',
                border: 'none',
                fontFamily: 'Georgia, serif',
                fontSize: '12px',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                cursor: topicInput.trim() && !generatingCharge ? 'pointer' : 'not-allowed',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {generatingCharge ? 'Drafting...' : 'Generate Charge'}
            </button>
          </div>
        </div>

        {/* Custom input */}
        <div style={{ margin: '1.5rem 0 0' }}>
          <div style={{
            fontSize: '10px',
            letterSpacing: '0.3em',
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            marginBottom: '0.75rem',
          }}>
            Or write your own charge
          </div>
          <textarea
            value={customText}
            onChange={e => { setCustomText(e.target.value); setSelectedId(null) }}
            placeholder="The defendant is accused of..."
            rows={3}
            style={{
              width: '100%',
              padding: '1rem',
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
              fontFamily: 'Georgia, serif',
              fontSize: '14px',
              lineHeight: 1.6,
              resize: 'none',
              outline: 'none',
              transition: 'border-color 0.2s',
            }}
            onFocus={e => e.currentTarget.style.borderColor = 'var(--text-muted)'}
            onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
          />
        </div>

        {/* Mode selector */}
        <div style={{ marginTop: '2.5rem' }}>
          <div style={{
            fontSize: '10px',
            letterSpacing: '0.3em',
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            marginBottom: '0.75rem',
          }}>
            How do you want to play?
          </div>
          <div style={{ display: 'flex', gap: '1px', background: 'var(--border)', border: '1px solid var(--border)' }}>
            {[
              { value: 'off', label: '✍  Text', desc: 'Type your defense' },
              { value: 'hybrid', label: 'Auto Voice', desc: 'Speak your defense' },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setMode(opt.value)}
                style={{
                  flex: 1,
                  padding: '1rem',
                  background: mode === opt.value ? 'var(--accent)' : 'var(--bg)',
                  color: mode === opt.value ? 'var(--accent-text)' : 'var(--text)',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'Georgia, serif',
                  textAlign: 'center',
                  transition: 'background 0.15s, color 0.15s',
                }}
                onMouseEnter={e => { if (mode !== opt.value) e.currentTarget.style.background = 'var(--bg-secondary)' }}
                onMouseLeave={e => { if (mode !== opt.value) e.currentTarget.style.background = 'var(--bg)' }}
              >
                <div style={{ fontSize: '14px', marginBottom: '2px' }}>{opt.label}</div>
                <div style={{ fontSize: '11px', opacity: 0.7 }}>{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Round selector */}
        <div style={{ marginTop: '1.5rem' }}>
          <div style={{ fontSize: '10px', letterSpacing: '0.3em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
            Rounds
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            {[1, 2, 3, 4, 5].map(n => (
              <button
                key={n}
                onClick={() => { setSelectedRounds(n); setIsDynamic(false) }}
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  background: !isDynamic && selectedRounds === n ? 'var(--accent)' : 'var(--bg)',
                  color: !isDynamic && selectedRounds === n ? 'var(--accent-text)' : 'var(--text)',
                  border: '1px solid var(--border)',
                  fontFamily: 'Georgia, serif',
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'background 0.15s, color 0.15s',
                }}
              >
                {n}
              </button>
            ))}
            <button
              onClick={() => setIsDynamic(true)}
              style={{
                flex: 2,
                padding: '0.5rem 0.75rem',
                background: isDynamic ? 'var(--accent)' : 'var(--bg)',
                color: isDynamic ? 'var(--accent-text)' : 'var(--text)',
                border: '1px solid var(--border)',
                fontFamily: 'Georgia, serif',
                fontSize: '12px',
                fontStyle: 'italic',
                cursor: 'pointer',
                transition: 'background 0.15s, color 0.15s',
                whiteSpace: 'nowrap',
              }}
            >
              Dynamic
            </button>
          </div>
          {isDynamic && (
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px', letterSpacing: '0.02em' }}>
              The prosecutor decides when enough is enough. Up to 10 rounds.
            </div>
          )}
        </div>

        {/* Difficulty selector */}
        <div style={{ marginTop: '1.5rem' }}>
          <div style={{ fontSize: '10px', letterSpacing: '0.3em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
            Difficulty
          </div>
          <div style={{ display: 'flex', gap: '1px', background: 'var(--border)', border: '1px solid var(--border)' }}>
            {[
              { value: 'easy', label: 'Easy', desc: 'Reginald is a bit sloppy today' },
              { value: 'normal', label: 'Normal', desc: 'Standard theatrical prosecution' },
              { value: 'hard', label: 'Hard', desc: 'Ruthless. Uses your words against you.' },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setDifficulty(opt.value)}
                style={{
                  flex: 1,
                  padding: '0.75rem 0.5rem',
                  background: difficulty === opt.value ? 'var(--accent)' : 'var(--bg)',
                  color: difficulty === opt.value ? 'var(--accent-text)' : 'var(--text)',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'Georgia, serif',
                  textAlign: 'center',
                  transition: 'background 0.15s, color 0.15s',
                }}
                onMouseEnter={e => { if (difficulty !== opt.value) e.currentTarget.style.background = 'var(--bg-secondary)' }}
                onMouseLeave={e => { if (difficulty !== opt.value) e.currentTarget.style.background = 'var(--bg)' }}
              >
                <div style={{ fontSize: '13px', marginBottom: '2px' }}>{opt.label}</div>
                <div style={{ fontSize: '10px', opacity: 0.7, fontStyle: 'italic' }}>{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Start button */}
        <div style={{ marginTop: '1.5rem' }}>
          {canStart && (
            <div style={{
              padding: '1rem',
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              marginBottom: '1rem',
              fontSize: '13px',
              color: 'var(--text-muted)',
              fontStyle: 'italic',
              lineHeight: 1.5,
            }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', fontStyle: 'normal' }}>
                Charge:{' '}
              </span>
              {activeAccusation.length > 120 ? activeAccusation.slice(0, 120) + '...' : activeAccusation}
            </div>
          )}
          <button
            onClick={handleStart}
            disabled={!canStart || isLoading}
            style={{
              width: '100%',
              padding: '1.1rem',
              background: canStart ? 'var(--accent)' : 'var(--bg-secondary)',
              color: canStart ? 'var(--accent-text)' : 'var(--text-muted)',
              border: '1px solid var(--border)',
              fontFamily: 'Georgia, serif',
              fontSize: '13px',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              cursor: canStart ? 'pointer' : 'not-allowed',
              transition: 'opacity 0.2s',
              opacity: isLoading ? 0.6 : 1,
            }}
          >
            {isLoading ? 'Summoning the court...' : 'Enter the Courtroom'}
          </button>
        </div>
      </section>
    </div>
  )
}
