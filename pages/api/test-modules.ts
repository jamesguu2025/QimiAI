/**
 * Module Router Test API Endpoint
 * Test module identification without full chat flow
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { identifyRelevantModules } from '../../lib/module-router';

const TEST_CASES = [
  {
    id: 1,
    name: 'Functional Medicine (Sleep)',
    message: 'My child has trouble sleeping. He wakes up 2-3 times at night and seems restless.',
    expected: ['functional_medicine'],
  },
  {
    id: 2,
    name: 'Exercise Intervention',
    message: 'I want to try exercise intervention for my 8-year-old. What activities would help with focus?',
    expected: ['intervention_exercise'],
  },
  {
    id: 3,
    name: 'Behavior Training',
    message: "My son keeps interrupting when others talk and can't wait his turn. How can I help him?",
    expected: ['intervention_behavior'],
  },
  {
    id: 4,
    name: 'Multiple Modules',
    message: "My daughter has ADHD. She's always tired in the morning, loses focus easily at school, and has meltdowns after homework. What could be going on?",
    expected: ['functional_medicine', 'intervention_behavior'],
  },
  {
    id: 5,
    name: 'TCM Permission Check',
    message: 'My child sweats a lot at night and has cold hands and feet. His tongue looks pale.',
    expected: ['functional_medicine', 'intervention_tcm'],
  },
];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const testId = req.query.id ? parseInt(req.query.id as string) : null;

  try {
    // Single test case
    if (testId !== null) {
      const testCase = TEST_CASES.find(t => t.id === testId);
      if (!testCase) {
        return res.status(404).json({ error: 'Test case not found' });
      }

      console.log(`\n${'='.repeat(80)}`);
      console.log(`📝 Test ${testCase.id}: ${testCase.name}`);
      console.log(`${'='.repeat(80)}`);
      console.log(`Message: "${testCase.message}"`);

      const identified = await identifyRelevantModules(testCase.message, []);

      console.log(`Expected: [${testCase.expected.join(', ')}]`);
      console.log(`Identified: [${identified.join(', ')}]`);

      const matches = testCase.expected.every(m => identified.includes(m));
      const status = matches ? 'PASS' : 'FAIL';
      console.log(`Status: ${status}\n`);

      return res.status(200).json({
        testId: testCase.id,
        testName: testCase.name,
        message: testCase.message,
        expected: testCase.expected,
        identified,
        status,
      });
    }

    // Run all tests
    console.log('\n🧪 Running All Module Router Tests\n');
    const results = [];

    for (const testCase of TEST_CASES) {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`📝 Test ${testCase.id}: ${testCase.name}`);
      console.log(`${'='.repeat(80)}`);
      console.log(`Message: "${testCase.message}"`);

      try {
        const identified = await identifyRelevantModules(testCase.message, []);

        console.log(`Expected: [${testCase.expected.join(', ')}]`);
        console.log(`Identified: [${identified.join(', ')}]`);

        const matches = testCase.expected.every(m => identified.includes(m));
        const noExtra = identified.every(m => testCase.expected.includes(m));
        const status = matches && noExtra ? 'PASS' : (matches ? 'PARTIAL' : 'FAIL');

        console.log(`Status: ${status}\n`);

        results.push({
          testId: testCase.id,
          testName: testCase.name,
          message: testCase.message,
          expected: testCase.expected,
          identified,
          status,
        });

        // Wait a bit between tests
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Error in test ${testCase.id}:`, error);
        results.push({
          testId: testCase.id,
          testName: testCase.name,
          error: error instanceof Error ? error.message : 'Unknown error',
          status: 'ERROR',
        });
      }
    }

    const passed = results.filter(r => r.status === 'PASS' || r.status === 'PARTIAL').length;
    const total = results.length;

    console.log(`\n${'='.repeat(80)}`);
    console.log('📊 Test Summary');
    console.log(`${'='.repeat(80)}`);
    console.log(`Passed: ${passed}/${total}`);
    console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%\n`);

    return res.status(200).json({
      summary: {
        total,
        passed,
        failed: total - passed,
        successRate: `${((passed / total) * 100).toFixed(1)}%`,
      },
      results,
    });
  } catch (error) {
    console.error('[test-modules] Error:', error);
    return res.status(500).json({
      error: 'Test execution failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
