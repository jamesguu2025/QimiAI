import { useEffect, useState } from 'react';
import type { ActionPlanItem, PlanCategory } from '@/types/plan';
import { PLAN_CATEGORIES } from '@/types/plan';

interface PlanItemFormProps {
  initialValues?: Partial<ActionPlanItem>;
  onSubmit: (values: { category: PlanCategory; painPoint: string; strategy: string }) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}

type FieldErrors = Partial<Record<'category' | 'painPoint' | 'strategy', string>>;

export default function PlanItemForm({ initialValues, onSubmit, onCancel, isSubmitting }: PlanItemFormProps) {
  const [category, setCategory] = useState<PlanCategory | ''>(initialValues?.category || '');
  const [painPoint, setPainPoint] = useState(initialValues?.painPoint || '');
  const [strategy, setStrategy] = useState(initialValues?.strategy || '');
  const [errors, setErrors] = useState<FieldErrors>({});
  const isEditMode = Boolean(initialValues?.id);

  useEffect(() => {
    setCategory(initialValues?.category || '');
    setPainPoint(initialValues?.painPoint || '');
    setStrategy(initialValues?.strategy || '');
    setErrors({});
  }, [initialValues]);

  function validate() {
    const nextErrors: FieldErrors = {};
    if (!category) nextErrors.category = 'Choose a category.';
    if (!painPoint.trim()) nextErrors.painPoint = 'Describe the challenge.';
    if (!strategy.trim()) nextErrors.strategy = 'Describe the strategy.';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!validate() || !category) return;

    await onSubmit({
      category,
      painPoint: painPoint.trim(),
      strategy: strategy.trim(),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid gap-4">
        <div>
          <label htmlFor="plan-category" className="block text-sm font-semibold text-slate-700">
            Category
          </label>
          <select
            id="plan-category"
            value={category}
            onChange={(event) => {
              setCategory(event.target.value as PlanCategory | '');
              setErrors((current) => ({ ...current, category: undefined }));
            }}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition-colors focus:border-primary-teal focus:ring-2 focus:ring-primary-teal/15"
          >
            <option value="">Select a category</option>
            {PLAN_CATEGORIES.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.name}
              </option>
            ))}
          </select>
          {errors.category && <p className="mt-1 text-xs text-red-600">{errors.category}</p>}
        </div>

        <div>
          <label htmlFor="plan-pain-point" className="block text-sm font-semibold text-slate-700">
            What challenge does your child face?
          </label>
          <textarea
            id="plan-pain-point"
            value={painPoint}
            rows={3}
            onChange={(event) => {
              setPainPoint(event.target.value);
              setErrors((current) => ({ ...current, painPoint: undefined }));
            }}
            className="mt-1 w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none transition-colors focus:border-primary-teal focus:ring-2 focus:ring-primary-teal/15"
            placeholder="Example: My child melts down after school."
          />
          {errors.painPoint && <p className="mt-1 text-xs text-red-600">{errors.painPoint}</p>}
        </div>

        <div>
          <label htmlFor="plan-strategy" className="block text-sm font-semibold text-slate-700">
            What strategy will you try?
          </label>
          <textarea
            id="plan-strategy"
            value={strategy}
            rows={3}
            onChange={(event) => {
              setStrategy(event.target.value);
              setErrors((current) => ({ ...current, strategy: undefined }));
            }}
            className="mt-1 w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none transition-colors focus:border-primary-teal focus:ring-2 focus:ring-primary-teal/15"
            placeholder="Example: Start with a 20-minute quiet decompression routine."
          />
          {errors.strategy && <p className="mt-1 text-xs text-red-600">{errors.strategy}</p>}
        </div>
      </div>

      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-primary-teal px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-teal/90 disabled:opacity-50"
        >
          {isSubmitting ? 'Saving...' : isEditMode ? 'Update Item' : 'Save Item'}
        </button>
      </div>
    </form>
  );
}
