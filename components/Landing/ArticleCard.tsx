import React from 'react';
import { ArrowRight } from 'lucide-react';

interface ArticleCardProps {
  category: string;
  title: string;
  excerpt: string;
  readTime: string;
  imageGradient: string;
}

export const ArticleCard: React.FC<ArticleCardProps> = ({
  category,
  title,
  excerpt,
  readTime,
  imageGradient
}) => {
  return (
    <div className="group cursor-pointer flex flex-col h-full">
      {/* Image Area */}
      <div className={`aspect-[16/10] w-full overflow-hidden rounded-3xl ${imageGradient} relative mb-6 shadow-sm transition-all duration-500 group-hover:shadow-xl group-hover:shadow-primary-purple/10 group-hover:-translate-y-1`}>
        <div className="absolute inset-0 bg-white/0 transition-colors duration-300 group-hover:bg-white/10" />
        {/* Overlay Content (Optional) */}
        <div className="absolute bottom-4 left-4">
          <span className="px-3 py-1 rounded-full bg-white/90 backdrop-blur-sm text-xs font-bold text-slate-900 shadow-sm">
            {readTime}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-primary-purple bg-primary-purple/5 px-2 py-1 rounded-md">
            {category}
          </span>
        </div>

        <h3 className="text-xl font-bold text-slate-900 mb-3 leading-tight group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-primary-teal group-hover:to-primary-purple transition-all duration-300">
          {title}
        </h3>

        <p className="text-slate-500 leading-relaxed mb-6 line-clamp-2 flex-1">
          {excerpt}
        </p>

        <div className="flex items-center text-sm font-bold text-slate-900 group-hover:text-primary-purple transition-colors">
          Read Article
          <ArrowRight size={16} className="ml-2 transition-transform duration-300 group-hover:translate-x-2" />
        </div>
      </div>
    </div>
  );
};
