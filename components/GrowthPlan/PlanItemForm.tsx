// components/GrowthPlan/PlanItemForm.tsx - Create/Edit plan item form

import React, { useState } from 'react';
import type { ActionPlanItem, PlanCategory } from '@/types/plan';
import { PLAN_CATEGORIES } from '@/types/plan';

interface PlanItemFormProps {
  initialValues?: Partial<ActionPlanItem>;
  onSubmit: (values: { category: PlanCategory; painPoint: string; strategy: string }) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}

const PlanItemForm: React.FC<PlanItemFormProps> = ({
  initialValues,
  onSubmit,
  onCancel,
  isSubmitting,
}) => {
  const [category, setCategory] = useState<string>(initialValues?.category || '');
  const [painPoint, setPainPoint] = useState(initialValues?.painPoint || '');
  const [strategy, setStrategy] = useState(initialValues?.strategy || '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isEditMode = !!initialValues?.id;

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!category) errs.category = 'Please select a category';
    if (!painPoint.trim()) errs.painPoint = 'Please describe the challenge';
    if (!strategy.trim()) errs.strategy = 'Please describe the strategy';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    await onSubmit({
      category: category as PlanCategory,
      painPoint: painPoint.trim(),
      strategy: strategy.trim(),
    });
  };

  return (
    <div className="space-y-4 bg-white rounded-xl p-4 shadow-sm border border-slate-100">
      {/* Category */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
        <select
          value={category}
          onChange={(e) => { setCategory(e.target.value); setErrors((prev) => ({ ...prev, category: '' })); }}
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#00D4AA]"
        >
          <option value="">Select category</option>
          {PLAN_CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
          ))}
        </select>
        {errors.category && <p className="text-xs text-red-500 mt-1">{errors.category}</p>}
      </div>

      {/* Pain Point */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          What challenge does your child face?
        </label>
        <textarea
          value={painPoint}
          onChange={(e) => { setPainPoint(e.target.value); setErrors((prev) => ({ ...prev, painPoint: '' })); }}
          rows={3}
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#00D4AA]"
          placeholder="e.g., My child melts down after school every day"
        />
        {errors.painPoint && <p className="text-xs text-red-500 mt-1">{errors.painPoint}</p>}
      </div>

      {/* Strategy */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          What strategy will you try?
        </label>
        <textarea
          value={strategy}
          onChange={(e) => { setStrategy(e.target.value); setErrors((prev) => ({ ...prev, strategy: '' })); }}
          rows={3}
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#00D4AA]"
          placeholder="e.g., Implement a 20-minute decompression routine with quiet play"
        />
        {errors.strategy && <p className="text-xs text-red-500 mt-1">{errors.strategy}</p>}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="flex-1 py-2 bg-[#00D4AA] text-white text-sm font-medium rounded-lg hover:bg-teal-500 transition-colors disabled:opacity-50"
        >
          {isSubmitting ? 'Saving...' : isEditMode ? 'Update Item' : 'Save Item'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default PlanItemForm;
