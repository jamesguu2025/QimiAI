// components/GrowthPlan/CategoryFilter.tsx - Horizontal filter chips

import React from 'react';
import type { PlanCategory } from '@/types/plan';
import { PLAN_CATEGORIES } from '@/types/plan';

interface CategoryFilterProps {
  selected: PlanCategory | 'all';
  onChange: (value: PlanCategory | 'all') => void;
}

const CategoryFilter: React.FC<CategoryFilterProps> = ({ selected, onChange }) => {
  return (
    <div className="flex flex-nowrap gap-2 overflow-x-auto pb-1 scrollbar-hide">
      <button
        type="button"
        onClick={() => onChange('all')}
        className={`flex-shrink-0 px-3 py-1.5 text-sm rounded-full transition-colors ${
          selected === 'all'
            ? 'bg-[#00D4AA] text-white'
            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
        }`}
      >
        All
      </button>
      {PLAN_CATEGORIES.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => onChange(c.id)}
          className={`flex-shrink-0 px-3 py-1.5 text-sm rounded-full transition-colors ${
            selected === c.id
              ? 'bg-[#00D4AA] text-white'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          {c.icon} {c.name}
        </button>
      ))}
    </div>
  );
};

export default CategoryFilter;
