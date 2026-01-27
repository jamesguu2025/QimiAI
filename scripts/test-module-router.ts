/**
 * Module Router Test Script
 * Tests the module identification system with predefined test cases
 */

import { identifyRelevantModules } from '../lib/module-router';

// Test cases from the test plan
const TEST_CASES = [
  {
    name: 'Test 1: Functional Medicine (Sleep Issues)',
    message: 'My child has trouble sleeping. He wakes up 2-3 times at night and seems restless.',
    expectedModules: ['functional_medicine'],
  },
  {
    name: 'Test 2: Exercise Intervention',
    message: 'I want to try exercise intervention for my 8-year-old. What activities would help with focus?',
    expectedModules: ['intervention_exercise'],
  },
  {
    name: 'Test 3: Behavior Training',
    message: "My son keeps interrupting when others talk and can't wait his turn. How can I help him?",
    expectedModules: ['intervention_behavior'],
  },
  {
    name: 'Test 4: Multiple Modules',
    message: "My daughter has ADHD. She's always tired in the morning, loses focus easily at school, and has meltdowns after homework. What could be going on?",
    expectedModules: ['functional_medicine', 'intervention_behavior'],
  },
  {
    name: 'Test 5: TCM Permission Check',
    message: 'My child sweats a lot at night and has cold hands and feet. His tongue looks pale.',
    expectedModules: ['functional_medicine', 'intervention_tcm'],
  },
];

async function runTests() {
  console.log('🧪 Starting Module Router Tests\n');

  let passed = 0;
  let failed = 0;

  for (const testCase of TEST_CASES) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`📝 ${testCase.name}`);
    console.log(`${'='.repeat(80)}`);
    console.log(`\n📩 User Message:\n"${testCase.message}"\n`);
    console.log(`🎯 Expected Modules: ${testCase.expectedModules.join(', ') || 'none'}\n`);

    try {
      const identifiedModules = await identifyRelevantModules(testCase.message, []);

      console.log(`✅ Identified Modules: ${identifiedModules.join(', ') || 'none'}\n`);

      // Check if identified modules match expected
      const matches = testCase.expectedModules.every(m => identifiedModules.includes(m));
      const noExtra = identifiedModules.every(m => testCase.expectedModules.includes(m));

      if (matches && noExtra) {
        console.log('✅ TEST PASSED: Modules match expected\n');
        passed++;
      } else if (matches) {
        console.log('⚠️  TEST PARTIAL: Expected modules identified, but has extra modules\n');
        passed++;
      } else {
        console.log('❌ TEST FAILED: Missing expected modules or incorrect identification\n');
        failed++;
      }
    } catch (error) {
      console.error('❌ TEST ERROR:', error);
      failed++;
    }

    // Wait a bit between tests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log('📊 Test Results');
  console.log(`${'='.repeat(80)}`);
  console.log(`✅ Passed: ${passed}/${TEST_CASES.length}`);
  console.log(`❌ Failed: ${failed}/${TEST_CASES.length}`);
  console.log(`Success Rate: ${((passed / TEST_CASES.length) * 100).toFixed(1)}%\n`);
}

// Run tests
runTests().catch(console.error);
