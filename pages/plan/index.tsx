import Head from 'next/head';
import { Plus } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import AppLayout from '@/components/Layout/AppLayout';
import PlanCategoryAccordion from '@/components/GrowthPlan/PlanCategoryAccordion';
import PlanItemForm from '@/components/GrowthPlan/PlanItemForm';
import PlanSummary from '@/components/GrowthPlan/PlanSummary';
import { useAuthUIStore } from '@/stores/authUIStore';
import AuthRequiredState from '@/components/Auth/AuthRequiredState';
import type { ActionPlanItem, PlanCategory } from '@/types/plan';
import { PLAN_CATEGORIES } from '@/types/plan';

type PlanFormValues = {
  category: PlanCategory;
  painPoint: string;
  strategy: string;
};

const PLAN_AUTH_REASON = 'Sign up to save AI-recommended strategies into your Growth Plan and track what works for your family over time.';

export default function GrowthPlanPage() {
  const { data: session, status } = useSession();
  const { openLoginModal } = useAuthUIStore();
  const [items, setItems] = useState<ActionPlanItem[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [starredCount, setStarredCount] = useState(0);
  const [openCategories, setOpenCategories] = useState<PlanCategory[]>(['emotion']);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<ActionPlanItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [entitlementTier] = useState<'free' | 'pro'>('free');

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

  useEffect(() => {
    if (session?.user?.email) {
      fetchItems();
    }
  }, [session?.user?.email, fetchItems]);

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

  async function handleCreate(values: PlanFormValues) {
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
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create plan item');
    } finally {
      setIsSubmitting(false);
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

  const quotaReached = totalItems >= 5 && entitlementTier !== 'pro';

  return (
    <AppLayout>
      <Head><title>Growth Plan - Qimi AI</title></Head>

      <main className="mx-auto max-w-4xl py-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Growth Plan</h1>
            <p className="mt-1 text-sm text-slate-600">
              Keep practical strategies in one place and check in as you try them.
            </p>
          </div>

          {quotaReached ? (
            <button
              type="button"
              disabled
              className="inline-flex items-center justify-center rounded-xl bg-primary-purple/10 px-4 py-2 text-sm font-semibold text-primary-purple"
            >
              Upgrade for More Items
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setEditingItem(null);
                setShowForm(true);
                setFormError(null);
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-teal px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-teal/90"
            >
              <Plus className="h-4 w-4" />
              Add Plan Item
            </button>
          )}
        </div>

        <div className="mt-6 space-y-5">
          <PlanSummary totalItems={totalItems} starredCount={starredCount} />

          {(showForm || editingItem) && (
            <div className="space-y-3">
              <PlanItemForm
                initialValues={editingItem || undefined}
                onSubmit={editingItem ? handleUpdate : handleCreate}
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
