// pages/plan/index.tsx - Growth Plan Dashboard

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import AppLayout from '@/components/Layout/AppLayout';
import PlanItemCard from '@/components/GrowthPlan/PlanItemCard';
import PlanItemForm from '@/components/GrowthPlan/PlanItemForm';
import CategoryFilter from '@/components/GrowthPlan/CategoryFilter';
import PlanSummary from '@/components/GrowthPlan/PlanSummary';
import type { ActionPlanItem, PlanCategory } from '@/types/plan';

export default function PlanPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [items, setItems] = useState<ActionPlanItem[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [starredCount, setStarredCount] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState<PlanCategory | 'all'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<ActionPlanItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/plan');
      if (!res.ok) throw new Error('Failed to load plan items');
      const data = await res.json();
      setItems(data.items);
      setTotalItems(data.totalItems);
      setStarredCount(data.starredCount);
    } catch (err) {
      console.error('[plan] fetch error:', err);
      setError('Failed to load plan items. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session) fetchItems();
  }, [session, fetchItems]);

  if (status === 'loading') {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <span className="text-slate-400">Loading...</span>
        </div>
      </AppLayout>
    );
  }

  if (!session) {
    router.push('/login');
    return null;
  }

  const visibleItems =
    categoryFilter === 'all'
      ? items
      : items.filter((i) => i.category === categoryFilter);

  const lastCheckIn = items
    .filter((i) => i.lastCheckIn)
    .sort((a, b) => new Date(b.lastCheckIn!).getTime() - new Date(a.lastCheckIn!).getTime())[0]?.lastCheckIn || null;

  const handleCreate = async (values: { category: PlanCategory; painPoint: string; strategy: string }) => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create');
      }
      const data = await res.json();
      setItems((prev) => [data.item, ...prev]);
      setTotalItems((prev) => prev + 1);
      setShowForm(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create item');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (values: { category: PlanCategory; painPoint: string; strategy: string }) => {
    if (!editingItem) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/plan?id=${editingItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update');
      }
      const data = await res.json();
      setItems((prev) => prev.map((i) => (i.id === editingItem.id ? data.item : i)));
      setEditingItem(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update item');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStar = async (id: string, newValue: boolean) => {
    // Optimistic update
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, star: newValue } : i)));
    setStarredCount((prev) => prev + (newValue ? 1 : -1));

    try {
      const res = await fetch(`/api/plan?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ star: newValue }),
      });
      if (!res.ok) throw new Error('Failed to update star');
    } catch {
      // Revert
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, star: !newValue } : i)));
      setStarredCount((prev) => prev + (newValue ? -1 : 1));
    }
  };

  const handleCheckin = async (id: string) => {
    try {
      const res = await fetch(`/api/plan/checkin?id=${id}`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to check in');
      const data = await res.json();
      setItems((prev) => prev.map((i) => (i.id === id ? data.item : i)));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to check in');
    }
  };

  const handleDelete = async (id: string) => {
    const item = items.find((i) => i.id === id);
    try {
      const res = await fetch(`/api/plan?id=${id}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 204) throw new Error('Failed to delete');
      setItems((prev) => prev.filter((i) => i.id !== id));
      setTotalItems((prev) => prev - 1);
      if (item?.star) setStarredCount((prev) => prev - 1);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete item');
    }
  };

  return (
    <AppLayout>
      <Head>
        <title>Growth Plan - Qimi AI</title>
      </Head>
      <div className="max-w-lg mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-800">Growth Plan</h1>
          {totalItems < 5 ? (
            <button
              type="button"
              onClick={() => { setShowForm(true); setEditingItem(null); }}
              className="px-3 py-1.5 bg-[#00D4AA] text-white text-sm rounded-lg hover:bg-teal-500 transition-colors"
            >
              + Add Plan Item
            </button>
          ) : (
            <span className="px-3 py-1.5 bg-purple-100 text-purple-600 text-xs rounded-lg">
              Upgrade for More Items
            </span>
          )}
        </div>

        {/* Summary */}
        {!isLoading && (
          <PlanSummary
            totalItems={totalItems}
            starredCount={starredCount}
            lastCheckIn={lastCheckIn}
          />
        )}

        {/* Category Filter */}
        <CategoryFilter selected={categoryFilter} onChange={setCategoryFilter} />

        {/* Form */}
        {(showForm || editingItem) && (
          <PlanItemForm
            initialValues={editingItem || undefined}
            onSubmit={editingItem ? handleUpdate : handleCreate}
            onCancel={() => { setShowForm(false); setEditingItem(null); }}
            isSubmitting={isSubmitting}
          />
        )}

        {/* Error */}
        {error && (
          <div className="text-sm text-red-500 bg-red-50 p-3 rounded-lg flex items-center justify-between">
            <span>{error}</span>
            <button
              type="button"
              onClick={fetchItems}
              className="text-red-600 underline text-xs"
            >
              Retry
            </button>
          </div>
        )}

        {/* Items */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-slate-50 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : visibleItems.length === 0 ? (
          <div className="text-center py-8 text-sm text-slate-400">
            {items.length === 0
              ? "You haven't added any plan items yet. Click 'Add Plan Item' to get started."
              : 'No items in this category yet.'}
          </div>
        ) : (
          <div className="space-y-3">
            {visibleItems.map((item) => (
              <PlanItemCard
                key={item.id}
                item={item}
                onStar={handleStar}
                onCheckin={handleCheckin}
                onEdit={(i) => { setEditingItem(i); setShowForm(false); }}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

        {/* Medical Disclaimer */}
        <p className="text-xs text-slate-400 text-center py-2">
          Not a substitute for professional medical advice.
        </p>
      </div>
    </AppLayout>
  );
}
