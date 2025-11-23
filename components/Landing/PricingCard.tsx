import React from 'react';
import { Check } from 'lucide-react';

interface PricingCardProps {
  title: string;
  price: string;
  period?: string;
  features: string[];
  isPopular?: boolean;
  ctaText: string;
  onCtaClick?: () => void;
}

export const PricingCard: React.FC<PricingCardProps> = ({
  title,
  price,
  period,
  features,
  isPopular = false,
  ctaText,
  onCtaClick
}) => {
  return (
    <div className={`relative rounded-3xl p-8 transition-all duration-500 ${isPopular
        ? 'bg-white border-2 border-primary-purple/20 shadow-2xl shadow-primary-purple/10 scale-105 z-10'
        : 'bg-white/60 backdrop-blur-md border border-slate-200 hover:bg-white hover:shadow-xl hover:scale-[1.02]'
      }`}>
      {isPopular && (
        <div className="absolute -top-5 left-1/2 -translate-x-1/2">
          <div className="bg-gradient-to-r from-primary-teal to-primary-purple px-6 py-2 rounded-full text-sm font-bold text-white shadow-lg shadow-primary-purple/20 uppercase tracking-wider">
            Most Popular
          </div>
        </div>
      )}

      <div className="mb-8">
        <h3 className={`text-lg font-bold uppercase tracking-wide mb-4 ${isPopular ? 'text-primary-purple' : 'text-slate-500'}`}>
          {title}
        </h3>
        <div className="flex items-baseline">
          <span className="text-5xl font-extrabold text-slate-900 tracking-tight">{price}</span>
          {period && <span className="ml-2 text-slate-500 font-medium">{period}</span>}
        </div>
      </div>

      <div className="space-y-5 mb-10">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start list-none group">
            <div className={`mr-4 mt-1 flex h-5 w-5 items-center justify-center rounded-full ${isPopular ? 'bg-primary-purple/10 text-primary-purple' : 'bg-slate-100 text-slate-500'} transition-colors group-hover:bg-primary-teal/10 group-hover:text-primary-teal`}>
              <Check size={12} strokeWidth={3} />
            </div>
            <span className="text-slate-600 font-medium">{feature}</span>
          </li>
        ))}
      </div>

      <button
        onClick={onCtaClick}
        className={`w-full rounded-xl py-4 font-bold transition-all duration-300 ${isPopular
            ? 'bg-gradient-to-r from-slate-900 to-slate-800 text-white hover:shadow-lg hover:shadow-slate-900/20 hover:-translate-y-0.5'
            : 'bg-white border-2 border-slate-100 text-slate-700 hover:border-primary-teal hover:text-primary-teal hover:bg-primary-teal/5'
          }`}
      >
        {ctaText}
      </button>
    </div>
  );
};
