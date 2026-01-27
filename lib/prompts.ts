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
  'intervention_tcm': 'intervention_tcm.md',
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

**1. Time & Schedule (suggest first, then adjust)**
Don't ask parents how long they want to execute - they often don't know.
Suggest a reasonable schedule, then ask if adjustments are needed.

**2. School Involvement (ask if needed)**
When the topic involves learning, focus, or classroom behavior:
- First ask: "Would you like suggestions for school as well?"
- If yes, determine if teacher cooperation is needed
- If teacher cooperation is needed, ask: "Is your child's teacher easy to work with?"
- Adjust recommendations based on teacher cooperation level

**Plan Format**:
- Each strategy should include specific timing and steps
- If school suggestions are included, use a clear subheading
- Be concrete and actionable`;
}

/**
 * Build interactive trigger section (for saving growth plans)
 */
function buildInteractiveTriggerSection(): string {
  return `

### Interactive Trigger Rules
When your response contains **specific, actionable intervention plans**, output a marker at the end:

<|DSML|invoke name="propose_save_plan" parameter="category:category_name"/><|DSML|>

**Category options**: exercise | sleep | diet | emotion | focus | social | study

**Output marker when** (must meet all):
1. At least 2 specific action steps (not just directions or questions)
2. Includes specific parameters (time/frequency/quantity)

**Don't output marker for**: questions, general directions, explanations, responses ending with question marks`;
}

/**
 * User profile interface
 */
export interface UserProfile {
  childBirthday?: { year: number; month: number } | string;
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

  // Child age
  if (userProfile.childBirthday) {
    const ageText = calculateAgeText(userProfile.childBirthday);
    if (ageText) {
      sections.push(`**Child's Age**: ${ageText}`);
    }
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

  // Add interactive trigger rules
  systemPrompt += buildInteractiveTriggerSection();

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
