import { useEffect, useState } from 'react'
import { PHASE_LABELS } from '../../constants/phases.js'

export default function PhaseTransition({ phase, visible }) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (visible) {
      setShow(true)
      const timer = setTimeout(() => setShow(false), 2500)
      return () => clearTimeout(timer)
    }
  }, [visible, phase])

  if (!show) return null

  return (
    <div
      className="w-full flex items-center justify-center transition-all duration-500"
      style={{
        background: 'rgba(26,16,8,0.95)',
        borderBottom: '1px solid rgba(201,168,76,0.3)',
        borderTop: '1px solid rgba(201,168,76,0.3)',
        padding: '18px 0',
        opacity: show ? 1 : 0,
        transform: show ? 'translateY(0)' : 'translateY(-20px)',
        zIndex: 20,
      }}
    >
      <span
        style={{
          color: '#C9A84C',
          fontFamily: 'Georgia, serif',
          fontSize: '1.5rem',
          fontWeight: 'bold',
          letterSpacing: '0.12em',
          fontVariant: 'small-caps',
        }}
      >
        {PHASE_LABELS[phase] || phase}
      </span>
    </div>
  )
}
