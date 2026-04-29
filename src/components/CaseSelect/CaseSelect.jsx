import { useState } from 'react';
import CASES from '../../constants/cases.js';
import { useTrialContext } from '../../context/TrialContext.jsx';
import CaseGrid from './CaseGrid';
import CustomInput from './CustomInput';

export default function CaseSelect({ onStart }) {
  const { startTrial, isLoading } = useTrialContext();
  const [selectedCaseId, setSelectedCaseId] = useState(null);
  const [customText, setCustomText] = useState('');

  const handleCaseSelect = (id) => {
    setSelectedCaseId(id);
  };

  const handleCustomChange = (text) => {
    setCustomText(text);
    if (text.trim()) {
      setSelectedCaseId(null);
    }
  };

  const activeAccusation = customText.trim()
    ? customText.trim()
    : selectedCaseId
    ? CASES.find(c => c.id === selectedCaseId)?.accusation ?? ''
    : '';

  const canStart = activeAccusation.length > 0;

  return (
    <div
      className="min-h-screen font-serif px-4 py-10"
      style={{ background: '#1a1008', color: '#F5F0E8' }}
    >
      <div className="max-w-3xl mx-auto flex flex-col gap-8">

        {/* Header */}
        <div className="flex flex-col items-center gap-3 text-center">
          <h1
            className="font-serif tracking-wide"
            style={{ color: '#C9A84C', fontSize: '3.5rem', lineHeight: 1.1 }}
          >
            ⚖ ALL RISE
          </h1>
          <p
            className="font-serif italic"
            style={{ color: '#F5F0E8', fontSize: '1rem', opacity: 0.8 }}
          >
            A Courtroom of Questionable Justice
          </p>
          <hr
            style={{
              border: 'none',
              borderTop: '1px solid #C9A84C',
              width: '100%',
              maxWidth: '400px',
              opacity: 0.5,
            }}
          />
        </div>

        {/* Case selection */}
        <div className="flex flex-col gap-3">
          <div
            className="font-serif tracking-widest text-xs font-semibold"
            style={{ color: '#C9A84C', fontVariant: 'small-caps', letterSpacing: '0.18em' }}
          >
            SELECT YOUR CHARGE
          </div>
          <CaseGrid
            cases={CASES}
            selectedId={selectedCaseId}
            onSelect={handleCaseSelect}
          />
        </div>

        {/* Divider */}
        <div className="text-center font-serif" style={{ color: '#C9A84C', fontSize: '13px', letterSpacing: '0.2em' }}>
          — OR —
        </div>

        {/* Custom input */}
        <CustomInput value={customText} onChange={handleCustomChange} />

        {/* Start button */}
        <button
          onClick={async () => {
            if (!canStart || isLoading) return
            await startTrial(activeAccusation)
            onStart()
          }}
          disabled={!canStart || isLoading}
          className="w-full font-serif tracking-widest text-base py-4 transition-all duration-150"
          style={{
            background: canStart ? '#8B1A1A' : '#8B1A1A',
            color: '#F5F0E8',
            border: 'none',
            opacity: canStart ? 1 : 0.4,
            cursor: canStart ? 'pointer' : 'not-allowed',
            letterSpacing: '0.2em',
            fontSize: '15px',
          }}
          onMouseEnter={e => { if (canStart) e.currentTarget.style.background = '#a82020'; }}
          onMouseLeave={e => { if (canStart) e.currentTarget.style.background = '#8B1A1A'; }}
        >
          ENTER THE COURTROOM
        </button>
      </div>
    </div>
  );
}
