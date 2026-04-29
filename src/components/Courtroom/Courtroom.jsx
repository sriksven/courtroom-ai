import { useEffect, useRef, useState } from 'react'
import { useTrialContext } from '../../context/TrialContext.jsx'
import { useVoice } from '../../hooks/useVoice.js'
import TrialHeader from './TrialHeader.jsx'
import PhaseTransition from './PhaseTransition.jsx'
import ChatArea from './ChatArea.jsx'
import InputBar from '../InputBar/InputBar.jsx'
import Verdict from '../Verdict/Verdict.jsx'

export default function Courtroom({ onVerdictComplete }) {
  const { messages, isLoading, phase, round, accusation } = useTrialContext()

  const [phaseTransitionVisible, setPhaseTransitionVisible] = useState(false)
  const prevPhaseRef = useRef(phase)

  useEffect(() => {
    if (prevPhaseRef.current !== phase) {
      prevPhaseRef.current = phase
      setPhaseTransitionVisible(true)
      const timer = setTimeout(() => setPhaseTransitionVisible(false), 2500)
      return () => clearTimeout(timer)
    }
  }, [phase])

  const { speakText } = useVoice({ onTranscript: () => {} })
  const lastMessageRef = useRef(null)

  useEffect(() => {
    const lastMsg = messages[messages.length - 1]
    if (!lastMsg || lastMsg === lastMessageRef.current) return
    if (lastMsg.role === 'prosecutor') {
      lastMessageRef.current = lastMsg
      speakText(lastMsg.content)
    }
  }, [messages])

  return (
    <div
      className="flex flex-col h-screen"
      style={{ background: '#1a1008', color: '#F5F0E8' }}
    >
      <TrialHeader accusation={accusation} phase={phase} round={round} />
      <PhaseTransition phase={phase} visible={phaseTransitionVisible} />
      <ChatArea messages={messages} isLoading={isLoading} />
      {phase !== 'VERDICT' && <InputBar />}
      {phase === 'VERDICT' && <Verdict onNewCase={onVerdictComplete} />}
    </div>
  )
}
