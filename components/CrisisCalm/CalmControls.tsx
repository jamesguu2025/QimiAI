// components/CrisisCalm/CalmControls.tsx - Exit button and sound toggle

import React, { useState } from 'react';

interface CalmControlsProps {
  onToggleSound: (on: boolean) => void;
  onExit: () => void;
}

const CalmControls: React.FC<CalmControlsProps> = ({ onToggleSound, onExit }) => {
  const [soundOn, setSoundOn] = useState(true);

  const handleToggle = () => {
    const next = !soundOn;
    setSoundOn(next);
    onToggleSound(next);
  };

  return (
    <div className="fixed top-4 right-4 flex items-center gap-3 z-50">
      {/* Sound Toggle */}
      <button
        type="button"
        onClick={handleToggle}
        className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors"
        aria-label="Toggle sound"
      >
        {soundOn ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <line x1="23" y1="9" x2="17" y2="15" />
            <line x1="17" y1="9" x2="23" y2="15" />
          </svg>
        )}
      </button>

      {/* Exit Button */}
      <button
        type="button"
        onClick={onExit}
        className="flex items-center gap-1.5 text-slate-300 hover:text-white transition-colors"
      >
        <span className="text-sm">Exit</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
};

export default CalmControls;
