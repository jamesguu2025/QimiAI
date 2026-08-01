import { ArrowRight, Bookmark, Check, MessageCircle, Sparkles } from 'lucide-react';

const actionSteps = [
  'Allow a short reset after school',
  'Make the first step visible and small',
  'Notice what makes starting easier',
];

export default function ProductDemo() {
  return (
    <figure className="w-full max-w-[540px]">
      <div className="overflow-hidden rounded-[28px] bg-white shadow-[0_24px_70px_rgba(15,23,42,0.16)] ring-1 ring-slate-200/80">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-5 py-3.5">
          <div className="flex items-center gap-2" aria-hidden="true">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-300" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <Sparkles size={14} className="text-primary-purple" />
            Qimi product preview
          </div>
          <span className="rounded-full bg-primary-teal/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-primary-teal">
            Question → Plan
          </span>
        </div>

        <div className="relative space-y-4 bg-gradient-to-br from-white via-white to-primary-teal/[0.06] p-5 sm:p-6">
          <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-primary-purple/10 blur-3xl" />

          <div className="relative ml-auto max-w-[88%] rounded-2xl rounded-br-md bg-slate-900 px-4 py-3 text-sm leading-relaxed text-white shadow-sm">
            <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-300">
              <MessageCircle size={12} />
              A real parenting question
            </div>
            Homework starts with an argument every day. How can I make the transition easier?
          </div>

          <div className="relative rounded-2xl border border-primary-purple/15 bg-white p-4 shadow-[0_10px_30px_rgba(79,70,229,0.08)] sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200/80">
                  <img src="/favicon.svg" alt="" className="h-6 w-6" aria-hidden="true" />
                </span>
                Qimi
              </div>
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-700">
                Research-informed
              </span>
            </div>

            <p className="mb-3 text-sm font-semibold leading-relaxed text-slate-800">
              Start with the transition—not the whole homework session.
            </p>
            <div className="space-y-2">
              {actionSteps.map((step) => (
                <div key={step} className="flex items-center gap-2.5 rounded-xl bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600">
                  <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-primary-teal/15 text-primary-teal">
                    <Check size={12} strokeWidth={3} />
                  </span>
                  {step}
                </div>
              ))}
            </div>
          </div>

          <div className="relative flex items-center justify-between gap-4 rounded-2xl border border-primary-teal/20 bg-primary-teal/[0.07] px-4 py-3.5">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-white text-primary-teal shadow-sm">
                <Bookmark size={17} />
              </span>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900">Save what fits your family</div>
                <div className="mt-0.5 text-[11px] text-slate-500">Organize selected strategies into a visual plan.</div>
              </div>
            </div>
            <span className="flex flex-none items-center gap-1 text-[11px] font-bold text-primary-purple">
              Growth Plan
              <ArrowRight size={13} />
            </span>
          </div>
        </div>
      </div>
      <figcaption className="mt-3 text-center text-xs font-medium text-slate-500 lg:text-right">
        One question. Clearer next steps. A plan you can return to.
      </figcaption>
    </figure>
  );
}
