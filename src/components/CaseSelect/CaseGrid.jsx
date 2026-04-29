import CaseCard from './CaseCard';

export default function CaseGrid({ cases, selectedId, onSelect }) {
  return (
    <div
      className="grid grid-cols-2 md:grid-cols-3 overflow-y-auto"
      style={{ gap: '12px', maxHeight: '420px' }}
    >
      {cases.map(c => (
        <CaseCard
          key={c.id}
          caseData={c}
          isSelected={selectedId === c.id}
          onClick={() => onSelect(c.id)}
        />
      ))}
    </div>
  );
}
