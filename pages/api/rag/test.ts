/**
 * RAG Service Test Endpoint
 *
 * Test connectivity and functionality of the ADHD RAG service
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { checkRAGHealth, getRAGStats, searchPapers } from '../../../services/rag-service';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const results: any = {
      timestamp: new Date().toISOString(),
      tests: {},
      overall_status: 'success'
    };

    // Test 1: Health Check
    console.log('[RAG Test] Checking health...');
    try {
      const isHealthy = await checkRAGHealth();
      results.tests.health = {
        status: isHealthy ? 'pass' : 'fail',
        healthy: isHealthy
      };
    } catch (error) {
      results.tests.health = {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      results.overall_status = 'failure';
    }

    // Test 2: Stats
    console.log('[RAG Test] Fetching stats...');
    try {
      const stats = await getRAGStats();
      results.tests.stats = {
        status: stats ? 'pass' : 'fail',
        data: stats
      };
    } catch (error) {
      results.tests.stats = {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    // Test 3: Sample Search
    console.log('[RAG Test] Running sample search...');
    try {
      const papers = await searchPapers({
        query: 'ADHD parent training behavioral intervention',
        top_k: 3
      });

      results.tests.search = {
        status: papers.length > 0 ? 'pass' : 'fail',
        papers_found: papers.length,
        sample_papers: papers.map(p => ({
          title: p.title,
          year: p.year,
          score: p.score
        }))
      };
    } catch (error) {
      results.tests.search = {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      results.overall_status = 'failure';
    }

    return res.status(200).json(results);
  } catch (error) {
    console.error('[RAG Test] Test suite failed:', error);
    return res.status(500).json({
      error: 'Test suite failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
