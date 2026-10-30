import { test } from 'node:test';
import assert from 'node:assert';
import {
  buildEvidenceGraph,
  formatGraphNodeLabel,
  computeGraphLayout
} from '../client/src/components/evidenceGraph/evidenceGraphModel.js';
import type { EvaluationReport, EvaluationScenario } from '../shared/src/index.js';

test('Evidence Graph: Handles empty graph and null report gracefully', () => {
  const emptyGraph = buildEvidenceGraph(null, null);
  assert.strictEqual(emptyGraph.nodes.length, 0);
  assert.strictEqual(emptyGraph.edges.length, 0);
  assert.strictEqual(emptyGraph.summary.seedCount, 0);
  assert.strictEqual(emptyGraph.summary.findingCount, 0);
});

test('Evidence Graph: Long names and labels are truncated safely without throwing', () => {
  const shortName = 'Four Horsemen';
  const longName = 'A Supercalifragilisticexpialidocious Ultra Long Restaurant Name That Exceeds Normal Limits';

  assert.strictEqual(formatGraphNodeLabel(shortName, 20), 'Four Horsemen');
  const truncated = formatGraphNodeLabel(longName, 20);
  assert.ok(truncated.endsWith('…'));
  assert.ok(truncated.length <= 20);
});

test('Evidence Graph: Unsupported & unindexed entities do not receive fabricated edges to candidates', () => {
  const mockScenario: EvaluationScenario = {
    id: 'test_scen',
    title: 'Test Scenario',
    personaName: 'Test Persona',
    description: 'Testing',
    seeds: [
      { name: 'Four Tet', domain: 'music', resolvedQlooId: 'ent_fourtet_123' }
    ],
    targetDomain: 'place',
    constraints: {
      targetCategoryUrn: 'urn:entity:place',
      minEmpiricalAffinity: 0.5,
      forbiddenAttributes: ['sports bar'],
      requiredAttributes: []
    }
  };

  const mockReport: EvaluationReport = {
    id: 'rep_123',
    scenarioId: 'test_scen',
    scenarioTitle: 'Test Scenario',
    createdAt: new Date().toISOString(),
    finalState: 'COMPLETED',
    agentOutputSummary: { mode: 'direct_text', itemCount: 2 },
    summaryCounts: {
      totalChecks: 2,
      passCount: 1,
      warningCount: 0,
      failCount: 1,
      unverifiableCount: 1
    },
    findings: [
      {
        id: 'finding_valid',
        itemTargetName: 'The Four Horsemen',
        status: 'PASS',
        severity: 'info',
        classification: 'VERIFIED_SUPPORTED',
        humanReadableReason: 'Verified empirical affinity 0.88',
        evidenceReferences: ['led_cand_1'],
        metricObserved: {
          name: 'affinity',
          value: 0.88,
          sourceFormulaOrOrigin: 'Qloo API affinity response'
        }
      },
      {
        id: 'finding_unindexed',
        itemTargetName: 'Hypothetical Secret Loft Bar',
        status: 'UNVERIFIABLE',
        severity: 'high',
        classification: 'UNRESOLVED_ENTITY',
        humanReadableReason: 'Entity resolution failed: 0 results returned from Qloo API',
        evidenceReferences: []
      }
    ],
    resolvedEntitiesEvidence: [
      {
        query: 'The Four Horsemen',
        isResolved: true,
        qlooId: 'ent_4h_456',
        canonicalName: 'The Four Horsemen',
        domain: 'place',
        tags: ['wine', 'dining'],
        evidenceSource: {
          endpoint: '/v2/search',
          parametersUsed: { query: 'The Four Horsemen' },
          provenance: 'live_network',
          latencyMs: 120,
          retrievedAt: new Date().toISOString()
        }
      },
      {
        query: 'Hypothetical Secret Loft Bar',
        isResolved: false,
        evidenceSource: {
          endpoint: '/v2/search',
          parametersUsed: { query: 'Hypothetical Secret Loft Bar' },
          provenance: 'live_network',
          latencyMs: 95,
          retrievedAt: new Date().toISOString()
        }
      }
    ],
    lifecycleTimeline: [],
    evidenceLedger: {
      runId: 'rep_123',
      scenarioId: 'test_scen',
      createdAt: new Date().toISOString(),
      evidenceEntries: [
        {
          ledgerId: 'led_cand_1',
          evidenceType: 'candidate_insight',
          entityId: 'ent_4h_456',
          name: 'The Four Horsemen',
          rawScore: 0.88,
          scoreMetric: 'affinity',
          source: {
            endpoint: '/v2/insights',
            parametersUsed: { 'signal.interests.entities': 'ent_fourtet_123' },
            provenance: 'live_network',
            latencyMs: 140,
            retrievedAt: new Date().toISOString()
          }
        }
      ],
      findingTraces: [
        {
          findingId: 'finding_valid',
          itemTargetName: 'The Four Horsemen',
          ruleName: 'Numeric Provenance Rule',
          referencedLedgerIds: ['led_cand_1'],
          status: 'PASS',
          classification: 'VERIFIED_SUPPORTED'
        },
        {
          findingId: 'finding_unindexed',
          itemTargetName: 'Hypothetical Secret Loft Bar',
          ruleName: 'Entity Identity Resolution Rule',
          referencedLedgerIds: [],
          status: 'UNVERIFIABLE',
          classification: 'UNRESOLVED_ENTITY'
        }
      ]
    }
  };

  const graph = buildEvidenceGraph(mockReport, mockScenario);

  // 1. Check node counts
  assert.strictEqual(graph.summary.seedCount, 1, 'Should have 1 seed node');
  assert.strictEqual(graph.summary.candidateCount, 1, 'Should have 1 candidate node');
  assert.strictEqual(graph.summary.resolvedCount, 2, 'Should have 2 resolved entity records');
  assert.strictEqual(graph.summary.findingCount, 2, 'Should have 2 finding nodes');

  // 2. Substantiated relationships check:
  // Candidate led_cand_1 should be connected to the seed because parametersUsed contains 'ent_fourtet_123'
  const seedToCandEdge = graph.edges.find(e => e.relationType === 'SEED_TO_CANDIDATE');
  assert.ok(seedToCandEdge, 'Substantiated Seed -> Candidate edge must exist');
  assert.strictEqual(seedToCandEdge.substantiated, true);

  // 3. The valid resolved entity 'The Four Horsemen' should be connected to the candidate
  const candToResEdge = graph.edges.find(e => e.relationType === 'CANDIDATE_TO_RESOLVED');
  assert.ok(candToResEdge, 'Substantiated Candidate -> Resolved Entity edge must exist');

  // 4. Critical rule: Hypothetical Secret Loft Bar (unresolved entity) MUST NOT have any edge to candidate
  const unindexedNode = graph.nodes.find(n => n.label.includes('Hypothetical'));
  assert.ok(unindexedNode, 'Unindexed entity node exists');
  assert.strictEqual(unindexedNode.status, 'UNVERIFIABLE');
  assert.strictEqual(unindexedNode.substantiated, false);

  const invalidEdgeToCandidate = graph.edges.find(
    e => (e.sourceId === unindexedNode.id || e.targetId === unindexedNode.id) &&
         (e.relationType === 'CANDIDATE_TO_RESOLVED' || e.relationType === 'SEED_TO_CANDIDATE')
  );
  assert.strictEqual(invalidEdgeToCandidate, undefined, 'Must NOT manufacture edges between unindexed entities and candidates');

  // 5. Check layout computation works without crashing
  computeGraphLayout(graph.nodes, graph.edges, 800, 500);
  assert.ok(graph.nodes.every(n => Number.isFinite(n.x) && Number.isFinite(n.y)));
});

test('Evidence Graph: Duplicate target names are disambiguated cleanly', () => {
  const scenario: EvaluationScenario = {
    id: 'scen_dup',
    title: 'Duplicate test',
    personaName: 'Persona',
    description: 'Testing duplicates',
    seeds: [{ name: 'Apex', domain: 'brand' }],
    targetDomain: 'place',
    constraints: {
      targetCategoryUrn: 'urn:entity:place',
      minEmpiricalAffinity: 0.5,
      forbiddenAttributes: [],
      requiredAttributes: []
    }
  };

  const report: EvaluationReport = {
    id: 'rep_dup',
    scenarioId: 'scen_dup',
    scenarioTitle: 'Duplicate test',
    createdAt: new Date().toISOString(),
    finalState: 'COMPLETED',
    agentOutputSummary: { mode: 'direct_text', itemCount: 2 },
    summaryCounts: { totalChecks: 2, passCount: 2, warningCount: 0, failCount: 0, unverifiableCount: 0 },
    findings: [
      {
        id: 'f1',
        itemTargetName: 'Blue Bottle',
        status: 'PASS',
        severity: 'info',
        classification: 'VERIFIED_SUPPORTED',
        humanReadableReason: 'Passed rule 1'
      },
      {
        id: 'f2',
        itemTargetName: 'Blue Bottle',
        status: 'PASS',
        severity: 'info',
        classification: 'VERIFIED_SUPPORTED',
        humanReadableReason: 'Passed rule 2'
      }
    ],
    resolvedEntitiesEvidence: [],
    lifecycleTimeline: []
  };

  const graph = buildEvidenceGraph(report, scenario);
  // Grouping by recommendation target means 1 unique recommendation node for Blue Bottle
  assert.strictEqual(graph.summary.recommendationCount, 1);
  // Both findings are present and linked
  assert.strictEqual(graph.summary.findingCount, 2);
  const findingEdges = graph.edges.filter(e => e.relationType === 'FINDING_TO_RECOMMENDATION');
  assert.strictEqual(findingEdges.length, 2);
});
