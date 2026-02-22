// pages/calm.tsx - Fullscreen Crisis Calm page (no auth, no layout)

import React from 'react';
import Head from 'next/head';
import BreathingCircle from '@/components/CrisisCalm/BreathingCircle';
import AffirmationCarousel from '@/components/CrisisCalm/AffirmationCarousel';
import CalmTimer from '@/components/CrisisCalm/CalmTimer';
import CalmControls from '@/components/CrisisCalm/CalmControls';

export default function CalmPage() {
  return (
    <>
      <Head>
        <title>Crisis Calm — Qimi AI</title>
      </Head>
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center relative">
        <CalmControls />

        <div className="flex flex-col items-center gap-8 px-4">
          <h1 className="text-2xl text-white font-light">Take a moment</h1>
          <BreathingCircle />
          <AffirmationCarousel />
          <CalmTimer />
        </div>

        <p className="fixed bottom-4 left-0 right-0 text-center text-xs text-slate-500 px-4">
          Not a substitute for professional medical advice. If you are in crisis, call 988 (Suicide &amp; Crisis Lifeline).
        </p>
      </div>
    </>
  );
}
