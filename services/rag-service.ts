/**
 * RAG Service Client for ADHD Research Paper Retrieval
 *
 * Connects to the shared RAG API at http://101.37.25.249:8000
 * Used by both mini-program and web version
 */

// RAG API configuration
const RAG_API_BASE = process.env.RAG_API_BASE || 'http://47.110.88.11:8000';

/**
 * Paper result from RAG API
 */
export interface PaperResult {
  idx: number;
  score: number;
  title: string;
  abstract: string;
  content?: string;
  year: number;
  journal: string;
  authors?: string[];
  types?: string[];
  url?: string;
  pmid?: string;
  doi?: string;
  domain?: string;
  topic?: string;
}

/**
 * Search request options
 */
export interface SearchOptions {
  query: string;
  top_k?: number;
  year_min?: number;
  year_max?: number;
  must_types?: string[];
  topics?: string[];
}

/**
 * Search ADHD research papers
 */
export async function searchPapers(options: SearchOptions): Promise<PaperResult[]> {
  try {
    const response = await fetch(`${RAG_API_BASE}/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: options.query,
        top_k: options.top_k || 10,
        year_min: options.year_min,
        year_max: options.year_max,
        must_types: options.must_types,
        topics: options.topics,
      }),
      // Add timeout to prevent hanging
      signal: AbortSignal.timeout(30000), // 30 seconds
    });

    if (!response.ok) {
      throw new Error(`RAG API error: ${response.status}`);
    }

    const papers: PaperResult[] = await response.json();
    return papers;
  } catch (error) {
    console.error('[RAG Service] Search failed:', error);
    throw error;
  }
}

/**
 * Format RAG results for LLM consumption
 *
 * Converts paper results into a formatted string that the LLM can understand
 */
export function formatPapersForLLM(papers: PaperResult[]): string {
  if (papers.length === 0) {
    return 'No relevant research papers found for this query.';
  }

  const sections: string[] = [
    `Found ${papers.length} relevant research papers:`,
    '',
  ];

  papers.forEach((paper, index) => {
    sections.push(`## Paper ${index + 1}: ${paper.title}`);
    sections.push(`**Year**: ${paper.year}`);
    sections.push(`**Journal**: ${paper.journal}`);

    if (paper.types && paper.types.length > 0) {
      sections.push(`**Study Type**: ${paper.types.join(', ')}`);
    }

    if (paper.authors && paper.authors.length > 0) {
      sections.push(`**Authors**: ${paper.authors.slice(0, 3).join(', ')}${paper.authors.length > 3 ? ' et al.' : ''}`);
    }

    sections.push(`**Relevance Score**: ${(paper.score * 100).toFixed(1)}%`);
    sections.push('');
    sections.push(`**Abstract**: ${paper.abstract}`);
    sections.push('');

    if (paper.url) {
      sections.push(`**Source**: ${paper.url}`);
      sections.push('');
    }
  });

  return sections.join('\n');
}

/**
 * Analyze paper topics distribution
 *
 * Groups papers by topic and returns statistics
 */
export function analyzePaperTopics(papers: PaperResult[]): Record<string, number> {
  const topicCounts: Record<string, number> = {};

  papers.forEach(paper => {
    if (paper.topic) {
      topicCounts[paper.topic] = (topicCounts[paper.topic] || 0) + 1;
    }
  });

  return topicCounts;
}

/**
 * Check if RAG service is healthy
 */
export async function checkRAGHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${RAG_API_BASE}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Get RAG service statistics
 */
export async function getRAGStats(): Promise<any> {
  try {
    const response = await fetch(`${RAG_API_BASE}/stats`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      throw new Error(`RAG API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('[RAG Service] Failed to get stats:', error);
    return null;
  }
}

/**
 * Execute RAG search from LLM tool call
 *
 * This is called when the LLM uses the search_adhd_research tool
 */
export async function executeRAGToolCall(toolCall: {
  function: { name: string; arguments: string };
}): Promise<string> {
  try {
    // Parse tool call arguments
    const args = JSON.parse(toolCall.function.arguments);

    if (!args.query || typeof args.query !== 'string') {
      throw new Error('Invalid query parameter');
    }

    // Execute search
    const papers = await searchPapers({
      query: args.query,
      top_k: args.top_k || 10,
    });

    // Format for LLM
    const formattedResults = formatPapersForLLM(papers);

    // Analyze topics
    const topicDistribution = analyzePaperTopics(papers);
    const topicsInfo = Object.entries(topicDistribution)
      .sort(([, a], [, b]) => b - a)
      .map(([topic, count]) => `${topic}: ${count} papers`)
      .join(', ');

    return `${formattedResults}\n\n**Topic Distribution**: ${topicsInfo}`;
  } catch (error) {
    console.error('[RAG Service] Tool call execution failed:', error);
    return `Error executing RAG search: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}

export default {
  searchPapers,
  formatPapersForLLM,
  analyzePaperTopics,
  checkRAGHealth,
  getRAGStats,
  executeRAGToolCall,
};
