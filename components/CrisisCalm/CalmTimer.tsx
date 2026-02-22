// components/CrisisCalm/CalmTimer.tsx - Elapsed session timer

import React, { useState, useEffect } from 'react';

const CalmTimer: React.FC = () => {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatted =
    String(Math.floor(seconds / 60)).padStart(2, '0') +
    ':' +
    String(seconds % 60).padStart(2, '0');

  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs text-slate-600">Time in calm mode</span>
      <span className="text-sm text-slate-500 tabular-nums">{formatted}</span>
    </div>
  );
};

export default CalmTimer;
