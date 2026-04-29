import { useRef, useEffect } from 'react'
import ChatBubble from './ChatBubble.jsx'

function LoadingDots() {
  return (
    <div
      className="flex items-center justify-center gap-2 my-3"
      style={{ color: '#C9A84C', fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: '0.85rem' }}
    >
      <span>The court deliberates</span>
      {[0, 150, 300].map((delay, i) => (
        <span
          key={i}
          className="animate-bounce inline-block"
          style={{ animationDelay: `${delay}ms` }}
        >
          .
        </span>
      ))}
    </div>
  )
}

export default function ChatArea({ messages, isLoading }) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  return (
    <div
      className="flex-1 overflow-y-auto px-4 py-4"
      style={{ background: '#1a1008' }}
    >
      {messages.map((msg) => (
        <ChatBubble key={msg.id} message={msg} />
      ))}
      {isLoading && <LoadingDots />}
      {/* Extra padding so last message isn't hidden behind input bar */}
      <div className="h-20" ref={bottomRef} />
    </div>
  )
}
