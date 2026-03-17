/**
 * ChallengeTags - Read-only challenge tags display
 * Shows challenges from onboarding as colored pills grouped by category
 */

import React from 'react';

// Category color mapping from GuestOnboarding CATEGORIES
const CATEGORY_CONFIG: Record<string, { name: string; nameZh: string; color: string }> = {
  emotion: { name: 'Emotions', nameZh: '情绪', color: '#E8A598' },
  focus: { name: 'Attention', nameZh: '注意力', color: '#E8B896' },
  control: { name: 'Self-Control', nameZh: '自控', color: '#B8A8D8' },
  study: { name: 'Learning', nameZh: '学习', color: '#E8D498' },
  social: { name: 'Social', nameZh: '社交', color: '#98D4C8' },
  daily: { name: 'Daily Life', nameZh: '生活', color: '#98C4E8' },
  parent: { name: 'Parent Stress', nameZh: '家长状态', color: '#E0A8C0' },
  medication: { name: 'Diagnosis', nameZh: '诊断用药', color: '#D4A8E0' },
  motor: { name: 'Motor Skills', nameZh: '运动', color: '#A8D8B8' },
};

export interface SelectedChallenge {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
}

interface ChallengeTagsProps {
  challenges: SelectedChallenge[];
}

export default function ChallengeTags({ challenges }: ChallengeTagsProps) {
  // Group challenges by category
  const groupedChallenges = React.useMemo(() => {
    const groups: Record<string, { categoryName: string; challenges: SelectedChallenge[] }> = {};
    
    challenges.forEach(challenge => {
      if (!groups[challenge.categoryId]) {
        groups[challenge.categoryId] = {
          categoryName: challenge.categoryName,
          challenges: [],
        };
      }
      groups[challenge.categoryId].challenges.push(challenge);
    });
    
    return groups;
  }, [challenges]);

  if (challenges.length === 0) {
    return (
      <p className="text-slate-500 text-sm italic">
        No challenges recorded from onboarding
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {Object.entries(groupedChallenges).map(([categoryId, group]) => {
        const config = CATEGORY_CONFIG[categoryId] || { 
          name: group.categoryName, 
          nameZh: '', 
          color: '#94A3B8' 
        };
        
        return (
          <div key={categoryId} className="space-y-2">
            {/* Category label */}
            <div className="flex items-center gap-2">
              <span 
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: config.color }}
              />
              <span className="text-sm font-medium text-slate-700">
                {config.name}
                {config.nameZh && <span className="text-slate-400 ml-1">({config.nameZh})</span>}
              </span>
            </div>
            
            {/* Challenge pills */}
            <div className="flex flex-wrap gap-2 ml-4">
              {group.challenges.map(challenge => (
                <span
                  key={challenge.id}
                  className="px-3 py-1.5 rounded-full text-sm text-slate-700"
                  style={{ 
                    backgroundColor: `${config.color}33`, // 20% opacity
                    border: `1px solid ${config.color}66` // 40% opacity
                  }}
                >
                  {challenge.name}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
