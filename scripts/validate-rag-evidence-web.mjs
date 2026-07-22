import assert from 'node:assert/strict';
import {
  detectEvidenceQuestionType,
  groupEvidenceForInjection,
  parseRelevanceGateAssessments,
  parseRelevanceGateDecisions,
} from '../lib/rag-evidence.ts';

const bigToeQuestion = "Can exercising my son's big toe make his collapsed arch better?";

assert.equal(detectEvidenceQuestionType(bigToeQuestion), 'intervention');
assert.equal(
  detectEvidenceQuestionType('His working memory test scores changed this year.'),
  'background',
  'The bare word test must not turn an observation into a diagnostic question.',
);

const judged = parseRelevanceGateAssessments(JSON.stringify({
  question_specificity: 'named_specific',
  decisions: [
    { i: 0, relevance_score: 3, intervention_match: 'exact', keep: true, reason: 'exact intervention' },
    { i: 1, relevance_score: 2, intervention_match: 'adjacent', keep: true, reason: 'different intervention' },
    { i: 2, relevance_score: 1, intervention_match: 'none', keep: true, reason: 'broad foot background' },
  ],
}), 3);

assert.deepEqual(judged.map(item => item.keep), [true, true, false]);
assert.deepEqual(
  parseRelevanceGateDecisions('[{"i":0,"keep":false},{"i":1,"keep":true}]', 2),
  [false, true],
  'Legacy keep/drop judge output remains rollback-compatible.',
);
assert.deepEqual(
  parseRelevanceGateAssessments('not json', 2).map(item => item.keep),
  [true, true],
  'Unparseable judge output fails open.',
);

const basePaper = {
  score: 80,
  abstract: 'A randomized controlled trial in children examined foot exercise outcomes.',
  types: ['Randomized Controlled Trial'],
  rag_question_specificity: 'named_specific',
};
const exact = {
  ...basePaper,
  title: 'Big-toe exercise for flexible flatfoot in children',
  pmid: 'exact',
  rag_relevance_score: 3,
  rag_intervention_match: 'exact',
};
const adjacent = {
  ...basePaper,
  title: 'Intrinsic foot stretching in children with cerebral palsy',
  pmid: 'adjacent',
  rag_relevance_score: 2,
  rag_intervention_match: 'adjacent',
};
const groups = groupEvidenceForInjection([adjacent, exact], bigToeQuestion);

assert.deepEqual(groups.primary.map(paper => paper.pmid), ['exact']);
assert.deepEqual(groups.supporting.map(paper => paper.pmid), ['adjacent']);

const unknownGroups = groupEvidenceForInjection([
  {
    ...basePaper,
    title: 'Unassessed intervention paper',
    pmid: 'unknown',
    rag_relevance_score: null,
    rag_intervention_match: 'unknown',
    rag_question_specificity: 'unknown',
  },
], bigToeQuestion);
assert.equal(unknownGroups.primary.length, 0, 'Unknown directness must not become primary for a named intervention.');
assert.equal(unknownGroups.supporting.length, 1);

console.log('RAG evidence validation passed: 10 assertions.');
