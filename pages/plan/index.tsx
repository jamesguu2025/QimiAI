import Head from 'next/head';
import { useRouter } from 'next/router';
import { Plus, Sparkles } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import AppLayout from '@/components/Layout/AppLayout';
import PlanCategoryAccordion from '@/components/GrowthPlan/PlanCategoryAccordion';
import PlanItemForm from '@/components/GrowthPlan/PlanItemForm';
import PlanGenerator from '@/components/GrowthPlan/PlanGenerator';
import ComposedPlanLibrary from '@/components/GrowthPlan/ComposedPlanLibrary';
import PlanSummary from '@/components/GrowthPlan/PlanSummary';
import { useAuthUIStore } from '@/stores/authUIStore';
import AuthRequiredState from '@/components/Auth/AuthRequiredState';
import type { ActionPlanItem, ComposedPlan, CreatePlanItemRequest, PlanCategory } from '@/types/plan';
import { PLAN_CATEGORIES } from '@/types/plan';
import type { GeneratedPlanDraft } from '@/lib/plan-generation';
import { useAiQuota } from '@/hooks/useAiQuota';
import { trackClientEvent } from '@/lib/client-analytics';

type PlanFormValues = {
  category: PlanCategory;
  painPoint: string;
  strategy: string;
};

const PLAN_AUTH_REASON = 'Sign up to save AI-recommended strategies into your Growth Plan and track what works for your family over time.';

export default function GrowthPlanPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { openLoginModal } = useAuthUIStore();
  const [items, setItems] = useState<ActionPlanItem[]>([]);
  const [composedPlans, setComposedPlans] = useState<ComposedPlan[]>([]);
  const [openComposedPlanId, setOpenComposedPlanId] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [totalItems, setTotalItems] = useState(0);
  const [starredCount, setStarredCount] = useState(0);
  const [openCategories, setOpenCategories] = useState<PlanCategory[]>(['emotion']);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);
  const [editingItem, setEditingItem] = useState<ActionPlanItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const libraryViewTrackedRef = useRef(false);
  const { quota, refreshQuota, setQuota } = useAiQuota(Boolean(session?.user?.email));

  useEffect(() => {
    if (status !== 'loading' && !session) {
      openLoginModal('signup', PLAN_AUTH_REASON);
    }
  }, [status, session, openLoginModal]);

  const refreshStats = useCallback((nextItems: ActionPlanItem[]) => {
    setTotalItems(nextItems.length);
    setStarredCount(nextItems.filter((item) => item.star).length);
  }, []);

  const fetchItems = useCallback(async () => {
    if (!session?.user?.email) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/plan');
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to load plan items');
      }

      const data = await response.json();
      const nextItems = data.items || [];
      setItems(nextItems);
      setTotalItems(data.totalItems ?? nextItems.length);
      setStarredCount(data.starredCount ?? nextItems.filter((item: ActionPlanItem) => item.star).length);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load plan items');
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.email]);

  const fetchComposedPlans = useCallback(async () => {
    if (!session?.user?.email) return;
    try {
      const response = await fetch('/api/composed-plans');
      if (!response.ok) throw new Error('Failed to load composed plans');
      const data = await response.json();
      setComposedPlans(data.plans || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load composed plans');
    }
  }, [session?.user?.email]);

  useEffect(() => {
    if (session?.user?.email) {
      fetchItems();
      fetchComposedPlans();
    }
  }, [session?.user?.email, fetchItems, fetchComposedPlans]);

  useEffect(() => {
    if (!session?.user?.email || isLoading || libraryViewTrackedRef.current) return;
    libraryViewTrackedRef.current = true;
    trackClientEvent('plan:library_viewed', {
      saved_plan_count: items.length,
      composed_plan_count: composedPlans.length,
    });
  }, [session?.user?.email, isLoading, items.length, composedPlans.length]);

  useEffect(() => {
    const requestedPlan = typeof router.query.plan === 'string' ? router.query.plan : null;
    if (requestedPlan) setOpenComposedPlanId(requestedPlan);
  }, [router.query.plan]);

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      if (a.star !== b.star) return a.star ? -1 : 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [items]);

  const groupedItems = useMemo(() => {
    return PLAN_CATEGORIES
      .map((category) => ({
        category,
        items: sortedItems.filter((item) => item.category === category.id),
      }));
  }, [sortedItems]);

  async function handleCreate(values: CreatePlanItemRequest): Promise<boolean> {
    setIsSubmitting(true);
    setFormError(null);

    try {
      const response = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to create plan item');
      }

      const data = await response.json();
      setItems((current) => {
        const nextItems = [data.item, ...current];
        refreshStats(nextItems);
        return nextItems;
      });
      setShowForm(false);
      setShowGenerator(false);
      setOpenCategories((current) => current.includes(data.item.category)
        ? current
        : [...current, data.item.category]);
      return true;
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create plan item');
    } finally {
      setIsSubmitting(false);
    }
    return false;
  }

  async function handleSaveComposed(draft: GeneratedPlanDraft, sourcePlanIds: string[]): Promise<boolean> {
    setFormError(null);
    try {
      const response = await fetch('/api/composed-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: draft.painPoint,
          summary: draft.strategySummary,
          explanationMarkdown: draft.explanationMarkdown,
          interventionBlocks: draft.interventionBlocks,
          sourcePlanIds,
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to save composed plan');
      }
      const data = await response.json();
      setComposedPlans((current) => [data.plan, ...current]);
      setOpenComposedPlanId(data.plan.id);
      setShowGenerator(false);
      setSaveNotice(`“${data.plan.title}” was saved to My Composed Plans.`);
      window.setTimeout(() => document.getElementById('my-composed-plans')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
      return true;
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save composed plan');
      return false;
    }
  }

  async function handleDeleteComposed(id: string) {
    try {
      const response = await fetch(`/api/composed-plans?id=${id}`, { method: 'DELETE' });
      if (!response.ok && response.status !== 204) throw new Error('Failed to delete composed plan');
      setComposedPlans((current) => current.filter((plan) => plan.id !== id));
      if (openComposedPlanId === id) setOpenComposedPlanId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete composed plan');
    }
  }

  async function handleUpdate(values: PlanFormValues) {
    if (!editingItem) return;
    setIsSubmitting(true);
    setFormError(null);

    try {
      const response = await fetch(`/api/plan?id=${editingItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update plan item');
      }

      const data = await response.json();
      setItems((current) => {
        const nextItems = current.map((item) => (item.id === editingItem.id ? data.item : item));
        refreshStats(nextItems);
        return nextItems;
      });
      setEditingItem(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to update plan item');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleStar(id: string, newValue: boolean) {
    const previousItems = items;
    const optimisticItems = items.map((item) => (item.id === id ? { ...item, star: newValue } : item));
    setItems(optimisticItems);
    refreshStats(optimisticItems);

    try {
      const response = await fetch(`/api/plan?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ star: newValue }),
      });

      if (!response.ok) throw new Error('Failed to update star');
    } catch {
      setItems(previousItems);
      refreshStats(previousItems);
    }
  }

  async function handleDelete(id: string) {
    try {
      const response = await fetch(`/api/plan?id=${id}`, { method: 'DELETE' });
      if (!response.ok && response.status !== 204) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete plan item');
      }

      setItems((current) => {
        const nextItems = current.filter((item) => item.id !== id);
        refreshStats(nextItems);
        return nextItems;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete plan item');
    }
  }

  function closeForm() {
    setShowForm(false);
    setEditingItem(null);
    setFormError(null);
  }

  function closeGenerator() {
    setShowGenerator(false);
    setFormError(null);
  }

  function toggleCategory(category: PlanCategory) {
    setOpenCategories((current) => (
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category]
    ));
  }

  useEffect(() => {
    if (items.length === 0) return;
    setOpenCategories((current) => {
      if (current.length > 0) return current;
      const firstPopulated = PLAN_CATEGORIES.find((category) => items.some((item) => item.category === category.id));
      return firstPopulated ? [firstPopulated.id] : current;
    });
  }, [items]);

  if (status === 'loading') {
    return (
      <AppLayout>
        <Head><title>Growth Plan - Qimi AI</title></Head>
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-primary-teal" />
        </div>
      </AppLayout>
    );
  }

  if (!session) {
    return (
      <AppLayout>
        <Head><title>Growth Plan - Qimi AI</title></Head>
        <AuthRequiredState
          title="Sign up to save your Growth Plan"
          description="Growth Plan items are saved to your account so you can return to them and track progress."
          reason={PLAN_AUTH_REASON}
        />
      </AppLayout>
    );
  }

  const planQuotaBanner = typeof quota?.planAi?.remaining === 'number' ? (
    <div className={`flex-shrink-0 border-b px-4 py-2 ${quota.planAi.remaining === 0 ? 'border-red-100 bg-red-50' : 'border-teal-100 bg-teal-50'}`}>
      <div className={`mx-auto flex max-w-3xl items-center justify-center text-sm font-medium ${quota.planAi.remaining === 0 ? 'text-red-700' : 'text-teal-700'}`}>
        {quota.planAi.remaining === 0
          ? 'Weekly AI limit reached'
          : `${quota.planAi.remaining} AI plan use${quota.planAi.remaining === 1 ? '' : 's'} left this week`}
      </div>
    </div>
  ) : null;

  return (
    <AppLayout topBanner={planQuotaBanner}>
      <Head><title>Growth Plan - Qimi AI</title></Head>

      <main className="mx-auto w-full min-w-0 max-w-4xl py-6 sm:py-8">
        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-slate-900">Growth Plan</h1>
            <p className="mt-1 text-sm text-slate-600">
              Keep practical strategies in one place and check in as you try them.
            </p>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end">
            <button
              type="button"
              disabled={isLoading}
              onClick={() => {
                setEditingItem(null);
                setShowForm(false);
                setShowGenerator(true);
                setFormError(null);
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-primary-purple/30 bg-primary-purple/5 px-4 py-2 text-sm font-semibold text-primary-purple transition-colors hover:bg-primary-purple/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4" />
              Compose Plan
            </button>
            <button
                type="button"
                onClick={() => {
                  setEditingItem(null);
                  setShowGenerator(false);
                  setShowForm(true);
                  setFormError(null);
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-teal px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-teal/90"
              >
                <Plus className="h-4 w-4" />
                Add Plan Item
            </button>
          </div>
        </div>

        <div className="mt-6 space-y-5">
          {saveNotice && (
            <div role="status" className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              <span>{saveNotice}</span>
              <button type="button" onClick={() => setSaveNotice(null)} className="font-semibold">Dismiss</button>
            </div>
          )}

          <ComposedPlanLibrary
            plans={composedPlans}
            openPlanId={openComposedPlanId}
            onOpenPlan={setOpenComposedPlanId}
            onDelete={handleDeleteComposed}
          />

          <PlanSummary totalItems={totalItems} starredCount={starredCount} />

          {showGenerator && (
            <PlanGenerator
              items={items}
              onSave={handleSaveComposed}
              onCancel={closeGenerator}
              quotaRemaining={quota?.planAi?.remaining}
              onQuotaConsumed={(remaining) => {
                setQuota((current) => current?.planAi ? {
                  ...current,
                  planAi: { ...current.planAi, remaining, used: current.planAi.limit - remaining },
                } : current);
                void refreshQuota();
              }}
            />
          )}

          {formError && showGenerator && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{formError}</div>
          )}

          {(showForm || editingItem) && (
            <div className="space-y-3">
              <PlanItemForm
                initialValues={editingItem || undefined}
                onSubmit={editingItem ? handleUpdate : async (values) => { await handleCreate(values); }}
                onCancel={closeForm}
                isSubmitting={isSubmitting}
              />
              {formError && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {formError}
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <span>{error}</span>
              <button type="button" onClick={fetchItems} className="font-semibold underline">
                Retry
              </button>
            </div>
          )}

          <div className="pt-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Source library</p>
            <h2 className="text-lg font-bold text-slate-900">Saved Plan Sources</h2>
            <p className="mt-1 text-sm text-slate-500">These categorized source plans remain available when you compose a new cross-topic plan.</p>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((item) => (
                <div key={item} className="h-20 animate-pulse rounded-xl bg-slate-100" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
              <p className="text-sm font-semibold text-slate-700">
                You haven't added any plan items yet.
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Save a useful AI suggestion from chat, or add one manually.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {groupedItems.map((group) => (
                <PlanCategoryAccordion
                  key={group.category.id}
                  category={group.category}
                  items={group.items}
                  isOpen={openCategories.includes(group.category.id)}
                  onToggle={() => toggleCategory(group.category.id)}
                  onStar={handleStar}
                  onEdit={(nextItem) => {
                    setShowForm(false);
                    setShowGenerator(false);
                    setEditingItem(nextItem);
                    setFormError(null);
                  }}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-center text-xs text-slate-500">
              Qimi AI is not a substitute for professional medical advice, diagnosis, or treatment.
            </p>
          </div>
        </div>
      </main>
    </AppLayout>
  );
}
