// components/CrisisCalm/BreathingHalo.tsx - 3-layer radial gradient halo effect
// Renders the teal/purple glow that scales with breathing phases

import React from 'react';

interface BreathingHaloProps {
  scale: number;
  transition?: string;
}

const BreathingHalo: React.FC<BreathingHaloProps> = ({ scale, transition = '1s' }) => {
  const transitionStyle = `transform ${transition} ease-in-out`;

  return (
    <>
      <div
        className="absolute rounded-full"
        style={{
          width: '100%',
          height: '100%',
          background: 'radial-gradient(circle, rgba(0,212,170,0.25) 0%, rgba(139,92,246,0.12) 50%, transparent 70%)',
          transform: `scale(${scale * 1.3})`,
          transition: transitionStyle,
          filter: 'blur(20px)',
        }}
      />
      <div
        className="absolute rounded-full"
        style={{
          width: '75%',
          height: '75%',
          background: 'radial-gradient(circle, rgba(0,212,170,0.45) 0%, rgba(139,92,246,0.2) 60%, transparent 100%)',
          transform: `scale(${scale * 1.2})`,
          transition: transitionStyle,
          filter: 'blur(10px)',
        }}
      />
      <div
        className="absolute rounded-full"
        style={{
          width: '50%',
          height: '50%',
          background: 'radial-gradient(circle, rgba(0,212,170,0.6) 0%, rgba(0,212,170,0.25) 50%, transparent 100%)',
          transform: `scale(${scale})`,
          transition: transitionStyle,
          filter: 'blur(4px)',
        }}
      />
    </>
  );
};

export default BreathingHalo;
