export default function CaseCard({ caseData, isSelected, onClick }) {
  return (
    <div
      onClick={onClick}
      className="relative cursor-pointer font-serif transition-all duration-150"
      style={{
        background: isSelected ? '#1a1008' : '#0d0804',
        border: `1px solid ${isSelected ? '#C9A84C' : '#3a2808'}`,
        boxShadow: isSelected ? '0 0 10px rgba(201,168,76,0.25)' : 'none',
        padding: '14px 14px 14px 18px',
        filter: 'brightness(1)',
      }}
      onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.15)'; }}
      onMouseLeave={e => { e.currentTarget.style.filter = 'brightness(1)'; }}
    >
      {/* Left accent bar */}
      <div
        className="absolute top-0 left-0 h-full"
        style={{ width: '3px', background: '#8B1A1A' }}
      />

      {/* Title */}
      <p
        className="font-serif leading-snug"
        style={{
          color: '#F5F0E8',
          fontSize: '14px',
          marginBottom: '4px',
          lineHeight: 1.3,
        }}
      >
        {caseData.title}
      </p>

      {/* Subtitle */}
      <p
        className="font-serif"
        style={{
          color: '#a89070',
          fontSize: '11px',
          lineHeight: 1.4,
          fontStyle: 'italic',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {caseData.subtitle}
      </p>
    </div>
  );
}
