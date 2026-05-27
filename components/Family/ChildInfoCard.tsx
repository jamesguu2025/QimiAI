/**
 * ChildInfoCard - Child basic info editing card
 * Only handles name, birthday, gender - NO challenges editing
 */

import React, { useState, useEffect } from 'react';

interface ChildInfoData {
  id?: string;
  userId?: string;
  name?: string;
  birthYear?: number;
  birthMonth?: number;
  gender?: 'boy' | 'girl' | 'other';
  createdAt?: string;
  updatedAt?: string;
}

interface ChildInfoCardProps {
  childInfo: ChildInfoData | null;
  onSaved: (childInfo: ChildInfoData) => void;
}

// Generate year options (current year down to 2000)
const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: currentYear - 2000 + 1 }, (_, i) => currentYear - i);

// Month options
const monthOptions = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

// Compute age from birth year and month
function computeAge(birthYear: number, birthMonth: number): string {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  let years = currentYear - birthYear;
  let months = currentMonth - birthMonth;

  if (months < 0) {
    years--;
    months += 12;
  }

  if (years === 0) {
    return `${months} month${months !== 1 ? 's' : ''}`;
  } else if (months === 0) {
    return `${years} year${years !== 1 ? 's' : ''}`;
  }
  return `${years} year${years !== 1 ? 's' : ''} ${months} month${months !== 1 ? 's' : ''}`;
}

export const ChildInfoCard: React.FC<ChildInfoCardProps> = ({
  childInfo,
  onSaved,
}) => {
  // Form state
  const [name, setName] = useState(childInfo?.name || '');
  const [birthYear, setBirthYear] = useState<number | undefined>(childInfo?.birthYear);
  const [birthMonth, setBirthMonth] = useState<number | undefined>(childInfo?.birthMonth);
  const [gender, setGender] = useState<'boy' | 'girl' | 'other' | undefined>(childInfo?.gender);

  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync form state when childInfo prop changes
  useEffect(() => {
    setName(childInfo?.name || '');
    setBirthYear(childInfo?.birthYear);
    setBirthMonth(childInfo?.birthMonth);
    setGender(childInfo?.gender);
  }, [childInfo]);

  // Computed age text
  const ageText = birthYear && birthMonth ? computeAge(birthYear, birthMonth) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/family', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || undefined,
          birthYear,
          birthMonth,
          gender,
          // NOTE: challenges NOT included - read-only, set during onboarding only
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to save');
      }

      // Show success message
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);

      // Notify parent
      onSaved(data.childProfile);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <h2 className="text-lg font-semibold text-slate-900 mb-4">Child Info</h2>
      
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Child Name */}
        <div>
          <label htmlFor="childName" className="block text-sm font-medium text-slate-700 mb-1">
            Child's Name
          </label>
          <input
            id="childName"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={50}
            placeholder="Enter your child's name"
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-teal focus:border-transparent"
          />
        </div>

        {/* Birth Date */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Birth Date
          </label>
          <div className="flex gap-3">
            <select
              id="birthYear"
              value={birthYear || ''}
              onChange={(e) => setBirthYear(e.target.value ? parseInt(e.target.value) : undefined)}
              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-teal focus:border-transparent"
            >
              <option value="">Year</option>
              {yearOptions.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            <select
              id="birthMonth"
              value={birthMonth || ''}
              onChange={(e) => setBirthMonth(e.target.value ? parseInt(e.target.value) : undefined)}
              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-teal focus:border-transparent"
            >
              <option value="">Month</option>
              {monthOptions.map((month) => (
                <option key={month.value} value={month.value}>{month.label}</option>
              ))}
            </select>
          </div>
          {/* Age display */}
          {ageText && (
            <p className="mt-2 text-sm text-primary-teal font-medium">
              Age: {ageText}
            </p>
          )}
        </div>

        {/* Gender */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Gender
          </label>
          <div className="flex gap-2" role="radiogroup" aria-label="Gender">
            {(['boy', 'girl', 'other'] as const).map((option) => (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={gender === option}
                onClick={() => setGender(option)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  gender === option
                    ? 'bg-primary-teal text-white'
                    : 'bg-white border border-slate-300 text-slate-600 hover:border-slate-400'
                }`}
              >
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Error message */}
        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}

        {/* Success message */}
        {showSuccess && (
          <p className="text-sm text-primary-teal font-medium">Saved!</p>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={isSaving}
          className={`w-full py-3 px-4 rounded-lg font-medium text-white transition-all ${
            isSaving
              ? 'bg-slate-400 cursor-not-allowed'
              : 'bg-primary-teal hover:bg-teal-600'
          }`}
        >
          {isSaving ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Saving...
            </span>
          ) : (
            'Save'
          )}
        </button>
      </form>
    </div>
  );
};

export default ChildInfoCard;
