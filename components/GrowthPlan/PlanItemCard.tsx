// components/GrowthPlan/PlanItemCard.tsx - Single plan item card

import React from 'react';
import type { ActionPlanItem } from '@/types/plan';
import { PLAN_CATEGORIES } from '@/types/plan';

interface PlanItemCardProps {
  item: ActionPlanItem;
  onStar: (id: string, newValue: boolean) => void;
  onCheckin: (id: string) => void;
  onEdit: (item: ActionPlanItem) => void;
  onDelete: (id: string) => void;
}

const PlanItemCard: React.FC<PlanItemCardProps> = ({
  item,
  onStar,
  onCheckin,
  onEdit,
  onDelete,
}) => {
  const categoryInfo = PLAN_CATEGORIES.find((c) => c.id === item.category);

  const isCheckedInToday = item.lastCheckIn
    ? new Date(item.lastCheckIn).toLocaleDateString() === new Date().toLocaleDateString()
    : false;

  const handleDelete = () => {
    if (window.confirm('Delete this plan item?')) {
      onDelete(item.id);
    }
  };

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
      {/* Header: category + star */}
      <div className="flex items-center justify-between mb-3">
        <span
          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white rounded-full"
          style={{ backgroundColor: categoryInfo?.color || '#94a3b8' }}
        >
          <span>{categoryInfo?.icon}</span>
          <span>{categoryInfo?.name || item.category}</span>
        </span>
        <button
          type="button"
          onClick={() => onStar(item.id, !item.star)}
          className="p-1 transition-colors"
          aria-label={item.star ? 'Unstar' : 'Star'}
        >
          {item.star ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#00D4AA" stroke="#00D4AA" strokeWidth="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          )}
        </button>
      </div>

      {/* Pain point */}
      <div className="mb-2">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Challenge</p>
        <p className="text-sm text-slate-700 mt-0.5">{item.painPoint}</p>
      </div>

      {/* Strategy */}
      <div className="mb-3">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Strategy</p>
        <p className="text-sm text-slate-700 mt-0.5">{item.strategy}</p>
      </div>

      {/* Footer: last check-in + actions */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-50">
        <div className="flex items-center gap-2">
          {item.lastCheckIn && (
            <span className="text-xs text-slate-400">
              Last: {new Date(item.lastCheckIn).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {/* Check In */}
          <button
            type="button"
            onClick={() => onCheckin(item.id)}
            className={`px-2.5 py-1 text-xs rounded-lg transition-colors ${
              isCheckedInToday
                ? 'bg-emerald-50 text-emerald-600'
                : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
            }`}
          >
            {isCheckedInToday ? '✓ Done Today' : 'Check In'}
          </button>

          {/* Edit */}
          <button
            type="button"
            onClick={() => onEdit(item)}
            className="p-1.5 text-slate-300 hover:text-slate-500 transition-colors"
            aria-label="Edit"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>

          {/* Delete */}
          <button
            type="button"
            onClick={handleDelete}
            className="p-1.5 text-slate-300 hover:text-red-400 transition-colors"
            aria-label="Delete"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlanItemCard;
