/**
 * RAG Tool Definition - Function Calling Standard
 *
 * Follows OpenAI Function Calling spec, defines RAG as an LLM-callable tool
 * Lets the LLM decide when to search for scientific research
 */

/**
 * RAG Tool Definition (OpenAI Function Calling standard)
 */
export const RAG_TOOL_DEFINITION = {
  type: "function" as const,
  function: {
    name: "search_adhd_research",
    description: `Search the ADHD scientific research paper database (6000+ curated high-quality papers).

【When to Use】
- User asks about specific interventions (exercise, nutrition, sensory training, mindfulness, etc.)
- User wants scientific evidence, effectiveness validation, or success rates
- User compares different intervention approaches (exercise vs nutrition, medication vs behavioral)
- User shares their experience with a method and needs scientific explanation or further guidance
- User questions the validity of a suggestion and needs evidence

【When NOT to Use】
- Pure emotional support conversations ("I'm so tired", "So stressed")
- Simple information gathering ("How old is your child?", "What symptoms?")
- Basic ADHD mechanism explanations (can answer from general knowledge)
- Initial greetings and casual chat

【Usage Instructions】
- When applicable, call this tool directly without asking or explaining
- Returned papers include title, abstract, year, study type, and detailed info
- Integrate research findings naturally into your response, don't just list papers
- Recommend returning 3-5 most relevant papers`,

    parameters: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: `⚠️ Search keywords (**must be in English**)

### Core Principle: Cast Wide, Filter Strictly

**Search Phase (this step)**:
- Include keywords from all possibly relevant dimensions, even ones you think "might not be related"
- Goal: Let RAG return research perspectives you might have overlooked
- ⚠️ Even if you think a dimension (like functional medicine) isn't directly related, include relevant keywords

**Analysis Phase (after RAG returns)**:
- RAG will show paper count distribution by field
- Decide depth based on paper count:
  * ≥10 papers → Must expand with dedicated paragraph
  * 5-9 papers → Briefly mention
  * <5 papers → May omit
- Don't skip dimensions with lots of papers just because you subjectively think they're "not very related"

💡 **Why this approach?**
ADHD problems often have hidden multi-dimensional connections (e.g., homework procrastination might relate to iron deficiency affecting executive function). If you exclude dimensions during search, this important info will never be discovered.

---

### Keyword Library by Dimension (cover 5-8 dimensions)

**Core** (required):
ADHD + problem core word (homework/sleep/attention/behavior)

**Recommended dimensions**:

**1️⃣ Neuroscience**:
executive function, task initiation, prefrontal cortex, dopamine, reward system, inhibition, working memory

**2️⃣ Psychology/Motivation**:
motivation, procrastination, avoidance, anxiety, self-efficacy, frustration, learned helplessness

**3️⃣ Behavior Management**:
behavioral intervention, behavior modification, parenting strategies, parent training, routine, habit formation, reinforcement

**4️⃣ Environment/Support**:
environment, structure, organizational skills, time management, visual support, distraction

**5️⃣ Educational Strategies**:
intervention, training, teaching strategies, skill development, homework management, classroom strategies

**6️⃣ Family/Relationships**:
parent-child relationship, family dynamics, communication, co-parenting, family stress

**7️⃣ Functional Medicine** (supplementary):
nutrition, iron, magnesium, zinc, omega-3, gut, microbiome, sleep quality, circadian rhythm

**8️⃣ TCM/Traditional Medicine** (supplementary):
traditional Chinese medicine, TCM, acupuncture, herbal medicine, qi deficiency, yin yang, meridian, pediatric massage, constitution, spleen deficiency, kidney deficiency

---

### Keyword Count Guidelines

- Complex questions: 15-25 keywords, cover 5-8 dimensions, top_k: 20-25 papers
- Simple questions: 8-12 keywords, cover 2-3 dimensions, top_k: 8-12 papers

💡 **Strategy**: Precise search, control return count to save tokens`
        },
        top_k: {
          type: "integer",
          description: "Number of papers to return (1-50). Recommend 20-25 for complex multi-dimensional questions, 8-12 for simple questions (saves tokens)",
          minimum: 1,
          maximum: 50
        }
      },
      required: ["query"]
    }
  }
};

/**
 * Tool call interface
 */
export interface ToolCall {
  id?: string;
  type?: string;
  function: {
    name: string;
    arguments: string;
  };
}

/**
 * Validate tool_call format
 */
export function validateToolCall(toolCall: ToolCall): boolean {
  // Basic structure check
  if (!toolCall || typeof toolCall !== 'object') {
    return false;
  }

  // Check function object
  if (!toolCall.function || typeof toolCall.function !== 'object') {
    return false;
  }

  // Check function name
  if (toolCall.function.name !== 'search_adhd_research') {
    return false;
  }

  // Check arguments exist
  if (!toolCall.function.arguments || typeof toolCall.function.arguments !== 'string') {
    return false;
  }

  // Parse and validate parameters
  try {
    const args = JSON.parse(toolCall.function.arguments);

    // query must exist and be non-empty string
    if (!args.query || typeof args.query !== 'string' || args.query.trim().length === 0) {
      return false;
    }

    // top_k if present must be number in valid range
    if (args.top_k !== undefined) {
      if (typeof args.top_k !== 'number' || args.top_k < 1 || args.top_k > 50) {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Parse tool_call arguments
 * @returns Parsed parameters {query, top_k}
 * @throws Error if tool_call format is invalid
 */
export function parseToolCallArguments(toolCall: ToolCall): { query: string; top_k: number } {
  // Validate format first
  if (!validateToolCall(toolCall)) {
    throw new Error('Invalid tool_call format: validation failed');
  }

  try {
    const args = JSON.parse(toolCall.function.arguments);

    // Clean and validate query
    const query = args.query.trim();
    if (query.length === 0) {
      throw new Error('query cannot be empty after trimming');
    }

    // Validate and limit top_k range (default 10 if not provided)
    let top_k = args.top_k !== undefined ? args.top_k : 10;
    top_k = Math.max(1, Math.min(50, Math.floor(top_k)));

    return { query, top_k };
  } catch (error) {
    if (error instanceof Error && error.message.includes('query cannot be empty')) {
      throw error;
    }
    throw new Error(`Failed to parse tool_call arguments: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get RAG tools array for LLM API call
 * Returns the tools array format expected by DeepSeek/OpenAI API
 */
export function getRagTools(): Array<typeof RAG_TOOL_DEFINITION> {
  return [RAG_TOOL_DEFINITION];
}
