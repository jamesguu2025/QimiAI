import { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  Check,
  CheckCircle2,
  FileText,
  ListChecks,
  LoaderCircle,
  Pencil,
  Plus,
  RefreshCcw,
  Sparkles,
  Star,
  Target,
  WifiOff,
  X,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ActionPlanItem, PlanCategory } from '@/types/plan';
import { PLAN_CATEGORIES } from '@/types/plan';
import { PLAN_TITLE_MAX_LENGTH } from '@/lib/plan-generation';
import type { GeneratedPlanDraft } from '@/lib/plan-generation';

type PlanGeneratorProps = {
  items: ActionPlanItem[];
  onSave: (draft: GeneratedPlanDraft, sourcePlanIds: string[]) => Promise<boolean>;
  onCancel: () => void;
};

export default function PlanGenerator({ items, onSave, onCancel }: PlanGeneratorProps) {
  const orderedItems = useMemo(() => [...items].sort((a, b) => Number(b.star) - Number(a.star)), [items]);
  const [selectedIds, setSelectedIds] = useState<string[]>(() => orderedItems.filter((item) => item.star).map((item) => item.id));
  const [manualItems, setManualItems] = useState<string[]>([]);
  const [manualText, setManualText] = useState('');
  const [draft, setDraft] = useState<GeneratedPlanDraft | null>(null);
  const [viewMode, setViewMode] = useState<'visual' | 'edit'>('visual');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedItems = orderedItems.filter((item) => selectedIds.includes(item.id));
  const selectedCount = selectedItems.length + manualItems.length;
  const selectedStarCount = selectedItems.filter((item) => item.star).length;

  function toggleSource(id: string) {
    setSelectedIds((current) => current.includes(id)
      ? current.filter((currentId) => currentId !== id)
      : [...current, id]);
    setError(null);
  }

  function addManualItem() {
    const cleaned = manualText.replace(/\s+/g, ' ').trim();
    if (!cleaned) return;
    if (cleaned.length > 500) {
      setError('Keep each added item to 500 characters or fewer.');
      return;
    }
    if (manualItems.length >= 5) {
      setError('You can add up to five custom items.');
      return;
    }
    setManualItems((current) => [...current, cleaned]);
    setManualText('');
    setError(null);
  }

  async function generateDraft() {
    if (selectedCount === 0) {
      setError('Choose at least one saved plan or add your own item.');
      return;
    }

    setIsGenerating(true);
    setError(null);
    try {
      const response = await fetch('/api/plan/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planItemIds: selectedIds, manualItems }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not build a visual plan.');
      setDraft(data.draft);
      setViewMode('visual');
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : 'Could not build a visual plan.');
    } finally {
      setIsGenerating(false);
    }
  }

  async function saveDraft() {
    if (!draft || !draft.painPoint.trim() || !draft.strategySummary.trim()) {
      setError('Keep a title and summary before saving.');
      return;
    }
    if (draft.painPoint.trim().length > PLAN_TITLE_MAX_LENGTH) {
      setError(`Keep the plan title to ${PLAN_TITLE_MAX_LENGTH} characters or fewer.`);
      return;
    }
    if (draft.interventionBlocks.some((block) => !block.contentMarkdown.trim())) {
      setError('Each plan section needs content before saving.');
      return;
    }

    setIsSaving(true);
    setError(null);
    const saved = await onSave(draft, selectedIds);
    setIsSaving(false);
    if (!saved) setError('The composed plan could not be saved. Your draft is still here.');
  }

  if (draft) {
    return (
      <section className="w-full min-w-0 overflow-hidden rounded-2xl border border-primary-purple/20 bg-white shadow-sm" aria-labelledby="composed-plan-title" aria-busy={isGenerating}>
        <div className="bg-gradient-to-br from-primary-purple/10 via-white to-primary-teal/10 p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-primary-purple shadow-sm ring-1 ring-primary-purple/10">
                  <Sparkles className="h-3.5 w-3.5" /> Composed from {selectedCount} source{selectedCount === 1 ? '' : 's'}
                </span>
              </div>
              <h2 id="composed-plan-title" className="mt-3 text-xl font-bold leading-tight text-slate-900 sm:text-2xl">{draft.painPoint}</h2>
              <p className="mt-1 text-sm text-slate-600">Review the organized plan, switch to Edit if needed, then save when it fits your family.</p>
            </div>
            <div className="inline-flex w-full flex-none rounded-xl bg-white/80 p-1 shadow-sm ring-1 ring-slate-200/80 backdrop-blur sm:w-fit">
              <button
                type="button"
                onClick={() => setViewMode('visual')}
                className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold sm:flex-none ${viewMode === 'visual' ? 'bg-primary-purple text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <ListChecks className="h-3.5 w-3.5" /> Visual plan
              </button>
              <button
                type="button"
                onClick={() => setViewMode('edit')}
                className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold sm:flex-none ${viewMode === 'edit' ? 'bg-primary-purple text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Pencil className="h-3.5 w-3.5" /> Edit
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          {isGenerating && <GenerationProgress mode="regenerate" />}

          {viewMode === 'visual' ? (
            <VisualPlan draft={draft} sourceCount={selectedCount} />
          ) : (
            <EditablePlan draft={draft} onChange={setDraft} />
          )}

          {error && <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

          <div className="mt-6 flex flex-col-reverse gap-2 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => { setDraft(null); setError(null); }} disabled={isSaving} className={secondaryButtonClassName}>Back to sources</button>
            <button type="button" onClick={generateDraft} disabled={isGenerating || isSaving} className={secondaryButtonClassName}>
              {isGenerating ? 'Rebuilding...' : 'Regenerate'}
            </button>
            <button type="button" onClick={saveDraft} disabled={isSaving || isGenerating} className={primaryButtonClassName}>
              {isSaving ? 'Saving...' : 'Save Composed Plan'}
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="w-full min-w-0 overflow-hidden rounded-xl border border-primary-purple/20 bg-white p-3 shadow-sm sm:p-4" aria-labelledby="plan-composer-title" aria-busy={isGenerating}>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-primary-purple">Saved Plan Composer</p>
        <h2 id="plan-composer-title" className="text-lg font-bold text-slate-900">Turn saved ideas into one visual plan</h2>
        <p className="mt-1 text-sm text-slate-600">Starred plans are selected automatically. Choose what to include; Qimi will reorganize the saved material without asking you to tell the story again.</p>
      </div>

      <div className="mt-5 grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)] xl:gap-5">
        <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-800">Plan sources</h3>
              <p className="text-xs text-slate-500">{selectedItems.length} saved plan{selectedItems.length === 1 ? '' : 's'} selected</p>
            </div>
            {selectedStarCount > 0 && (
              <span className="inline-flex flex-none items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                <Star className="h-3 w-3" fill="currentColor" /> {selectedStarCount} starred
              </span>
            )}
          </div>

          <div className="mt-3 max-h-[440px] space-y-2 overflow-y-auto pr-1">
            {orderedItems.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">No Saved Plans yet. Add an idea below, or save useful strategies first.</p>
            ) : orderedItems.map((item) => {
              const selected = selectedIds.includes(item.id);
              const category = PLAN_CATEGORIES.find((entry) => entry.id === item.category)?.name || item.category;
              return (
                <label key={item.id} className={`block min-w-0 cursor-pointer overflow-hidden rounded-lg border p-3 transition-colors ${selected ? 'border-primary-purple/40 bg-primary-purple/5' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                  <span className="flex items-start gap-3">
                    <input type="checkbox" checked={selected} onChange={() => toggleSource(item.id)} className="mt-1 h-4 w-4 rounded border-slate-300 text-primary-purple focus:ring-primary-purple" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                        {item.star && <Star className="h-3.5 w-3.5 flex-none text-amber-500" fill="currentColor" />}
                        <span className="truncate">{item.painPoint}</span>
                      </span>
                      <span className="mt-1 line-clamp-2 block text-xs leading-relaxed text-slate-600">{item.strategySummary || item.strategy}</span>
                      <span className="mt-2 block text-[11px] font-medium text-slate-400">{category} · {item.sourceType === 'chat' ? 'Saved from chat' : 'Saved plan'}</span>
                    </span>
                    {selected && <Check className="h-4 w-4 flex-none text-primary-purple" />}
                  </span>
                </label>
              );
            })}
          </div>

          <div className="mt-3 rounded-lg border border-dashed border-slate-300 bg-white p-3">
            <label htmlFor="composer-manual-item" className="text-xs font-semibold text-slate-700">Add your own item for this plan</label>
            <div className="mt-1.5 flex min-w-0 flex-col gap-2 sm:flex-row">
              <input
                id="composer-manual-item"
                value={manualText}
                maxLength={500}
                onChange={(event) => setManualText(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    addManualItem();
                  }
                }}
                placeholder="Add a strategy, constraint, or reminder"
                className={`${inputClassName} min-w-0`}
              />
              <button type="button" onClick={addManualItem} className="inline-flex flex-none items-center justify-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                <Plus className="h-4 w-4" /> Add
              </button>
            </div>
            {manualItems.length > 0 && (
              <div className="mt-2 space-y-1.5">
                {manualItems.map((item, index) => (
                  <div key={`${item}-${index}`} className="flex min-w-0 items-start justify-between gap-2 rounded-md bg-slate-50 px-2.5 py-2 text-xs text-slate-600">
                    <span className="min-w-0 break-words">{item}</span>
                    <button type="button" onClick={() => setManualItems((current) => current.filter((_, currentIndex) => currentIndex !== index))} aria-label="Remove custom item" className="text-slate-400 hover:text-red-600">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex min-w-0 flex-col rounded-xl border border-slate-200 p-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary-purple">One practical plan</p>
            <h3 className="mt-1 text-base font-bold text-slate-900">Organize the selected material</h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">Qimi will keep the saved interventions and arrange only the implementation details supported by your sources.</p>
          </div>

          {isGenerating ? <GenerationProgress mode="generate" /> : <div className="mt-4 rounded-xl bg-primary-purple/5 p-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary-purple" />
              <h3 className="text-sm font-bold text-slate-800">Ready to organize</h3>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-3">
              <div><dt className="text-[11px] uppercase text-slate-400">Sources</dt><dd className="text-lg font-bold text-slate-800">{selectedCount}</dd></div>
              <div><dt className="text-[11px] uppercase text-slate-400">Starred</dt><dd className="text-lg font-bold text-slate-800">{selectedStarCount}</dd></div>
            </dl>
            <p className="mt-3 text-xs leading-relaxed text-slate-600">The plan shows only source-backed, non-duplicative details. Missing optional categories are omitted rather than guessed or repeated in empty columns.</p>
          </div>}

          {selectedItems.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold text-slate-600">Included Saved Plans</p>
              <div className="mt-2 flex min-w-0 flex-wrap gap-1.5">
                {selectedItems.map((item) => <span key={item.id} className="min-w-0 max-w-full truncate rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">{item.star ? '★ ' : ''}{item.painPoint}</span>)}
              </div>
            </div>
          )}

          {error && <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

          <div className="mt-auto flex flex-col-reverse gap-2 pt-6 sm:flex-row sm:justify-end">
            <button type="button" onClick={onCancel} disabled={isGenerating} className={secondaryButtonClassName}>Cancel</button>
            <button type="button" onClick={generateDraft} disabled={isGenerating || selectedCount === 0} className={primaryButtonClassName}>
              {isGenerating ? 'Organizing saved plans...' : `Generate from ${selectedCount} item${selectedCount === 1 ? '' : 's'}`}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

const GENERATION_STAGES = [
  'Reading your selected Saved Plans',
  'Organizing actions and schedules',
  'Checking every detail against the sources',
  'Preparing the visual plan',
] as const;

function GenerationProgress({ mode }: { mode: 'generate' | 'regenerate' }) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(typeof navigator === 'undefined' ? true : navigator.onLine);
    const timer = window.setInterval(() => setElapsedSeconds((current) => current + 1), 1000);
    const updateConnection = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', updateConnection);
    window.addEventListener('offline', updateConnection);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('online', updateConnection);
      window.removeEventListener('offline', updateConnection);
    };
  }, []);

  const activeStage = elapsedSeconds < 3 ? 0 : elapsedSeconds < 7 ? 1 : elapsedSeconds < 12 ? 2 : 3;
  const waitingLonger = elapsedSeconds >= 18;

  return (
    <div className={`${mode === 'regenerate' ? 'mb-5' : 'mt-4'} overflow-hidden rounded-xl border border-primary-purple/20 bg-gradient-to-br from-primary-purple/[0.08] via-white to-primary-teal/[0.08]`} role="status" aria-live="polite">
      <div className="h-1 overflow-hidden bg-primary-purple/10" aria-hidden="true">
        <div className="h-full w-2/5 animate-[plan-progress_1.6s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-primary-purple to-primary-teal" />
      </div>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-full bg-primary-purple text-white shadow-sm">
            <LoaderCircle className="h-5 w-5 animate-spin" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-sm font-bold text-slate-900">{mode === 'regenerate' ? 'Reorganizing your plan' : 'Organizing your Saved Plans'}</h3>
              <span className="text-xs tabular-nums text-slate-500">{elapsedSeconds}s elapsed</span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              {waitingLonger
                ? 'Still working. Combined plans can take longer when Qimi needs an extra source check.'
                : 'Qimi is keeping the request open while it organizes and verifies your source material.'}
            </p>
          </div>
        </div>

        <ol className="mt-4 grid gap-2 sm:grid-cols-2">
          {GENERATION_STAGES.map((stage, index) => {
            const complete = index < activeStage;
            const active = index === activeStage;
            return (
              <li key={stage} className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs ${active ? 'bg-white font-semibold text-slate-800 shadow-sm ring-1 ring-primary-purple/10' : complete ? 'text-primary-teal' : 'text-slate-400'}`}>
                {complete
                  ? <CheckCircle2 className="h-4 w-4 flex-none" />
                  : <span className={`h-2.5 w-2.5 flex-none rounded-full ${active ? 'animate-pulse bg-primary-purple' : 'bg-slate-200'}`} />}
                <span>{stage}</span>
              </li>
            );
          })}
        </ol>

        {!isOnline && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800">
            <WifiOff className="mt-0.5 h-4 w-4 flex-none" />
            <span>Your device appears to be offline. Reconnect to finish generating the plan.</span>
          </div>
        )}
        <p className="mt-3 text-[11px] leading-relaxed text-slate-400">Stages show the expected workflow, not an exact percentage. Keep this page open until the plan appears.</p>
      </div>
      <style jsx global>{`
        @keyframes plan-progress {
          0% { transform: translateX(-110%); }
          50% { transform: translateX(130%); }
          100% { transform: translateX(360%); }
        }
      `}</style>
    </div>
  );
}

function VisualPlan({ draft, sourceCount }: { draft: GeneratedPlanDraft; sourceCount: number }) {
  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-2xl border border-primary-purple/15 bg-gradient-to-br from-primary-purple/[0.07] via-white to-primary-teal/[0.08]">
        <div className="p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-primary-purple text-white shadow-sm">
              <Target className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary-purple">Plan purpose</p>
              <p className="mt-1 text-base font-semibold leading-relaxed text-slate-900">{draft.strategySummary}</p>
            </div>
          </div>
        </div>
        <div className="grid border-t border-white/80 bg-white/55 sm:grid-cols-2">
          <PlanMeta icon={<Sparkles className="h-4 w-4" />} label="Source material" value={`${sourceCount} selected item${sourceCount === 1 ? '' : 's'}`} />
          <PlanMeta icon={<CheckCircle2 className="h-4 w-4" />} label="Before saving" value="Review or edit" />
        </div>
        <div className="px-5 pb-5 sm:px-6 sm:pb-6">
        {draft.explanationMarkdown && <MarkdownContent content={draft.explanationMarkdown} />}
        </div>
      </div>
      {draft.interventionBlocks.map((block, index) => {
        const theme = getBlockTheme(block.title);
        return (
          <section key={`${block.title || 'section'}-${index}`} className={`overflow-hidden rounded-2xl border shadow-sm ${theme.border}`}>
            {block.title && (
              <div className={`flex items-center gap-3 border-b px-4 py-3.5 sm:px-5 ${theme.header} ${theme.border}`}>
                <span className={`inline-flex h-8 w-8 flex-none items-center justify-center rounded-lg ${theme.iconBackground}`}>
                  {theme.icon}
                </span>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{String(index + 1).padStart(2, '0')}</p>
                  <h3 className="text-sm font-bold text-slate-900 sm:text-base">{block.title}</h3>
                </div>
              </div>
            )}
            <div className="bg-white p-4 sm:p-5"><MarkdownContent content={block.contentMarkdown} /></div>
          </section>
        );
      })}
    </div>
  );
}

function PlanMeta({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5 border-b border-white/80 px-5 py-3 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
      <span className="text-primary-teal">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
        <p className="truncate text-xs font-semibold text-slate-700">{value}</p>
      </div>
    </div>
  );
}

function getBlockTheme(title?: string) {
  const normalized = (title || '').toLowerCase();
  const topicTheme = [
    { match: 'emotional support', border: 'border-rose-200/80', header: 'bg-rose-50/80', iconBackground: 'bg-rose-100 text-rose-600' },
    { match: 'learning strategies', border: 'border-cyan-200/80', header: 'bg-cyan-50/80', iconBackground: 'bg-cyan-100 text-cyan-700' },
    { match: 'exercise & movement', border: 'border-sky-200/80', header: 'bg-sky-50/80', iconBackground: 'bg-sky-100 text-sky-700' },
    { match: 'diet & nutrition', border: 'border-emerald-200/80', header: 'bg-emerald-50/80', iconBackground: 'bg-emerald-100 text-emerald-700' },
    { match: 'social skills', border: 'border-fuchsia-200/80', header: 'bg-fuchsia-50/80', iconBackground: 'bg-fuchsia-100 text-fuchsia-700' },
    { match: 'sleep & rest', border: 'border-indigo-200/80', header: 'bg-indigo-50/80', iconBackground: 'bg-indigo-100 text-indigo-700' },
    { match: 'school communication', border: 'border-orange-200/80', header: 'bg-orange-50/80', iconBackground: 'bg-orange-100 text-orange-700' },
    { match: 'additional items', border: 'border-slate-200', header: 'bg-slate-50', iconBackground: 'bg-slate-200/80 text-slate-600' },
  ].find((theme) => normalized === theme.match);
  if (topicTheme) {
    return {
      border: topicTheme.border,
      header: topicTheme.header,
      iconBackground: topicTheme.iconBackground,
      icon: <ListChecks className="h-4 w-4" />,
    };
  }
  if (normalized.includes('review') || normalized.includes('adjust')) {
    return {
      border: 'border-amber-200/80',
      header: 'bg-amber-50/80',
      iconBackground: 'bg-amber-100 text-amber-700',
      icon: <RefreshCcw className="h-4 w-4" />,
    };
  }
  if (normalized.includes('source')) {
    return {
      border: 'border-slate-200',
      header: 'bg-slate-50',
      iconBackground: 'bg-slate-200/80 text-slate-600',
      icon: <FileText className="h-4 w-4" />,
    };
  }
  if (normalized.includes('glance') || normalized.includes('routine') || normalized.includes('schedule')) {
    return {
      border: 'border-primary-purple/20',
      header: 'bg-primary-purple/[0.06]',
      iconBackground: 'bg-primary-purple/10 text-primary-purple',
      icon: <CalendarDays className="h-4 w-4" />,
    };
  }
  return {
    border: 'border-primary-teal/20',
    header: 'bg-primary-teal/[0.06]',
    iconBackground: 'bg-primary-teal/10 text-primary-teal',
    icon: <ListChecks className="h-4 w-4" />,
  };
}

function EditablePlan({ draft, onChange }: { draft: GeneratedPlanDraft; onChange: (draft: GeneratedPlanDraft) => void }) {
  return (
    <div className="mt-5 grid gap-4">
      <Field label="Category" htmlFor="composed-plan-category">
        <select id="composed-plan-category" value={draft.category} onChange={(event) => onChange({ ...draft, category: event.target.value as PlanCategory })} className={inputClassName}>
          {PLAN_CATEGORIES.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select>
      </Field>
      <Field label={`Plan title (${draft.painPoint.length}/${PLAN_TITLE_MAX_LENGTH})`} htmlFor="composed-plan-name"><input id="composed-plan-name" value={draft.painPoint} maxLength={PLAN_TITLE_MAX_LENGTH} onChange={(event) => onChange({ ...draft, painPoint: event.target.value })} className={inputClassName} /></Field>
      <Field label="Plan purpose" htmlFor="composed-plan-summary">
        <textarea id="composed-plan-summary" value={draft.strategySummary} rows={2} maxLength={500} onChange={(event) => onChange({ ...draft, strategySummary: event.target.value, strategy: event.target.value })} className={textareaClassName} />
      </Field>
      <Field label="Implementation guidance" htmlFor="composed-plan-explanation">
        <textarea id="composed-plan-explanation" value={draft.explanationMarkdown} rows={3} maxLength={2000} onChange={(event) => onChange({ ...draft, explanationMarkdown: event.target.value })} className={textareaClassName} />
      </Field>
      {draft.interventionBlocks.map((block, index) => (
        <Field key={`${block.title || 'section'}-${index}`} label={block.title || `Plan section ${index + 1}`} htmlFor={`composed-plan-block-${index}`}>
          <textarea
            id={`composed-plan-block-${index}`}
            value={block.contentMarkdown}
            rows={6}
            maxLength={4000}
            onChange={(event) => onChange({
              ...draft,
              interventionBlocks: draft.interventionBlocks.map((entry, entryIndex) => entryIndex === index ? { ...entry, contentMarkdown: event.target.value } : entry),
            })}
            className={textareaClassName}
          />
        </Field>
      ))}
    </div>
  );
}

function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="prose prose-slate mt-2 max-w-none prose-p:my-1.5 prose-p:text-sm prose-p:leading-7 prose-p:text-slate-700 prose-ul:my-2 prose-ol:my-2 prose-li:my-1 prose-li:text-sm prose-li:leading-6 prose-strong:text-slate-900">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          table: ({ children }) => (
            <div className="not-prose my-4 max-w-full overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
              <table className="w-full min-w-[620px] border-collapse text-left">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-gradient-to-r from-primary-purple/[0.09] to-primary-teal/[0.08]">{children}</thead>,
          tbody: ({ children }) => <tbody className="divide-y divide-slate-100 [&>tr:nth-child(even)]:bg-slate-50/70">{children}</tbody>,
          th: ({ children }) => <th className="border-r border-slate-200/80 px-4 py-3 text-xs font-bold leading-snug text-slate-900 last:border-r-0">{children}</th>,
          td: ({ children }) => <td className="border-r border-slate-100 px-4 py-3.5 align-top text-sm leading-6 text-slate-700 last:border-r-0">{children}</td>,
        }}
      >{content}</ReactMarkdown>
    </div>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return <div><label htmlFor={htmlFor} className="block text-sm font-semibold text-slate-700">{label}</label>{children}</div>;
}

const inputClassName = 'mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition-colors focus:border-primary-teal focus:ring-2 focus:ring-primary-teal/15';
const textareaClassName = `${inputClassName} resize-none`;
const primaryButtonClassName = 'rounded-lg bg-primary-purple px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-purple/90 disabled:cursor-not-allowed disabled:opacity-50';
const secondaryButtonClassName = 'rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50';
