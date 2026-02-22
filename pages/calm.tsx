// pages/calm.tsx - Fullscreen Crisis Calm page (no auth, no layout)
// Flow: Welcome → Active (Preparation 5s → Breathing 4 cycles) → Complete
// Single halo center point throughout — never moves, only scales

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Head from 'next/head';
import AffirmationCarousel from '@/components/CrisisCalm/AffirmationCarousel';
import CalmTimer from '@/components/CrisisCalm/CalmTimer';
import CalmControls from '@/components/CrisisCalm/CalmControls';

type Stage = 'welcome' | 'active' | 'complete';
type ActivePhase = 'preparation' | 'breathing';
type BreathPhase = 'inhale' | 'hold1' | 'exhale' | 'hold2';

const BREATH_CONFIG: Record<BreathPhase, { duration: number; label: string; next: BreathPhase; scale: number }> = {
  inhale:  { duration: 4, label: 'Breathe In',  next: 'hold1',  scale: 1.8 },
  hold1:   { duration: 4, label: 'Hold',        next: 'exhale', scale: 1.8 },
  exhale:  { duration: 4, label: 'Breathe Out', next: 'hold2',  scale: 1.3 },
  hold2:   { duration: 4, label: 'Hold',        next: 'inhale', scale: 1.3 },
};

const MAX_CYCLES = 4;

export default function CalmPage() {
  const [stage, setStage] = useState<Stage>('welcome');
  const [activePhase, setActivePhase] = useState<ActivePhase>('preparation');
  const [prepCountdown, setPrepCountdown] = useState(5);

  // Breathing state
  const [breathPhase, setBreathPhase] = useState<BreathPhase>('inhale');
  const [breathCountdown, setBreathCountdown] = useState(4);
  const [cycle, setCycle] = useState(1);
  const [breathDone, setBreathDone] = useState(false);

  // UI
  const [guideVisible, setGuideVisible] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Halo scale: steady during prep (matches welcome), then breathes 1.8 ↔ 1.3
  const haloScale = activePhase === 'preparation'
    ? 1.8  // same as welcome & inhale — no size jump
    : BREATH_CONFIG[breathPhase].scale;

  const haloTransition = activePhase === 'preparation' ? '1s' : '4s';

  // --- Handlers ---

  const handleBegin = () => {
    const audio = new Audio('/audio/background-music.mp3');
    audio.loop = true;
    audio.volume = 0.3;
    audio.play().catch(() => {});
    audioRef.current = audio;

    setStage('active');
    setActivePhase('preparation');
    setPrepCountdown(5);
  };

  // Preparation countdown
  useEffect(() => {
    if (stage !== 'active' || activePhase !== 'preparation') return;

    const timer = setInterval(() => {
      setPrepCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setActivePhase('breathing');
          setTimeout(() => setGuideVisible(true), 300);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [stage, activePhase]);

  const handleSkipPrep = () => {
    setActivePhase('breathing');
    setTimeout(() => setGuideVisible(true), 300);
  };

  // Breathing timer
  useEffect(() => {
    if (stage !== 'active' || activePhase !== 'breathing' || breathDone) return;

    const timer = setInterval(() => {
      setBreathCountdown((prev) => {
        if (prev <= 1) {
          // Advance phase
          const nextPhase = BREATH_CONFIG[breathPhase].next;

          if (nextPhase === 'inhale') {
            const nextCycle = cycle + 1;
            if (nextCycle > MAX_CYCLES) {
              clearInterval(timer);
              setBreathDone(true);
              return 0;
            }
            setCycle(nextCycle);
          }

          setBreathPhase(nextPhase);
          return BREATH_CONFIG[nextPhase].duration;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [stage, activePhase, breathPhase, cycle, breathDone]);

  // Breathing complete → transition to complete stage
  const handleBreathingComplete = useCallback(() => {
    setGuideVisible(false);
    setTimeout(() => setStage('complete'), 800);
  }, []);

  useEffect(() => {
    if (breathDone) handleBreathingComplete();
  }, [breathDone, handleBreathingComplete]);

  // Restart
  const handleRestart = () => {
    setBreathPhase('inhale');
    setBreathCountdown(4);
    setCycle(1);
    setBreathDone(false);
    setGuideVisible(false);
    setActivePhase('preparation');
    setPrepCountdown(5);
    setStage('active');
  };

  const handleExit = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    window.history.back();
  };

  const handleToggleSound = (on: boolean) => {
    if (!audioRef.current) return;
    if (on) {
      audioRef.current.play().catch(() => {});
    } else {
      audioRef.current.pause();
    }
  };

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  return (
    <>
      <Head>
        <title>Crisis Calm — Qimi AI</title>
      </Head>
      <div className="min-h-screen bg-slate-800 relative overflow-hidden">

        {/* Controls — always top-right when not welcome */}
        {stage !== 'welcome' && (
          <CalmControls onToggleSound={handleToggleSound} onExit={handleExit} />
        )}

        {/* === THE CIRCLE — always at exact viewport center === */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 1 }}>
          <div className="relative w-64 h-64 flex items-center justify-center">

            {/* Welcome: Begin — same 3-layer halo, scale matches prep first frame (1.8) */}
            {stage === 'welcome' && (
              <>
                <div
                  className="absolute rounded-full"
                  style={{
                    width: '100%',
                    height: '100%',
                    background: 'radial-gradient(circle, rgba(0,212,170,0.25) 0%, rgba(139,92,246,0.12) 50%, transparent 70%)',
                    transform: `scale(${1.8 * 1.3})`,
                    filter: 'blur(20px)',
                  }}
                />
                <div
                  className="absolute rounded-full"
                  style={{
                    width: '75%',
                    height: '75%',
                    background: 'radial-gradient(circle, rgba(0,212,170,0.45) 0%, rgba(139,92,246,0.2) 60%, transparent 100%)',
                    transform: `scale(${1.8 * 1.2})`,
                    filter: 'blur(10px)',
                  }}
                />
                <div
                  className="absolute rounded-full"
                  style={{
                    width: '50%',
                    height: '50%',
                    background: 'radial-gradient(circle, rgba(0,212,170,0.6) 0%, rgba(0,212,170,0.25) 50%, transparent 100%)',
                    transform: `scale(${1.8})`,
                    filter: 'blur(4px)',
                  }}
                />
                <button
                  type="button"
                  onClick={handleBegin}
                  className="relative z-10 text-[#00D4AA] text-lg font-light tracking-wide pointer-events-auto transition-opacity duration-300 hover:opacity-80 fade-in"
                >
                  Begin
                </button>
              </>
            )}

            {/* Active: Halo layers */}
            {stage === 'active' && (
              <>
                <div
                  className="absolute rounded-full"
                  style={{
                    width: '100%',
                    height: '100%',
                    background: 'radial-gradient(circle, rgba(0,212,170,0.25) 0%, rgba(139,92,246,0.12) 50%, transparent 70%)',
                    transform: `scale(${haloScale * 1.3})`,
                    transition: `transform ${haloTransition} ease-in-out`,
                    filter: 'blur(20px)',
                  }}
                />
                <div
                  className="absolute rounded-full"
                  style={{
                    width: '75%',
                    height: '75%',
                    background: 'radial-gradient(circle, rgba(0,212,170,0.45) 0%, rgba(139,92,246,0.2) 60%, transparent 100%)',
                    transform: `scale(${haloScale * 1.2})`,
                    transition: `transform ${haloTransition} ease-in-out`,
                    filter: 'blur(10px)',
                  }}
                />
                <div
                  className="absolute rounded-full"
                  style={{
                    width: '50%',
                    height: '50%',
                    background: 'radial-gradient(circle, rgba(0,212,170,0.6) 0%, rgba(0,212,170,0.25) 50%, transparent 100%)',
                    transform: `scale(${haloScale})`,
                    transition: `transform ${haloTransition} ease-in-out`,
                    filter: 'blur(4px)',
                  }}
                />

                {/* Prep countdown */}
                <div
                  className="absolute inset-0 flex items-center justify-center z-10 transition-opacity duration-500"
                  style={{ opacity: activePhase === 'preparation' ? 1 : 0 }}
                >
                  <span className="text-6xl font-extralight text-white">{prepCountdown}</span>
                </div>

                {/* Breathing text (Round indicator moved above halo) */}
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center z-10 transition-opacity duration-1000"
                  style={{ opacity: activePhase === 'breathing' && !breathDone ? 1 : 0 }}
                >
                  <span className="text-xl font-light text-white tracking-wide">
                    {BREATH_CONFIG[breathPhase].label}
                  </span>
                  <span className="text-3xl font-extralight text-white/80 mt-1">
                    {breathCountdown}
                  </span>
                </div>
              </>
            )}

            {/* Complete: checkmark */}
            {stage === 'complete' && (
              <div className="fade-in">
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: 'radial-gradient(circle, rgba(0,212,170,0.3) 0%, transparent 70%)',
                    filter: 'blur(10px)',
                  }}
                />
                <svg className="relative z-10" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#00D4AA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
            )}
          </div>
        </div>

        {/* === TEXT ABOVE THE CIRCLE === */}
        <div className="absolute left-0 right-0 flex justify-center" style={{ zIndex: 2, bottom: 'calc(50% + 160px)' }}>
          {stage === 'welcome' && (
            <div className="text-center px-4 fade-in">
              <h1 className="text-3xl text-white font-light">Take a moment</h1>
              <p className="text-slate-400 text-sm max-w-xs mx-auto mt-3">
                A guided breathing exercise to help you feel calm and grounded.
              </p>
            </div>
          )}

          {stage === 'active' && (
            <>
              <div
                className="text-center px-4 transition-opacity duration-700"
                style={{ opacity: activePhase === 'preparation' ? 1 : 0, position: activePhase === 'preparation' ? 'relative' : 'absolute' }}
              >
                <p className="text-slate-400 text-sm max-w-xs mx-auto">
                  Find a comfortable position and relax your shoulders...
                </p>
              </div>
              <div
                className="text-center transition-opacity duration-1000"
                style={{ opacity: activePhase === 'breathing' && !breathDone ? 1 : 0, position: activePhase === 'breathing' ? 'relative' : 'absolute' }}
              >
                <span className="text-sm text-slate-300">
                  Round {cycle} / {MAX_CYCLES}
                </span>
              </div>
            </>
          )}

          {stage === 'complete' && (
            <h2 className="text-2xl text-white font-light fade-in">Well done</h2>
          )}
        </div>

        {/* === TEXT BELOW THE CIRCLE === */}
        <div className="absolute left-0 right-0 flex flex-col items-center" style={{ zIndex: 2, top: 'calc(50% + 160px)' }}>
          {stage === 'welcome' && (
            <p className="text-xs text-slate-500 mt-6 text-center px-4 fade-in">
              Not a substitute for professional medical advice.
              <br />
              If you are in crisis, call 988 (Suicide &amp; Crisis Lifeline).
            </p>
          )}

          {stage === 'active' && (
            <>
              {/* Skip — prep only */}
              <div
                className="transition-all duration-500 overflow-hidden pointer-events-auto"
                style={{ opacity: activePhase === 'preparation' ? 1 : 0, maxHeight: activePhase === 'preparation' ? '40px' : '0', pointerEvents: activePhase === 'preparation' ? 'auto' : 'none' }}
              >
                <button
                  type="button"
                  onClick={handleSkipPrep}
                  className="text-sm text-slate-500 hover:text-slate-300 transition-colors underline"
                >
                  Start now
                </button>
              </div>

              {/* Affirmation + Timer */}
              <div
                className="flex flex-col items-center gap-4 mt-4 transition-opacity duration-1000"
                style={{ opacity: guideVisible ? 1 : 0 }}
              >
                <AffirmationCarousel />
                <CalmTimer />
              </div>
            </>
          )}

          {stage === 'complete' && (
            <div className="flex flex-col items-center gap-4 mt-2 fade-in">
              <p className="text-slate-400 text-center text-sm max-w-xs px-4">
                You completed {MAX_CYCLES} rounds of breathing. Remember, you are not alone.
              </p>
              <div className="flex gap-4 mt-2">
                <button
                  type="button"
                  onClick={handleRestart}
                  className="px-6 py-2.5 rounded-full bg-white/10 text-slate-300 text-sm hover:bg-white/20 transition-colors"
                >
                  Do it again
                </button>
                <button
                  type="button"
                  onClick={handleExit}
                  className="px-6 py-2.5 rounded-full bg-[#00D4AA]/20 text-[#00D4AA] text-sm border border-[#00D4AA]/30 hover:bg-[#00D4AA]/30 transition-colors"
                >
                  I feel better
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-4">
                Not a substitute for professional medical advice.
                <br />
                If you are in crisis, call 988 (Suicide &amp; Crisis Lifeline).
              </p>
            </div>
          )}
        </div>

        {/* Bottom disclaimer — active stage */}
        {stage === 'active' && (
          <p className="fixed bottom-4 left-0 right-0 text-center text-xs text-slate-500 px-4" style={{ zIndex: 2 }}>
            Not a substitute for professional medical advice. If you are in crisis, call 988 (Suicide &amp; Crisis Lifeline).
          </p>
        )}
      </div>

      <style jsx>{`
        .fade-in {
          animation: fadeIn 0.8s ease-out;
        }
        @keyframes fadeIn {
          0% { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
