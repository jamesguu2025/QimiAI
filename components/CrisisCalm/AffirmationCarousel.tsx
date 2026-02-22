// components/CrisisCalm/AffirmationCarousel.tsx - Rotating affirmation text

import React, { useState, useEffect, useRef } from 'react';

const AFFIRMATIONS = [
  'You are safe.',
  'This feeling will pass.',
  'You are doing your best.',
  'Take it one breath at a time.',
  'You are not alone.',
  'It is okay to rest.',
  'You have gotten through this before.',
];

const AffirmationCarousel: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      // Fade out
      setVisible(false);

      // After fade out, update text and fade in
      timeoutRef.current = setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % AFFIRMATIONS.length);
        setVisible(true);
      }, 500);
    }, 8000);

    return () => {
      clearInterval(interval);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="min-h-[3rem] flex items-center justify-center px-4">
      <p
        className={`text-xl text-slate-200 text-center italic font-light transition-opacity duration-500 ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {AFFIRMATIONS[currentIndex]}
      </p>
    </div>
  );
};

export default AffirmationCarousel;
