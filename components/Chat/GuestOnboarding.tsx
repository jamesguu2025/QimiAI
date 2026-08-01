/**
 * GuestOnboarding - 访客引导组件
 *
 * 对齐小程序设计：3步引导流程
 * 步骤1：孩子出生日期（年份+月份）
 * 步骤2：挑战选择（漂浮气泡动画）
 * 步骤3：问题选择（根据挑战生成）
 */

import { useEffect, useRef, useState, useMemo } from 'react';
import { ChevronRight, ChevronLeft, ChevronDown, ArrowLeft } from 'lucide-react';
import { trackClientEvent } from '@/lib/client-analytics';

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
export const ONBOARDING_CATEGORIES = [
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
      { id: 'side_effects', name: 'Worried about ADHD medication side effects', nameZh: '担心ADHD药物副作用' },
      { id: 'other_treatment', name: 'Looking for alternatives to ADHD medication', nameZh: '想找ADHD用药替代方案' },
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
  tantrums: ['What should I do in the moment when my child has a huge tantrum?', 'How can I reduce the daily triggers behind my child\'s tantrums?'],
  mood_swings: ['Why does my child go from happy to explosive so fast?', 'How can I help my child regulate big mood swings without constant battles?'],
  meltdown: ['What helps when my child completely falls apart after frustration?', 'How can I stop small frustrations from turning into full meltdowns?'],
  sensitive: ['How can I correct my child without everything becoming a meltdown?', 'Why does my child react so strongly to small comments or setbacks?'],
  anxiety: ['How can I help an ADHD child who is anxious about school, mistakes, or new situations?', 'When is my child\'s anxiety serious enough that I should get extra help?'],
  low_self_esteem: ['How do I help my child who keeps saying “I can\'t do it” or “I\'m bad”?', 'How can I build confidence when my child is used to feeling behind or in trouble?'],
  distracted: ['How do I get my child to stay with one task without 20 reminders?', 'What actually helps an easily distracted child focus at home or school?'],
  cant_start: ['Why does my child freeze or avoid starting even simple tasks?', 'How can I help my child start homework or routines without a daily fight?'],
  short_focus: ['How can I help my child stay with homework, reading, or chores for longer?', 'What should I expect from an ADHD child\'s attention span by age?'],
  forgetful: ['How do I stop being my child\'s external memory for every little thing?', 'What systems actually help ADHD kids remember homework, directions, and daily tasks?'],
  no_time_sense: ['How can I teach my child time without nagging every five minutes?', 'Why is my child always shocked that time is up or we are late again?'],
  loses_things: ['How do I help my child stop losing jackets, water bottles, and school papers?', 'What simple organization system can an ADHD child actually keep using?'],
  interrupting: ['How do I teach my child to stop interrupting without shaming them?', 'What can I say when my child cuts people off constantly in conversations?'],
  blurting: ['How can I help my child pause before speaking or shouting things out?', 'How do I handle blurting at school without making my child feel like the “bad kid”?'],
  cant_wait: ['How do I help my child handle waiting without whining, grabbing, or exploding?', 'What can I practice with my child who cannot tolerate waiting their turn?'],
  fidgety: ['How can I help my child who cannot sit still during meals, class, or homework?', 'When is “can\'t sit still” just ADHD energy, and when should I worry more?'],
  hands_on: ['How do I respond when my child gets physical during anger or conflict?', 'How can I reduce hitting, pushing, or rough behavior before it escalates?'],
  no_rules: ['How do I handle a child who seems to break every rule unless I am right there?', 'What consequences actually work when ADHD makes rule-following hard?'],
  homework_battle: ['How can I make homework less miserable for both of us?', 'What do I do when every homework session turns into stalling, arguing, or tears?'],
  reading_hard: ['How do I tell whether my child\'s reading struggle is attention, comprehension, or something else?', 'What can I do when my child avoids reading because it feels so hard?'],
  writing_messy: ['How can I help when my child knows the answer but written work comes out messy and frustrating?', 'Is messy handwriting more about ADHD, fine motor skills, or both?'],
  hates_school: ['What do I do when my child dreads school every morning?', 'How can I help if school has become a place where my child only feels failure or criticism?'],
  cant_follow: ['How can I help my child keep up when they miss directions in class?', 'How should I talk to the teacher if my child seems lost most of the school day?'],
  test_anxiety: ['How do I help my child who blanks out or panics during tests?', 'What support should I ask for if test anxiety is hurting my child\'s performance?'],
  no_friends: ['How can I help my child make friends without forcing awkward playdates?', 'What do I do when my child feels left out and says nobody likes them?'],
  fights: ['Why does my child end up in conflicts so quickly with other kids?', 'How can I help my child stop turning frustration into fights with peers or siblings?'],
  misreads_cues: ['How do I teach my child to notice when other kids are annoyed, bored, or joking?', 'What helps an ADHD child who keeps misreading social situations?'],
  teacher_complaints: ['How should I respond when the teacher keeps messaging about behavior problems?', 'How do I work with school when my child is always the one getting blamed?'],
  bullied: ['How can I support my child if they are being bullied or singled out at school?', 'What should I say to the school when my child is being targeted by peers?'],
  plays_rough: ['How do I help my child stop getting too rough during play?', 'What can I teach when my child thinks they are playing normally but other kids get upset?'],
  sleep: ['How do I get an ADHD child to settle at night without a two-hour bedtime battle?', 'Why is my child still wired when everyone else is ready for sleep?'],
  eating: ['How do I handle picky eating without every meal turning into a power struggle?', 'Is my child\'s eating issue sensory, appetite-related, or ADHD-related?'],
  screen: ['How do I reduce screen time without triggering a huge explosion?', 'Why does my child seem able to focus on screens but not on anything else?'],
  messy_room: ['How do I help my child keep a room or backpack manageable instead of constantly overwhelmed?', 'What organizing routines actually work for ADHD kids who hate cleanup?'],
  morning_routine: ['How do I get out the door on time without yelling every morning?', 'What morning routine works for an ADHD child who moves slowly and gets distracted?'],
  hygiene: ['How do I stop brushing teeth, bathing, and basic hygiene from becoming daily battles?', 'Why do I have to remind my child about every hygiene step every single day?'],
  angry: ['How do I stay calm when I am already triggered and my child is spiraling?', 'What can I do when parenting this every day is turning me into the parent I do not want to be?'],
  exhausted: ['How do I keep going when parenting my child feels nonstop and draining?', 'What does ADHD parent burnout actually look like, and how do I recover from it?'],
  guilty: ['How do I stop feeling like everything wrong with my child is somehow my fault?', 'How can I carry less guilt when I know I am trying hard and still struggling?'],
  couple: ['How do my partner and I stop fighting about how to handle our child?', 'What helps when one parent is stricter and the other thinks the child needs more support?'],
  alone: ['Where can I find support when nobody around me seems to get what this is like?', 'How do I stop feeling so alone in raising an ADHD child?'],
  hopeless: ['How do I hold on to hope when nothing we try seems to work?', 'Does life with an ADHD child actually get easier, or am I always going to feel underwater?'],
  unsure_adhd: ['How can I tell whether this is really ADHD or something else?', 'What signs mean it is time to get my child evaluated for ADHD?'],
  considering: ['How do I decide whether ADHD medication is worth trying for my child?', 'What questions should I ask before starting ADHD medication?'],
  on_meds: ['What should I watch for after my child starts ADHD medication?', 'How do I know whether ADHD medication is truly helping or just changing my child?'],
  side_effects: ['What ADHD medication side effects should I actually watch for day to day?', 'What should I do if ADHD medication seems to be affecting sleep, appetite, or mood?'],
  other_treatment: ['What are realistic alternatives to ADHD medication if we are not ready to use it?', 'Besides ADHD medication, what treatments actually help with focus, behavior, and daily functioning?'],
  clumsy: ['How can I help my child who seems clumsy, awkward, or always bumping into things?', 'Is clumsiness in my child something to work on, worry about, or both?'],
  ball_sports: ['How do I help my child who struggles with coordination in sports and keeps getting discouraged?', 'Should I keep pushing team sports if my child is always behind and frustrated?'],
  fine_motor: ['What can I do when weak fine motor skills are making school tasks harder for my child?', 'What activities really help with scissors, buttons, pencil control, and hand strength?'],
  handwriting: ['How can I make writing less painful for a child who struggles to get words onto paper?', 'When should I look into extra support for handwriting and written output?'],
  avoids_sports: ['How do I help my child who avoids PE because they feel embarrassed or left behind?', 'How can I build movement confidence when sports have become a source of shame?'],
};

export interface SelectedChallenge {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
}

export interface OnboardingInitialData {
  childName?: string;
  childBirthday?: { year?: number; month?: number };
  gender?: 'boy' | 'girl' | 'other';
  challenges?: SelectedChallenge[];
}

interface GuestOnboardingProps {
  onComplete: (data: {
    childName: string;
    childBirthday: { year: number; month: number };
    gender: 'boy' | 'girl' | 'other';
    challenges: SelectedChallenge[];
    firstQuestion: string;
  }) => void;
  onLogin?: () => void;
  initialData?: OnboardingInitialData;
  includeFirstQuestion?: boolean;
  analyticsMode?: 'guest' | 'registered';
}

export default function GuestOnboarding({
  onComplete,
  onLogin,
  initialData,
  includeFirstQuestion = true,
  analyticsMode = 'guest',
}: GuestOnboardingProps) {
  const [currentStep, setCurrentStep] = useState(1);

  // 步骤1：孩子基本信息
  const [childName, setChildName] = useState(initialData?.childName || '');
  const [selectedGender, setSelectedGender] = useState<'boy' | 'girl' | 'other' | null>(initialData?.gender || null);
  const [selectedYear, setSelectedYear] = useState<number | null>(initialData?.childBirthday?.year || null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(initialData?.childBirthday?.month || null);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  // 步骤2：挑战选择
  const [selectedChallenges, setSelectedChallenges] = useState<SelectedChallenge[]>(initialData?.challenges || []);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  // 步骤3：问题选择
  const [selectedQuestion, setSelectedQuestion] = useState<string>('');
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<string[]>([]);
  const [stepStartedAt, setStepStartedAt] = useState(Date.now());
  const dropoffStateRef = useRef({
    currentStep: 1,
    stepKey: 'child_info',
    stepStartedAt: Date.now(),
    isValid: false,
  });
  const completedRef = useRef(false);

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
  const canContinueStep1 = childName.trim().length > 0 && selectedGender !== null && selectedYear !== null && selectedMonth !== null;

  // 步骤2验证
  const canContinueStep2 = selectedChallenges.length > 0;

  // 步骤3验证
  const canFinish = selectedQuestion !== '';

  const stepKey = currentStep === 1 ? 'child_info' : currentStep === 2 ? 'challenges' : 'first_question';
  const currentStepIsValid = currentStep === 1 ? canContinueStep1 : currentStep === 2 ? canContinueStep2 : canFinish;

  dropoffStateRef.current = {
    currentStep,
    stepKey,
    stepStartedAt,
    isValid: currentStepIsValid,
  };

  const trackStepComplete = (stepNumber: number, completedStepKey: string, selectedCount?: number) => {
    trackClientEvent('onboarding:step_complete', {
      step_number: stepNumber,
      step_key: completedStepKey,
      selected_count: selectedCount,
      mode: analyticsMode,
    });
    setStepStartedAt(Date.now());
  };

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
      trackStepComplete(1, 'child_info');
      setCurrentStep(2);
    }
  };

  // 进入步骤3
  const goToStep3 = () => {
    if (canContinueStep2) {
      trackStepComplete(2, 'challenges', selectedChallenges.length);

      if (!includeFirstQuestion && selectedYear && selectedMonth) {
        completedRef.current = true;
        onComplete({
          childName: childName.trim(),
          childBirthday: { year: selectedYear, month: selectedMonth },
          gender: selectedGender!,
          challenges: selectedChallenges,
          firstQuestion: '',
        });
        return;
      }

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
      completedRef.current = true;
      trackStepComplete(3, 'first_question');
      onComplete({
        childName: childName.trim(),
        childBirthday: { year: selectedYear, month: selectedMonth },
        gender: selectedGender!,
        challenges: selectedChallenges,
        firstQuestion: selectedQuestion
      });
    }
  };

  // 进度条
  const totalSteps = includeFirstQuestion ? 3 : 2;
  const progress = (currentStep / totalSteps) * 100;

  useEffect(() => {
    return () => {
      if (completedRef.current) return;
      const state = dropoffStateRef.current;
      trackClientEvent('onboarding:step_dropoff', {
        step_number: state.currentStep,
        step_key: state.stepKey,
        time_on_step_ms: Date.now() - state.stepStartedAt,
        last_valid_state: state.isValid,
        mode: analyticsMode,
      }, { keepalive: true });
    };
  }, []);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50">
      {/* 进度条 */}
      <div className="h-1 bg-slate-200">
        <div
          className="h-full bg-gradient-to-r from-primary-teal to-primary-purple transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* 步骤1：孩子基本信息 */}
      {currentStep === 1 && (
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
          <div className="w-full max-w-md">
            {/* 头部 - 移除中间logo */}
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-slate-900 mb-2">
                Tell us about your child
              </h1>
              <p className="text-slate-500">
                A nickname is enough. We&apos;ll use this to personalize support.
              </p>
            </div>

            {/* 基本信息 */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-6">
              <div className="mb-5">
                <label htmlFor="guestChildName" className="block text-sm font-medium text-slate-700 mb-2">
                  Child&apos;s name or nickname
                </label>
                <input
                  id="guestChildName"
                  type="text"
                  value={childName}
                  onChange={(event) => setChildName(event.target.value.slice(0, 50))}
                  placeholder="Alex"
                  className="w-full h-12 rounded-xl border-2 border-slate-200 px-4 text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-primary-purple focus:bg-primary-purple/5"
                />
              </div>

              <div className="mb-5">
                <label className="block text-sm font-medium text-slate-700 mb-2">Gender</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'boy', label: 'Boy' },
                    { value: 'girl', label: 'Girl' },
                    { value: 'other', label: 'Other' },
                  ].map(option => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setSelectedGender(option.value as 'boy' | 'girl' | 'other')}
                      className={`h-11 rounded-xl border-2 text-sm font-semibold transition-all ${
                        selectedGender === option.value
                          ? 'border-primary-purple bg-primary-purple/5 text-primary-purple'
                          : 'border-slate-200 text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

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

            <p className="text-center text-xs text-slate-400 mb-4">
              Step 1 of {totalSteps}
            </p>

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

            {onLogin && (
              <button
                onClick={onLogin}
                className="mt-4 w-full text-center text-sm font-semibold text-slate-500 transition-colors hover:text-primary-purple"
              >
                Already have an account? <span className="text-primary-purple">Log in</span>
              </button>
            )}
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
                <span className={canContinueStep2 ? 'bg-gradient-to-r from-primary-teal to-primary-purple bg-clip-text text-transparent' : 'text-slate-400'}>
                  {includeFirstQuestion ? 'Next' : 'Save and continue'}
                </span>
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

            {ONBOARDING_CATEGORIES.map((category, index) => {
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
                  {ONBOARDING_CATEGORIES.find(c => c.id === expandedCategory)?.name}
                </h2>
                <p className="text-white/70 text-center text-sm">
                  Select specific challenges
                </p>
              </div>

              {/* 子气泡区域 - 限制最大宽度 */}
              <div className="flex-1 relative max-w-xl mx-auto w-full">
                {ONBOARDING_CATEGORIES.find(c => c.id === expandedCategory)?.subItems.map((item, index) => {
                  const pos = SUB_BUBBLE_POSITIONS[index % SUB_BUBBLE_POSITIONS.length];
                  const isSelected = selectedChallenges.some(c => c.id === item.id);
                  const category = ONBOARDING_CATEGORIES.find(c => c.id === expandedCategory)!;

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
              Choose Your First Question
            </h1>
            <p className="text-slate-500 text-center">
              Start building solutions for your challenges
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
                Continue
              </span>
              <ChevronRight size={18} className={canFinish ? 'text-primary-purple' : 'text-slate-400'} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
