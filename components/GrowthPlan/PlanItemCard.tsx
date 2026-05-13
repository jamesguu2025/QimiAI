import { ChevronDown, Pencil, Star, Trash2 } from 'lucide-react';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ActionPlanItem } from '@/types/plan';

interface PlanItemCardProps {
  item: ActionPlanItem;
  onStar: (id: string, newValue: boolean) => void;
  onEdit: (item: ActionPlanItem) => void;
  onDelete: (id: string) => void;
}

export default function PlanItemCard({ item, onStar, onEdit, onDelete }: PlanItemCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const hasStructuredContent = Boolean(item.explanationMarkdown || item.interventionBlocks?.length);
  const summary = item.strategySummary || item.strategy;

  function handleDelete() {
    if (window.confirm('Delete this plan item?')) {
      onDelete(item.id);
    }
  }

  return (
    <article className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start gap-3 px-4 py-4">
        <button
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          aria-expanded={isOpen}
          className="flex min-w-0 flex-1 items-start justify-between gap-3 text-left"
        >
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-slate-900">{item.painPoint}</span>
            <span className="mt-1 line-clamp-2 block text-sm leading-relaxed text-slate-600">{summary}</span>
          </span>
          <ChevronDown
            className={`mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </button>

        <button
          type="button"
          onClick={() => onStar(item.id, !item.star)}
          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-primary-teal"
          aria-label={item.star ? 'Unstar this item' : 'Star this item'}
        >
          <Star className="h-4 w-4" fill={item.star ? 'currentColor' : 'none'} />
        </button>
      </div>

      {isOpen && (
        <div className="space-y-4 border-t border-slate-100 px-4 pb-4 pt-3">
          <div>
            <p className="text-xs font-semibold uppercase text-slate-400">Challenge</p>
            <p className="mt-1 text-sm leading-relaxed text-slate-700">{item.painPoint}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-slate-400">Strategy</p>
            <p className="mt-1 text-sm leading-relaxed text-slate-700">{summary}</p>
          </div>

          {hasStructuredContent && (
            <div className="space-y-3 rounded-lg bg-slate-50 p-3">
              {item.explanationMarkdown && (
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-400">Why It May Help</p>
                  <MarkdownContent content={item.explanationMarkdown} />
                </div>
              )}

              {item.interventionBlocks?.map((block, index) => (
                <div key={`${block.title || 'block'}-${index}`}>
                  {block.title && (
                    <p className="text-xs font-semibold uppercase text-slate-400">{block.title}</p>
                  )}
                  <MarkdownContent content={block.contentMarkdown} />
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={() => onEdit(item)}
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              aria-label="Edit plan item"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
              aria-label="Delete plan item"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
        )}
    </article>
  );
}

function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="prose prose-slate mt-1 max-w-none prose-p:my-1 prose-p:text-sm prose-p:leading-relaxed prose-p:text-slate-700 prose-strong:text-slate-800 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-li:text-sm prose-table:block prose-table:w-full prose-table:overflow-x-auto prose-table:border-collapse prose-th:border prose-th:border-slate-300 prose-th:bg-white prose-th:px-3 prose-th:py-2 prose-th:text-left prose-th:text-xs prose-td:border prose-td:border-slate-200 prose-td:bg-white prose-td:px-3 prose-td:py-2 prose-td:text-xs">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
