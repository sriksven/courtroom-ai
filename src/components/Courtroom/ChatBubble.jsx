export default function ChatBubble({ message }) {
  const { role, content, timestamp } = message

  const formatTime = (ts) => {
    if (!ts) return ''
    const d = new Date(ts)
    const h = String(d.getHours()).padStart(2, '0')
    const m = String(d.getMinutes()).padStart(2, '0')
    return `${h}:${m}`
  }

  if (role === 'system') {
    return (
      <div className="w-full flex justify-center my-2">
        <span
          style={{ color: '#888', fontSize: '0.75rem', fontFamily: 'monospace' }}
        >
          {content}
        </span>
      </div>
    )
  }

  if (role === 'judge') {
    return (
      <div className="w-full flex flex-col items-center my-3">
        <span
          style={{
            color: '#C9A84C',
            fontSize: '0.65rem',
            letterSpacing: '0.1em',
            fontVariant: 'small-caps',
            marginBottom: '4px',
          }}
        >
          THE COURT
        </span>
        <p
          style={{
            color: '#C9A84C',
            fontFamily: 'Georgia, serif',
            fontStyle: 'italic',
            fontSize: '0.95rem',
            textAlign: 'center',
            maxWidth: '80%',
          }}
        >
          {content}
        </p>
      </div>
    )
  }

  if (role === 'prosecutor') {
    return (
      <div className="my-2" style={{ maxWidth: '85%' }}>
        <span
          style={{
            color: '#8B1A1A',
            fontSize: '0.65rem',
            letterSpacing: '0.1em',
            fontVariant: 'small-caps',
            display: 'block',
            marginBottom: '3px',
          }}
        >
          PROSECUTION
        </span>
        <div
          style={{
            borderLeft: '3px solid #8B1A1A',
            background: 'rgba(139,26,26,0.1)',
            padding: '10px 14px',
            borderRadius: '0 6px 6px 0',
            fontFamily: 'Georgia, serif',
            color: '#F5F0E8',
            fontSize: '0.9rem',
            position: 'relative',
          }}
        >
          <p style={{ margin: 0 }}>{content}</p>
          {timestamp && (
            <span
              style={{
                display: 'block',
                textAlign: 'right',
                color: 'rgba(245,240,232,0.35)',
                fontSize: '0.65rem',
                marginTop: '6px',
              }}
            >
              {formatTime(timestamp)}
            </span>
          )}
        </div>
      </div>
    )
  }

  if (role === 'defense') {
    return (
      <div className="my-2 ml-auto" style={{ maxWidth: '85%' }}>
        <span
          style={{
            color: '#2A4A6B',
            fontSize: '0.65rem',
            letterSpacing: '0.1em',
            fontVariant: 'small-caps',
            display: 'block',
            textAlign: 'right',
            marginBottom: '3px',
          }}
        >
          DEFENSE
        </span>
        <div
          style={{
            borderRight: '3px solid #2A4A6B',
            background: 'rgba(42,74,107,0.15)',
            padding: '10px 14px',
            borderRadius: '6px 0 0 6px',
            fontFamily: 'Georgia, serif',
            color: '#F5F0E8',
            fontSize: '0.9rem',
          }}
        >
          <p style={{ margin: 0 }}>{content}</p>
          {timestamp && (
            <span
              style={{
                display: 'block',
                textAlign: 'right',
                color: 'rgba(245,240,232,0.35)',
                fontSize: '0.65rem',
                marginTop: '6px',
              }}
            >
              {formatTime(timestamp)}
            </span>
          )}
        </div>
      </div>
    )
  }

  return null
}
