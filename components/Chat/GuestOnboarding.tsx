/**
 * GuestOnboarding - 访客引导组件
 *
 * 对齐小程序设计：3步引导流程
 * 步骤1：孩子出生日期（年份+月份）
 * 步骤2：挑战选择（漂浮气泡动画）
 * 步骤3：问题选择（根据挑战生成）
 */

import { useState, useMemo } from 'react';
import { ChevronRight, ChevronLeft, ChevronDown, ArrowLeft } from 'lucide-react';

// 气泡位置配置（9个分类，3x3超紧凑布局）
const BUBBLE_POSITIONS = [
  { x: 10, y: 5, delay: 0 },
  { x: 38, y: 2, delay: 0.2 },
  { x: 66, y: 6, delay: 0.4 },
  { x: 8, y: 35, delay: 0.6 },
  { x: 37, y: 38, delay: 0.8 },
  { x: 65, y: 33, delay: 1.0 },
  { x: 11, y: 66, delay: 1.2 },
  { x: 39, y: 70, delay: 1.4 },
  { x: 67, y: 64, delay: 1.6 },
];

// 子气泡位置配置（2列3行紧凑布局）
const SUB_BUBBLE_POSITIONS = [
  { x: 8, y: 5 },
  { x: 52, y: 8 },
  { x: 6, y: 38 },
  { x: 54, y: 42 },
  { x: 10, y: 72 },
  { x: 50, y: 75 },
];

// 挑战分类配置 - 对齐小程序 9 大类
const CATEGORIES = [
  {
    id: 'emotion',
    name: 'Emotions',
    nameZh: '情绪',
    color: '#E8A598',
    subItems: [
      { id: 'tantrums', name: 'Frequent tantrums', nameZh: '动不动发脾气' },
      { id: 'mood_swings', name: 'Mood swings', nameZh: '情绪说变就变' },
      { id: 'meltdown', name: 'Meltdowns when frustrated', nameZh: '遇挫就崩溃' },
      { id: 'sensitive', name: 'Overly sensitive', nameZh: '说两句就炸' },
      { id: 'anxiety', name: 'Anxiety', nameZh: '容易焦虑紧张' },
      { id: 'low_self_esteem', name: 'Low self-esteem', nameZh: '总说自己不行' },
    ]
  },
  {
    id: 'focus',
    name: 'Attention',
    nameZh: '注意力',
    color: '#E8B896',
    subItems: [
      { id: 'distracted', name: 'Easily distracted', nameZh: '做着做着走神' },
      { id: 'cant_start', name: 'Hard to start tasks', nameZh: '迟迟不开始' },
      { id: 'short_focus', name: 'Short attention span', nameZh: '坚持不了几分钟' },
      { id: 'forgetful', name: 'Forgetful', nameZh: '转身就忘' },
      { id: 'no_time_sense', name: 'No sense of time', nameZh: '没时间概念' },
      { id: 'loses_things', name: 'Loses things often', nameZh: '东西老丢' },
    ]
  },
  {
    id: 'control',
    name: 'Self-Control',
    nameZh: '自控',
    color: '#B8A8D8',
    subItems: [
      { id: 'interrupting', name: 'Interrupts others', nameZh: '爱打断别人' },
      { id: 'blurting', name: 'Blurts out', nameZh: '想到就说' },
      { id: 'cant_wait', name: "Can't wait", nameZh: '等不了' },
      { id: 'fidgety', name: "Can't sit still", nameZh: '坐不住' },
      { id: 'hands_on', name: 'Gets physical', nameZh: '容易动手' },
      { id: 'no_rules', name: "Doesn't follow rules", nameZh: '不守规则' },
    ]
  },
  {
    id: 'study',
    name: 'Learning',
    nameZh: '学习',
    color: '#E8D498',
    subItems: [
      { id: 'homework_battle', name: 'Homework battles', nameZh: '作业拖拉磨蹭' },
      { id: 'reading_hard', name: 'Reading difficulties', nameZh: '读不懂题' },
      { id: 'writing_messy', name: 'Messy handwriting', nameZh: '写字歪扭' },
      { id: 'hates_school', name: 'Hates school', nameZh: '厌学不想去' },
      { id: 'cant_follow', name: "Can't follow lessons", nameZh: '听不进去课' },
      { id: 'test_anxiety', name: 'Test anxiety', nameZh: '考试就紧张' },
    ]
  },
  {
    id: 'social',
    name: 'Social',
    nameZh: '社交',
    color: '#98D4C8',
    subItems: [
      { id: 'no_friends', name: 'No friends', nameZh: '没朋友' },
      { id: 'fights', name: 'Gets into conflicts', nameZh: '老起冲突' },
      { id: 'misreads_cues', name: 'Misreads social cues', nameZh: '读不懂脸色' },
      { id: 'teacher_complaints', name: 'Teacher complaints', nameZh: '老师常投诉' },
      { id: 'bullied', name: 'Gets bullied', nameZh: '被欺负孤立' },
      { id: 'plays_rough', name: 'Plays too rough', nameZh: '玩着就过火' },
    ]
  },
  {
    id: 'daily',
    name: 'Daily Life',
    nameZh: '生活',
    color: '#98C4E8',
    subItems: [
      { id: 'sleep', name: 'Sleep issues', nameZh: '晚不睡早不起' },
      { id: 'eating', name: 'Picky eating', nameZh: '吃饭难伺候' },
      { id: 'screen', name: 'Screen addiction', nameZh: '离不开手机' },
      { id: 'messy_room', name: 'Messy room', nameZh: '房间太乱' },
      { id: 'morning_routine', name: 'Slow mornings', nameZh: '早上出门慢' },
      { id: 'hygiene', name: 'Hygiene battles', nameZh: '催很多遍' },
    ]
  },
  {
    id: 'parent',
    name: 'Parent Stress',
    nameZh: '家长状态',
    color: '#E0A8C0',
    subItems: [
      { id: 'angry', name: 'Losing my temper', nameZh: '忍不住发火' },
      { id: 'exhausted', name: 'Exhausted', nameZh: '身心俱疲' },
      { id: 'guilty', name: 'Feeling guilty', nameZh: '觉得是我的错' },
      { id: 'couple', name: 'Partner disagreements', nameZh: '因孩子吵架' },
      { id: 'alone', name: 'Feeling alone', nameZh: '没人理解' },
      { id: 'hopeless', name: 'Feeling hopeless', nameZh: '看不到希望' },
    ]
  },
  {
    id: 'medication',
    name: 'Diagnosis',
    nameZh: '诊断用药',
    color: '#D4A8E0',
    subItems: [
      { id: 'unsure_adhd', name: 'Unsure if ADHD', nameZh: '不确定是不是' },
      { id: 'considering', name: 'Considering medication', nameZh: '犹豫要不要用药' },
      { id: 'on_meds', name: 'Currently on medication', nameZh: '正在吃药' },
      { id: 'side_effects', name: 'Worried about side effects', nameZh: '担心副作用' },
      { id: 'other_treatment', name: 'Looking for alternatives', nameZh: '想试其他方法' },
    ]
  },
  {
    id: 'motor',
    name: 'Motor Skills',
    nameZh: '运动',
    color: '#A8D8B8',
    subItems: [
      { id: 'clumsy', name: 'Clumsy movements', nameZh: '动作笨拙爱摔' },
      { id: 'ball_sports', name: 'Struggles with sports', nameZh: '球类运动困难' },
      { id: 'fine_motor', name: 'Poor fine motor skills', nameZh: '手指不灵活' },
      { id: 'handwriting', name: 'Writing difficulties', nameZh: '书写困难' },
      { id: 'avoids_sports', name: 'Avoids PE class', nameZh: '逃避体育课' },
    ]
  }
];

// 问题模板
const QUESTION_TEMPLATES: Record<string, string[]> = {
  tantrums: ['How can I calm my child during a tantrum?', 'How to prevent frequent tantrums?'],
  mood_swings: ['Is it normal for my child to have rapid mood swings?', 'How to help stabilize emotions?'],
  meltdown: ['How to help when my child melts down from frustration?', 'How to build resilience?'],
  sensitive: ['How to communicate with an overly sensitive child?', 'Why does my child overreact?'],
  anxiety: ['How to help my anxious child?', 'What causes anxiety in ADHD children?'],
  low_self_esteem: ['How to build my child\'s confidence?', 'Why does my child say they can\'t do anything?'],
  distracted: ['How to help my easily distracted child?', 'Tips to improve focus?'],
  cant_start: ['How to help my child start tasks?', 'Why does my child procrastinate?'],
  short_focus: ['How to extend my child\'s attention span?', 'Is short focus normal for ADHD?'],
  forgetful: ['How to help my forgetful child remember things?', 'Memory strategies for ADHD kids?'],
  no_time_sense: ['How to teach time management?', 'Why does my child have no sense of time?'],
  loses_things: ['How to help my child stop losing things?', 'Organization tips for ADHD kids?'],
  interrupting: ['How to teach my child not to interrupt?', 'Why does my child interrupt so much?'],
  blurting: ['How to help my child think before speaking?', 'Is blurting out an ADHD symptom?'],
  cant_wait: ['How to teach patience?', 'Why can\'t my child wait?'],
  fidgety: ['How to help my fidgety child?', 'Is it okay if my child can\'t sit still?'],
  hands_on: ['How to stop physical aggression?', 'Why does my child get physical?'],
  no_rules: ['How to help my child follow rules?', 'Why does my child break rules?'],
  homework_battle: ['How to make homework less of a battle?', 'Tips for homework time?'],
  reading_hard: ['How to help with reading comprehension?', 'Why does my child struggle with reading?'],
  writing_messy: ['How to improve handwriting?', 'Is messy writing an ADHD thing?'],
  hates_school: ['How to help a child who hates school?', 'Why does my child refuse to go to school?'],
  cant_follow: ['How to help my child pay attention in class?', 'Should I talk to the teacher?'],
  test_anxiety: ['How to reduce test anxiety?', 'Tips for exam preparation?'],
  no_friends: ['How to help my child make friends?', 'Why does my child have no friends?'],
  fights: ['How to reduce conflicts with peers?', 'Why does my child fight so much?'],
  misreads_cues: ['How to teach social cues?', 'Why does my child misread situations?'],
  teacher_complaints: ['How to handle teacher complaints?', 'Should I advocate for my child?'],
  bullied: ['How to help a bullied child?', 'How to talk to school about bullying?'],
  plays_rough: ['How to teach gentle play?', 'Why does my child play too rough?'],
  sleep: ['How to establish a bedtime routine?', 'Why does my ADHD child struggle with sleep?'],
  eating: ['How to deal with picky eating?', 'Is picky eating related to ADHD?'],
  screen: ['How to manage screen time?', 'Why is my child addicted to screens?'],
  messy_room: ['How to teach organization?', 'Tips for keeping a tidy room?'],
  morning_routine: ['How to speed up mornings?', 'Morning routine tips for ADHD kids?'],
  hygiene: ['How to establish hygiene habits?', 'Why do I have to remind so many times?'],
  angry: ['How to control my own anger?', 'Tips for staying calm while parenting?'],
  exhausted: ['How to avoid parent burnout?', 'Self-care tips for ADHD parents?'],
  guilty: ['How to stop feeling guilty?', 'Is it my fault my child has ADHD?'],
  couple: ['How to get on the same page with my partner?', 'Parenting disagreements about ADHD?'],
  alone: ['Where can I find support?', 'How to connect with other ADHD parents?'],
  hopeless: ['How to stay hopeful?', 'Does it get better?'],
  unsure_adhd: ['How do I know if my child has ADHD?', 'Should I get my child evaluated?'],
  considering: ['What are the pros and cons of ADHD medication?', 'Is medication right for my child?'],
  on_meds: ['What should I watch for while on medication?', 'How to support medication treatment?'],
  side_effects: ['What are common medication side effects?', 'How to manage side effects?'],
  other_treatment: ['What are alternatives to medication?', 'Does therapy help ADHD?'],
  clumsy: ['How to help a clumsy child?', 'Is clumsiness related to ADHD?'],
  ball_sports: ['How to help with sports coordination?', 'Should I push sports or not?'],
  fine_motor: ['How to improve fine motor skills?', 'Activities for finger dexterity?'],
  handwriting: ['How to make writing easier?', 'Should I be concerned about handwriting?'],
  avoids_sports: ['How to encourage physical activity?', 'Why does my child avoid PE?'],
};

interface SelectedChallenge {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
}

interface GuestOnboardingProps {
  onComplete: (data: {
    childBirthday: { year: number; month: number };
    challenges: SelectedChallenge[];
    firstQuestion: string;
  }) => void;
}

export default function GuestOnboarding({ onComplete }: GuestOnboardingProps) {
  const [currentStep, setCurrentStep] = useState(1);

  // 步骤1：出生日期
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  // 步骤2：挑战选择
  const [selectedChallenges, setSelectedChallenges] = useState<SelectedChallenge[]>([]);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  // 步骤3：问题选择
  const [selectedQuestion, setSelectedQuestion] = useState<string>('');
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<string[]>([]);

  // 生成年份范围（当前年份往前推18年）
  const yearRange = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years: number[] = [];
    for (let y = currentYear; y >= currentYear - 18; y--) {
      years.push(y);
    }
    return years;
  }, []);

  const monthRange = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  // 计算孩子年龄
  const childAge = useMemo(() => {
    if (!selectedYear || !selectedMonth) return null;
    const today = new Date();
    const birthDate = new Date(selectedYear, selectedMonth - 1);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0) age--;
    return age;
  }, [selectedYear, selectedMonth]);

  // 步骤1验证
  const canContinueStep1 = selectedYear !== null && selectedMonth !== null;

  // 步骤2验证
  const canContinueStep2 = selectedChallenges.length > 0;

  // 步骤3验证
  const canFinish = selectedQuestion !== '';

  // 切换挑战选择
  const toggleChallenge = (challenge: { id: string; name: string }, category: { id: string; name: string }) => {
    setSelectedChallenges(prev => {
      const exists = prev.find(c => c.id === challenge.id);
      if (exists) {
        return prev.filter(c => c.id !== challenge.id);
      } else {
        return [...prev, {
          id: challenge.id,
          name: challenge.name,
          categoryId: category.id,
          categoryName: category.name
        }];
      }
    });
  };

  // 移除已选挑战
  const removeChallenge = (id: string) => {
    setSelectedChallenges(prev => prev.filter(c => c.id !== id));
  };

  // 检查分类是否有已选项
  const categoryHasSelection = (categoryId: string) => {
    return selectedChallenges.some(c => c.categoryId === categoryId);
  };

  // 进入步骤2
  const goToStep2 = () => {
    if (canContinueStep1) {
      setCurrentStep(2);
    }
  };

  // 进入步骤3
  const goToStep3 = () => {
    if (canContinueStep2) {
      setCurrentStep(3);
      setIsLoadingQuestions(true);

      // 生成问题
      setTimeout(() => {
        const allQuestions: string[] = [];
        selectedChallenges.forEach(challenge => {
          const questions = QUESTION_TEMPLATES[challenge.id] || [];
          questions.forEach(q => {
            if (!allQuestions.includes(q)) {
              allQuestions.push(q);
            }
          });
        });

        // 随机选择3个问题
        const shuffled = allQuestions.sort(() => 0.5 - Math.random());
        setGeneratedQuestions(shuffled.slice(0, 3));
        setIsLoadingQuestions(false);
      }, 1000);
    }
  };

  // 完成引导
  const handleFinish = () => {
    if (canFinish && selectedYear && selectedMonth) {
      onComplete({
        childBirthday: { year: selectedYear, month: selectedMonth },
        challenges: selectedChallenges,
        firstQuestion: selectedQuestion
      });
    }
  };

  // 进度条
  const progress = (currentStep / 3) * 100;

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50">
      {/* 进度条 */}
      <div className="h-1 bg-slate-200">
        <div
          className="h-full bg-gradient-to-r from-primary-teal to-primary-purple transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* 步骤1：出生日期选择 */}
      {currentStep === 1 && (
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
          <div className="w-full max-w-md">
            {/* 头部 - 移除中间logo */}
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-slate-900 mb-2">
                When was your child born?
              </h1>
              <p className="text-slate-500">
                We&apos;ll personalize advice based on their age
              </p>
            </div>

            {/* 日期选择 */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-6">
              <div className="flex gap-4">
                {/* 年份选择 */}
                <div className="flex-1 relative">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Year</label>
                  <button
                    onClick={() => { setShowYearPicker(!showYearPicker); setShowMonthPicker(false); }}
                    className={`w-full h-12 rounded-xl border-2 flex items-center justify-between px-4 transition-all ${
                      selectedYear
                        ? 'border-primary-purple bg-primary-purple/5 text-slate-900'
                        : 'border-slate-200 text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    <span>{selectedYear || 'Year'}</span>
                    <ChevronDown size={18} className={`transition-transform ${showYearPicker ? 'rotate-180' : ''}`} />
                  </button>

                  {showYearPicker && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-slate-100 max-h-48 overflow-y-auto z-10">
                      {yearRange.map(year => (
                        <button
                          key={year}
                          onClick={() => { setSelectedYear(year); setShowYearPicker(false); }}
                          className={`w-full px-4 py-2 text-left hover:bg-slate-50 ${
                            selectedYear === year ? 'bg-primary-purple/10 text-primary-purple font-medium' : ''
                          }`}
                        >
                          {year}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* 月份选择 */}
                <div className="flex-1 relative">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Month</label>
                  <button
                    onClick={() => { setShowMonthPicker(!showMonthPicker); setShowYearPicker(false); }}
                    className={`w-full h-12 rounded-xl border-2 flex items-center justify-between px-4 transition-all ${
                      selectedMonth
                        ? 'border-primary-purple bg-primary-purple/5 text-slate-900'
                        : 'border-slate-200 text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    <span>{selectedMonth || 'Month'}</span>
                    <ChevronDown size={18} className={`transition-transform ${showMonthPicker ? 'rotate-180' : ''}`} />
                  </button>

                  {showMonthPicker && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-slate-100 max-h-48 overflow-y-auto z-10">
                      {monthRange.map(month => (
                        <button
                          key={month}
                          onClick={() => { setSelectedMonth(month); setShowMonthPicker(false); }}
                          className={`w-full px-4 py-2 text-left hover:bg-slate-50 ${
                            selectedMonth === month ? 'bg-primary-purple/10 text-primary-purple font-medium' : ''
                          }`}
                        >
                          {month}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 年龄显示 */}
              {childAge !== null && (
                <div className="mt-4 text-center text-sm text-slate-500">
                  Your child is <span className="font-semibold text-primary-purple">{childAge} years old</span>
                </div>
              )}
            </div>

            {/* 继续按钮 - 渐变边框+渐变文字样式 */}
            <button
              onClick={goToStep2}
              disabled={!canContinueStep1}
              className={`w-full py-3.5 rounded-full font-bold flex items-center justify-center gap-2 transition-all ${
                canContinueStep1
                  ? 'hover:shadow-lg active:scale-[0.98]'
                  : 'opacity-40 cursor-not-allowed'
              }`}
              style={canContinueStep1 ? {
                background: 'white',
                border: '2px solid transparent',
                backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #00D4AA 0%, #8B5CF6 100%)',
                backgroundOrigin: 'border-box',
                backgroundClip: 'padding-box, border-box',
              } : {
                background: '#f1f5f9',
                border: '2px solid #e2e8f0',
              }}
            >
              <span className={canContinueStep1 ? 'bg-gradient-to-r from-primary-teal to-primary-purple bg-clip-text text-transparent' : 'text-slate-400'}>
                Continue
              </span>
              <ChevronRight size={18} className={canContinueStep1 ? 'text-primary-purple' : 'text-slate-400'} />
            </button>

            <p className="text-center text-xs text-slate-400 mt-4">
              Step 1 of 3
            </p>
          </div>
        </div>
      )}

      {/* 步骤2：挑战选择 - 悬浮气泡 */}
      {currentStep === 2 && (
        <div className="flex-1 flex flex-col relative overflow-hidden">
          {/* 头部 */}
          <div className="px-4 pt-6 pb-2 z-10">
            {/* Back 和 Next 按钮在同一行 - 渐变边框样式 */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setCurrentStep(1)}
                className="flex items-center gap-1 px-4 py-2 rounded-full text-sm font-semibold transition-all hover:shadow-md active:scale-[0.98]"
                style={{
                  background: 'white',
                  border: '2px solid transparent',
                  backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #00D4AA 0%, #8B5CF6 100%)',
                  backgroundOrigin: 'border-box',
                  backgroundClip: 'padding-box, border-box',
                }}
              >
                <ChevronLeft size={18} className="text-primary-teal" />
                <span className="bg-gradient-to-r from-primary-teal to-primary-purple bg-clip-text text-transparent">Back</span>
              </button>
              <button
                onClick={goToStep3}
                disabled={!canContinueStep2}
                className={`flex items-center gap-1 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                  canContinueStep2
                    ? 'hover:shadow-md active:scale-[0.98]'
                    : 'opacity-40 cursor-not-allowed'
                }`}
                style={canContinueStep2 ? {
                  background: 'white',
                  border: '2px solid transparent',
                  backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #00D4AA 0%, #8B5CF6 100%)',
                  backgroundOrigin: 'border-box',
                  backgroundClip: 'padding-box, border-box',
                } : {
                  background: '#f1f5f9',
                  border: '2px solid #e2e8f0',
                }}
              >
                <span className={canContinueStep2 ? 'bg-gradient-to-r from-primary-teal to-primary-purple bg-clip-text text-transparent' : 'text-slate-400'}>Next</span>
                <ChevronRight size={18} className={canContinueStep2 ? 'text-primary-purple' : 'text-slate-400'} />
              </button>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-1 text-center">
              What challenges are you facing?
            </h1>
            <p className="text-slate-500 text-center">
              Tap bubbles to select (multiple allowed)
            </p>
          </div>

          {/* 悬浮气泡容器 - 限制最大宽度让气泡更紧凑 */}
          <div className="flex-1 relative max-w-2xl mx-auto w-full">
            <style jsx>{`
              @keyframes float-1 {
                0%, 100% { transform: translate(0, 0); }
                25% { transform: translate(5px, -8px); }
                50% { transform: translate(-3px, -12px); }
                75% { transform: translate(-8px, -5px); }
              }
              @keyframes float-2 {
                0%, 100% { transform: translate(0, 0); }
                25% { transform: translate(-6px, -10px); }
                50% { transform: translate(4px, -6px); }
                75% { transform: translate(8px, -12px); }
              }
              @keyframes float-3 {
                0%, 100% { transform: translate(0, 0); }
                25% { transform: translate(8px, -5px); }
                50% { transform: translate(-5px, -10px); }
                75% { transform: translate(3px, -8px); }
              }
              .bubble {
                position: absolute;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: transform 0.3s ease, box-shadow 0.3s ease, font-size 0.3s ease;
                box-shadow: 0 8px 24px rgba(0,0,0,0.12);
                /* 自适应尺寸 */
                width: clamp(85px, 14vw, 130px);
                height: clamp(85px, 14vw, 130px);
              }
              .bubble:hover {
                transform: scale(1.1);
              }
              /* 选中状态：放大（荧光在inline style中设置） */
              .bubble.has-selection {
                transform: scale(1.15);
                z-index: 10;
              }
              .bubble.has-selection span {
                font-size: clamp(13px, 1.5vw, 16px) !important;
                font-weight: 700;
              }
              .bubble-float-1 { animation: float-1 8s ease-in-out infinite; }
              .bubble-float-2 { animation: float-2 9s ease-in-out infinite; }
              .bubble-float-3 { animation: float-3 10s ease-in-out infinite; }
            `}</style>

            {CATEGORIES.map((category, index) => {
              const pos = BUBBLE_POSITIONS[index];
              const hasSelection = categoryHasSelection(category.id);
              const floatClass = `bubble-float-${(index % 3) + 1}`;

              return (
                <div
                  key={category.id}
                  onClick={() => setExpandedCategory(category.id)}
                  className={`bubble ${floatClass} ${hasSelection ? 'has-selection' : ''}`}
                  style={{
                    left: `${pos.x}%`,
                    top: `${pos.y}%`,
                    backgroundColor: category.color,
                    animationDelay: `${pos.delay}s`,
                    boxShadow: hasSelection
                      ? `0 0 25px ${category.color}, 0 0 50px ${category.color}, 0 0 80px ${category.color}`
                      : '0 8px 24px rgba(0,0,0,0.12)',
                  }}
                >
                  <span className="text-white font-semibold text-center px-1 drop-shadow-sm" style={{ fontSize: 'clamp(11px, 1.2vw, 14px)' }}>
                    {category.name}
                  </span>
                </div>
              );
            })}
          </div>

          {/* 底部已选标签 */}
          {selectedChallenges.length > 0 && (
            <div className="absolute bottom-4 left-4 right-20 z-10">
              <div className="overflow-x-auto">
                <div className="flex gap-2 whitespace-nowrap">
                  {selectedChallenges.map(challenge => (
                    <span
                      key={challenge.id}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-sm text-primary-purple text-sm shrink-0 shadow-lg"
                    >
                      {challenge.name}
                      <button
                        onClick={(e) => { e.stopPropagation(); removeChallenge(challenge.id); }}
                        className="hover:bg-primary-purple/20 rounded-full w-4 h-4 flex items-center justify-center text-xs"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Zoom 弹层 - 选择子项（深色半透明背景） */}
          {expandedCategory && (
            <div className="absolute inset-0 bg-slate-900/70 z-20 flex flex-col animate-fadeIn">
              <style jsx>{`
                @keyframes fadeIn {
                  from { opacity: 0; }
                  to { opacity: 1; }
                }
                .animate-fadeIn {
                  animation: fadeIn 0.2s ease-out;
                }
                .sub-bubble {
                  position: absolute;
                  border-radius: 50%;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  cursor: pointer;
                  transition: transform 0.3s ease, box-shadow 0.3s ease;
                  box-shadow: 0 8px 24px rgba(0,0,0,0.15);
                  /* 自适应尺寸 */
                  width: clamp(100px, 16vw, 140px);
                  height: clamp(100px, 16vw, 140px);
                }
                .sub-bubble:hover {
                  transform: scale(1.08);
                }
                /* 选中状态：放大（荧光在inline style中设置） */
                .sub-bubble.selected {
                  transform: scale(1.15);
                  z-index: 10;
                }
                .sub-bubble.selected span {
                  font-size: clamp(12px, 1.3vw, 15px) !important;
                  font-weight: 700;
                }
              `}</style>

              {/* 弹层头部 */}
              <div className="px-4 pt-4 pb-2">
                {/* Back 和 Done 按钮在同一行 - 渐变边框样式 */}
                <div className="flex items-center justify-between mb-2">
                  <button
                    onClick={() => setExpandedCategory(null)}
                    className="flex items-center gap-1 px-4 py-2 rounded-full text-sm font-semibold transition-all hover:shadow-md active:scale-[0.98]"
                    style={{
                      background: 'white',
                      border: '2px solid transparent',
                      backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #00D4AA 0%, #8B5CF6 100%)',
                      backgroundOrigin: 'border-box',
                      backgroundClip: 'padding-box, border-box',
                    }}
                  >
                    <ArrowLeft size={18} className="text-primary-teal" />
                    <span className="bg-gradient-to-r from-primary-teal to-primary-purple bg-clip-text text-transparent">Back</span>
                  </button>
                  <button
                    onClick={() => setExpandedCategory(null)}
                    className="flex items-center gap-1 px-4 py-2 rounded-full text-sm font-semibold transition-all hover:shadow-md active:scale-[0.98]"
                    style={{
                      background: 'white',
                      border: '2px solid transparent',
                      backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #00D4AA 0%, #8B5CF6 100%)',
                      backgroundOrigin: 'border-box',
                      backgroundClip: 'padding-box, border-box',
                    }}
                  >
                    <span className="bg-gradient-to-r from-primary-teal to-primary-purple bg-clip-text text-transparent">Done</span>
                    <ChevronRight size={18} className="text-primary-purple" />
                  </button>
                </div>
                <h2 className="text-xl font-bold text-white text-center">
                  {CATEGORIES.find(c => c.id === expandedCategory)?.name}
                </h2>
                <p className="text-white/70 text-center text-sm">
                  Select specific challenges
                </p>
              </div>

              {/* 子气泡区域 - 限制最大宽度 */}
              <div className="flex-1 relative max-w-xl mx-auto w-full">
                {CATEGORIES.find(c => c.id === expandedCategory)?.subItems.map((item, index) => {
                  const pos = SUB_BUBBLE_POSITIONS[index % SUB_BUBBLE_POSITIONS.length];
                  const isSelected = selectedChallenges.some(c => c.id === item.id);
                  const category = CATEGORIES.find(c => c.id === expandedCategory)!;

                  return (
                    <div
                      key={item.id}
                      onClick={() => toggleChallenge(item, category)}
                      className={`sub-bubble bubble-float-${(index % 3) + 1} ${isSelected ? 'selected' : ''}`}
                      style={{
                        left: `${pos.x}%`,
                        top: `${pos.y}%`,
                        backgroundColor: category.color,
                        animationDelay: `${index * 0.15}s`,
                        boxShadow: isSelected
                          ? `0 0 25px ${category.color}, 0 0 50px ${category.color}, 0 0 80px ${category.color}`
                          : '0 8px 24px rgba(0,0,0,0.15)',
                      }}
                    >
                      <span className="text-white font-medium text-center px-2 leading-tight drop-shadow-sm" style={{ fontSize: 'clamp(11px, 1.2vw, 14px)' }}>
                        {item.name}
                      </span>
                    </div>
                  );
                })}
              </div>

            </div>
          )}
        </div>
      )}

      {/* 步骤3：问题选择 */}
      {currentStep === 3 && (
        <div className="flex-1 flex flex-col">
          {/* 头部 - 移除logo */}
          <div className="px-4 pt-6 pb-4">
            <button
              onClick={() => setCurrentStep(2)}
              className="flex items-center gap-1 px-4 py-2 rounded-full text-sm font-semibold transition-all hover:shadow-md active:scale-[0.98] mb-4"
              style={{
                background: 'white',
                border: '2px solid transparent',
                backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #00D4AA 0%, #8B5CF6 100%)',
                backgroundOrigin: 'border-box',
                backgroundClip: 'padding-box, border-box',
              }}
            >
              <ChevronLeft size={18} className="text-primary-teal" />
              <span className="bg-gradient-to-r from-primary-teal to-primary-purple bg-clip-text text-transparent">Back</span>
            </button>
            <h1 className="text-2xl font-bold text-slate-900 mb-1 text-center">
              Let&apos;s start chatting
            </h1>
            <p className="text-slate-500 text-center">
              Pick a question to begin your first conversation
            </p>
          </div>

          {/* 已选挑战 */}
          <div className="px-4 mb-4">
            <div className="bg-slate-50 rounded-xl p-3">
              <div className="text-xs text-slate-500 mb-2">Selected challenges:</div>
              <div className="flex flex-wrap gap-1">
                {selectedChallenges.map(c => (
                  <span key={c.id} className="px-2 py-1 bg-white rounded-lg text-xs text-slate-700">
                    {c.name}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* 问题列表 */}
          <div className="flex-1 overflow-y-auto px-4">
            {isLoadingQuestions ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="flex gap-1 mb-2">
                  <div className="w-2 h-2 bg-primary-purple rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-primary-purple rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-primary-purple rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <p className="text-slate-500">Generating questions...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {generatedQuestions.map((question, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedQuestion(question)}
                    className={`w-full p-4 rounded-xl text-left transition-all ${
                      selectedQuestion === question
                        ? 'bg-gradient-to-r from-primary-teal/10 to-primary-purple/10 border-2 border-primary-purple shadow-md'
                        : 'bg-white border-2 border-slate-100 hover:border-slate-200'
                    }`}
                  >
                    <p className={`${selectedQuestion === question ? 'text-slate-900 font-medium' : 'text-slate-700'}`}>
                      {question}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 开始按钮 - 渐变边框+渐变文字样式 */}
          <div className="border-t border-slate-100 bg-white px-4 py-4">
            <button
              onClick={handleFinish}
              disabled={!canFinish}
              className={`w-full py-3.5 rounded-full font-bold flex items-center justify-center gap-2 transition-all ${
                canFinish
                  ? 'hover:shadow-lg active:scale-[0.98]'
                  : 'opacity-40 cursor-not-allowed'
              }`}
              style={canFinish ? {
                background: 'white',
                border: '2px solid transparent',
                backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #00D4AA 0%, #8B5CF6 100%)',
                backgroundOrigin: 'border-box',
                backgroundClip: 'padding-box, border-box',
              } : {
                background: '#f1f5f9',
                border: '2px solid #e2e8f0',
              }}
            >
              <span className={canFinish ? 'bg-gradient-to-r from-primary-teal to-primary-purple bg-clip-text text-transparent' : 'text-slate-400'}>
                Start Chatting
              </span>
              <ChevronRight size={18} className={canFinish ? 'text-primary-purple' : 'text-slate-400'} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
