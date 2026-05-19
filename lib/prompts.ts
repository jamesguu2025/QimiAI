/**
 * Prompt Assembler for Qimi AI Web Version
 *
 * Adapted from mini-program prompt system with:
 * - LITE System Prompt (core methodology)
 * - Dynamic module injection (LLM-based)
 * - User context injection
 * - RAG tool integration
 */

import { identifyRelevantModules } from './module-router';
import { SYSTEM_PROMPT_LITE } from './system-prompt-lite';

// Module file mapping
const MODULE_FILE_MAP: Record<string, string> = {
  'functional_medicine': 'functional_medicine.md',
  'adhd_dimensions': 'adhd_dimensions.md',
  'intervention_exercise': 'intervention_exercise.md',
  'intervention_sensory': 'intervention_sensory.md',
  'intervention_behavior': 'intervention_behavior.md'
};

// Knowledge modules content cache
let moduleCache: Record<string, string> = {};

/**
 * Load knowledge module content
 * In Next.js, we read from the data directory at build time or use fetch at runtime
 */
async function loadModule(moduleName: string): Promise<string | null> {
  // Check cache first
  if (moduleCache[moduleName]) {
    return moduleCache[moduleName];
  }

  const filename = MODULE_FILE_MAP[moduleName];
  if (!filename) {
    console.warn(`[Prompts] Unknown module: ${moduleName}`);
    return null;
  }

  try {
    // In server-side context, we can use fs
    if (typeof window === 'undefined') {
      const fs = await import('fs');
      const path = await import('path');
      const modulePath = path.join(process.cwd(), 'data', 'knowledge_modules', filename);
      const content = fs.readFileSync(modulePath, 'utf-8');
      moduleCache[moduleName] = content;
      return content;
    }
    return null;
  } catch (error) {
    console.error(`[Prompts] Failed to load module ${moduleName}:`, error);
    return null;
  }
}

/**
 * Inject knowledge modules based on user message
 * Uses LLM to identify relevant modules, then loads and injects them
 */
export async function injectModules(
  userMessage: string,
  conversationHistory: Array<{ role: string; content: string }> = []
): Promise<string> {
  if (!userMessage) return '';

  try {
    // Use LLM to identify relevant modules
    const relevantModules = await identifyRelevantModules(userMessage, conversationHistory);

    if (relevantModules.length === 0) {
      console.log('[Prompts] No modules identified for injection');
      return '';
    }

    const injectedParts: string[] = [];

    for (const moduleName of relevantModules) {
      const content = await loadModule(moduleName);
      if (content) {
        injectedParts.push(`\n### Dynamic Module Injection: ${moduleName}\n${content}`);
        console.log(`[Prompts] Injected module: ${moduleName}`);
      }
    }

    if (injectedParts.length > 0) {
      return `\n\n# Context Injection (Dynamic Knowledge Modules)\n${injectedParts.join('\n')}`;
    }
  } catch (error) {
    console.error('[Prompts] Module injection failed:', error);
    // Don't throw - continue without modules
  }

  return '';
}

/**
 * Build value preview section (informs user about personalized plan capability)
 */
function buildValuePreviewSection(): string {
  return `

### Value Preview Capability
When you identify the user is discussing ADHD intervention topics, inform them about the personalized plan capability.

**Trigger conditions**: User mentions any ADHD intervention topic (focus, emotions, sleep, exercise, learning, etc.)

**Action**: At the end of your first response, add a new paragraph:
"Keep chatting with me, and I'll help you create a **personalized growth plan** that you can save and reference anytime!"

**Notes**:
- Only mention once per conversation
- Use bold for "personalized growth plan"
- Don't mention during casual chat or greetings`;
}

/**
 * Build plan generation guidance section
 */
function buildPlanGenerationSection(): string {
  return `

### Plan Generation Guidelines

**Consultative loop comes first**
Before producing a complete plan, identify the likely bottleneck through the conversation:
- Where does the process fail: starting, staying with it, returning after interruption, emotional resistance, sensory/body difficulty, unclear instructions, or environmental overload?
- What setting is involved: home, homework, morning/evening routine, school, transitions, peers, or sleep?
- What has the parent already tried, and what happened?

During this stage, give one useful insight and ask the next diagnostic question. Do not output a full strategy list, action table, or saveable Growth Plan block until the bottleneck is clear enough or the parent explicitly asks you to stop asking and give the best answer now.

**Audience fit**
Write for English-speaking parents in North America and Europe. Use plain, practical home/school language rather than clinical labels unless the user asks for clinical detail. Use active voice and short, direct sentences.

**Research-backed plan design**
When research is available, use it as the backbone for the recommendation. Translate the retrieved studies into what the parent can do, including timing, frequency, duration, expected benefit, limits, and confidence when the studies provide them. Do not replace paper-supported parameters with generic advice.

**Evidence-to-action order**
Start with what the parent can try. Then briefly explain why it may help. Do not lead with a long research summary unless the user explicitly asks for the literature.

**Evidence wording**
Do not write vague citations like "research shows." When citing evidence, name the study source naturally: author or team, year, study type or sample size if available, and the practical takeaway. If evidence is early, indirect, mixed, or product-specific evidence is missing, say so plainly.

**Growth Plan-ready shape**
When your reply includes advice that could be saved as a Growth Plan item, make that actionable part stand on its own:
- state the challenge in one sentence
- state the goal in one sentence
- give 2-4 concrete actions
- include when/how often/how long to try them
- include one simple way to check whether it is helping
- when research is available, make clear which timing/method comes from the evidence and which part is practical judgment

Use this shape only after the plan readiness gate is met: the bottleneck is clear enough, or the parent explicitly asks for a plan now. If the parent is still describing a broad problem, give a short orientation and ask the next diagnostic question instead of producing a saveable plan.

**Pre-generation checks**
Before a detailed plan:
- Suggest a reasonable trial period yourself rather than asking the parent to invent one.
- Ask whether that timing is workable.
- If learning, focus, classroom behavior, homework, or school participation is involved, ask whether they want school suggestions.
- If school suggestions depend on teacher cooperation, ask whether the teacher or support team is easy to communicate with. If not, prefer low-dependence strategies.

**1. Time & Schedule (suggest first, then adjust)**
Don't ask parents how long they want to execute from scratch; they often don't know.
Suggest a reasonable schedule first, then ask if adjustments are needed.

**2. School Involvement (ask if needed)**
When the topic involves learning, focus, or classroom behavior:
- First ask if they want school suggestions, unless the user already asked for school help
- Use a separate **School support** section when school suggestions are included
- Adapt to North America and Europe: teacher, school counselor, learning support team, IEP, 504 Plan, SEN/SEND support, email, and meeting notes only when relevant
- For cooperative teachers, provide a short email/script and 1-2 simple classroom requests
- For difficult situations, focus on low-dependence strategies the parent or child can do

**Plan Format**:
- Each strategy must include specific timing and execution details
- Use compact labels such as **Goal**, **Try this for**, **What to do**, **When**, **How often**, **How long**, **Watch for**, and **Why this may help** when they make the advice easier to follow
- For multiple actions, stages, repeated timing/frequency fields, school/home comparisons, nutrition suggestions, or weekly schedules, prefer a simple Markdown table
- For a single strategy, bullets are fine, but **When**, **How often**, and **How long** must be on separate lines
- For multi-week plans, use phases such as **Week 1**, **Week 2**, or **Weeks 3-4**
- If you are giving starter steps before a full personalized plan, keep them clearly structured rather than embedded inside a research summary
- If school suggestions are included, use a clear subheading
- Avoid vague advice such as "practice regularly," "build a routine," or "do some exercises" unless you specify exactly what, when, and how long
- Be concrete and actionable

**Preferred plan layout**
When the user asks for a plan or when the answer contains saveable guidance, use this shape:

### [Specific Plan Name]

**Goal:** One concrete outcome.
**Try this for:** A realistic trial period.

| Step | What to do | When / how often |
|---|---|---|
| 1 | Concrete parent or child action | Specific timing |

**Watch for**
- Observable sign of progress
- Sign the plan needs adjustment

**Why this may help**
Brief explanation, with research support if available.`;
}


/**
 * User profile interface
 */
export interface UserProfile {
  childName?: string;
  childBirthday?: { year: number; month: number } | string;
  gender?: 'boy' | 'girl' | 'other';
  challenges?: Array<{ id: string; name: string; categoryId?: string; categoryName?: string }>;
  familyNotes?: string;
  extractedFacts?: string[];
}

/**
 * Calculate age text from birthday
 */
function calculateAgeText(birthday: { year: number; month: number } | string): string {
  try {
    const today = new Date();
    let birth: Date;

    if (typeof birthday === 'object' && birthday.year) {
      birth = new Date(birthday.year, (birthday.month || 1) - 1, 1);
    } else if (typeof birthday === 'string') {
      birth = new Date(birthday);
    } else {
      return '';
    }

    if (isNaN(birth.getTime())) return '';

    let years = today.getFullYear() - birth.getFullYear();
    let months = today.getMonth() - birth.getMonth();

    if (months < 0) {
      years--;
      months += 12;
    }

    if (today.getDate() < birth.getDate() && months > 0) {
      months--;
    } else if (today.getDate() < birth.getDate() && months === 0) {
      years--;
      months = 11;
    }

    if (years > 0 && months > 0) {
      return `${years} years ${months} months`;
    } else if (years > 0) {
      return `${years} years`;
    } else if (months > 0) {
      return `${months} months`;
    } else {
      return 'less than 1 month';
    }
  } catch {
    return '';
  }
}

/**
 * Build user context section for prompt injection
 */
export function buildUserContextSection(userProfile: UserProfile | null): string {
  if (!userProfile) return '';

  const sections: string[] = [];

  // Child name
  if (userProfile.childName?.trim()) {
    sections.push(`**Child's Name/Nickname**: ${userProfile.childName.trim()}`);
  }

  // Child age
  if (userProfile.childBirthday) {
    const ageText = calculateAgeText(userProfile.childBirthday);
    if (ageText) {
      sections.push(`**Child's Age**: ${ageText}`);
    }
  }

  // Gender
  if (userProfile.gender) {
    sections.push(`**Child's Gender**: ${userProfile.gender}`);
  }

  // Challenges
  if (Array.isArray(userProfile.challenges) && userProfile.challenges.length > 0) {
    const challengesList = userProfile.challenges
      .map(c => `- ${c.categoryName || c.categoryId}: ${c.name}`)
      .join('\n');
    sections.push(`**Parent's Concerns**:\n${challengesList}`);
  }

  // Family notes
  if (userProfile.familyNotes?.trim()) {
    sections.push(`**Family Notes**:\n${userProfile.familyNotes.trim()}`);
  }

  // AI-extracted facts
  if (Array.isArray(userProfile.extractedFacts) && userProfile.extractedFacts.length > 0) {
    const factsList = userProfile.extractedFacts.map(f => `- ${f}`).join('\n');
    sections.push(`**Information Learned from Conversations**:\n${factsList}`);
  }

  if (sections.length === 0) return '';

  return `

### User Profile Context
The following is information about this user and their child. Please consider this background when responding:

${sections.join('\n\n')}

**How to Use Profile Information**:
1. **Be accurate**: Profile info is from "records", not something the user "just mentioned"
2. **Use selectively**: Only reference information directly relevant to the current question
3. **Show understanding**: Make insights based on the profile, don't just repeat it`;
}

/**
 * Build complete system message
 *
 * @param userProfile - User profile for context injection (optional)
 * @param userMessage - User's current message for module injection
 * @param conversationHistory - Recent conversation history
 * @returns Complete system prompt
 */
export async function buildSystemMessage(
  userProfile: UserProfile | null = null,
  userMessage: string = '',
  conversationHistory: Array<{ role: string; content: string }> = []
): Promise<string> {
  // Start with base LITE prompt
  let systemPrompt = SYSTEM_PROMPT_LITE;

  // Dynamic module injection based on user message
  if (userMessage) {
    const injectedModules = await injectModules(userMessage, conversationHistory);
    if (injectedModules) {
      systemPrompt += injectedModules;
      console.log(`[Prompts] Injected modules, added ${injectedModules.length} characters`);
    }
  }

  // Add value preview capability
  systemPrompt += buildValuePreviewSection();

  // Add plan generation guidance
  systemPrompt += buildPlanGenerationSection();

  // Inject user context if available
  const userContext = buildUserContextSection(userProfile);
  if (userContext) {
    systemPrompt += userContext;
    console.log(`[Prompts] Injected user context, added ${userContext.length} characters`);
  }

  console.log(`[Prompts] Complete system prompt built, total ${systemPrompt.length} characters`);

  return systemPrompt;
}

/**
 * Clear module cache (useful for development/testing)
 */
export function clearModuleCache(): void {
  moduleCache = {};
}
