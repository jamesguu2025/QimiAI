/**
 * Module Router - LLM-based knowledge module identification
 *
 * Uses DeepSeek to intelligently identify which knowledge modules should be injected
 * based on the user's message and conversation context.
 *
 * Completely removes keyword matching - uses pure semantic understanding.
 */

// Available modules
const MODULE_LIST = [
  'functional_medicine',      // Functional medicine
  'adhd_dimensions',          // 10 dimensions framework
  'intervention_exercise',    // Exercise intervention
  'intervention_sensory',     // Sensory integration training
  'intervention_tcm',         // Traditional Chinese Medicine
  'intervention_behavior'     // Behavior training
];

// DeepSeek API configuration
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_API_BASE = process.env.DEEPSEEK_API_BASE || 'https://api.deepseek.com';

/**
 * Call DeepSeek API for module identification
 */
async function callModuleRouter(prompt: string): Promise<string> {
  if (!DEEPSEEK_API_KEY) {
    throw new Error('DEEPSEEK_API_KEY not configured');
  }

  const response = await fetch(`${DEEPSEEK_API_BASE}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    throw new Error(`DeepSeek API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

/**
 * Build the module identification prompt
 */
function buildRouterPrompt(
  userMessage: string,
  conversationHistory: Array<{ role: string; content: string }>
): string {
  // Extract recent history
  const recentHistory = conversationHistory.slice(-5).map(msg => {
    const content = typeof msg.content === 'string'
      ? msg.content.substring(0, 200)
      : '';
    return `${msg.role}: ${content}`;
  }).join('\n');

  return `
You are an ADHD knowledge module identification expert. Your task is to identify which knowledge modules should be injected based on the user's message and conversation history.

## Available Modules

1. **functional_medicine** (Functional Medicine):
   - Trigger: User describes physiological symptoms or health issues
   - Examples:
     * Sleep: difficulty falling asleep, night waking, snoring, restless sleep, waking early, daytime drowsiness
     * Digestion: stomach pain, bloating, diarrhea, constipation, food intolerance, sensitive stomach
     * Nutrition: poor attention, irritability, night cramps, brittle nails/white spots, hair loss, dry skin, afternoon fatigue, headaches when studying, picky eating
     * Blood sugar: sudden energy drops, irritable before meals, hyper after sweets, gets hangry easily, sudden emotional outbursts
     * Allergies: eczema, rhinitis, asthma, food allergies, runny nose, bug bites that stay swollen long
     * Emotions: anxiety, emotional dysregulation, irritability, low frustration tolerance

2. **adhd_dimensions** (10 Dimensions Framework):
   - Trigger: User asks about dimensions, causes, reasons, manifestations, symptoms, or analysis

3. **intervention_exercise** (Exercise Intervention):
   - Trigger: User asks about exercise, sports, jumping rope, running, fitness, physical training

4. **intervention_sensory** (Sensory Integration Training):
   - Trigger: User asks about sensory integration, vestibular, tactile, proprioceptive, sensory seeking/avoiding

5. **intervention_tcm** (Traditional Chinese Medicine):
   - Trigger: User describes symptoms matching TCM patterns (using everyday language)
   - Examples:
     * Physical signs: dry legs/feet/skin, flaky skin, cracked lips, brittle nails/white spots, hangnails, pale/dull complexion, dry/yellow hair
     * Sleep: night sweats, teeth grinding, night terrors, restless sleep, sleeping on stomach
     * Body: hands always hot, hot palms/soles, cold intolerance/cold hands and feet, tongue with map-like patterns, thick tongue coating
     * Emotions/behavior: restless, hyperactive, bad temper, impulsive, yelling, timid
     * Digestion: poor appetite, picky eating, constipation (hard pellets), diarrhea, bloating
     * Other: scattered attention (daydreaming), fatigue, dark circles under eyes
   - Note: Users won't use professional terms like "night sweats" or "map tongue" - they say everyday things like "sweats a lot while sleeping" or "tongue has patterns"

6. **intervention_behavior** (Behavior Training):
   - Trigger: User asks about behavior, habits, procrastination, dawdling, rewards, discipline, managing behavior

## Identification Rules

- Judge based on the **semantic meaning** of the user's message, not keyword matching
- Consider conversation context (if previous messages mentioned a dimension, continue if related)
- Users may describe symptoms in everyday language
- One message may trigger multiple modules (e.g., "sleep problems" may trigger both functional_medicine and TCM)

## Conversation to Analyze

**Recent History**:
${recentHistory || 'No previous history'}

**Current User Message**: ${userMessage}

## Output Requirements

**IMPORTANT**: You must output ONLY a valid JSON array, no other text, explanation, or markdown formatting.

**Output format** (must be valid JSON):
- If modules identified: ["functional_medicine", "intervention_tcm"]
- If no modules: []

**Forbidden**:
- No markdown code blocks (no triple backticks)
- No explanatory text
- No other content

**Examples**:
User message: "My child sweats a lot while sleeping"
Correct output: ["functional_medicine", "intervention_tcm"]

User message: "Hello"
Correct output: []
  `;
}

/**
 * Parse the LLM response to extract module list
 */
function parseModuleResponse(responseText: string): string[] {
  if (!responseText || responseText.trim().length === 0) {
    console.warn('[ModuleRouter] Empty response from LLM');
    return [];
  }

  try {
    // Clean response text
    let cleanedText = responseText.trim();

    // Remove markdown code blocks if present
    cleanedText = cleanedText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');

    // Try to extract JSON array
    const jsonMatch = cleanedText.match(/\[[\s\S]*?\]/);
    if (jsonMatch) {
      const modules = JSON.parse(jsonMatch[0]);

      if (!Array.isArray(modules)) {
        console.warn('[ModuleRouter] Parsed result is not an array');
        return [];
      }

      // Validate module names
      const validModules = modules.filter(
        (module: string) => MODULE_LIST.includes(module)
      );

      if (validModules.length !== modules.length) {
        const invalidModules = modules.filter(
          (module: string) => !MODULE_LIST.includes(module)
        );
        console.warn(`[ModuleRouter] Invalid module names filtered out: ${invalidModules.join(', ')}`);
      }

      return validModules;
    }

    // Try direct parse
    const modules = JSON.parse(cleanedText);
    if (Array.isArray(modules)) {
      return modules.filter((module: string) => MODULE_LIST.includes(module));
    }
  } catch (error) {
    console.error('[ModuleRouter] Failed to parse module response:', error);
    console.error('[ModuleRouter] Raw response:', responseText.substring(0, 200));
  }

  return [];
}

/**
 * Identify relevant modules for a user message
 *
 * @param userMessage - The user's current message
 * @param conversationHistory - Recent conversation history (last 3-5 messages)
 * @returns Array of module names to inject
 */
export async function identifyRelevantModules(
  userMessage: string,
  conversationHistory: Array<{ role: string; content: string }> = []
): Promise<string[]> {
  if (!userMessage || userMessage.trim().length === 0) {
    return [];
  }

  // Quick filter: Skip very short messages that are likely greetings
  if (userMessage.trim().length < 5) {
    return [];
  }

  try {
    const prompt = buildRouterPrompt(userMessage, conversationHistory);
    const response = await callModuleRouter(prompt);
    const modules = parseModuleResponse(response);

    console.log(`[ModuleRouter] Identified ${modules.length} modules: ${modules.join(', ') || 'none'}`);
    return modules;
  } catch (error) {
    console.error('[ModuleRouter] Module identification failed:', error);
    // Return empty array instead of throwing - graceful degradation
    return [];
  }
}

/**
 * Get available module list
 */
export function getAvailableModules(): string[] {
  return [...MODULE_LIST];
}
