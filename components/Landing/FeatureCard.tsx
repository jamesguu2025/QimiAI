import React from 'react';
import { LucideIcon } from 'lucide-react';

interface FeatureCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
}

export const FeatureCard: React.FC<FeatureCardProps> = ({ title, description, icon: Icon, color, bgColor }) => {
  return (
    <div className="group relative overflow-hidden rounded-2xl bg-white p-8 shadow-sm border border-slate-100 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
      <div className={`absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full ${bgColor} opacity-50 blur-2xl transition-all group-hover:scale-150`} />

      <div className={`relative mb-6 inline-flex h-14 w-14 items-center justify-center rounded-xl ${bgColor} ${color}`}>
        <Icon size={28} />
      </div>

      <h3 className="mb-3 text-xl font-bold text-slate-900">{title}</h3>
      <p className="text-slate-600 leading-relaxed">{description}</p>

      <div className="mt-6 flex items-center text-sm font-medium text-slate-900 opacity-0 transition-opacity group-hover:opacity-100">
        Learn more <span className="ml-2">→</span>
      </div>
    </div>
  );
};
