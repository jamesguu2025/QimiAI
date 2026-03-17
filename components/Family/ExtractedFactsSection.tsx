/**
 * ExtractedFactsSection - Display AI-extracted facts from conversations
 * Reads from memory_items table via /api/memory/relevant
 * Gracefully handles 404 (memory module not built yet)
 */

import React, { useState, useEffect } from 'react';
import { Brain, Loader2 } from 'lucide-react';

interface MemoryItem {
  id: string;
  category: string;
  key: string;
  value: string;
  confidence: number;
  updatedAt: string;
}

// Category display names
const CATEGORY_LABELS: Record<string, { name: string; icon: string }> = {
  child_info: { name: 'Child Info', icon: '👶' },
  school: { name: 'School', icon: '🏫' },
  family: { name: 'Family', icon: '👨‍👩‍👧' },
  behavior: { name: 'Behavior', icon: '🎯' },
  preference: { name: 'Preferences', icon: '❤️' },
  medical: { name: 'Medical', icon: '🏥' },
  concern: { name: 'Concerns', icon: '⚠️' },
  goal: { name: 'Goals', icon: '🎯' },
  progress: { name: 'Progress', icon: '📈' },
  sports: { name: 'Sports & Activities', icon: '⚽' },
};

interface ExtractedFactsSectionProps {
  className?: string;
}

export default function ExtractedFactsSection({ className = '' }: ExtractedFactsSectionProps) {
  const [facts, setFacts] = useState<MemoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notAvailable, setNotAvailable] = useState(false);

  useEffect(() => {
    async function fetchFacts() {
      try {
        setLoading(true);
        setError(null);
        setNotAvailable(false);

        const response = await fetch('/api/memory/facts');
        
        if (response.status === 404) {
          // Memory module not built yet
          setNotAvailable(true);
          return;
        }

        if (!response.ok) {
          throw new Error('Failed to fetch facts');
        }

        const data = await response.json();
        setFacts(data.facts || []);
      } catch (err) {
        // Check if it's a 404 route error
        if (err instanceof Error && err.message.includes('404')) {
          setNotAvailable(true);
        } else {
          setError(err instanceof Error ? err.message : 'Failed to load');
        }
      } finally {
        setLoading(false);
      }
    }

    fetchFacts();
  }, []);

  // Group facts by category
  const groupedFacts = React.useMemo(() => {
    const groups: Record<string, MemoryItem[]> = {};
    facts.forEach(fact => {
      if (!groups[fact.category]) {
        groups[fact.category] = [];
      }
      groups[fact.category].push(fact);
    });
    return groups;
  }, [facts]);

  // Loading state
  if (loading) {
    return (
      <div className={`bg-white rounded-xl shadow-sm border border-slate-200 p-6 ${className}`}>
        <div className="flex items-center gap-2 mb-4">
          <Brain className="w-5 h-5 text-primary-teal" />
          <h2 className="text-lg font-semibold text-slate-900">What Qimi Has Learned</h2>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      </div>
    );
  }

  // Not available state (memory module not built)
  if (notAvailable) {
    return (
      <div className={`bg-white rounded-xl shadow-sm border border-slate-200 p-6 ${className}`}>
        <div className="flex items-center gap-2 mb-4">
          <Brain className="w-5 h-5 text-primary-teal" />
          <h2 className="text-lg font-semibold text-slate-900">What Qimi Has Learned</h2>
        </div>
        <p className="text-slate-500 text-sm italic">
          As you chat with Qimi, insights about your family will appear here.
        </p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`bg-white rounded-xl shadow-sm border border-slate-200 p-6 ${className}`}>
        <div className="flex items-center gap-2 mb-4">
          <Brain className="w-5 h-5 text-primary-teal" />
          <h2 className="text-lg font-semibold text-slate-900">What Qimi Has Learned</h2>
        </div>
        <p className="text-red-500 text-sm">{error}</p>
      </div>
    );
  }

  // Empty state
  if (facts.length === 0) {
    return (
      <div className={`bg-white rounded-xl shadow-sm border border-slate-200 p-6 ${className}`}>
        <div className="flex items-center gap-2 mb-4">
          <Brain className="w-5 h-5 text-primary-teal" />
          <h2 className="text-lg font-semibold text-slate-900">What Qimi Has Learned</h2>
        </div>
        <p className="text-slate-500 text-sm italic">
          As you chat with Qimi, insights about your family will appear here.
        </p>
      </div>
    );
  }

  // Display facts grouped by category
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-slate-200 p-6 ${className}`}>
      <div className="flex items-center gap-2 mb-2">
        <Brain className="w-5 h-5 text-primary-teal" />
        <h2 className="text-lg font-semibold text-slate-900">What Qimi Has Learned</h2>
      </div>
      <p className="text-sm text-slate-500 mb-4">Insights from your conversations</p>
      
      <div className="space-y-4">
        {Object.entries(groupedFacts).map(([category, items]) => {
          const config = CATEGORY_LABELS[category] || { name: category, icon: '📝' };
          
          return (
            <div key={category} className="space-y-2">
              {/* Category header */}
              <div className="flex items-center gap-2">
                <span className="text-lg">{config.icon}</span>
                <span className="text-sm font-medium text-slate-700">{config.name}</span>
              </div>
              
              {/* Facts list */}
              <div className="ml-6 space-y-2">
                {items.map(item => (
                  <div 
                    key={item.id} 
                    className="text-sm text-slate-600 bg-slate-50 rounded-lg px-3 py-2"
                  >
                    <span className="font-medium text-slate-700">{item.key}:</span> {item.value}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
