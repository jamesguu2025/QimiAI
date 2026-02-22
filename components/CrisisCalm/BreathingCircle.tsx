// components/CrisisCalm/BreathingCircle.tsx - Breathing text with 4-phase cycle
// The halo/glow is rendered by the parent (calm.tsx) for seamless transition from preparation

import React, { useState, useEffect, useCallback } from 'react';

type Phase = 'inhale' | 'hold1' | 'exhale' | 'hold2';

const PHASE_CONFIG: Record<Phase, { duration: number; label: string; next: Phase }> = {
  inhale: { duration: 4, label: 'Breathe In', next: 'hold1' },
  hold1: { duration: 4, label: 'Hold', next: 'exhale' },
  exhale: { duration: 4, label: 'Breathe Out', next: 'hold2' },
  hold2: { duration: 4, label: 'Hold', next: 'inhale' },
};

interface BreathingState {
  phase: Phase;
  countdown: number;
  cycle: number;
}

interface BreathingCircleProps {
  maxCycles?: number;
  onComplete?: () => void;
}

const BreathingCircle: React.FC<BreathingCircleProps> = ({ maxCycles = 4, onComplete }) => {
  const [state, setState] = useState<BreathingState>({
    phase: 'inhale',
    countdown: PHASE_CONFIG.inhale.duration,
    cycle: 1,
  });
  const [completed, setCompleted] = useState(false);

  const handleComplete = useCallback(() => {
    setCompleted(true);
    if (onComplete) onComplete();
  }, [onComplete]);

  useEffect(() => {
    if (completed) return;

    const timer = setInterval(() => {
      setState((prev) => {
        if (prev.countdown <= 1) {
          const nextPhase = PHASE_CONFIG[prev.phase].next;

          if (nextPhase === 'inhale') {
            const nextCycle = prev.cycle + 1;
            if (nextCycle > maxCycles) {
              return { ...prev, countdown: 0 };
            }
            return {
              phase: nextPhase,
              countdown: PHASE_CONFIG[nextPhase].duration,
              cycle: nextCycle,
            };
          }

          return {
            ...prev,
            phase: nextPhase,
            countdown: PHASE_CONFIG[nextPhase].duration,
          };
        }
        return { ...prev, countdown: prev.countdown - 1 };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [completed, maxCycles]);

  useEffect(() => {
    if (state.countdown === 0 && !completed) {
      handleComplete();
    }
  }, [state.countdown, completed, handleComplete]);

  if (completed) return null;

  const config = PHASE_CONFIG[state.phase];

  return (
    <div className="w-full h-full flex flex-col items-center justify-center">
      {/* Cycle indicator */}
      <div className="text-xs text-slate-500 mb-3">
        Round {state.cycle} / {maxCycles}
      </div>
      {/* Phase label */}
      <span className="text-xl font-light text-white tracking-wide">
        {config.label}
      </span>
      {/* Countdown */}
      <span className="text-3xl font-extralight text-white/70 mt-1">
        {state.countdown}
      </span>
    </div>
  );
};

export default BreathingCircle;
