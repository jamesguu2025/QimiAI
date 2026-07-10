/**
 * RAG evidence judgment layer — post-retrieval rerank + tiering.
 *
 * Ported from the mini-program (adhdhelper-server `api/services/rag-service.js`,
 * functions `detectEvidenceQuestionType` / `classifyEvidenceForQuestion` /
 * `rankPapersForInjection` / `selectEvidenceForInjection`) so the web version
 * matches the mini-program's retrieval precision.
 *
 * Design notes (so this stays cheap to extract into the shared @qimi/rag-core
 * package later — see optimization-backlog):
 * - PURE functions only. No imports from Next/web. No Redis/OSS/network.
 * - The judgment emits NEUTRAL reason codes + a tier, never localized prose.
 *   Each app maps codes → its own wording (Chinese for mini, English here),
 *   so one judgment core can serve both sides while prompts stay per-locale.
 * - Scoring is kept numerically identical to the mini-program source so the two
 *   sides rank the same way until they are unified behind one package.
 *
 * Both the question text and paper text are matched bilingually (en + zh), so
 * this core is language-agnostic by construction.
 */

export type EvidenceQuestionType =
  | 'prognosis'
  | 'intervention'
  | 'diagnosis'
  | 'etiology'
  | 'background';

export type EvidenceTier = 'strong' | 'moderate' | 'low_extrapolation' | 'background';

/** Neutral reason codes. Locale wording is applied by the consuming app. */
export type EvidenceReasonCode =
  | 'high_evidence_flag'
  | 'systematic_review'
  | 'rct'
  | 'clinical_trial'
  | 'review'
  | 'longitudinal_trajectory'
  | 'intervention_not_prognosis'
  | 'association_risk_factor'
  | 'diagnostic_study'
  | 'match_population_adhd'
  | 'match_age_child'
  | 'match_outcome_cognition'
  | 'title_match_cognition'
  | 'off_topic_mood'
  | 'off_topic_reading_language'
  | 'off_topic_social'
  | 'not_cognitive_trajectory'
  | 'preprint'
  | 'case_report'
  | 'feasibility_pilot'
  | 'protocol'
  | 'animal_cross_species'
  | 'non_target_asd'
  | 'non_target_age_older'
  | 'sex_mismatch'
  | 'non_target_preterm'
  | 'non_target_psychiatric';

export interface EvidenceAssessment {
  tier: EvidenceTier;
  rankBonus: number;
  reasonCodes: EvidenceReasonCode[];
}

/** Minimal structural shape this layer needs; PaperResult satisfies it. */
export interface EvidencePaperLike {
  title?: string;
  abstract?: string;
  types?: string[] | string;
  journal?: string;
  topic?: string;
  topics?: string[] | string;
  score?: number;
  pmid?: string;
  doi?: string;
  is_high_evidence?: boolean;
}

export interface EvidenceGroups<T extends EvidencePaperLike> {
  questionType: EvidenceQuestionType;
  primary: T[];
  supporting: T[];
}

const LOW_EXTRAPOLATION_CODES: ReadonlySet<EvidenceReasonCode> = new Set([
  'preprint',
  'case_report',
  'animal_cross_species',
  'non_target_asd',
  'non_target_age_older',
  'non_target_preterm',
  'non_target_psychiatric',
  'sex_mismatch',
  'off_topic_mood',
  'off_topic_reading_language',
  'off_topic_social',
  'not_cognitive_trajectory',
]);

function paperText(paper: EvidencePaperLike): string {
  const title = String(paper?.title || '');
  const abstract = String(paper?.abstract || '');
  const types = Array.isArray(paper?.types) ? paper.types.join(' ') : String(paper?.types || '');
  const journal = String(paper?.journal || '');
  const topics = Array.isArray(paper?.topics)
    ? paper.topics.join(' ')
    : String(paper?.topics || paper?.topic || '');
  return `${title} ${abstract} ${types} ${journal} ${topics}`.toLowerCase();
}

export function detectEvidenceQuestionType(questionText = ''): EvidenceQuestionType {
  const q = String(questionText || '').toLowerCase();
  if (/自然改善|随.*年龄|长大|发育.*改善|轨迹|预后|会不会.*改善|能不能.*追上|prognosis|trajectory|maturation|developmental/.test(q)) {
    return 'prognosis';
  }
  if (/训练|干预|治疗|补充|药|运动|方案|有没有用|有效|改善.*方法|intervention|treatment|training|therapy/.test(q)) {
    return 'intervention';
  }
  if (/诊断|筛查|评估|量表|检查|是不是.*adhd|是不是.*自闭|diagnos|screen|assessment|test/.test(q)) {
    return 'diagnosis';
  }
  if (/相关|原因|导致|影响|风险|解释|为什么|etiology|cause|associated|risk/.test(q)) {
    return 'etiology';
  }
  return 'background';
}

/**
 * Re-score a single paper by evidence strength + population/age/outcome match.
 * Returns a neutral assessment (tier + rankBonus + reason codes).
 *
 * The numeric weights mirror the mini-program source exactly.
 */
export function classifyEvidenceForQuestion(
  paper: EvidencePaperLike,
  userQuestion = '',
): EvidenceAssessment {
  const q = String(userQuestion || '').toLowerCase();
  const title = String(paper?.title || '');
  const text = paperText(paper);

  let rankBonus = 0;
  const codes: EvidenceReasonCode[] = [];
  const questionType = detectEvidenceQuestionType(q);
  const isInterventionStudy = /intervention|training|treatment|therapy|treated|control group|randomi[sz]ed|clinical trial|pre-post|pre post|neurofeedback|cogmed|训练|干预|治疗/.test(text);
  const isPrognosisTrajectoryStudy = /longitudinal|trajectory|trajectories|maturation|follow-up|follow up|from childhood to (young )?adulthood|from .*childhood.*adulthood|10-year|16-year|随访|纵向|成熟|轨迹/.test(text);

  if (paper?.is_high_evidence) {
    rankBonus += questionType === 'prognosis' && isInterventionStudy ? 4 : 10;
    codes.push('high_evidence_flag');
  }
  if (/meta-analysis|systematic review|荟萃|系统综述/.test(text)) {
    rankBonus += questionType === 'background' ? 14 : 18;
    codes.push('systematic_review');
  } else if (/randomi[sz]ed controlled trial|randomised controlled trial|\brct\b/.test(text)) {
    rankBonus += questionType === 'intervention' ? 18 : 4;
    codes.push('rct');
  } else if (/clinical trial/.test(text)) {
    rankBonus += questionType === 'intervention' ? 10 : 2;
    codes.push('clinical_trial');
  } else if (/\breview\b/.test(text)) {
    rankBonus += 5;
    codes.push('review');
  }

  if (questionType === 'prognosis' && !isInterventionStudy && isPrognosisTrajectoryStudy) {
    rankBonus += 18;
    codes.push('longitudinal_trajectory');
  }
  if (questionType === 'prognosis' && isInterventionStudy) {
    rankBonus -= 8;
    codes.push('intervention_not_prognosis');
  }
  if (questionType === 'etiology' && /cohort|case-control|association|associated|risk factor|predict|相关|风险因素|预测/.test(text)) {
    rankBonus += 10;
    codes.push('association_risk_factor');
  }
  if (questionType === 'diagnosis' && /diagnostic|sensitivity|specificity|screening|validation|评估|筛查|敏感性|特异性|验证/.test(text)) {
    rankBonus += 12;
    codes.push('diagnostic_study');
  }

  const asksAdhd = /adhd|attention deficit|多动|注意/.test(q);
  const asksChild = /child|children|adolescent|youth|kid|孩子|儿童|青少年|男孩|女孩/.test(q);
  const asksWorkingMemory = /working memory|executive|cognitive|认知|理解|工作记忆|执行功能/.test(q);

  if (asksAdhd && /adhd|attention deficit|hyperactivity/.test(text)) {
    rankBonus += 6;
    codes.push('match_population_adhd');
  }
  if (asksChild && /child|children|adolescent|youth|pediatric|paediatric|儿童|青少年/.test(text)) {
    rankBonus += 6;
    codes.push('match_age_child');
  }
  if (asksWorkingMemory && /working memory|executive|cognitive|认知|工作记忆|执行功能/.test(text)) {
    rankBonus += 6;
    codes.push('match_outcome_cognition');
  }

  if (asksWorkingMemory) {
    const titleText = title.toLowerCase();
    const titleHasCoreOutcome = /working memory|executive|cognitive|cognition|认知|工作记忆|执行功能/.test(titleText);
    if (titleHasCoreOutcome) {
      rankBonus += 8;
      codes.push('title_match_cognition');
    }
    if (!/depress|抑郁|情绪/.test(q) && /depress|mood disorder|affective|抑郁|情绪障碍/.test(text)) {
      rankBonus -= 14;
      codes.push('off_topic_mood');
    }
    if (!/reading|dyslexia|language|读|阅读|语言/.test(q) && /reading|dyslexia|language disorder|developmental language|word reading|spelling|phonological|阅读|读写|语言障碍|拼写/.test(text)) {
      rankBonus -= 12;
      codes.push('off_topic_reading_language');
    }
    if (!/peer|social|同伴|社交/.test(q) && /peer preference|peer problems|social|同伴|社交/.test(text)) {
      rankBonus -= 12;
      codes.push('off_topic_social');
    }
    if (questionType === 'prognosis' && !titleHasCoreOutcome && !isPrognosisTrajectoryStudy) {
      rankBonus -= 10;
      codes.push('not_cognitive_trajectory');
    }
  }

  if (/preprint|biorxiv|medrxiv/.test(text)) {
    rankBonus -= 18;
    codes.push('preprint');
  }
  if (/case report|case-based|proof-of-concept/.test(text)) {
    rankBonus -= 12;
    codes.push('case_report');
  }
  // Pilot / feasibility / small-sample studies: by design not powered for efficacy.
  // Keep them citable (light penalty -> stays in the supporting tier, never dropped
  // just for being weak) but out of PRIMARY, and label them so the answer flags the
  // limits instead of over-stating them. Tier resolves to 'background', not the
  // heavier 'low_extrapolation', so they are not squeezed out of injection.
  if (/\bfeasibility\b|\bpilot stud|\bpilot trial|\bpilot test|preliminary stud|small sample|small-scale/.test(text)) {
    rankBonus -= 6;
    codes.push('feasibility_pilot');
  }
  if (/protocol/.test(text)) {
    rankBonus -= 10;
    codes.push('protocol');
  }
  if (/monkey|macaque|animal model|non-human|cross-species|猕猴|动物|跨物种/.test(text)) {
    rankBonus -= 22;
    codes.push('animal_cross_species');
  }
  if (!/autism|asd|自闭/.test(q) && /\basd\b|autism|autistic|自闭/.test(text)) {
    rankBonus -= 20;
    codes.push('non_target_asd');
  }
  if (!/aging|older|老年|成人|衰老/.test(q) && /older adult|gerontolog|age-related decline|aging|老年|衰老/.test(text)) {
    rankBonus -= 18;
    codes.push('non_target_age_older');
  }
  if (/男孩|boy|male/.test(q) && /females|female|girls|女孩/.test(text) && !/males|male|boys|男孩/.test(text)) {
    rankBonus -= 6;
    codes.push('sex_mismatch');
  }
  if (!/早产|preterm/.test(q) && /very preterm|preterm children|premature/.test(text)) {
    rankBonus -= 18;
    codes.push('non_target_preterm');
  }
  if (!/psychosis|精神病|双相|bipolar|schizophrenia|精神分裂/.test(q) && /first-episode psychosis|psychosis|bipolar disorder|pbd|schizophrenia|精神分裂/.test(text)) {
    rankBonus -= 20;
    codes.push('non_target_psychiatric');
  }

  const tier = deriveTier(codes, questionType, isInterventionStudy, paper);
  return { tier, rankBonus, reasonCodes: codes };
}

function deriveTier(
  codes: EvidenceReasonCode[],
  questionType: EvidenceQuestionType,
  isInterventionStudy: boolean,
  paper: EvidencePaperLike,
): EvidenceTier {
  if (codes.some(code => LOW_EXTRAPOLATION_CODES.has(code))) {
    return 'low_extrapolation';
  }
  const strong =
    codes.includes('systematic_review') ||
    (questionType === 'intervention' && codes.includes('rct')) ||
    (questionType === 'prognosis' && codes.includes('longitudinal_trajectory')) ||
    (questionType === 'diagnosis' && codes.includes('diagnostic_study')) ||
    (Boolean(paper?.is_high_evidence) && !(questionType === 'prognosis' && isInterventionStudy));
  if (strong) return 'strong';
  if (codes.includes('clinical_trial') || codes.includes('review')) return 'moderate';
  return 'background';
}

/**
 * Re-rank papers for injection. RAG semantic score reflects similarity, not
 * medical/educational evidence strength; this avoids the model being pulled by
 * high-similarity / low-evidence papers.
 */
export function rankPapersForInjection<T extends EvidencePaperLike>(
  papers: T[],
  userQuestion = '',
): Array<{ paper: T; assessment: EvidenceAssessment; combinedScore: number }> {
  const safePapers = Array.isArray(papers) ? papers : [];
  return safePapers
    .map((paper, index) => {
      const assessment = classifyEvidenceForQuestion(paper, userQuestion);
      const semanticScore = Number(paper.score) || 0;
      const tierPenalty =
        assessment.tier === 'low_extrapolation' ? -30 : assessment.tier === 'background' ? -8 : 0;
      const prognosisInterventionPenalty = assessment.reasonCodes.includes('intervention_not_prognosis')
        ? -25
        : 0;
      return {
        paper,
        assessment,
        index,
        combinedScore: semanticScore + assessment.rankBonus + tierPenalty + prognosisInterventionPenalty,
      };
    })
    .sort((a, b) => {
      if (b.combinedScore !== a.combinedScore) return b.combinedScore - a.combinedScore;
      return a.index - b.index;
    })
    .map(({ paper, assessment, combinedScore }) => ({ paper, assessment, combinedScore }));
}

/**
 * Split ranked papers into primary (can answer the core question) and supporting
 * (background / adjacent only) tiers, capping how many of each get injected.
 */
export function selectEvidenceForInjection<T extends EvidencePaperLike>(
  ranked: Array<{ paper: T; assessment: EvidenceAssessment }>,
  userQuestion = '',
): EvidenceGroups<T> {
  const questionType = detectEvidenceQuestionType(userQuestion);
  const primary: T[] = [];
  const supporting: T[] = [];
  const seen = new Set<string>();

  for (const { paper, assessment } of ranked) {
    const key = paper.pmid || paper.doi || paper.title || '';
    if (!key || seen.has(key)) continue;

    const isLow = assessment.tier === 'low_extrapolation';
    const isBackground = assessment.tier === 'background';
    const isInterventionForPrognosis = assessment.reasonCodes.includes('intervention_not_prognosis');
    const isTrajectory = assessment.reasonCodes.includes('longitudinal_trajectory');
    const matchesAdhd = assessment.reasonCodes.includes('match_population_adhd');
    const matchesAge = assessment.reasonCodes.includes('match_age_child');
    const matchesOutcome = assessment.reasonCodes.includes('match_outcome_cognition');

    let isPrimary = false;
    if (questionType === 'prognosis') {
      isPrimary = !isLow && !isBackground && !isInterventionForPrognosis && isTrajectory && matchesAdhd && matchesAge && matchesOutcome;
    } else {
      isPrimary = !isLow && !isBackground;
    }

    if (isPrimary && primary.length < 5) {
      primary.push(paper);
      seen.add(key);
    } else if (supporting.length < 3) {
      supporting.push(paper);
      seen.add(key);
    }

    if (primary.length >= 5 && supporting.length >= 3) break;
  }

  return { questionType, primary, supporting };
}

/**
 * Convenience: full rerank + tiering in one call.
 */
export function groupEvidenceForInjection<T extends EvidencePaperLike>(
  papers: T[],
  userQuestion = '',
): EvidenceGroups<T> {
  return selectEvidenceForInjection(rankPapersForInjection(papers, userQuestion), userQuestion);
}

/* --------------------------------------------------------------------------
 * Locale wording — English. (Mini-program keeps its own Chinese wording.)
 * Lives next to the core for now; moves to the consuming app on extraction.
 * ------------------------------------------------------------------------ */

const REASON_CODE_EN: Record<EvidenceReasonCode, string> = {
  high_evidence_flag: 'flagged high-quality evidence',
  systematic_review: 'systematic review / meta-analysis',
  rct: 'randomized controlled trial',
  clinical_trial: 'clinical trial',
  review: 'narrative review',
  longitudinal_trajectory: 'longitudinal / developmental-trajectory study',
  intervention_not_prognosis: 'intervention study — cannot answer natural prognosis',
  association_risk_factor: 'association / risk-factor study',
  diagnostic_study: 'diagnostic / assessment study',
  match_population_adhd: 'population matches ADHD',
  match_age_child: 'age matches child / adolescent',
  match_outcome_cognition: 'outcome matches cognition / working memory',
  title_match_cognition: 'title directly matches cognition / working memory',
  off_topic_mood: 'topic drifts to mood / depression',
  off_topic_reading_language: 'topic drifts to reading / language',
  off_topic_social: 'topic drifts to peer / social',
  not_cognitive_trajectory: 'does not directly address cognitive trajectory',
  preprint: 'preprint',
  case_report: 'case report / proof-of-concept',
  feasibility_pilot: 'small pilot / feasibility study (preliminary, not powered for efficacy)',
  protocol: 'study protocol',
  animal_cross_species: 'animal / cross-species background',
  non_target_asd: 'off-target population (ASD)',
  non_target_age_older: 'off-target age (older adults / aging)',
  sex_mismatch: 'sex sample mismatch',
  non_target_preterm: 'off-target population (preterm children)',
  non_target_psychiatric: 'off-target psychiatric population',
};

const TIER_EN: Record<EvidenceTier, string> = {
  strong: 'Stronger evidence — usable to support the core answer, after confirming the population, age, and outcome match this child',
  moderate: 'Moderate evidence — supports a general direction, not an individual-case conclusion',
  low_extrapolation: 'Low-extrapolation evidence — background clue or low-confidence inference only, not direct evidence',
  background: 'Background evidence — explains general mechanism, cannot support an individual-case conclusion',
};

/** Render a neutral assessment into an English evidence-positioning line. */
export function describeEvidenceEn(assessment: EvidenceAssessment): string {
  const reasons = assessment.reasonCodes.map(code => REASON_CODE_EN[code]).filter(Boolean);
  const tail = reasons.length ? ` (${reasons.join('; ')})` : '';
  return `${TIER_EN[assessment.tier]}${tail}`;
}

/* --------------------------------------------------------------------------
 * Cross-domain relevance gate (stage-1 of two-stage retrieval).
 *
 * The evidence tiering above rewards study design (systematic review, RCT…) but
 * has NO cross-domain relevance check — so an off-domain systematic review
 * (e.g. bariatric-surgery guidelines for a child's flatfoot question) can be
 * promoted to PRIMARY. Verified: the mini-program shares this blind spot.
 *
 * Fix (evidence-based: two-stage retrieve -> relevance rerank, +10-48% precision
 * — cross-encoder / Cohere Rerank is the gold standard). First cut here is an
 * LLM-as-relevance-judge, which fits the existing pipeline without a new vendor.
 * These two functions are PURE (prompt build + response parse); the consuming
 * app supplies the LLM call between them, so the judgment stays extraction-ready
 * and both web + mini can share one implementation while the model/vendor swaps.
 * ------------------------------------------------------------------------ */

export interface RelevanceGatePaper {
  title?: string;
  abstract?: string;
  topic?: string;
}

/** Build the relevance-gate prompt. Pure. Conservative by design (keep-on-doubt). */
export function buildRelevanceGatePrompt(question: string, papers: RelevanceGatePaper[]): string {
  const list = papers
    .map((p, i) => {
      const title = String(p.title || 'Untitled').trim();
      const abstract = String(p.abstract || '').trim().slice(0, 320);
      return `[${i}] ${title}\n${abstract}`;
    })
    .join('\n\n');

  return `You are a relevance filter for a pediatric and child-development research assistant.

Given a parent's question about their child and a list of retrieved research papers, decide for EACH paper whether it is in the SAME clinical/topical domain as the question — i.e. whether it could plausibly inform an answer to THIS child's situation.

Mark a paper keep=false ONLY when its population, condition, or subject is clearly unrelated to the child's described issue — for example: adult-only populations (e.g. bariatric-surgery patients), unrelated diseases, generic methodology/protocol-standardization papers, or molecular-mechanism studies not about the child's problem.

Be conservative. If a paper is even partially related — same body region, same developmental/behavioral/motor domain, same age group, or a plausibly transferable intervention — keep it (keep=true). When in doubt, keep it.

Return ONLY a JSON array, one object per paper, no prose:
[{"i": <index>, "keep": true|false, "reason": "<short>"}]

PARENT QUESTION:
${question}

PAPERS:
${list}`;
}

/**
 * Parse the relevance-gate response into a keep[] mask. Pure.
 * Fail-open at every step: anything unparseable or ambiguous keeps the paper,
 * and a paper is only dropped when the judge explicitly says keep=false.
 */
export function parseRelevanceGateDecisions(raw: string, count: number): boolean[] {
  const keep = new Array<boolean>(count).fill(true);
  try {
    const match = String(raw || '').match(/\[[\s\S]*\]/);
    if (!match) return keep;
    const arr = JSON.parse(match[0]);
    if (!Array.isArray(arr)) return keep;
    for (const item of arr) {
      if (!item || typeof item !== 'object') continue;
      const idx =
        typeof item.i === 'number' ? item.i
        : typeof item.index === 'number' ? item.index
        : null;
      if (idx === null || idx < 0 || idx >= count) continue;
      const off =
        item.keep === false ||
        item.relevant === false ||
        item.in_domain === false ||
        item.on_domain === false;
      if (off) keep[idx] = false;
    }
    return keep;
  } catch {
    return keep;
  }
}
