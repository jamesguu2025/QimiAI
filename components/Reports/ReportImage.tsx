// components/Reports/ReportImage.tsx - Image display with click-to-enlarge

import React, { useState } from 'react';

interface ReportImageProps {
  imageUrl: string;
  title: string;
}

const ReportImage: React.FC<ReportImageProps> = ({ imageUrl, title }) => {
  const [enlarged, setEnlarged] = useState(false);

  return (
    <>
      <div className="cursor-pointer" onClick={() => setEnlarged(true)}>
        <img
          src={imageUrl}
          alt={title}
          className="w-full max-h-[400px] object-contain rounded-lg border border-slate-100"
        />
        <p className="text-xs text-slate-400 text-center mt-1">Click to enlarge</p>
      </div>

      {/* Fullscreen overlay */}
      {enlarged && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setEnlarged(false)}
        >
          <button
            type="button"
            onClick={() => setEnlarged(false)}
            className="absolute top-4 right-4 text-white hover:text-slate-300 transition-colors z-10"
            aria-label="Close"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          <img
            src={imageUrl}
            alt={title}
            className="max-w-[90vw] max-h-[90vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
};

export default ReportImage;
