import {
  Apple,
  BookOpen,
  Dumbbell,
  HeartPulse,
  Moon,
  School,
  Users,
} from 'lucide-react';
import type { PlanCategory } from '@/types/plan';

interface CategoryIconProps {
  category: PlanCategory;
  className?: string;
}

export default function CategoryIcon({ category, className = 'h-4 w-4' }: CategoryIconProps) {
  const props = { className, strokeWidth: 2 };

  switch (category) {
    case 'emotion':
      return <HeartPulse {...props} />;
    case 'learning':
      return <BookOpen {...props} />;
    case 'exercise':
      return <Dumbbell {...props} />;
    case 'nutrition':
      return <Apple {...props} />;
    case 'social':
      return <Users {...props} />;
    case 'sleep':
      return <Moon {...props} />;
    case 'school':
      return <School {...props} />;
    default:
      return <BookOpen {...props} />;
  }
}
