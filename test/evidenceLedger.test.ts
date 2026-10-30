import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateReportIntegrity,
  type EvidenceLedgerRecord,
  type LedgerEvidenceEntry
} from '../shared/src/evidenceLedger.js';
import type {
  EvaluationFinding,
  ResolvedEntityEvidence,
  CandidateEntityEvidence
} from '../shared/src/evaluationModel.js';

// ============================================================================
// Synthetic Test Fixtures for Evidence Ledger Audit
// ============================================================================

const VALID_RESOLVED: ResolvedEntityEvidence[] = [
  {
    query: 'The Four Horsemen',
    isResolved: true,
    qlooId: 'ent_4horsemen',
    canonicalName: 'The Four Horsemen',
    domain: 'place',
    tags: ['natural_wine'],
    evidenceSource: {
      endpoint: '/search [DEMO FIXTURE]',
      parametersUsed: { query: 'The Four Horsemen' },
      provenance: 'fixture',
      latencyMs: 10,
      retrievedAt: new Date().toISOString()
    }
  }
];

const VALID_CANDIDATES: CandidateEntityEvidence[] = [
  {
    candidateId: 'ent_4horsemen',
    name: 'The Four Horsemen',
    type: 'place',
    returnedScore: 0.88,
    scoreMetricName: 'affinity',
    evidenceSource: {
      endpoint: '/insights [DEMO FIXTURE]',
      parametersUsed: { 'signal.interests.entities': 'ent_crumb' },
      provenance: 'fixture',
      latencyMs: 20,
      retrievedAt: new Date().toISOString()
    }
  }
];

const VALID_LEDGER: EvidenceLedgerRecord = {
  runId: 'run_valid_01',
  scenarioId: 'scen_brooklyn',
  createdAt: new Date().toISOString(),
  evidenceEntries: [
    {
      ledgerId: 'ledg_resolved_4horsemen',
      evidenceType: 'resolved_entity',
      entityId: 'ent_4horsemen',
      name: 'The Four Horsemen',
      source: VALID_RESOLVED[0].evidenceSource
    },
    {
      ledgerId: 'ledg_candidate_4horsemen',
      evidenceType: 'candidate_insight',
      entityId: 'ent_4horsemen',
      name: 'The Four Horsemen',
      rawScore: 0.88,
      scoreMetric: 'affinity',
      source: VALID_CANDIDATES[0].evidenceSource
    }
  ],
  findingTraces: [
    {
      findingId: 'find_4horsemen_affinity',
      itemTargetName: 'The Four Horsemen',
      ruleName: 'EmpiricalAffinityThresholdRule',
      referencedLedgerIds: ['ledg_resolved_4horsemen', 'ledg_candidate_4horsemen'],
      status: 'PASS',
      classification: 'VERIFIED_SUPPORTED',
      numericClaimSource: 'Qloo API response payload: affinity'
    }
  ]
};

const VALID_FINDINGS: EvaluationFinding[] = [
  {
    id: 'find_4horsemen_affinity',
    itemTargetName: 'The Four Horsemen',
    status: 'PASS',
    severity: 'info',
    classification: 'VERIFIED_SUPPORTED',
    humanReadableReason: 'Verified empirical affinity exceeds threshold.',
    evidenceReferences: ['ledg_resolved_4horsemen', 'ledg_candidate_4horsemen'],
    metricObserved: {
      name: 'affinity',
      value: 0.88,
      sourceFormulaOrOrigin: 'Qloo API response payload: affinity'
    }
  }
];

// ============================================================================
// Ledger Integrity Tests
// ============================================================================

test('validateReportIntegrity passes a valid consistent report and ledger', () => {
  const result = validateReportIntegrity(VALID_LEDGER, VALID_FINDINGS, VALID_RESOLVED, VALID_CANDIDATES);
  assert.equal(result.isValid, true);
  assert.equal(result.violations.length, 0);
  assert.equal(result.auditedCount, 1);
});

test('validateReportIntegrity detects duplicate evidence IDs in the ledger', () => {
  const duplicateLedger: EvidenceLedgerRecord = {
    ...VALID_LEDGER,
    evidenceEntries: [
      VALID_LEDGER.evidenceEntries[0],
      VALID_LEDGER.evidenceEntries[0] // DUPLICATE entry
    ]
  };

  const result = validateReportIntegrity(duplicateLedger, VALID_FINDINGS, VALID_RESOLVED, VALID_CANDIDATES);
  assert.equal(result.isValid, false);
  assert(result.violations.some(v => v.includes('Duplicate ledger evidence entry ID')));
});

test('validateReportIntegrity detects altered / nonexistent evidence IDs referenced by findings', () => {
  const alteredLedger: EvidenceLedgerRecord = {
    ...VALID_LEDGER,
    findingTraces: [
      {
        ...VALID_LEDGER.findingTraces[0],
        referencedLedgerIds: ['nonexistent_corrupted_id_999'] // Corrupted reference!
      }
    ]
  };

  const result = validateReportIntegrity(alteredLedger, VALID_FINDINGS, VALID_RESOLVED, VALID_CANDIDATES);
  assert.equal(result.isValid, false);
  assert(result.violations.some(v => v.includes('references nonexistent ledger evidence ID')));
});

test('validateReportIntegrity catches fabricated numeric claims lacking documented formula', () => {
  const findingWithFabricatedScore: EvaluationFinding[] = [
    {
      id: 'find_4horsemen_affinity',
      itemTargetName: 'The Four Horsemen',
      status: 'PASS',
      severity: 'info',
      classification: 'VERIFIED_SUPPORTED',
      humanReadableReason: 'Verified empirical affinity exceeds threshold.',
      evidenceReferences: ['ledg_resolved_4horsemen'],
      metricObserved: {
        name: 'fabricated_metric',
        value: 0.99,
        sourceFormulaOrOrigin: '' // EMPTY / FABRICATED SOURCE!
      }
    }
  ];

  const result = validateReportIntegrity(VALID_LEDGER, findingWithFabricatedScore, VALID_RESOLVED, VALID_CANDIDATES);
  assert.equal(result.isValid, false);
  assert(result.violations.some(v => v.includes('without documented sourceFormulaOrOrigin')));
});

test('validateReportIntegrity catches unlabelled fixtures masquerading as live responses', () => {
  const unlabelledLedger: EvidenceLedgerRecord = {
    ...VALID_LEDGER,
    evidenceEntries: [
      {
        ledgerId: 'ledg_unlabelled_fixture',
        evidenceType: 'resolved_entity',
        entityId: 'ent_4horsemen',
        name: 'The Four Horsemen',
        source: {
          endpoint: '/search', // Marked provenance fixture, but lacks fixture labelling in endpoint!
          parametersUsed: {},
          provenance: 'fixture',
          latencyMs: 10,
          retrievedAt: new Date().toISOString()
        }
      }
    ],
    findingTraces: [
      {
        findingId: 'find_4horsemen_affinity',
        itemTargetName: 'The Four Horsemen',
        ruleName: 'EmpiricalAffinityThresholdRule',
        referencedLedgerIds: ['ledg_unlabelled_fixture'],
        status: 'PASS',
        classification: 'VERIFIED_SUPPORTED'
      }
    ]
  };

  const result = validateReportIntegrity(unlabelledLedger, VALID_FINDINGS, VALID_RESOLVED, VALID_CANDIDATES);
  assert.equal(result.isValid, false);
  assert(result.violations.some(v => v.includes('lacks explicit fixture labelling')));
});

test('validateReportIntegrity requires missing evidence to be explicitly UNVERIFIABLE', () => {
  const illegalPassFinding: EvaluationFinding[] = [
    {
      id: 'find_4horsemen_affinity',
      itemTargetName: 'Unindexed Local Bodega',
      status: 'PASS', // ILLEGAL: Passing an unindexed / missing evidence item!
      severity: 'critical',
      classification: 'UNRESOLVED_ENTITY',
      humanReadableReason: 'Item is not in catalog.',
      evidenceReferences: []
    }
  ];

  const result = validateReportIntegrity(VALID_LEDGER, illegalPassFinding, VALID_RESOLVED, VALID_CANDIDATES);
  assert.equal(result.isValid, false);
  assert(result.violations.some(v => v.includes('status is "PASS" instead of UNVERIFIABLE')));
});

test('evalEngine generates an evidence ledger that passes integrity validation', async () => {
  const { DeterministicEvalEngine } = await import('../server/src/services/evalEngine.js');
  const engine = new DeterministicEvalEngine();

  const mockScenario = {
    id: 'scen_test',
    title: 'Test Scenario',
    personaName: 'Test Persona',
    seeds: [{ name: 'Radiohead', domain: 'music', resolvedQlooId: 'ent_radiohead' }],
    targetDomain: 'place',
    constraints: {
      targetCategoryUrn: 'urn:tag',
      minEmpiricalAffinity: 0.5
    }
  };

  const mockOutput = {
    mode: 'direct_text' as const,
    rawPayload: 'The Four Horsemen',
    recommendations: [{ rawName: 'The Four Horsemen', domain: 'place' as const }],
    capturedAt: new Date().toISOString()
  };

  const report = engine.evaluate({
    scenario: mockScenario,
    agentOutput: mockOutput,
    resolvedEntities: VALID_RESOLVED,
    candidateSet: VALID_CANDIDATES
  });

  assert(report.evidenceLedger !== undefined, 'Report must contain evidenceLedger');
  assert.equal(report.evidenceLedger.runId.startsWith('run_scen_test'), true);
  assert(report.evidenceLedger.evidenceEntries.length > 0);
  assert(report.evidenceLedger.findingTraces.length > 0);

  // Validate integrity of engine-produced report and ledger
  const audit = validateReportIntegrity(
    report.evidenceLedger,
    report.findings,
    report.resolvedEntitiesEvidence,
    VALID_CANDIDATES
  );

  assert.equal(audit.isValid, true, `Expected valid report integrity, but got violations: ${audit.violations.join('; ')}`);
});

