import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EvaluationScenarioSchema,
  CapturedAgentOutputSchema,
  EvaluationFindingSchema,
  EvaluationReportSchema,
  isVerifiedFilterCombination,
  isValidLifecycleTransition,
  type EvaluationScenario,
  type EvaluationReport
} from '../shared/src/evaluationModel.js';

// ============================================================================
// 1. Valid Records Validation
// ============================================================================

test('EvaluationScenarioSchema validates a complete valid cultural scenario', () => {
  const validScenario: EvaluationScenario = {
    id: 'scen_brooklyn_neo_psychedelia',
    title: 'Brooklyn Neo-Psychedelia to Natural Wine',
    personaName: 'East Williamsburg Naturalist',
    description: 'Validates cross-domain recommendations between indie psych-rock and hospitality.',
    seeds: [
      { name: 'Crumb', domain: 'music', resolvedQlooId: 'ent_artist_crumb' },
      { name: 'Stereolab', domain: 'music', resolvedQlooId: 'ent_artist_stereolab' }
    ],
    targetDomain: 'place',
    location: {
      city: 'New York',
      countryCode: 'US',
      neighborhood: 'Bushwick'
    },
    constraints: {
      minEmpiricalAffinity: 0.65,
      forbiddenAttributes: ['commercial_sports_bar'],
      requiredAttributes: ['natural_wine'],
      targetCategoryUrn: 'urn:entity:place'
    }
  };

  const parsed = EvaluationScenarioSchema.safeParse(validScenario);
  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.seeds.length, 2);
    assert.equal(parsed.data.targetDomain, 'place');
  }
});

test('CapturedAgentOutputSchema validates valid captured agent outputs', () => {
  const validAgentOutput = {
    mode: 'structured_json',
    rawPayload: JSON.stringify({ items: ['The Four Horsemen'] }),
    recommendations: [
      {
        rawName: 'The Four Horsemen',
        domain: 'place',
        agentClaimedReasoning: 'Known for curated low-intervention natural wine list.',
        agentClaimedAffinity: 0.92
      }
    ],
    capturedAt: new Date().toISOString()
  };

  const parsed = CapturedAgentOutputSchema.safeParse(validAgentOutput);
  assert.equal(parsed.success, true);
});

// ============================================================================
// 2. Malformed Records & Missing Evidence Handling
// ============================================================================

test('EvaluationScenarioSchema rejects empty seeds or invalid URNs', () => {
  const invalidScenario = {
    id: 'scen_bad',
    title: 'Invalid Scenario',
    personaName: 'Test',
    description: '',
    seeds: [], // Empty seeds!
    targetDomain: 'invalid_domain_type',
    constraints: {
      targetCategoryUrn: 'not-a-urn'
    }
  };

  const parsed = EvaluationScenarioSchema.safeParse(invalidScenario);
  assert.equal(parsed.success, false);
  if (!parsed.success) {
    const errorPaths = parsed.error.issues.map(i => i.path[0]);
    assert(errorPaths.includes('seeds'));
    assert(errorPaths.includes('targetDomain'));
  }
});

test('EvaluationFindingSchema requires explicit classification and avoids manufactured metrics', () => {
  // Valid finding that distinguishes "not present in retrieved set" from generic failure
  const validFinding = {
    id: 'find_001',
    itemTargetName: 'Obscure Wine Bodega',
    status: 'WARNING',
    severity: 'medium',
    classification: 'NOT_PRESENT_IN_RETRIEVED_SET',
    humanReadableReason: 'Entity was resolved in Qloo catalog but was not returned within the top-affinity retrieved candidate set.',
    evidenceReferences: ['qloo:search:resolved:ent_bodega', 'qloo:insights:candidates:empty'],
    metricObserved: undefined // No score manufactured!
  };

  const parsed = EvaluationFindingSchema.safeParse(validFinding);
  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.metricObserved, undefined);
    assert.equal(parsed.data.classification, 'NOT_PRESENT_IN_RETRIEVED_SET');
  }
});

test('EvaluationFindingSchema permits metricObserved ONLY with source documentation', () => {
  const findingWithMetric = {
    id: 'find_002',
    itemTargetName: 'The Four Horsemen',
    status: 'PASS',
    severity: 'info',
    classification: 'VERIFIED_SUPPORTED',
    humanReadableReason: 'Empirical Qloo cross-domain affinity exceeds scenario threshold.',
    evidenceReferences: ['qloo:insights:item:ent_4horsemen'],
    metricObserved: {
      name: 'empirical_affinity',
      value: 0.88,
      sourceFormulaOrOrigin: 'Qloo Insights API response field: affinity'
    }
  };

  const parsed = EvaluationFindingSchema.safeParse(findingWithMetric);
  assert.equal(parsed.success, true);
});

// ============================================================================
// 3. Supported Endpoint / Parameter Combination Verification
// ============================================================================

test('isVerifiedFilterCombination accepts verified documented URNs and rejects unverified ones', () => {
  assert.equal(isVerifiedFilterCombination('urn:tag'), true);
  assert.equal(isVerifiedFilterCombination('urn:demographics'), true);
  assert.equal(isVerifiedFilterCombination('urn:entity:brand'), true);
  assert.equal(isVerifiedFilterCombination('urn:entity:place'), true);

  // Unverified/arbitrary filter types return false -> handled as UNVERIFIABLE
  assert.equal(isVerifiedFilterCombination('random_string'), false);
  assert.equal(isVerifiedFilterCombination('http://custom-filter'), false);
  assert.equal(isVerifiedFilterCombination('urn:custom:experimental:mystery'), false);
});

// ============================================================================
// 4. Lifecycle Transitions & State Machine Integrity
// ============================================================================

test('isValidLifecycleTransition enforces forward evaluation state flow and rejects illegal jumps', () => {
  // Valid forward steps
  assert.equal(isValidLifecycleTransition('CONFIGURED', 'RESOLVING_ENTITIES'), true);
  assert.equal(isValidLifecycleTransition('RESOLVING_ENTITIES', 'FETCHING_QLOO_EVIDENCE'), true);
  assert.equal(isValidLifecycleTransition('FETCHING_QLOO_EVIDENCE', 'EVALUATING_RULES'), true);
  assert.equal(isValidLifecycleTransition('EVALUATING_RULES', 'COMPLETED'), true);

  // Failure transitions from any active state are valid
  assert.equal(isValidLifecycleTransition('CONFIGURED', 'FAILED'), true);
  assert.equal(isValidLifecycleTransition('FETCHING_QLOO_EVIDENCE', 'FAILED'), true);

  // Illegal jumps or backward transitions
  assert.equal(isValidLifecycleTransition('CONFIGURED', 'COMPLETED'), false); // Cannot jump from start to complete
  assert.equal(isValidLifecycleTransition('COMPLETED', 'RESOLVING_ENTITIES'), false); // Terminal state cannot transition
  assert.equal(isValidLifecycleTransition('EVALUATING_RULES', 'RESOLVING_ENTITIES'), false); // Cannot go backwards
});

// ============================================================================
// 5. Full Evaluation Report Schema Test
// ============================================================================

test('EvaluationReportSchema validates a complete end-to-end evaluation report', () => {
  const completeReport: EvaluationReport = {
    id: 'report_eval_101',
    scenarioId: 'scen_brooklyn_neo_psychedelia',
    scenarioTitle: 'Brooklyn Neo-Psychedelia to Natural Wine',
    createdAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    finalState: 'COMPLETED',
    agentOutputSummary: {
      mode: 'structured_json',
      itemCount: 1
    },
    summaryCounts: {
      totalChecks: 1,
      passCount: 1,
      warningCount: 0,
      failCount: 0,
      unverifiableCount: 0
    },
    findings: [
      {
        id: 'find_001',
        itemTargetName: 'The Four Horsemen',
        status: 'PASS',
        severity: 'info',
        classification: 'VERIFIED_SUPPORTED',
        humanReadableReason: 'Verified against Qloo empirical affinity.',
        evidenceReferences: ['ref_evidence_1'],
        metricObserved: {
          name: 'affinity',
          value: 0.88,
          sourceFormulaOrOrigin: 'Qloo response payload: score'
        }
      }
    ],
    resolvedEntitiesEvidence: [
      {
        query: 'Crumb',
        isResolved: true,
        qlooId: 'ent_artist_crumb',
        canonicalName: 'Crumb',
        domain: 'music',
        tags: ['psychedelic', 'indie_rock'],
        evidenceSource: {
          endpoint: '/search',
          parametersUsed: { query: 'Crumb', type: 'music' },
          provenance: 'fixture',
          latencyMs: 12,
          retrievedAt: new Date().toISOString()
        }
      }
    ],
    lifecycleTimeline: [
      { state: 'CONFIGURED', timestamp: new Date().toISOString() },
      { state: 'RESOLVING_ENTITIES', timestamp: new Date().toISOString() },
      { state: 'FETCHING_QLOO_EVIDENCE', timestamp: new Date().toISOString() },
      { state: 'EVALUATING_RULES', timestamp: new Date().toISOString() },
      { state: 'COMPLETED', timestamp: new Date().toISOString() }
    ]
  };

  const parsed = EvaluationReportSchema.safeParse(completeReport);
  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.findings.length, 1);
    assert.equal(parsed.data.lifecycleTimeline.length, 5);
  }
});
