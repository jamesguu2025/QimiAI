import React, { useState } from 'react';

export interface Source {
    title: string;
    url?: string;
    snippet?: string;
}

interface RAGSourcesProps {
    sources: Source[];
}

export const RAGSources: React.FC<RAGSourcesProps> = ({ sources }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    if (!sources || sources.length === 0) return null;

    return (
        <div className="mt-3 pt-2">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-600 transition-colors mb-2"
            >
                <span className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded text-[9px]">SOURCES</span>
                <span>{sources.length} citations</span>
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                >
                    <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                </svg>
            </button>

            <div className={`grid gap-1.5 transition-all duration-300 ease-in-out ${isExpanded ? 'opacity-100 max-h-[500px]' : 'opacity-100 max-h-[0px] overflow-hidden'}`}>
                <div className="flex flex-wrap gap-1.5">
                    {sources.map((source, index) => (
                        <a
                            key={index}
                            href={source.url || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="
                flex items-center gap-1.5 
                bg-slate-50 border border-slate-200 
                hover:border-slate-300 hover:bg-white
                px-2 py-1 rounded-md
                transition-all duration-200
                max-w-full
                "
                        >
                            <span className="text-[9px] font-bold text-slate-400">{index + 1}</span>
                            <span className="text-[11px] text-slate-600 font-medium truncate max-w-[180px]">
                                {source.title}
                            </span>
                        </a>
                    ))}
                </div>
            </div>
        </div>
    );
};
