import assert from 'node:assert/strict';
import {
  applySourceBackedReviewSection,
  buildPlanFaithfulnessAuditPrompt,
  buildPlanGenerationPrompt,
  cleanPlanGenerationJson,
  describeGeneratedPlanShape,
  normalizeGeneratedPlanPresentation,
  PLAN_TITLE_MAX_LENGTH,
  reconcilePlanFaithfulnessAudit,
  validateGeneratedPlanDraft,
  validateGeneratedPlanSourceCoverage,
  validatePlanGenerationInput,
  validatePlanFaithfulnessAudit,
} from '../lib/plan-generation.ts';

const sourceId = '00000000-0000-0000-0000-000000000101';
const validInput = {
  planItemIds: [sourceId],
  manualItems: ['Keep the first work block short.'],
};
const inputResult = validatePlanGenerationInput(validInput);
assert.ok('input' in inputResult);
assert.deepEqual(inputResult.input.planItemIds, [sourceId]);

const sources = [{
  id: sourceId,
  category: 'learning',
  painPoint: 'Starting homework after dinner',
  strategySummary: 'Use a visible cue and a short child-chosen first step.',
  explanationMarkdown: 'A smaller first action may make starting easier.',
  interventionBlocks: [{ title: 'Steps', contentMarkdown: '1. Choose the first subject.\n2. Start one short task.' }],
  star: true,
  sourceType: 'chat',
}];
const prompt = buildPlanGenerationPrompt(inputResult.input, sources);
assert.match(prompt, /SAVED SOURCE 1 \[STARRED\]/);
assert.match(prompt, /When \/ Trigger/);
assert.match(prompt, /CLOSED-WORLD transformation task/);
assert.match(prompt, /Produce one unified practical plan/);
assert.match(prompt, /When \/ Trigger \| What to do \| Support \/ Setup \| Feedback \| Track/);
assert.match(prompt, /Do not add or change any actor, beneficiary, schedule, trigger/);
assert.match(prompt, /do not extend, reinterpret, or promote an instruction or observation into a new goal, tracker, or success criterion/);
assert.match(prompt, /supporting context, not implementation instructions/);
assert.match(prompt, /Never create an empty column/);
assert.match(prompt, /Keep Feedback and Track as separate optional columns/);
assert.match(prompt, /Place each source fact in exactly one best-fit column/);
assert.match(prompt, /Never repeat the same setup fact/);
assert.match(prompt, /replace the reference with the exact action names/);
assert.match(prompt, /When \/ Trigger owns timing, cadence, and schedule facts/);
assert.match(prompt, /Do not broaden, reinterpret, or replace a source schedule/);
assert.match(prompt, /different focuses or categories, preserve every selected source/);
assert.match(prompt, /selected Saved Plans use one topic/);
assert.match(prompt, /Do not create a missing-fields or "Saved Plan gaps" section/);
assert.match(prompt, new RegExp(`3 to ${PLAN_TITLE_MAX_LENGTH} characters`));

assert.deepEqual(validatePlanGenerationInput({ ...validInput, planItemIds: ['bad-id'] }), { error: 'One or more saved plan IDs are invalid' });
assert.deepEqual(validatePlanGenerationInput({ ...validInput, planItemIds: [], manualItems: [] }), { error: 'Choose at least one saved plan or add your own item' });
assert.deepEqual(validatePlanGenerationInput({ ...validInput, planItemIds: [], manualItems: ['x'.repeat(501)] }), { error: 'Custom items must be 500 characters or fewer' });
assert.equal(cleanPlanGenerationJson('```json\n{"ok":true}\n```'), '{"ok":true}');

const visualDraft = {
  painPoint: 'Homework Start Routine',
  strategySummary: 'Organize saved homework supports into one repeatable routine.',
  explanationMarkdown: 'Use the same cue and adjust the plan without blame.',
  interventionBlocks: [
    {
      title: 'Plan at a glance',
      contentMarkdown: '| When / Trigger | What to do | Support / Setup | Track |\n|---|---|---|---|\n| After dinner | Child chooses and starts one short task | Parent prepares a visible timer | Mark whether the start happened |',
    },
    { title: 'Guidance', contentMarkdown: 'Keep the first action short and repeat the saved cue consistently.' },
    { title: 'Review and adjust', contentMarkdown: 'Choose a review date and compare the observable starts.' },
    { title: 'Plan sources', contentMarkdown: '- Starting homework after dinner\n- Manual: Keep the first work block short.' },
  ],
};

const draftResult = validateGeneratedPlanDraft(visualDraft, 'learning');
assert.ok('draft' in draftResult);
assert.equal(draftResult.draft.strategy, visualDraft.strategySummary);
assert.equal(draftResult.draft.interventionBlocks.length, 4);
assert.deepEqual(
  validateGeneratedPlanDraft({ ...visualDraft, painPoint: 'x'.repeat(PLAN_TITLE_MAX_LENGTH + 1) }, 'learning'),
  { error: 'PLAN_DRAFT_TITLE_TOO_LONG' },
);

const auditPrompt = buildPlanFaithfulnessAuditPrompt(inputResult.input, sources, draftResult.draft);
assert.match(auditPrompt, /strict source-fidelity auditor|faithful CLOSED-WORLD transformation/i);
assert.match(auditPrompt, /assistance, supervision, independence level/);
assert.deepEqual(validatePlanFaithfulnessAudit({ faithful: true, issues: [] }), { audit: { faithful: true, issues: [] } });
assert.deepEqual(
  validatePlanFaithfulnessAudit({ faithful: false, issues: ['Changed parent support to independent work.'] }),
  { audit: { faithful: false, issues: ['Changed parent support to independent work.'] } },
);
assert.deepEqual(validatePlanFaithfulnessAudit({ faithful: true, issues: ['Unsupported detail'] }), { error: 'Invalid plan faithfulness audit' });
assert.deepEqual(validatePlanFaithfulnessAudit({ faithful: false, issues: [] }), { error: 'Invalid plan faithfulness audit' });

const crossCategorySources = [
  sources[0],
  { ...sources[0], id: '00000000-0000-0000-0000-000000000102', category: 'social', painPoint: 'Social scripts and memory support' },
];
const crossCategoryPrompt = buildPlanGenerationPrompt(
  { planItemIds: crossCategorySources.map((source) => source.id), manualItems: [] },
  crossCategorySources,
);
assert.match(crossCategoryPrompt, /Create one separate Markdown-table block for each topic/);
assert.match(crossCategoryPrompt, /Learning Strategies \| Social Skills/);
const crossCategoryDraft = {
  ...draftResult.draft,
  painPoint: 'Homework and social support',
  interventionBlocks: draftResult.draft.interventionBlocks.map((block) => block.title === 'Plan sources' ? {
    ...block,
    contentMarkdown: '- Starting homework after dinner\n- Social scripts and memory support',
  } : block),
};
assert.deepEqual(
  reconcilePlanFaithfulnessAudit({
    audit: {
      faithful: false,
      issues: ['The social category source is not selected for this learning plan and is an unsupported source reference.'],
    },
  }, crossCategorySources, crossCategoryDraft),
  { audit: { faithful: true, issues: [] } },
);
assert.deepEqual(
  reconcilePlanFaithfulnessAudit({
    audit: { faithful: false, issues: ['The candidate invented a new reward schedule.'] },
  }, crossCategorySources, crossCategoryDraft),
  { audit: { faithful: false, issues: ['The candidate invented a new reward schedule.'] } },
);

const trackingAndReviewSource = [{
  ...sources[0],
  strategySummary: 'Keep a home log and reassess after 4-6 weeks.',
  interventionBlocks: [
    { title: 'Observation and Tracking', contentMarkdown: 'Observe daily and note any changes in a simple home log.' },
    { title: 'Reassessment', contentMarkdown: 'Reassess after 4-6 weeks.' },
  ],
}];
const trackingAndReviewDraft = {
  ...draftResult.draft,
  interventionBlocks: [
    {
      title: 'Plan at a glance',
      contentMarkdown: '| What to do | Track |\n|---|---|\n| Complete the saved observation | Note changes in the home log |',
    },
    { title: 'Review and adjust', contentMarkdown: 'Reassess after 4 to 6 weeks.' },
    { title: 'Plan sources', contentMarkdown: '- Starting homework after dinner' },
  ],
};
assert.deepEqual(
  reconcilePlanFaithfulnessAudit({
    audit: {
      faithful: false,
      issues: [
        "The Track column converts the observation instruction into a tracking metric, which is a repurposing.",
        "The Review and adjust section places the Reassessment block in a different structure and duplicates its timing.",
      ],
    },
  }, trackingAndReviewSource, trackingAndReviewDraft),
  { audit: { faithful: true, issues: [] } },
);
assert.deepEqual(
  reconcilePlanFaithfulnessAudit({
    audit: {
      faithful: false,
      issues: [
        "The 'Review and adjust' section duplicates the exercise steps and timing, and adds a reassessment step that is not present in the original source's 'Review and adjust' section.",
        "The 'Review and adjust' section includes a reassessment step placed in a section that also contains school communication content, potentially mixing categories.",
        "The 'Plan sources' section is allowed, but the 'Review and adjust' section does not clearly separate the reassessment and duplicates the exercise steps.",
        "The reassessment was a separate intervention block and moving it into 'Review and adjust' is a repurposing of the source structure.",
        "The 'Review and adjust' block includes a 'Reassess' step with 'End of week 4-6' which is not present in the original source's plan table; the original source has a separate 'Reassessment' block, but the candidate merges it into the table and adds a 'Step' column, changing the structure.",
      ],
    },
  }, trackingAndReviewSource, trackingAndReviewDraft),
  { audit: { faithful: true, issues: [] } },
);
assert.deepEqual(
  reconcilePlanFaithfulnessAudit({
    audit: { faithful: false, issues: ['The Review and adjust section adds a new reward schedule.'] },
  }, trackingAndReviewSource, trackingAndReviewDraft),
  { audit: { faithful: false, issues: ['The Review and adjust section adds a new reward schedule.'] } },
);

const groupedCrossCategoryDraft = {
  ...crossCategoryDraft,
  interventionBlocks: [
    {
      title: 'Learning Strategies',
      contentMarkdown: '| When / Trigger | What to do |\n|---|---|\n| After dinner | Start one short task |',
    },
    {
      title: 'Social Skills',
      contentMarkdown: '| What to do |\n|---|\n| Practice the saved social script |',
    },
    crossCategoryDraft.interventionBlocks.find((block) => block.title === 'Plan sources'),
  ].filter(Boolean),
};
assert.ok('draft' in validateGeneratedPlanDraft(groupedCrossCategoryDraft, 'learning'));
assert.deepEqual(
  validateGeneratedPlanSourceCoverage(crossCategorySources, [], groupedCrossCategoryDraft),
  { covered: true, issues: [] },
);
const mixedCrossCategoryCoverage = validateGeneratedPlanSourceCoverage(crossCategorySources, [], crossCategoryDraft);
assert.equal(mixedCrossCategoryCoverage.covered, false);
assert.match(mixedCrossCategoryCoverage.issues.join(' '), /separate action-table sections|must not combine/i);

const aliasedCrossCategoryDraft = normalizeGeneratedPlanPresentation({
  ...groupedCrossCategoryDraft,
  interventionBlocks: groupedCrossCategoryDraft.interventionBlocks.map((block) => {
    if (block.title === 'Learning Strategies') {
      return {
        ...block,
        contentMarkdown: '| When | Action |\n|---|---|\n| After dinner | Start one short task |',
      };
    }
    if (block.title === 'Social Skills') {
      return {
        ...block,
        contentMarkdown: '| Trigger | Steps | Tracking |\n|---|---|---|\n| Before recess | Practice the saved social script | Mark the completed practice |',
      };
    }
    return block;
  }),
});
assert.ok('draft' in validateGeneratedPlanDraft(aliasedCrossCategoryDraft, 'learning'));
assert.match(aliasedCrossCategoryDraft.interventionBlocks[0].contentMarkdown, /^\| When \/ Trigger \| What to do \|/);
assert.match(aliasedCrossCategoryDraft.interventionBlocks[1].contentMarkdown, /^\| When \/ Trigger \| What to do \| Track \|/);
assert.deepEqual(describeGeneratedPlanShape(aliasedCrossCategoryDraft).tableHeaders, [
  { blockIndex: 0, blockLabel: 'Learning Strategies', columns: ['When / Trigger', 'What to do'] },
  { blockIndex: 1, blockLabel: 'Social Skills', columns: ['When / Trigger', 'What to do', 'Track'] },
]);

const unknownHeaderDraft = normalizeGeneratedPlanPresentation({
  ...groupedCrossCategoryDraft,
  interventionBlocks: groupedCrossCategoryDraft.interventionBlocks.map((block) => block.title === 'Social Skills' ? {
    ...block,
    contentMarkdown: '| What to do | New recommendation |\n|---|---|\n| Practice the saved social script | Add a new reward |',
  } : block),
});
assert.deepEqual(
  validateGeneratedPlanDraft(unknownHeaderDraft, 'learning'),
  { error: 'PLAN_DRAFT_INVALID_TABLE_HEADER' },
);
assert.deepEqual(describeGeneratedPlanShape(unknownHeaderDraft).tableHeaders[1], {
  blockIndex: 1,
  blockLabel: 'Social Skills',
  columns: ['What to do', 'Unrecognized column'],
});

const reviewSpecificTableDraft = normalizeGeneratedPlanPresentation({
  ...groupedCrossCategoryDraft,
  interventionBlocks: [
    ...groupedCrossCategoryDraft.interventionBlocks.filter((block) => block.title !== 'Plan sources'),
    {
      title: 'Review and adjust',
      contentMarkdown: '| Review timing | What to review | Next step |\n|---|---|---|\n| After the saved trial | Compare the saved observations | Discuss whether to continue |',
    },
    groupedCrossCategoryDraft.interventionBlocks.find((block) => block.title === 'Plan sources'),
  ].filter(Boolean),
});
assert.ok('draft' in validateGeneratedPlanDraft(reviewSpecificTableDraft, 'learning'));
assert.match(reviewSpecificTableDraft.interventionBlocks[2].contentMarkdown, /^\| Review timing \| What to review \| Next step \|/);

const reviewCoverageSource = [{
  ...sources[0],
  strategySummary: 'Try the routine for a 4-week trial before reassessment.',
  interventionBlocks: [{ title: 'Review', contentMarkdown: 'Reassess after the 4-week trial.' }],
}];
const coveredReviewDraft = {
  ...draftResult.draft,
  interventionBlocks: [
    ...draftResult.draft.interventionBlocks.filter((block) => block.title !== 'Review and adjust'),
    { title: 'Review and adjust', contentMarkdown: 'Review after the 4-week trial.' },
  ],
};
assert.deepEqual(
  validateGeneratedPlanSourceCoverage(reviewCoverageSource, [], coveredReviewDraft),
  { covered: true, issues: [] },
);
const uncoveredReview = validateGeneratedPlanSourceCoverage(
  reviewCoverageSource,
  [],
  { ...coveredReviewDraft, interventionBlocks: coveredReviewDraft.interventionBlocks.filter((block) => block.title !== 'Review and adjust') },
);
assert.equal(uncoveredReview.covered, false);
assert.match(uncoveredReview.issues.join(' '), /4[- ]week|review information/i);

const evidenceDurationSource = [{
  ...sources[0],
  strategySummary: 'Use a 4-6 week home trial before reassessment.',
  explanationMarkdown: 'Background explanation only.',
  interventionBlocks: [
    { title: 'Reassessment', contentMarkdown: 'Reassess after the 4-6 week home trial.' },
    { title: 'Why this may help', contentMarkdown: 'A cited study used a 12-week intervention.' },
  ],
}];
const evidenceDurationDraft = {
  ...draftResult.draft,
  strategySummary: 'Use the saved home trial and reassessment.',
  interventionBlocks: [
    ...draftResult.draft.interventionBlocks.filter((block) => block.title !== 'Review and adjust'),
    { title: 'Review and adjust', contentMarkdown: 'Reassess after the 4 to 6 week home trial.' },
  ],
};
assert.deepEqual(
  validateGeneratedPlanSourceCoverage(evidenceDurationSource, [], evidenceDurationDraft),
  { covered: true, issues: [] },
);
const missingOperationalRange = validateGeneratedPlanSourceCoverage(
  evidenceDurationSource,
  [],
  {
    ...evidenceDurationDraft,
    interventionBlocks: evidenceDurationDraft.interventionBlocks.map((block) => block.title === 'Review and adjust'
      ? { ...block, contentMarkdown: 'Reassess the home trial.' }
      : block),
  },
);
assert.equal(missingOperationalRange.covered, false);
assert.match(missingOperationalRange.issues.join(' '), /4-6 week/);

const deterministicReviewSources = [
  {
    ...sources[0],
    category: 'exercise',
    painPoint: 'Movement routine',
    strategySummary: 'Use the saved movement routine and reassess after 4-6 weeks.',
    interventionBlocks: [
      { title: 'Practice', contentMarkdown: 'Complete the saved movement activity.' },
      { title: 'Reassessment', contentMarkdown: '**Reassess after 4-6 weeks.** Check the saved observations.' },
      { title: 'Plan Table', contentMarkdown: '| Step | What to do | When / how often |\n|---|---|---|\n| 1 | Complete the activity | Most days |\n| 2 | Reassess the saved observations | End of week 4-6 |' },
    ],
  },
  {
    ...sources[0],
    id: '00000000-0000-0000-0000-000000000103',
    category: 'school',
    painPoint: 'School communication routine',
    strategySummary: 'Use the saved school communication routine.',
    interventionBlocks: [
      { title: 'Starter Plan', contentMarkdown: 'Use the saved weekly check in.' },
      { title: 'Watch for', contentMarkdown: '- **Progress:** Communication becomes more consistent.\n- **Needs adjustment:** Discuss the saved support option after 2 weeks.' },
    ],
  },
];
const candidateWithBrokenReview = {
  ...groupedCrossCategoryDraft,
  interventionBlocks: [
    ...groupedCrossCategoryDraft.interventionBlocks.filter((block) => block.title !== 'Plan sources').map((block) => (
      block.title === 'Learning Strategies'
        ? { ...block, contentMarkdown: `${block.contentMarkdown}\n| After 4-6 weeks | Reassess the saved observations |` }
        : block
    )),
    {
      title: 'Review and adjust',
      contentMarkdown: '| Step | What to do | When / how often ||---|---|---|| 1 | Duplicate every action | Daily |',
    },
    groupedCrossCategoryDraft.interventionBlocks.find((block) => block.title === 'Plan sources'),
  ].filter(Boolean),
};
const deterministicReviewDraft = applySourceBackedReviewSection(candidateWithBrokenReview, deterministicReviewSources);
const deterministicReviewBlock = deterministicReviewDraft.interventionBlocks.find((block) => block.title === 'Review and adjust');
assert.ok(deterministicReviewBlock);
assert.match(deterministicReviewBlock.contentMarkdown, /### Movement routine/);
assert.match(deterministicReviewBlock.contentMarkdown, /Reassess after 4-6 weeks/);
assert.match(deterministicReviewBlock.contentMarkdown, /### School communication routine/);
assert.match(deterministicReviewBlock.contentMarkdown, /Needs adjustment/);
assert.doesNotMatch(deterministicReviewBlock.contentMarkdown, /Duplicate every action|\| Step \|/);
const deterministicLearningBlock = deterministicReviewDraft.interventionBlocks.find((block) => block.title === 'Learning Strategies');
assert.ok(deterministicLearningBlock);
assert.doesNotMatch(deterministicLearningBlock.contentMarkdown, /Reassess the saved observations/);

const noReviewSource = [{
  ...sources[0],
  strategySummary: 'Use the saved action.',
  interventionBlocks: [{ title: 'Steps', contentMarkdown: 'Complete the saved action.' }],
}];
const hallucinatedReviewRemoved = applySourceBackedReviewSection(candidateWithBrokenReview, noReviewSource);
assert.equal(hallucinatedReviewRemoved.interventionBlocks.some((block) => block.title === 'Review and adjust'), false);

assert.deepEqual(
  validateGeneratedPlanDraft({ ...visualDraft, interventionBlocks: visualDraft.interventionBlocks.slice(1) }, 'learning'),
  { error: 'PLAN_DRAFT_INVALID_TABLE_HEADER' },
);
assert.deepEqual(
  validateGeneratedPlanDraft({
    ...visualDraft,
    interventionBlocks: visualDraft.interventionBlocks.map((block, index) => index === 0 ? {
      ...block,
      contentMarkdown: '| When / Trigger | What to do | Support / Setup | Feedback |\n|---|---|---|---|\n| After dinner | Start one task | Use timer | Not specified |',
    } : block),
  }, 'learning'),
  { error: 'PLAN_DRAFT_INVALID_TABLE_ROWS' },
);
const minimalSourceBackedDraft = {
  ...visualDraft,
  interventionBlocks: visualDraft.interventionBlocks.filter((block) => block.title !== 'Review and adjust').map((block, index) => index === 0 ? {
    ...block,
    contentMarkdown: '| What to do |\n|---|\n| Start one short task |',
  } : block),
};
assert.ok('draft' in validateGeneratedPlanDraft(minimalSourceBackedDraft, 'learning'));

const legacySparseDraft = {
  ...visualDraft,
  interventionBlocks: visualDraft.interventionBlocks.map((block, index) => index === 0 ? {
    ...block,
    contentMarkdown: '| When / Trigger | What to do | Support / Setup | Feedback / Track |\n|---|---|---|---|\n| Daily | Complete 10 repetitions | Actor not specified. Bare feet, seated | Feedback: Not specified. Track: Not specified. |',
  } : block.title === 'Review and adjust' ? {
    ...block,
    contentMarkdown: 'Review date: After 4 weeks. Measure: Not specified. Note: Discuss before changing the plan.',
  } : block),
};
const normalizedLegacyDraft = normalizeGeneratedPlanPresentation(legacySparseDraft);
assert.ok('draft' in validateGeneratedPlanDraft(normalizedLegacyDraft, 'exercise'));
const normalizedLegacyTable = normalizedLegacyDraft.interventionBlocks[0].contentMarkdown;
assert.match(normalizedLegacyTable, /\| When \/ Trigger \| What to do \| Support \/ Setup \|/);
assert.doesNotMatch(normalizedLegacyTable, /Feedback|Track|Actor not specified|Not specified/);
assert.doesNotMatch(normalizedLegacyDraft.interventionBlocks[2].contentMarkdown, /Measure|Not specified/);

const variedEmptyReviewDraft = normalizeGeneratedPlanPresentation({
  ...visualDraft,
  interventionBlocks: visualDraft.interventionBlocks.map((block) => block.title === 'Review and adjust' ? {
    ...block,
    contentMarkdown: 'Review date: After 4 weeks. Observable measure: Not specified. Adjustment: Not specified.',
  } : block),
});
assert.ok('draft' in validateGeneratedPlanDraft(variedEmptyReviewDraft, 'exercise'));
const cleanedVariedReview = variedEmptyReviewDraft.interventionBlocks.find((block) => block.title === 'Review and adjust');
assert.equal(cleanedVariedReview.contentMarkdown, 'Review date: After 4 weeks.');

const appendedGenericReviewDraft = normalizeGeneratedPlanPresentation({
  ...visualDraft,
  interventionBlocks: visualDraft.interventionBlocks.map((block) => block.title === 'Review and adjust' ? {
    ...block,
    contentMarkdown: 'Review interval: 4-week trial before reassessment discuss source-backed observations before changing the plan.',
  } : block),
});
const cleanedAppendedReview = appendedGenericReviewDraft.interventionBlocks.find((block) => block.title === 'Review and adjust');
assert.equal(cleanedAppendedReview.contentMarkdown, 'Review interval: 4-week trial before reassessment');

const markdownEmptyReviewDraft = normalizeGeneratedPlanPresentation({
  ...visualDraft,
  interventionBlocks: visualDraft.interventionBlocks.map((block) => block.title === 'Review and adjust' ? {
    ...block,
    contentMarkdown: 'Review date: After 4 weeks. **Observable measure:** Not specified. **Adjustment:** Not specified.',
  } : block),
});
assert.ok('draft' in validateGeneratedPlanDraft(markdownEmptyReviewDraft, 'exercise'));
const cleanedMarkdownReview = markdownEmptyReviewDraft.interventionBlocks.find((block) => block.title === 'Review and adjust');
assert.equal(cleanedMarkdownReview.contentMarkdown, 'Review date: After 4 weeks.');

const reversedColumnsDraft = normalizeGeneratedPlanPresentation({
  ...visualDraft,
  interventionBlocks: visualDraft.interventionBlocks.map((block, index) => index === 0 ? {
    ...block,
    contentMarkdown: '| What to do | When / Trigger |\n|---|---|\n| Start one task | After dinner |',
  } : block),
});
assert.ok('draft' in validateGeneratedPlanDraft(reversedColumnsDraft, 'learning'));
assert.match(reversedColumnsDraft.interventionBlocks[0].contentMarkdown, /^\| When \/ Trigger \| What to do \|/);

const duplicatedSetupDraft = normalizeGeneratedPlanPresentation({
  ...visualDraft,
  interventionBlocks: visualDraft.interventionBlocks.map((block, index) => index === 0 ? {
    ...block,
    contentMarkdown: '| When / Trigger | What to do | Support / Setup |\n|---|---|---|\n| Daily | Stand holding onto a counter and rise onto tiptoes | Stand holding onto a counter |',
  } : block),
});
assert.ok('draft' in validateGeneratedPlanDraft(duplicatedSetupDraft, 'exercise'));
assert.doesNotMatch(duplicatedSetupDraft.interventionBlocks[0].contentMarkdown, /Support \/ Setup/);

const numberedReferenceDraft = normalizeGeneratedPlanPresentation({
  ...visualDraft,
  interventionBlocks: visualDraft.interventionBlocks.map((block, index) => index === 0 ? {
    ...block,
    contentMarkdown: '| When / Trigger | What to do |\n|---|---|\n| Daily | **Short-Foot Exercise:** Complete the saved exercise |\n| Daily | **Heel-Rise Practice:** Complete the saved exercise |\n| During breaks | **Maintenance:** Continue Steps 1 and 2 at least 3 times per week |',
  } : block),
});
const numberedReferenceTable = numberedReferenceDraft.interventionBlocks[0].contentMarkdown;
assert.doesNotMatch(numberedReferenceTable, /Steps 1 and 2/);
assert.match(numberedReferenceTable, /Continue Short-Foot Exercise and Heel-Rise Practice at least 3 times per week/);

const misplacedScheduleDraft = normalizeGeneratedPlanPresentation({
  ...visualDraft,
  interventionBlocks: visualDraft.interventionBlocks.map((block, index) => index === 0 ? {
    ...block,
    contentMarkdown: "| When / Trigger | What to do |\n|---|---|\n| Maintain during all weeks, even 'off' weeks | **Prevent Regression:** During school breaks or holidays, maintain a minimum routine of Short-Foot Exercise and Heel-Rise Practice at least 3 times per week. |",
  } : block),
});
const normalizedScheduleTable = misplacedScheduleDraft.interventionBlocks[0].contentMarkdown;
assert.match(normalizedScheduleTable, /\| Maintain during all weeks, even 'off' weeks; During school breaks or holidays; at least 3 times per week \|/);
assert.match(normalizedScheduleTable, /\*\*Prevent Regression:\*\* Maintain a minimum routine of Short-Foot Exercise and Heel-Rise Practice\./);
assert.equal((normalizedScheduleTable.match(/school breaks or holidays/g) || []).length, 1);

const misplacedSectionsDraft = normalizeGeneratedPlanPresentation({
  painPoint: 'Short-Foot Exercise',
  strategySummary: 'Complete the saved short-foot exercise daily.',
  explanationMarkdown: 'The saved action is organized into one row.',
  interventionBlocks: [{
    title: 'Plan at a glance',
    contentMarkdown: '| When / Trigger | What to do |\n|---|---|\n| Daily | Complete the saved short-foot exercise |',
  }],
  'Saved Plan gaps': ['Feedback', 'Tracking'],
  'Plan sources': ['Manual source 1'],
});
assert.ok('draft' in validateGeneratedPlanDraft(misplacedSectionsDraft, 'exercise'));
assert.equal(misplacedSectionsDraft.interventionBlocks.length, 2);
assert.equal(misplacedSectionsDraft.interventionBlocks[1].title, 'Plan sources');
assert.deepEqual(
  validateGeneratedPlanDraft({
    ...visualDraft,
    interventionBlocks: visualDraft.interventionBlocks.map((block, index) => index === 0 ? {
      ...block,
      contentMarkdown: '| When / Trigger | What to do | Feedback |\n|---|---|---|\n| After dinner | Start one task | — |',
    } : block),
  }, 'learning'),
  { error: 'PLAN_DRAFT_EMPTY_OPTIONAL_COLUMN' },
);
assert.deepEqual(
  validateGeneratedPlanDraft({
    ...visualDraft,
    interventionBlocks: visualDraft.interventionBlocks.map((block, index) => index === 0 ? {
      ...block,
      contentMarkdown: '| When / Trigger | Who | What to do | Cue / Setup | Immediate feedback | How to track |\n|---|---|---|---|---|---|\n| After dinner | Parent | Start | Timer | Praise | Check |',
    } : block),
  }, 'learning'),
  { error: 'PLAN_DRAFT_INVALID_TABLE_HEADER' },
);
assert.deepEqual(
  validateGeneratedPlanDraft({ ...visualDraft, strategySummary: 'Give 20 mg and increase the dose tomorrow.' }, 'learning'),
  { error: 'Unsafe or unsupported plan draft' },
);
assert.deepEqual(
  validateGeneratedPlanDraft({ ...visualDraft, strategySummary: '明天开始给孩子吃20毫克药物。' }, 'learning'),
  { error: 'Unsafe or unsupported plan draft' },
);

console.log('Plan generation validation passed.');
