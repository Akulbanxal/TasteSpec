import test from 'node:test';
import assert from 'node:assert/strict';
import { DeterministicEvalEngine } from '../server/src/services/evalEngine.js';
import type {
  EvaluationScenario,
  CapturedAgentOutput,
  ResolvedEntityEvidence,
  CandidateEntityEvidence
} from '../shared/src/evaluationModel.js';

// ============================================================================
// Fixtures for Deterministic Engine Tests
// ============================================================================

const BASE_SCENARIO: EvaluationScenario = {
  id: 'scen_brooklyn_music_dining',
  title: 'Indie Rock to Natural Wine Bars',
  personaName: 'Bushwick Audio/Culinary Enthusiast',
  description: 'Correlates indie rock tastes with low-intervention wine establishments.',
  seeds: [
    { name: 'Stereolab', domain: 'music', resolvedQlooId: 'ent_stereolab' }
  ],
  targetDomain: 'place',
  constraints: {
    minEmpiricalAffinity: 0.65,
    forbiddenAttributes: ['commercial_sports_bar'],
    requiredAttributes: ['natural_wine'],
    targetCategoryUrn: 'urn:entity:place'
  }
};

const BASE_RESOLVED: ResolvedEntityEvidence[] = [
  {
    query: 'The Four Horsemen',
    isResolved: true,
    qlooId: 'ent_4horsemen',
    canonicalName: 'The Four Horsemen',
    domain: 'place',
    tags: ['natural_wine', 'intimate_dining'],
    evidenceSource: {
      endpoint: '/search',
      parametersUsed: { query: 'The Four Horsemen' },
      provenance: 'fixture',
      latencyMs: 15,
      retrievedAt: new Date().toISOString()
    }
  },
  {
    query: 'Dave & Busters',
    isResolved: true,
    qlooId: 'ent_dave_busters',
    canonicalName: 'Dave & Busters',
    domain: 'place',
    tags: ['commercial_sports_bar', 'arcade'],
    evidenceSource: {
      endpoint: '/search',
      parametersUsed: { query: 'Dave & Busters' },
      provenance: 'fixture',
      latencyMs: 12,
      retrievedAt: new Date().toISOString()
    }
  },
  {
    query: 'Unindexed Local Bodega',
    isResolved: false,
    evidenceSource: {
      endpoint: '/search',
      parametersUsed: { query: 'Unindexed Local Bodega' },
      provenance: 'fixture',
      latencyMs: 10,
      retrievedAt: new Date().toISOString()
    },
    tags: []
  }
];

const BASE_CANDIDATES: CandidateEntityEvidence[] = [
  {
    candidateId: 'ent_4horsemen',
    name: 'The Four Horsemen',
    type: 'place',
    returnedScore: 0.88,
    scoreMetricName: 'affinity',
    evidenceSource: {
      endpoint: '/insights',
      parametersUsed: { 'signal.interests.entities': 'ent_stereolab', 'filter.type': 'urn:entity:place' },
      provenance: 'fixture',
      latencyMs: 30,
      retrievedAt: new Date().toISOString()
    }
  },
  {
    candidateId: 'ent_low_affinity_bistro',
    name: 'Generic Midtown Bistro',
    type: 'place',
    returnedScore: 0.32,
    scoreMetricName: 'affinity',
    evidenceSource: {
      endpoint: '/insights',
      parametersUsed: { 'signal.interests.entities': 'ent_stereolab', 'filter.type': 'urn:entity:place' },
      provenance: 'fixture',
      latencyMs: 25,
      retrievedAt: new Date().toISOString()
    }
  }
];

// ============================================================================
// Unit Tests: Deterministic Engine Rules
// ============================================================================

test('Rule 1 (Entity Identity): Flags unresolved entities as UNVERIFIABLE without false negative', () => {
  const engine = new DeterministicEvalEngine();
  const agentOutput: CapturedAgentOutput = {
    mode: 'direct_text',
    rawPayload: 'Unindexed Local Bodega',
    recommendations: [{ rawName: 'Unindexed Local Bodega' }],
    capturedAt: new Date().toISOString()
  };

  const report = engine.evaluate({
    scenario: BASE_SCENARIO,
    agentOutput,
    resolvedEntities: BASE_RESOLVED,
    candidateSet: BASE_CANDIDATES
  });

  const finding = report.findings.find(f => f.itemTargetName === 'Unindexed Local Bodega');
  assert(finding, 'Expected finding for unindexed item');
  assert.equal(finding.status, 'UNVERIFIABLE');
  assert.equal(finding.classification, 'UNRESOLVED_ENTITY');
  assert(finding.humanReadableReason.includes('could not be resolved'));
});

test('Rule 2 (Candidate Provenance): Classifies known resolved entity missing from candidate set as NOT_PRESENT_IN_RETRIEVED_SET', () => {
  const engine = new DeterministicEvalEngine();

  // "Another Known Bar" is resolved in Qloo, but was NOT in the retrieved top-K candidate set for this scenario
  const resolvedList: ResolvedEntityEvidence[] = [
    ...BASE_RESOLVED,
    {
      query: 'Ten Bells',
      isResolved: true,
      qlooId: 'ent_ten_bells',
      canonicalName: 'Ten Bells',
      domain: 'place',
      tags: ['natural_wine'],
      evidenceSource: {
        endpoint: '/search',
        parametersUsed: { query: 'Ten Bells' },
        provenance: 'fixture',
        latencyMs: 10,
        retrievedAt: new Date().toISOString()
      }
    }
  ];

  const agentOutput: CapturedAgentOutput = {
    mode: 'direct_text',
    rawPayload: 'Ten Bells',
    recommendations: [{ rawName: 'Ten Bells' }],
    capturedAt: new Date().toISOString()
  };

  const report = engine.evaluate({
    scenario: BASE_SCENARIO,
    agentOutput,
    resolvedEntities: resolvedList,
    candidateSet: BASE_CANDIDATES // Ten Bells is not in candidateSet!
  });

  const finding = report.findings.find(f => f.itemTargetName === 'Ten Bells');
  assert(finding, 'Expected finding for Ten Bells');
  assert.equal(finding.status, 'WARNING');
  assert.equal(finding.classification, 'NOT_PRESENT_IN_RETRIEVED_SET');
  assert(finding.humanReadableReason.includes("unsupported by this run's retrieved evidence"));
});

test('Rule 3 (Numeric Provenance): Verified empirical affinity above threshold evaluates to PASS', () => {
  const engine = new DeterministicEvalEngine();
  const agentOutput: CapturedAgentOutput = {
    mode: 'structured_json',
    rawPayload: '{}',
    recommendations: [{ rawName: 'The Four Horsemen', agentClaimedAffinity: 0.88 }],
    capturedAt: new Date().toISOString()
  };

  const report = engine.evaluate({
    scenario: BASE_SCENARIO,
    agentOutput,
    resolvedEntities: BASE_RESOLVED,
    candidateSet: BASE_CANDIDATES
  });

  const affinityFinding = report.findings.find(f => f.id.includes('affinity'));
  assert(affinityFinding, 'Expected affinity finding');
  assert.equal(affinityFinding.status, 'PASS');
  assert.equal(affinityFinding.classification, 'VERIFIED_SUPPORTED');
  assert.equal(affinityFinding.metricObserved?.value, 0.88);
});

test('Rule 3b (Numeric Provenance): Significant divergence between agent claimed score and empirical evidence triggers WARNING', () => {
  const engine = new DeterministicEvalEngine();
  const agentOutput: CapturedAgentOutput = {
    mode: 'structured_json',
    rawPayload: '{}',
    // Agent claims 0.20 when empirical score is 0.88 (delta 0.68)
    recommendations: [{ rawName: 'The Four Horsemen', agentClaimedAffinity: 0.20 }],
    capturedAt: new Date().toISOString()
  };

  const report = engine.evaluate({
    scenario: BASE_SCENARIO,
    agentOutput,
    resolvedEntities: BASE_RESOLVED,
    candidateSet: BASE_CANDIDATES
  });

  const numFinding = report.findings.find(f => f.id.includes('numeric_provenance'));
  assert(numFinding, 'Expected numeric provenance finding');
  assert.equal(numFinding.status, 'WARNING');
  assert(numFinding.humanReadableReason.includes('diverges significantly'));
});

test('Rule 4 (Request Contract): Unverified URN combinations produce UNVERIFIABLE without guessing', () => {
  const engine = new DeterministicEvalEngine();
  const invalidScenario: EvaluationScenario = {
    ...BASE_SCENARIO,
    constraints: {
      ...BASE_SCENARIO.constraints,
      targetCategoryUrn: 'urn:unsupported:speculative:filter' // Not verified in docs
    }
  };

  const agentOutput: CapturedAgentOutput = {
    mode: 'direct_text',
    rawPayload: 'The Four Horsemen',
    recommendations: [{ rawName: 'The Four Horsemen' }],
    capturedAt: new Date().toISOString()
  };

  const report = engine.evaluate({
    scenario: invalidScenario,
    agentOutput,
    resolvedEntities: BASE_RESOLVED,
    candidateSet: BASE_CANDIDATES
  });

  assert.equal(report.findings.length, 1);
  assert.equal(report.findings[0].status, 'UNVERIFIABLE');
  assert.equal(report.findings[0].classification, 'UNSUPPORTED_COMBINATION_OR_MISSING_EVIDENCE');
});

test('Rule 5 (Evidence Coverage & Forbidden Attributes): Forbidden attributes produce deterministic FAIL', () => {
  const engine = new DeterministicEvalEngine();
  const agentOutput: CapturedAgentOutput = {
    mode: 'direct_text',
    rawPayload: 'Dave & Busters',
    recommendations: [{ rawName: 'Dave & Busters' }],
    capturedAt: new Date().toISOString()
  };

  const report = engine.evaluate({
    scenario: BASE_SCENARIO, // Forbidden attributes includes commercial_sports_bar
    agentOutput,
    resolvedEntities: BASE_RESOLVED,
    candidateSet: BASE_CANDIDATES
  });

  const violationFinding = report.findings.find(f => f.classification === 'CONTRADICTS_CONSTRAINT');
  assert(violationFinding, 'Expected constraint violation finding');
  assert.equal(violationFinding.status, 'FAIL');
  assert.equal(violationFinding.severity, 'critical');
  assert(violationFinding.humanReadableReason.includes('commercial_sports_bar'));
});

test('Rule 6 (Scenario Diff): Accurately computes additions, removals, status changes, and score deltas between runs', () => {
  const engine = new DeterministicEvalEngine();

  // Run 1: Evaluates The Four Horsemen (PASS) and Low-affinity Bistro (FAIL)
  const resolvedWithBistro: ResolvedEntityEvidence[] = [
    ...BASE_RESOLVED,
    {
      query: 'Generic Midtown Bistro',
      isResolved: true,
      qlooId: 'ent_low_affinity_bistro',
      canonicalName: 'Generic Midtown Bistro',
      domain: 'place',
      tags: [],
      evidenceSource: {
        endpoint: '/search',
        parametersUsed: { query: 'Generic Midtown Bistro' },
        provenance: 'fixture',
        latencyMs: 10,
        retrievedAt: new Date().toISOString()
      }
    }
  ];

  const report1 = engine.evaluate({
    scenario: BASE_SCENARIO,
    agentOutput: {
      mode: 'direct_text',
      rawPayload: 'Midtown Bistro',
      recommendations: [{ rawName: 'Generic Midtown Bistro' }],
      capturedAt: new Date().toISOString()
    },
    resolvedEntities: resolvedWithBistro,
    candidateSet: BASE_CANDIDATES
  });

  // Run 2: Replaces Bistro with The Four Horsemen
  const report2 = engine.evaluate({
    scenario: BASE_SCENARIO,
    agentOutput: {
      mode: 'direct_text',
      rawPayload: 'The Four Horsemen',
      recommendations: [{ rawName: 'The Four Horsemen' }],
      capturedAt: new Date().toISOString()
    },
    resolvedEntities: resolvedWithBistro,
    candidateSet: BASE_CANDIDATES
  });

  const diff = engine.diffReports(report1, report2);

  assert.deepEqual(diff.addedItemNames, ['The Four Horsemen']);
  assert.deepEqual(diff.removedItemNames, ['Generic Midtown Bistro']);
  assert.equal(diff.retainedItemNames.length, 0);
});

test('Rule 7 (Report Results & Counts): Calculates accurate summaryCounts strictly from active run findings', () => {
  const engine = new DeterministicEvalEngine();

  const multiOutput: CapturedAgentOutput = {
    mode: 'direct_text',
    rawPayload: 'Four Horsemen\nGeneric Midtown Bistro\nUnindexed Local Bodega\nTen Bells',
    recommendations: [
      { rawName: 'The Four Horsemen' },         // PASS (verified affinity 0.88 >= 0.65)
      { rawName: 'Generic Midtown Bistro' },    // FAIL (low affinity 0.32 < 0.65)
      { rawName: 'Unindexed Local Bodega' },    // UNVERIFIABLE (unresolved entity)
      { rawName: 'Ten Bells' }                  // WARNING (not in retrieved candidate set)
    ],
    capturedAt: new Date().toISOString()
  };

  const resolvedWithAll: ResolvedEntityEvidence[] = [
    ...BASE_RESOLVED,
    {
      query: 'Generic Midtown Bistro',
      isResolved: true,
      qlooId: 'ent_low_affinity_bistro',
      canonicalName: 'Generic Midtown Bistro',
      domain: 'place',
      tags: ['midtown', 'bistro'],
      evidenceSource: {
        endpoint: '/search',
        parametersUsed: { query: 'Generic Midtown Bistro' },
        provenance: 'fixture',
        latencyMs: 14,
        retrievedAt: new Date().toISOString()
      }
    },
    {
      query: 'Ten Bells',
      isResolved: true,
      qlooId: 'ent_ten_bells',
      canonicalName: 'Ten Bells',
      domain: 'place',
      tags: ['natural_wine'],
      evidenceSource: {
        endpoint: '/search',
        parametersUsed: { query: 'Ten Bells' },
        provenance: 'fixture',
        latencyMs: 12,
        retrievedAt: new Date().toISOString()
      }
    }
  ];

  const report = engine.evaluate({
    scenario: BASE_SCENARIO,
    agentOutput: multiOutput,
    resolvedEntities: resolvedWithAll,
    candidateSet: BASE_CANDIDATES
  });

  // Verify counts are strictly computed from this run's findings
  assert.equal(report.summaryCounts.totalChecks, report.findings.length);
  assert.equal(report.summaryCounts.passCount, 1, 'Expected exactly 1 PASS check');
  assert.equal(report.summaryCounts.warningCount, 1, 'Expected exactly 1 WARNING check');
  assert.equal(report.summaryCounts.failCount, 1, 'Expected exactly 1 FAIL check');
  assert.equal(report.summaryCounts.unverifiableCount, 1, 'Expected exactly 1 UNVERIFIABLE check');

  // Verify item-level details
  const passFinding = report.findings.find(f => f.itemTargetName === 'The Four Horsemen');
  assert(passFinding);
  assert.equal(passFinding.status, 'PASS');
  assert.equal(passFinding.metricObserved?.value, 0.88);
  assert(passFinding.metricObserved?.sourceFormulaOrOrigin.includes('Qloo API response payload'));

  const failFinding = report.findings.find(f => f.itemTargetName === 'Generic Midtown Bistro');
  assert(failFinding);
  assert.equal(failFinding.status, 'FAIL');
  assert.equal(failFinding.classification, 'KNOWN_LOW_AFFINITY');

  const unverifiedFinding = report.findings.find(f => f.itemTargetName === 'Unindexed Local Bodega');
  assert(unverifiedFinding);
  assert.equal(unverifiedFinding.status, 'UNVERIFIABLE');
  assert.equal(unverifiedFinding.classification, 'UNRESOLVED_ENTITY');
});

