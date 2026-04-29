import { useState } from 'react'

export default function Tooltip({ children, text }) {
  const [visible, setVisible] = useState(false)

  return (
    <span
      className="relative inline-block"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && text && (
        <span
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs font-sans text-[#F5F0E8] bg-[#0f0a04] border border-[#C9A84C]/40 rounded whitespace-nowrap pointer-events-none z-50"
        >
          {text}
        </span>
      )}
    </span>
  )
}
