// components/Chat/RAGSources.tsx - Research Paper Citations Display

import { useState } from 'react';
import { RAGSource } from '../../types/api';

interface RAGSourcesProps {
  sources: RAGSource[];
}

export function RAGSources({ sources }: RAGSourcesProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!sources || sources.length === 0) {
    return null;
  }

  const formatMeta = (source: RAGSource) => {
    const author = Array.isArray(source.authors) && source.authors.length > 0
      ? `${source.authors[0]}${source.authors.length > 1 ? ' et al.' : ''}`
      : null;
    return [source.year, source.journal, author].filter(Boolean).join(' · ');
  };

  return (
    <div className="mt-3 border-t border-gray-200 pt-3">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="inline-flex items-center gap-2 rounded-md border border-teal-100 bg-teal-50 px-3 py-1.5 text-sm text-teal-800 hover:border-teal-200 hover:bg-teal-100 transition-colors"
        aria-expanded={isExpanded}
      >
        <svg
          className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="font-medium">
          Research sources for this answer
        </span>
      </button>

      {isExpanded && (
        <div className="mt-2 space-y-2">
          {sources.map((source, index) => (
            <div
              key={index}
              className="bg-gray-50 rounded-lg p-3 border border-gray-200 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-start gap-2">
                <span className="flex-shrink-0 w-6 h-6 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center text-xs font-medium">
                  {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  {source.url ? (
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-gray-900 hover:text-teal-600 transition-colors line-clamp-2"
                    >
                      {source.title}
                    </a>
                  ) : (
                    <p className="text-sm font-medium text-gray-900 line-clamp-2">
                      {source.title}
                    </p>
                  )}
                  {formatMeta(source) && (
                    <p className="mt-1 text-xs text-gray-500 line-clamp-1">
                      {formatMeta(source)}
                    </p>
                  )}
                  {source.snippet && (
                    <p className="mt-1 text-xs text-gray-600 line-clamp-2">
                      {source.snippet}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default RAGSources;
