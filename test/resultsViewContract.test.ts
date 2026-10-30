import test from 'node:test';
import assert from 'node:assert/strict';
import { DeterministicEvalEngine } from '../server/src/services/evalEngine.js';
import type {
  EvaluationScenario,
  CapturedAgentOutput,
  ResolvedEntityEvidence,
  CandidateEntityEvidence,
  EvaluationReport
} from '../shared/src/evaluationModel.js';

const TEST_SCENARIO: EvaluationScenario = {
  id: 'scen_audit_results_test',
  title: 'Audit Results Verification Scenario',
  personaName: 'Music & Dining Critic',
  description: 'Deterministic scenario for proving report calculations and evidence links.',
  seeds: [
    { name: 'LCD Soundsystem', domain: 'music', resolvedQlooId: 'ent_lcd' }
  ],
  targetDomain: 'place',
  constraints: {
    minEmpiricalAffinity: 0.70,
    forbiddenAttributes: ['fast_food_chain'],
    requiredAttributes: ['wine_bar'],
    targetCategoryUrn: 'urn:entity:place'
  }
};

const TEST_RESOLVED: ResolvedEntityEvidence[] = [
  {
    query: 'Lillies Natural Wines',
    isResolved: true,
    qlooId: 'ent_lillies',
    canonicalName: 'Lillies Natural Wines',
    domain: 'place',
    tags: ['wine_bar', 'craft_beverage'],
    evidenceSource: {
      endpoint: '/search',
      parametersUsed: { query: 'Lillies Natural Wines' },
      provenance: 'fixture',
      latencyMs: 14,
      retrievedAt: new Date().toISOString()
    }
  },
  {
    query: 'Fast Burger Joint',
    isResolved: true,
    qlooId: 'ent_fast_burger',
    canonicalName: 'Fast Burger Joint',
    domain: 'place',
    tags: ['fast_food_chain', 'drive_thru'],
    evidenceSource: {
      endpoint: '/search',
      parametersUsed: { query: 'Fast Burger Joint' },
      provenance: 'fixture',
      latencyMs: 11,
      retrievedAt: new Date().toISOString()
    }
  },
  {
    query: 'Uncataloged Basement Speakeasy',
    isResolved: false,
    evidenceSource: {
      endpoint: '/search',
      parametersUsed: { query: 'Uncataloged Basement Speakeasy' },
      provenance: 'fixture',
      latencyMs: 9,
      retrievedAt: new Date().toISOString()
    },
    tags: []
  },
  {
    query: 'Divergent Bistro',
    isResolved: true,
    qlooId: 'ent_divergent_bistro',
    canonicalName: 'Divergent Bistro',
    domain: 'place',
    tags: ['wine_bar'],
    evidenceSource: {
      endpoint: '/search',
      parametersUsed: { query: 'Divergent Bistro' },
      provenance: 'fixture',
      latencyMs: 16,
      retrievedAt: new Date().toISOString()
    }
  }
];

const TEST_CANDIDATES: CandidateEntityEvidence[] = [
  {
    candidateId: 'ent_lillies',
    name: 'Lillies Natural Wines',
    type: 'place',
    returnedScore: 0.89,
    scoreMetricName: 'affinity',
    evidenceSource: {
      endpoint: '/insights',
      parametersUsed: { 'signal.interests.entities': 'ent_lcd', 'filter.type': 'urn:entity:place' },
      provenance: 'fixture',
      latencyMs: 28,
      retrievedAt: new Date().toISOString()
    }
  },
  {
    candidateId: 'ent_divergent_bistro',
    name: 'Divergent Bistro',
    type: 'place',
    returnedScore: 0.72,
    scoreMetricName: 'affinity',
    evidenceSource: {
      endpoint: '/insights',
      parametersUsed: { 'signal.interests.entities': 'ent_lcd', 'filter.type': 'urn:entity:place' },
      provenance: 'fixture',
      latencyMs: 22,
      retrievedAt: new Date().toISOString()
    }
  }
];

test('Results view data contract: Proves counts are strictly calculated from report run', () => {
  const engine = new DeterministicEvalEngine();

  const agentOutput: CapturedAgentOutput = {
    mode: 'direct_text',
    rawPayload: 'Lillies Natural Wines\nFast Burger Joint\nUncataloged Basement Speakeasy\nDivergent Bistro',
    recommendations: [
      { rawName: 'Lillies Natural Wines' },                        // PASS: affinity 0.89 >= 0.70
      { rawName: 'Fast Burger Joint' },                           // FAIL: forbidden attribute fast_food_chain
      { rawName: 'Uncataloged Basement Speakeasy' },              // UNVERIFIABLE: not indexed in Qloo
      { rawName: 'Divergent Bistro', agentClaimedAffinity: 0.95 } // WARNING: claimed 0.95 vs empirical 0.55 delta > 0.15
    ],
    capturedAt: new Date().toISOString()
  };

  const report: EvaluationReport = engine.evaluate({
    scenario: TEST_SCENARIO,
    agentOutput,
    resolvedEntities: TEST_RESOLVED,
    candidateSet: TEST_CANDIDATES
  });

  // 1. Verify summary counts are dynamic and calculated exclusively from this report's findings
  assert.equal(report.summaryCounts.totalChecks, report.findings.length);
  assert.equal(report.summaryCounts.passCount, report.findings.filter(f => f.status === 'PASS').length);
  assert.equal(report.summaryCounts.warningCount, report.findings.filter(f => f.status === 'WARNING').length);
  assert.equal(report.summaryCounts.failCount, report.findings.filter(f => f.status === 'FAIL').length);
  assert.equal(report.summaryCounts.unverifiableCount, report.findings.filter(f => f.status === 'UNVERIFIABLE').length);

  assert.equal(report.summaryCounts.passCount, 2, 'Lillies Natural Wines and Divergent Bistro pass affinity threshold');
  assert.equal(report.summaryCounts.warningCount, 2, 'Fast Burger Joint (missing from candidate set) and Divergent Bistro (affinity divergence) trigger WARNING');
  assert.equal(report.summaryCounts.failCount, 1, 'Fast Burger Joint fails on forbidden attribute');
  assert.equal(report.summaryCounts.unverifiableCount, 1, 'Uncataloged Basement Speakeasy is unindexed and unverifiable');

  // 2. Proves finding details and rule classification are derived from the report
  const passFinding = report.findings.find(f => f.itemTargetName === 'Lillies Natural Wines');
  assert(passFinding, 'Pass finding must exist in findings list');
  assert.equal(passFinding.status, 'PASS');
  assert.equal(passFinding.classification, 'VERIFIED_SUPPORTED');
  assert.equal(passFinding.metricObserved?.value, 0.89);
  assert.equal(passFinding.metricObserved?.name, 'affinity');
  assert(passFinding.metricObserved?.sourceFormulaOrOrigin.includes('Qloo API response payload'));

  const warningFinding = report.findings.find(f => f.classification === 'KNOWN_LOW_AFFINITY');
  assert(warningFinding, 'Warning finding must exist for divergent claimed score');
  assert.equal(warningFinding.status, 'WARNING');
  assert.equal(warningFinding.metricObserved?.name, 'affinity_delta');
  assert.equal(warningFinding.metricObserved?.sourceFormulaOrOrigin, '|agentClaimedAffinity - returnedScore|');

  const unverifiableFinding = report.findings.find(f => f.classification === 'UNRESOLVED_ENTITY');
  assert(unverifiableFinding, 'Unverifiable finding must exist for uncataloged item');
  assert.equal(unverifiableFinding.status, 'UNVERIFIABLE');
  // Must NOT be labelled as definitively false or hallucination
  assert(!unverifiableFinding.humanReadableReason.toLowerCase().includes('hallucination'));
  assert(unverifiableFinding.humanReadableReason.includes('unverified'));

  // 3. Proves evidence ledger matches finding trace references for evidence drawer
  assert(report.evidenceLedger, 'Report must contain an evidence ledger');
  const findingTraces = report.evidenceLedger.findingTraces;
  for (const finding of report.findings) {
    const trace = findingTraces.find((t: any) => t.findingId === finding.id);
    assert(trace, `Every finding ${finding.id} must have a corresponding trace in evidence ledger`);
    assert.equal(trace.itemTargetName, finding.itemTargetName);
    assert.equal(trace.status, finding.status);
  }
});
