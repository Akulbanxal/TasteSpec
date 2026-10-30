import { test } from 'node:test';
import assert from 'node:assert';
import { compareEvaluationReports } from '../client/src/components/compare/scenarioComparisonEngine.js';
import type { EvaluationReport } from '../shared/src/index.js';

const REPORT_A: EvaluationReport = {
  id: 'rep_run_a',
  scenarioId: 'scen_brooklyn_wine',
  scenarioTitle: 'Brooklyn Natural Wine Persona',
  createdAt: '2026-10-28T09:00:00.000Z',
  completedAt: '2026-10-28T09:00:05.000Z',
  finalState: 'COMPLETED',
  agentOutputSummary: {
    mode: 'direct_text',
    itemCount: 2
  },
  summaryCounts: {
    totalChecks: 2,
    passCount: 1,
    warningCount: 0,
    failCount: 1,
    unverifiableCount: 0
  },
  findings: [
    {
      id: 'f_4h',
      itemTargetName: 'The Four Horsemen',
      status: 'PASS',
      severity: 'info',
      classification: 'VERIFIED_SUPPORTED',
      humanReadableReason: 'Verified empirical affinity 0.88',
      evidenceReferences: ['led_4h'],
      metricObserved: {
        name: 'affinity',
        value: 0.88,
        sourceFormulaOrOrigin: 'Qloo API affinity'
      }
    },
    {
      id: 'f_db',
      itemTargetName: 'Dave & Busters',
      status: 'FAIL',
      severity: 'critical',
      classification: 'CONTRADICTS_CONSTRAINT',
      humanReadableReason: 'Matches forbidden attribute: sports bar',
      evidenceReferences: ['/search']
    }
  ],
  resolvedEntitiesEvidence: [],
  lifecycleTimeline: [],
  evidenceLedger: {
    runId: 'rep_run_a',
    scenarioId: 'scen_brooklyn_wine',
    createdAt: '2026-10-28T09:00:00.000Z',
    evidenceEntries: [
      {
        ledgerId: 'led_4h',
        evidenceType: 'candidate_insight',
        entityId: 'ent_4h',
        name: 'The Four Horsemen',
        rawScore: 0.88,
        scoreMetric: 'affinity',
        source: {
          endpoint: '/v2/insights',
          parametersUsed: { filter: 'urn:entity:place' },
          provenance: 'live_network',
          latencyMs: 120,
          retrievedAt: '2026-10-28T09:00:02.000Z'
        }
      }
    ],
    findingTraces: []
  },
  scenarioSnapshot: {
    id: 'scen_brooklyn_wine',
    title: 'Brooklyn Natural Wine Persona',
    personaName: 'Maya (Williamsburg Curator)',
    description: 'Natural wine enthusiast',
    targetDomain: 'place',
    location: {
      city: 'New York',
      neighborhood: 'Williamsburg',
      countryCode: 'US'
    },
    seeds: [
      { name: 'Four Tet', domain: 'music', resolvedQlooId: 'ent_fourtet' },
      { name: 'Aesop', domain: 'brand', resolvedQlooId: 'ent_aesop' }
    ],
    constraints: {
      targetCategoryUrn: 'urn:entity:place',
      minEmpiricalAffinity: 0.65,
      forbiddenAttributes: ['sports bar'],
      requiredAttributes: []
    }
  },
  rawAgentOutputSnapshot: 'The Four Horsemen\nDave & Busters'
};

const REPORT_B: EvaluationReport = {
  id: 'rep_run_b',
  scenarioId: 'scen_brooklyn_wine',
  scenarioTitle: 'Brooklyn Natural Wine Persona',
  createdAt: '2026-10-28T09:05:00.000Z',
  completedAt: '2026-10-28T09:05:04.000Z',
  finalState: 'COMPLETED',
  agentOutputSummary: {
    mode: 'direct_text',
    itemCount: 2
  },
  summaryCounts: {
    totalChecks: 2,
    passCount: 2,
    warningCount: 0,
    failCount: 0,
    unverifiableCount: 0
  },
  findings: [
    {
      id: 'f_4h',
      itemTargetName: 'The Four Horsemen',
      status: 'PASS',
      severity: 'info',
      classification: 'VERIFIED_SUPPORTED',
      humanReadableReason: 'Verified empirical affinity 0.91',
      evidenceReferences: ['led_4h'],
      metricObserved: {
        name: 'affinity',
        value: 0.91,
        sourceFormulaOrOrigin: 'Qloo API affinity'
      }
    },
    {
      id: 'f_ten_bells',
      itemTargetName: 'Ten Bells',
      status: 'PASS',
      severity: 'info',
      classification: 'VERIFIED_SUPPORTED',
      humanReadableReason: 'Verified empirical affinity 0.82',
      evidenceReferences: ['led_tb'],
      metricObserved: {
        name: 'affinity',
        value: 0.82,
        sourceFormulaOrOrigin: 'Qloo API affinity'
      }
    }
  ],
  resolvedEntitiesEvidence: [],
  lifecycleTimeline: [],
  evidenceLedger: {
    runId: 'rep_run_b',
    scenarioId: 'scen_brooklyn_wine',
    createdAt: '2026-10-28T09:05:00.000Z',
    evidenceEntries: [
      {
        ledgerId: 'led_4h',
        evidenceType: 'candidate_insight',
        entityId: 'ent_4h',
        name: 'The Four Horsemen',
        rawScore: 0.91,
        scoreMetric: 'affinity',
        source: {
          endpoint: '/v2/insights',
          parametersUsed: { filter: 'urn:entity:place' },
          provenance: 'live_network',
          latencyMs: 110,
          retrievedAt: '2026-10-28T09:05:02.000Z'
        }
      },
      {
        ledgerId: 'led_tb',
        evidenceType: 'candidate_insight',
        entityId: 'ent_tb',
        name: 'Ten Bells',
        rawScore: 0.82,
        scoreMetric: 'affinity',
        source: {
          endpoint: '/v2/insights',
          parametersUsed: { filter: 'urn:entity:place' },
          provenance: 'live_network',
          latencyMs: 115,
          retrievedAt: '2026-10-28T09:05:03.000Z'
        }
      }
    ],
    findingTraces: []
  },
  scenarioSnapshot: {
    id: 'scen_brooklyn_wine',
    title: 'Brooklyn Natural Wine Persona',
    personaName: 'Maya (Williamsburg Curator)',
    description: 'Natural wine enthusiast',
    targetDomain: 'place',
    location: {
      city: 'New York',
      neighborhood: 'Lower East Side',
      countryCode: 'US'
    },
    seeds: [
      { name: 'Four Tet', domain: 'music', resolvedQlooId: 'ent_fourtet' },
      { name: 'Byredo', domain: 'brand', resolvedQlooId: 'ent_byredo' }
    ],
    constraints: {
      targetCategoryUrn: 'urn:entity:place',
      minEmpiricalAffinity: 0.65,
      forbiddenAttributes: ['sports bar'],
      requiredAttributes: []
    }
  },
  rawAgentOutputSnapshot: 'The Four Horsemen\nTen Bells'
};

test('Scenario Comparison: Accurately identifies input differences (seeds, location, output)', () => {
  const diff = compareEvaluationReports(REPORT_A, REPORT_B);

  // Input Diff Checks
  assert.strictEqual(diff.inputDiff.locationChanged, true, 'Location changed Williamsburg -> Lower East Side');
  assert.strictEqual(diff.inputDiff.agentInputChanged, true, 'Agent raw recommendations changed');

  // Seeds Diff Checks
  assert.strictEqual(diff.inputDiff.seedsShared.length, 1, 'Four Tet was shared');
  assert.strictEqual(diff.inputDiff.seedsShared[0].name, 'Four Tet');
  assert.strictEqual(diff.inputDiff.seedsAdded.length, 1, 'Byredo was added in Run B');
  assert.strictEqual(diff.inputDiff.seedsAdded[0].name, 'Byredo');
  assert.strictEqual(diff.inputDiff.seedsRemoved.length, 1, 'Aesop was removed from Run A');
  assert.strictEqual(diff.inputDiff.seedsRemoved[0].name, 'Aesop');
});

test('Scenario Comparison: Added, removed, and retained candidate evidence computed correctly', () => {
  const diff = compareEvaluationReports(REPORT_A, REPORT_B);

  // Retained candidate: The Four Horsemen
  assert.strictEqual(diff.evidenceDiff.retainedEntries.length, 1);
  const fourH = diff.evidenceDiff.retainedEntries[0];
  assert.strictEqual(fourH.entityName, 'The Four Horsemen');
  assert.strictEqual(fourH.scoreA, 0.88);
  assert.strictEqual(fourH.scoreB, 0.91);
  assert.ok(Math.abs((fourH.scoreDelta || 0) - 0.03) < 0.001);
  assert.strictEqual(fourH.isComparable, true);

  // Added candidate in B: Ten Bells
  assert.strictEqual(diff.evidenceDiff.addedEntries.length, 1);
  assert.strictEqual(diff.evidenceDiff.addedEntries[0].entityName, 'Ten Bells');
});

test('Scenario Comparison: Scorecard deltas calculate genuine run arithmetic', () => {
  const diff = compareEvaluationReports(REPORT_A, REPORT_B);

  assert.strictEqual(diff.scorecardDelta.passDelta, 1, 'Pass count improved from 1 to 2 (+1)');
  assert.strictEqual(diff.scorecardDelta.failDelta, -1, 'Fail count decreased from 1 to 0 (-1)');
  assert.strictEqual(diff.scorecardDelta.totalChecksDelta, 0, 'Total checks remained 2');
});

test('Scenario Comparison: Flags non-comparable items with differing metrics or missing data', () => {
  // Create Run C with incompatible metric score
  const reportC: EvaluationReport = {
    ...REPORT_B,
    id: 'rep_run_c',
    evidenceLedger: {
      ...REPORT_B.evidenceLedger,
      evidenceEntries: [
        {
          ledgerId: 'led_4h_c',
          evidenceType: 'candidate_insight',
          name: 'The Four Horsemen',
          rawScore: 4.8,
          scoreMetric: 'star_rating', // Incompatible metric!
          source: {
            endpoint: '/v2/insights',
            parametersUsed: {},
            provenance: 'live_network',
            latencyMs: 100,
            retrievedAt: new Date().toISOString()
          }
        }
      ]
    }
  };

  const diff = compareEvaluationReports(REPORT_A, reportC);
  const retained = diff.evidenceDiff.retainedEntries[0];
  assert.strictEqual(retained.isComparable, false);
  assert.ok(retained.nonComparableReason?.includes('Incompatible score metrics'));
  assert.ok(diff.uncomparableItems.some(u => u.itemName === 'The Four Horsemen'));
});

test('Scenario Comparison: Does not claim causal effects in methodological disclaimer', () => {
  const diff = compareEvaluationReports(REPORT_A, REPORT_B);
  assert.ok(diff.methodologicalNotice.includes('Differing inputs (e.g., location or seeds) do not guarantee different outputs'));
  assert.ok(diff.methodologicalNotice.includes('should not be interpreted as causal cultural effects'));
});
