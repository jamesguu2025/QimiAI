import { ChevronDown } from 'lucide-react';
import CategoryIcon from '@/components/GrowthPlan/CategoryIcon';
import PlanItemCard from '@/components/GrowthPlan/PlanItemCard';
import type { ActionPlanItem, CategoryInfo } from '@/types/plan';

interface PlanCategoryAccordionProps {
  category: CategoryInfo;
  items: ActionPlanItem[];
  isOpen: boolean;
  onToggle: () => void;
  onStar: (id: string, newValue: boolean) => void;
  onEdit: (item: ActionPlanItem) => void;
  onDelete: (id: string) => void;
}

export default function PlanCategoryAccordion({
  category,
  items,
  isOpen,
  onToggle,
  onStar,
  onEdit,
  onDelete,
}: PlanCategoryAccordionProps) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition-colors hover:bg-slate-50"
      >
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-white"
            style={{ backgroundColor: category.color }}
            aria-hidden="true"
          >
            <CategoryIcon category={category.id} className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-slate-900">{category.name}</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {items.length === 0 ? 'No saved plans' : `${items.length} saved ${items.length === 1 ? 'plan' : 'plans'}`}
            </p>
          </div>
        </div>

        <ChevronDown
          className={`h-4 w-4 flex-shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div className="border-t border-slate-100 bg-slate-50/70 p-3">
          {items.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 bg-white px-4 py-5 text-sm text-slate-500">
              No saved plans in this category yet.
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <PlanItemCard
                  key={item.id}
                  item={item}
                  onStar={onStar}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
