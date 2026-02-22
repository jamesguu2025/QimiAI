// components/CrisisCalm/BreathingCircle.tsx - Animated breathing circle with state machine

import React, { useState, useEffect, useCallback } from 'react';

type Phase = 'inhale' | 'hold' | 'exhale';

const PHASE_CONFIG: Record<Phase, { duration: number; label: string; next: Phase }> = {
  inhale: { duration: 4, label: 'Breathe In', next: 'hold' },
  hold: { duration: 4, label: 'Hold', next: 'exhale' },
  exhale: { duration: 6, label: 'Breathe Out', next: 'inhale' },
};

const SCALE_MAP: Record<Phase, number> = {
  inhale: 1,
  hold: 1,
  exhale: 0.6,
};

const BreathingCircle: React.FC = () => {
  const [phase, setPhase] = useState<Phase>('inhale');
  const [countdown, setCountdown] = useState(PHASE_CONFIG.inhale.duration);
  const [scale, setScale] = useState(0.6);

  const advancePhase = useCallback(() => {
    setPhase((prev) => {
      const next = PHASE_CONFIG[prev].next;
      setCountdown(PHASE_CONFIG[next].duration);
      setScale(SCALE_MAP[next]);
      return next;
    });
  }, []);

  useEffect(() => {
    // Start with inhale scale
    setScale(SCALE_MAP.inhale);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          advancePhase();
          return prev; // Will be reset by advancePhase
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [advancePhase]);

  const config = PHASE_CONFIG[phase];
  const transitionDuration = phase === 'exhale' ? 6 : 4;

  return (
    <div className="flex flex-col items-center gap-6">
      <svg
        width="200"
        height="200"
        viewBox="0 0 200 200"
        className="overflow-visible"
      >
        <circle
          cx="100"
          cy="100"
          r="80"
          fill="rgba(0, 212, 170, 0.15)"
          stroke="#00D4AA"
          strokeWidth="3"
          style={{
            transform: `scale(${scale})`,
            transformOrigin: '100px 100px',
            transition: `transform ${transitionDuration}s ease-in-out`,
          }}
        />
        <text
          x="100"
          y="95"
          textAnchor="middle"
          dominantBaseline="middle"
          fill="white"
          fontSize="20"
          fontWeight="500"
        >
          {config.label}
        </text>
        <text
          x="100"
          y="120"
          textAnchor="middle"
          dominantBaseline="middle"
          fill="rgba(255,255,255,0.7)"
          fontSize="28"
          fontWeight="300"
        >
          {countdown}
        </text>
      </svg>
    </div>
  );
};

export default BreathingCircle;
