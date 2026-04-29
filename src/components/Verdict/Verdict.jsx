import { useTrialContext } from '../../context/TrialContext.jsx'
import VerdictBanner from './VerdictBanner.jsx'
import VerdictStatement from './VerdictStatement.jsx'
import ScoreCard from './ScoreCard.jsx'
import FallacyList from './FallacyList.jsx'

export default function Verdict({ onNewCase }) {
  const { verdict, fallacies, resetTrial } = useTrialContext()

  function handleNewCase() {
    resetTrial()
    if (onNewCase) onNewCase()
  }

  return (
    <div className="min-h-screen bg-[#1a1008] text-[#F5F0E8] overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-8">
        <VerdictBanner guilty={verdict?.guilty} />

        <VerdictStatement statement={verdict?.verdict_statement} />

        <ScoreCard scores={verdict?.scores} />

        <FallacyList fallacies={fallacies ?? verdict?.fallacies ?? []} />

        <div className="flex justify-center pt-4">
          <button
            onClick={handleNewCase}
            className="px-8 py-3 bg-[#2A4A6B] hover:bg-[#3a5a7b] text-[#F5F0E8] font-serif uppercase tracking-widest text-sm border border-[#2A4A6B] rounded transition-colors"
          >
            New Case
          </button>
        </div>
      </div>
    </div>
  )
}
