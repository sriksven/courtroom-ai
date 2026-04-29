import { useScoring } from '../../hooks/useScoring.js'

function MetricCard({ label, value, description }) {
  return (
    <div className="bg-[#0f0a04] border border-[#C9A84C]/30 rounded p-4 flex flex-col gap-1">
      <p className="text-xs font-mono tracking-widest uppercase text-[#C9A84C]">{label}</p>
      <p className="text-3xl font-mono text-[#F5F0E8]">
        {value}<span className="text-base opacity-50">/10</span>
      </p>
      <p className="text-xs font-serif italic text-[#F5F0E8]/60">{description}</p>
    </div>
  )
}

export default function ScoreCard({ scores }) {
  const { total, percentage, grade, breakdown } = useScoring(scores)

  return (
    <div className="w-full flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        {breakdown.map((item) => (
          <MetricCard
            key={item.label}
            label={item.label.toUpperCase()}
            value={item.value}
            description={item.description}
          />
        ))}
      </div>

      <div className="bg-[#0f0a04] border border-[#C9A84C]/30 rounded p-4 flex flex-col gap-2">
        <p className="text-sm font-mono tracking-widest uppercase text-[#C9A84C]">
          Total Score: {total} / 40
        </p>
        <div className="w-full h-3 bg-[#8B1A1A]/40 rounded overflow-hidden">
          <div
            className="h-full bg-[#C9A84C] rounded transition-all"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <p className="text-sm font-serif italic text-[#F5F0E8]/70">Grade: {grade}</p>
      </div>
    </div>
  )
}
