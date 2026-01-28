/**
 * RAG Service Client for ADHD Research Paper Retrieval
 *
 * Connects to the shared RAG API at http://101.37.25.249:8000
 * Used by both mini-program and web version
 *
 * 双LLM架构：
 * - 第一个LLM (summarizePapers): 提取论文核心发现，保留关键数据，转为通俗语言
 * - 第二个LLM (主对话): 基于精炼后的摘要与用户对话
 *
 * 参考: docs/PROMPT_SYSTEM_ARCHITECTURE.md 第8.4节
 */

// RAG API configuration
const RAG_API_BASE = process.env.RAG_API_BASE || 'http://47.110.88.11:8000';

// 智能摘要开关（双LLM架构）
const ENABLE_SMART_SUMMARY = process.env.ENABLE_SMART_SUMMARY === 'true';

// DeepSeek API configuration (for summarization LLM)
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_API_BASE = process.env.DEEPSEEK_API_BASE || 'https://api.deepseek.com';

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
 * RAG Tool Call Result
 */
export interface RAGToolCallResult {
  formattedText: string;  // For LLM consumption
  sources: Array<{        // For frontend display
    title: string;
    url: string;
    snippet?: string;
  }>;
}

/**
 * Execute RAG search from LLM tool call
 *
 * This is called when the LLM uses the search_adhd_research tool
 * Returns both formatted text for LLM and structured sources for frontend
 */
export async function executeRAGToolCall(toolCall: {
  function: { name: string; arguments: string };
}): Promise<RAGToolCallResult> {
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

    const formattedText = `${formattedResults}\n\n**Topic Distribution**: ${topicsInfo}`;

    // Convert papers to frontend sources format
    const sources = papers.map(paper => ({
      title: paper.title,
      url: paper.url || `https://pubmed.ncbi.nlm.nih.gov/${paper.pmid || ''}`,
      snippet: paper.abstract.slice(0, 200) + (paper.abstract.length > 200 ? '...' : ''),
    }));

    return {
      formattedText,
      sources,
    };
  } catch (error) {
    console.error('[RAG Service] Tool call execution failed:', error);
    return {
      formattedText: `Error executing RAG search: ${error instanceof Error ? error.message : 'Unknown error'}`,
      sources: [],
    };
  }
}

/**
 * 智能摘要：将多篇论文的核心发现综合成 500-800 字的摘要
 *
 * 双LLM架构中的第一个LLM，负责：
 * 1. 提取与问题最相关的 3-5 个核心发现
 * 2. 每个发现标注来源（作者/机构 + 年份）
 * 3. 保留关键数据（样本量、效果百分比等）
 * 4. 语言通俗，家长能听懂
 * 5. 如果研究有局限性，诚实告知
 *
 * @param papers - 论文列表
 * @param userQuestion - 用户问题
 * @returns 综合摘要文本，失败返回 null（降级到原始格式化）
 */
export async function summarizePapers(
  papers: PaperResult[],
  userQuestion: string
): Promise<string | null> {
  const startTime = Date.now();

  try {
    console.log(`[RAG] 开始为 ${papers.length} 篇论文生成综合摘要`);

    // 构建论文内容（每篇提取关键信息）
    const papersText = papers.map((paper, i) => {
      const year = paper.year || '近年';
      const authors = paper.authors?.join(', ') || '研究团队';
      const title = paper.title || '相关研究';
      const content = paper.abstract || '';

      return `【论文 ${i + 1}】
标题: ${title}
作者: ${authors}
年份: ${year}
内容摘要: ${content.substring(0, 2000)}${content.length > 2000 ? '...' : ''}`;
    }).join('\n\n---\n\n');

    const prompt = `你是一个科研文献阅读助手。请综合以下 ${papers.length} 篇论文，针对用户问题生成一篇 500-800 字的综合摘要。

用户问题：${userQuestion}

要求：
1. 提取与问题最相关的 3-5 个核心发现
2. 每个发现必须标注来源（作者/机构 + 年份）
3. 保留关键数据（样本量、效果百分比等）
4. 语言通俗，家长能听懂
5. 如果研究有局限性（样本小、只针对特定人群等），要诚实告知

论文内容：
${papersText}

请直接输出综合摘要，不需要标题或前言。`;

    // 调用 DeepSeek API 生成摘要
    const response = await fetch(`${DEEPSEEK_API_BASE}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2000,  // 综合摘要 800 字 + buffer
        temperature: 0.3,  // 低温度，更稳定
        stream: false,
      }),
      signal: AbortSignal.timeout(60000), // 60 seconds
    });

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.status}`);
    }

    const data = await response.json();
    const summary = data.choices?.[0]?.message?.content;

    if (!summary) {
      throw new Error('Empty response from DeepSeek');
    }

    const duration = Date.now() - startTime;
    console.log(`[RAG] ✅ 综合摘要生成成功，长度: ${summary.length} 字符，耗时: ${duration}ms`);

    return summary;

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[RAG] ❌ 综合摘要生成失败（耗时 ${duration}ms）:`, error);

    return null;  // 返回 null 触发降级到旧逻辑
  }
}

/**
 * 执行 RAG 搜索并返回结果（支持双LLM架构）
 *
 * 如果 ENABLE_SMART_SUMMARY=true，使用双LLM架构：
 * 1. 先调用 summarizePapers 生成精炼摘要
 * 2. 将摘要作为 formattedText 返回给主对话LLM
 *
 * 否则使用原始模式：直接将完整论文内容传给LLM
 */
export async function executeRAGWithSmartSummary(
  query: string,
  userQuestion: string,
  topK: number = 10
): Promise<RAGToolCallResult & { summaryMode: 'smart' | 'raw' }> {
  // 1. 执行搜索
  const papers = await searchPapers({ query, top_k: topK });

  // 2. 转换为前端显示格式
  const sources = papers.map(paper => ({
    title: paper.title,
    url: paper.url || `https://pubmed.ncbi.nlm.nih.gov/${paper.pmid || ''}`,
    snippet: paper.abstract.slice(0, 200) + (paper.abstract.length > 200 ? '...' : ''),
  }));

  // 3. 根据开关决定使用哪种模式
  if (ENABLE_SMART_SUMMARY && userQuestion) {
    console.log('[RAG] 🚀 智能摘要已启用，开始生成综合摘要...');

    const summary = await summarizePapers(papers, userQuestion);

    if (summary) {
      console.log('[RAG] ✅ 智能摘要生成成功');
      return {
        formattedText: `【研究支持】在ADHD研究数据库中找到 ${papers.length} 篇相关研究\n\n${summary}`,
        sources,
        summaryMode: 'smart',
      };
    }

    // 摘要失败，降级到原始格式化
    console.warn('[RAG] ⚠️ 智能摘要生成失败，降级到原始格式化');
  }

  // 4. 原始模式：完整论文内容
  const formattedResults = formatPapersForLLM(papers);
  const topicDistribution = analyzePaperTopics(papers);
  const topicsInfo = Object.entries(topicDistribution)
    .sort(([, a], [, b]) => b - a)
    .map(([topic, count]) => `${topic}: ${count} papers`)
    .join(', ');

  return {
    formattedText: `${formattedResults}\n\n**Topic Distribution**: ${topicsInfo}`,
    sources,
    summaryMode: 'raw',
  };
}

export default {
  searchPapers,
  formatPapersForLLM,
  analyzePaperTopics,
  checkRAGHealth,
  getRAGStats,
  executeRAGToolCall,
  summarizePapers,
  executeRAGWithSmartSummary,
};
