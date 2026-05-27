interface PlanSummaryProps {
  totalItems: number;
  starredCount: number;
}

export default function PlanSummary({ totalItems, starredCount }: PlanSummaryProps) {
  const stats = [
    { label: 'Total Items', value: totalItems, accent: 'text-slate-900' },
    { label: 'Starred', value: starredCount, accent: 'text-primary-teal' },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {stats.map((stat) => (
        <div key={stat.label} className="rounded-xl border border-slate-200 bg-white p-4">
          <p className={`text-2xl font-bold ${stat.accent}`}>{stat.value}</p>
          <p className="mt-1 text-xs font-semibold uppercase text-slate-400">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}
