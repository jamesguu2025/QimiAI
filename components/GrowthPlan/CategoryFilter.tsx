import type { PlanCategory } from '@/types/plan';
import { PLAN_CATEGORIES } from '@/types/plan';

interface CategoryFilterProps {
  selected: PlanCategory | 'all';
  onChange: (value: PlanCategory | 'all') => void;
}

export default function CategoryFilter({ selected, onChange }: CategoryFilterProps) {
  const chipClass = (active: boolean) =>
    `flex-shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
      active
        ? 'bg-primary-teal text-white'
        : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
    }`;

  return (
    <div role="tablist" aria-label="Plan category filter" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
      <button
        type="button"
        role="tab"
        aria-selected={selected === 'all'}
        onClick={() => onChange('all')}
        className={chipClass(selected === 'all')}
      >
        All
      </button>
      {PLAN_CATEGORIES.map((entry) => (
        <button
          key={entry.id}
          type="button"
          role="tab"
          aria-selected={selected === entry.id}
          onClick={() => onChange(entry.id)}
          className={chipClass(selected === entry.id)}
        >
          {entry.name}
        </button>
      ))}
    </div>
  );
}
