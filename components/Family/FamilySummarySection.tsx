/**
 * FamilySummarySection - What Qimi Knows
 * Top: categorized AI-extracted facts (read-only)
 * Bottom: editable user note
 * Reads facts from /api/memory/facts, summary from /api/memory/summary
 */

import { useState, useEffect } from 'react';
import { Brain, Loader2, Pencil } from 'lucide-react';

interface Fact {
  id: string;
  category: string;
  key: string;
  value: string;
}

interface FamilySummarySectionProps {
  className?: string;
}

// Map DB categories to user-friendly display labels + icons
const CATEGORY_DISPLAY: Record<string, { label: string; icon: string }> = {
  child_info: { label: 'Child Info', icon: '👤' },
  school: { label: 'School & Learning', icon: '📚' },
  family: { label: 'Family', icon: '👨‍👩‍👧‍👦' },
  behavior: { label: 'Behavior', icon: '🧠' },
  preference: { label: 'Interests & Preferences', icon: '⭐' },
  medical: { label: 'Medical', icon: '🏥' },
  concern: { label: 'Concerns', icon: '💬' },
  goal: { label: 'Goals', icon: '🎯' },
  progress: { label: 'Progress', icon: '📈' },
  sports: { label: 'Sports & Activities', icon: '🏀' },
};

export default function FamilySummarySection({ className = '' }: FamilySummarySectionProps) {
  const [facts, setFacts] = useState<Fact[]>([]);
  const [summary, setSummary] = useState('');
  const [originalSummary, setOriginalSummary] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Fetch facts and summary on mount
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        const [factsRes, summaryRes] = await Promise.all([
          fetch('/api/memory/facts'),
          fetch('/api/memory/summary'),
        ]);

        if (factsRes.ok) {
          const factsData = await factsRes.json();
          setFacts(factsData.facts || []);
        }

        if (summaryRes.ok) {
          const summaryData = await summaryRes.json();
          const text = summaryData.summary?.text || '';
          setSummary(text);
          setOriginalSummary(text);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const hasChanges = summary !== originalSummary;

  const handleSave = async () => {
    if (!hasChanges) return;

    setSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/memory/summary', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary }),
      });

      if (!response.ok) {
        throw new Error('Failed to save');
      }

      setOriginalSummary(summary);
      setIsEditing(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setSummary(originalSummary);
    setIsEditing(false);
    setError(null);
  };

  // Group facts by category
  const groupedFacts = facts.reduce<Record<string, Fact[]>>((acc, fact) => {
    if (!acc[fact.category]) acc[fact.category] = [];
    acc[fact.category].push(fact);
    return acc;
  }, {});

  // Loading state
  if (loading) {
    return (
      <div className={`bg-white rounded-xl shadow-sm border border-slate-200 p-6 ${className}`}>
        <div className="flex items-center gap-2 mb-4">
          <Brain className="w-5 h-5 text-primary-teal" />
          <h2 className="text-lg font-semibold text-slate-900">What Qimi Knows</h2>
        </div>
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      </div>
    );
  }

  const hasFacts = facts.length > 0;

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-slate-200 p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary-teal" />
          <h2 className="text-lg font-semibold text-slate-900">What Qimi Knows</h2>
        </div>
        {showSuccess && (
          <span className="text-sm text-primary-teal font-medium">Saved!</span>
        )}
      </div>
      <p className="text-sm text-slate-500 mb-4">
        Qimi learns from your conversations. You can also add your own notes below.
      </p>

      {/* Categorized facts (read-only) */}
      {hasFacts && (
        <div className="space-y-4 mb-5">
          {Object.entries(groupedFacts).map(([category, items]) => {
            const display = CATEGORY_DISPLAY[category] || { label: category, icon: '📌' };
            return (
              <div key={category}>
                <h3 className="text-sm font-medium text-slate-700 mb-1.5">
                  {display.icon} {display.label}
                </h3>
                <ul className="space-y-1 pl-6">
                  {items.map((fact) => (
                    <li key={fact.id} className="text-sm text-slate-600 list-disc">
                      {fact.value}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      {!hasFacts && (
        <div className="text-sm text-slate-400 italic mb-5 py-3 text-center">
          As you chat with Qimi, insights about your family will appear here.
        </div>
      )}

      {/* Divider */}
      <div className="border-t border-slate-100 pt-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-slate-700">Your Notes</h3>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors"
            >
              <Pencil className="w-3 h-3" />
              Edit
            </button>
          )}
        </div>

        {isEditing ? (
          <>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value.slice(0, 200))}
              placeholder="Add any notes about your family that you'd like Qimi to know..."
              rows={3}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-teal focus:border-transparent resize-none text-sm text-slate-700"
              autoFocus
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-slate-400">{summary.length}/200</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !hasChanges}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    saving || !hasChanges
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      : 'bg-primary-teal text-white hover:bg-teal-600'
                  }`}
                >
                  {saving ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </span>
                  ) : (
                    'Save'
                  )}
                </button>
              </div>
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-600 min-h-[2rem]">
            {summary || <span className="text-slate-400 italic">No notes yet. Click Edit to add.</span>}
          </p>
        )}
      </div>

      {error && (
        <p className="text-red-500 text-sm mt-2">{error}</p>
      )}
    </div>
  );
}
