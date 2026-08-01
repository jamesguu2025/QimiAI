import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ChevronDown, Layers3 } from 'lucide-react';
import CategoryIcon from '@/components/GrowthPlan/CategoryIcon';
import type { ComposedPlan } from '@/types/plan';
import { PLAN_CATEGORIES } from '@/types/plan';

export default function DashboardPlansOverview() {
  const [plans, setPlans] = useState<ComposedPlan[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [openPlanId, setOpenPlanId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch('/api/composed-plans?limit=3')
      .then(async (response) => response.ok ? response.json() : Promise.reject(new Error('Failed to load plans')))
      .then((data) => {
        if (!active) return;
        setPlans(data.plans || []);
        setTotal(data.total || 0);
      })
      .catch(() => undefined)
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <section className="mb-6 overflow-hidden rounded-xl border border-primary-purple/20 bg-white shadow-sm">
      <button type="button" onClick={() => setIsOpen((current) => !current)} aria-expanded={isOpen} className="flex w-full items-center justify-between gap-4 p-4 text-left hover:bg-slate-50">
        <span className="flex min-w-0 items-center gap-3">
          <span className="inline-flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-primary-purple/10 text-primary-purple"><Layers3 className="h-5 w-5" /></span>
          <span className="min-w-0">
            <span className="block text-sm font-bold text-slate-900">My Plans</span>
            <span className="mt-0.5 block text-xs text-slate-500">{isLoading ? 'Loading saved plans…' : total > 0 ? `${total} composed ${total === 1 ? 'plan' : 'plans'} · open for quick access` : 'No composed plans saved yet'}</span>
          </span>
        </span>
        <ChevronDown className={`h-5 w-5 flex-none text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="space-y-2 border-t border-slate-100 bg-slate-50/60 p-3">
          {plans.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-500">
              Compose a plan from your Saved Plans in Growth Plan.
            </div>
          ) : plans.map((plan) => {
            const planOpen = openPlanId === plan.id;
            return (
              <article key={plan.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                <button type="button" onClick={() => setOpenPlanId(planOpen ? null : plan.id)} aria-expanded={planOpen} className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left">
                  <span className="min-w-0 truncate text-sm font-semibold text-slate-800">{plan.title}</span>
                  <ChevronDown className={`h-4 w-4 flex-none text-slate-400 transition-transform ${planOpen ? 'rotate-180' : ''}`} />
                </button>
                {planOpen && (
                  <div className="border-t border-slate-100 px-3 pb-3 pt-2">
                    <p className="text-xs leading-relaxed text-slate-600">{plan.summary}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {plan.topicCategories.map((categoryId) => {
                        const category = PLAN_CATEGORIES.find((entry) => entry.id === categoryId);
                        return category ? <span key={category.id} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[11px] text-slate-600"><CategoryIcon category={category.id} className="h-3 w-3" />{category.name}</span> : null;
                      })}
                    </div>
                    <Link href={`/plan?plan=${plan.id}#my-composed-plans`} className="mt-3 inline-flex text-xs font-semibold text-primary-purple hover:underline">View full plan</Link>
                  </div>
                )}
              </article>
            );
          })}
          {total > plans.length && <Link href="/plan#my-composed-plans" className="block px-2 py-1 text-center text-xs font-semibold text-primary-purple hover:underline">View all plans</Link>}
        </div>
      )}
    </section>
  );
}
