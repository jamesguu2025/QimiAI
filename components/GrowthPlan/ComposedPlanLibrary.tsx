import { useState } from 'react';
import { ChevronDown, Layers3, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import CategoryIcon from '@/components/GrowthPlan/CategoryIcon';
import type { ComposedPlan, PlanCategory } from '@/types/plan';
import { PLAN_CATEGORIES } from '@/types/plan';

type ComposedPlanLibraryProps = {
  plans: ComposedPlan[];
  openPlanId: string | null;
  onOpenPlan: (id: string | null) => void;
  onDelete: (id: string) => void;
};

const CATEGORY_BY_TITLE = new Map(PLAN_CATEGORIES.map((category) => [category.name.toLowerCase(), category]));

export default function ComposedPlanLibrary({ plans, openPlanId, onOpenPlan, onDelete }: ComposedPlanLibraryProps) {
  const [openSections, setOpenSections] = useState<Record<string, string[]>>({});

  function toggleSection(planId: string, sectionKey: string) {
    setOpenSections((current) => {
      const planSections = current[planId] || [];
      return {
        ...current,
        [planId]: planSections.includes(sectionKey)
          ? planSections.filter((key) => key !== sectionKey)
          : [...planSections, sectionKey],
      };
    });
  }

  if (plans.length === 0) {
    return (
      <section id="my-composed-plans" className="rounded-2xl border border-dashed border-primary-purple/25 bg-gradient-to-br from-primary-purple/[0.05] to-primary-teal/[0.05] p-5">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-primary-purple/10 text-primary-purple">
            <Layers3 className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-base font-bold text-slate-900">My Composed Plans</h2>
            <p className="mt-1 text-sm text-slate-600">Plans you compose from Saved Plan sources will appear here as one organized, cross-topic plan.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="my-composed-plans" aria-labelledby="my-composed-plans-title" className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary-purple">Your plan library</p>
          <h2 id="my-composed-plans-title" className="text-lg font-bold text-slate-900">My Composed Plans</h2>
        </div>
        <span className="text-xs font-medium text-slate-500">{plans.length} saved {plans.length === 1 ? 'plan' : 'plans'}</span>
      </div>

      {plans.map((plan) => {
        const isOpen = openPlanId === plan.id;
        return (
          <article key={plan.id} className="overflow-hidden rounded-2xl border border-primary-purple/15 bg-white shadow-sm">
            <div className="flex items-start gap-2 p-4 sm:p-5">
              <button type="button" onClick={() => onOpenPlan(isOpen ? null : plan.id)} aria-expanded={isOpen} className="min-w-0 flex-1 text-left">
                <span className="flex items-start gap-3">
                  <span className="inline-flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-gradient-to-br from-primary-purple to-primary-teal text-white">
                    <Layers3 className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-base font-bold leading-snug text-slate-900">{plan.title}</span>
                    <span className="mt-1 line-clamp-2 block text-sm leading-relaxed text-slate-600">{plan.summary}</span>
                    <span className="mt-2 flex flex-wrap gap-1.5">
                      {plan.topicCategories.map((categoryId) => {
                        const category = PLAN_CATEGORIES.find((entry) => entry.id === categoryId);
                        return category ? (
                          <span key={category.id} className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold" style={{ color: category.color, backgroundColor: `${category.color}14` }}>
                            <CategoryIcon category={category.id} className="h-3 w-3" /> {category.name}
                          </span>
                        ) : null;
                      })}
                    </span>
                  </span>
                  <ChevronDown className={`mt-1 h-5 w-5 flex-none text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Delete this composed plan? Your Saved Plan sources will not be deleted.')) onDelete(plan.id);
                }}
                aria-label="Delete composed plan"
                className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            {isOpen && (
              <div className="space-y-3 border-t border-slate-100 bg-slate-50/60 p-3 sm:p-4">
                {plan.interventionBlocks.map((block, index) => {
                  const sectionKey = `${block.title || 'section'}-${index}`;
                  const sectionOpen = (openSections[plan.id] || []).includes(sectionKey);
                  const category = CATEGORY_BY_TITLE.get((block.title || '').toLowerCase());
                  return (
                    <section key={sectionKey} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                      <button type="button" onClick={() => toggleSection(plan.id, sectionKey)} aria-expanded={sectionOpen} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50">
                        <span className="flex min-w-0 items-center gap-2.5">
                          {category ? (
                            <span className="inline-flex h-7 w-7 flex-none items-center justify-center rounded-lg text-white" style={{ backgroundColor: category.color }}>
                              <CategoryIcon category={category.id as PlanCategory} className="h-3.5 w-3.5" />
                            </span>
                          ) : <span className="inline-flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-slate-100 text-slate-500"><Layers3 className="h-3.5 w-3.5" /></span>}
                          <span className="truncate text-sm font-semibold text-slate-800">{block.title || `Plan section ${index + 1}`}</span>
                        </span>
                        <ChevronDown className={`h-4 w-4 flex-none text-slate-400 transition-transform ${sectionOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {sectionOpen && <div className="border-t border-slate-100 p-4"><MarkdownContent content={block.contentMarkdown} /></div>}
                    </section>
                  );
                })}
              </div>
            )}
          </article>
        );
      })}
    </section>
  );
}

function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="prose prose-slate max-w-none prose-p:my-1 prose-p:text-sm prose-p:leading-relaxed prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-li:text-sm prose-table:block prose-table:w-full prose-table:min-w-[620px] prose-table:overflow-x-auto prose-table:border-collapse prose-th:border prose-th:border-slate-300 prose-th:bg-slate-50 prose-th:px-3 prose-th:py-2 prose-th:text-left prose-th:text-xs prose-td:border prose-td:border-slate-200 prose-td:px-3 prose-td:py-2 prose-td:text-xs">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
