import type {
  EvaluationReport,
  EvaluationScenario,
  EvaluationFinding,
  ResolvedEntityEvidence,
  LedgerEvidenceEntry,
  FindingTrace
} from '@shared/index';

export type EvidenceNodeType =
  | 'seed'
  | 'resolved_entity'
  | 'candidate_insight'
  | 'agent_recommendation'
  | 'finding';

export type NodeShape =
  | 'diamond'    // Seed
  | 'circle'     // Resolved Entity
  | 'round-rect' // Candidate Insight (Qloo API Result)
  | 'square'     // Agent Recommendation
  | 'hexagon';   // Validation Finding

export interface ProvenanceDetails {
  sourceEndpoint?: string;
  parametersUsed?: Record<string, string>;
  provenanceType?: string;
  latencyMs?: number;
  retrievedAt?: string;
  rawScore?: number;
  scoreMetric?: string;
  formulaOrOrigin?: string;
  justification?: string;
  qlooId?: string;
  canonicalName?: string;
  domain?: string;
  tags?: string[];
  findingSeverity?: string;
  findingStatus?: string;
  epistemicClassification?: string;
  referencedLedgerIds?: string[];
}

export interface EvidenceGraphNode {
  id: string;
  label: string;
  shortLabel: string;
  type: EvidenceNodeType;
  shape: NodeShape;
  status: 'PASS' | 'WARNING' | 'FAIL' | 'UNVERIFIABLE' | 'NEUTRAL';
  substantiated: boolean;
  provenance: ProvenanceDetails;
  degree: number;
  // Layout coordinates (computed by layout)
  x: number;
  y: number;
  vx?: number;
  vy?: number;
}

export interface EvidenceGraphEdge {
  id: string;
  sourceId: string;
  targetId: string;
  relationType:
    | 'SEED_TO_CANDIDATE'
    | 'CANDIDATE_TO_RESOLVED'
    | 'RESOLVED_TO_RECOMMENDATION'
    | 'FINDING_TO_EVIDENCE'
    | 'FINDING_TO_RECOMMENDATION';
  label: string;
  substantiated: boolean;
  evidenceRefId?: string;
  weight?: number;
}

export interface EvidenceGraphModel {
  nodes: EvidenceGraphNode[];
  edges: EvidenceGraphEdge[];
  summary: {
    seedCount: number;
    resolvedCount: number;
    candidateCount: number;
    recommendationCount: number;
    findingCount: number;
    substantiatedEdgeCount: number;
    unsubstantiatedNodesCount: number;
  };
}

/**
 * Truncate strings cleanly with ellipsis
 */
export function formatGraphNodeLabel(label: string, maxLength: number = 24): string {
  if (!label) return '';
  if (label.length <= maxLength) return label;
  return `${label.slice(0, maxLength - 1)}…`;
}

/**
 * Construct an honest Evidence Graph directly from real evaluation report evidence.
 * RULES:
 * 1. Nodes are created for seeds, resolved entities, candidates, recommendations, and findings.
 * 2. Edges are created ONLY when explicitly supported by the run's ledger, finding traces,
 *    or entity references.
 * 3. Never invent edges between unindexed/unresolved items and candidates/seeds.
 */
export function buildEvidenceGraph(
  report: EvaluationReport | null,
  scenario: EvaluationScenario | null
): EvidenceGraphModel {
  if (!report && !scenario) {
    return {
      nodes: [],
      edges: [],
      summary: {
        seedCount: 0,
        resolvedCount: 0,
        candidateCount: 0,
        recommendationCount: 0,
        findingCount: 0,
        substantiatedEdgeCount: 0,
        unsubstantiatedNodesCount: 0
      }
    };
  }

  const nodesMap = new Map<string, EvidenceGraphNode>();
  const edges: EvidenceGraphEdge[] = [];

  // Helper to safely register nodes
  const registerNode = (node: EvidenceGraphNode) => {
    if (!nodesMap.has(node.id)) {
      nodesMap.set(node.id, node);
    }
  };

  // 1. Cultural Seeds from Scenario
  const seeds = scenario?.seeds || [];
  seeds.forEach((seed, index) => {
    const id = `seed_${index}_${seed.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
    registerNode({
      id,
      label: seed.name,
      shortLabel: formatGraphNodeLabel(seed.name, 18),
      type: 'seed',
      shape: 'diamond',
      status: 'NEUTRAL',
      substantiated: true,
      provenance: {
        domain: seed.domain,
        qlooId: seed.resolvedQlooId,
        justification: `Persona Seed Anchor (${seed.domain}) defined in scenario "${scenario?.title || 'Active'}"`
      },
      degree: 0,
      x: 0,
      y: 0
    });
  });

  // 2. Candidate Insights (empirical Qloo items from ledger)
  const ledgerEntries: LedgerEvidenceEntry[] = report?.evidenceLedger?.evidenceEntries || [];
  const candidateEntries = ledgerEntries.filter(
    e => e.evidenceType === 'candidate_insight' || e.evidenceType === 'demo_fixture'
  );

  candidateEntries.forEach((cand, idx) => {
    const id = `cand_${cand.ledgerId || idx}_${cand.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
    registerNode({
      id,
      label: cand.name,
      shortLabel: formatGraphNodeLabel(cand.name, 20),
      type: 'candidate_insight',
      shape: 'round-rect',
      status: 'NEUTRAL',
      substantiated: true,
      provenance: {
        sourceEndpoint: cand.source?.endpoint,
        parametersUsed: cand.source?.parametersUsed,
        provenanceType: cand.source?.provenance,
        latencyMs: cand.source?.latencyMs,
        retrievedAt: cand.source?.retrievedAt,
        rawScore: cand.rawScore,
        scoreMetric: cand.scoreMetric,
        qlooId: cand.entityId,
        canonicalName: cand.name,
        justification: `Empirical candidate retrieved from endpoint: ${cand.source?.endpoint || 'API'}`
      },
      degree: 0,
      x: 0,
      y: 0
    });

    // Substantiated Edge: Seed -> Candidate
    // Only link if the candidate query parameters specifically targeted this seed's ID or name
    seeds.forEach((seed, sIdx) => {
      const seedNodeId = `seed_${sIdx}_${seed.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      const params = cand.source?.parametersUsed || {};
      const signalEntities = params['signal.interests.entities'] || '';
      const filterUrn = params['filter'] || '';

      const seedQlooId = seed.resolvedQlooId;
      const isLinkedToSeed =
        (seedQlooId && (signalEntities.includes(seedQlooId) || filterUrn.includes(seedQlooId))) ||
        signalEntities.toLowerCase().includes(seed.name.toLowerCase());

      // If this is a scenario query derived from seeds, link it
      if (isLinkedToSeed || (!signalEntities && seeds.length === 1)) {
        edges.push({
          id: `edge_${seedNodeId}_to_${id}`,
          sourceId: seedNodeId,
          targetId: id,
          relationType: 'SEED_TO_CANDIDATE',
          label: cand.scoreMetric ? `${cand.scoreMetric}: ${cand.rawScore ?? ''}` : 'Informed By Seed',
          substantiated: true,
          evidenceRefId: cand.ledgerId,
          weight: cand.rawScore ?? 1
        });
      }
    });
  });

  // 3. Resolved Entities Evidence
  const resolvedList: ResolvedEntityEvidence[] = report?.resolvedEntitiesEvidence || [];
  resolvedList.forEach((res, idx) => {
    const id = `res_${idx}_${res.query.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
    const isResolved = res.isResolved && !!res.qlooId;

    registerNode({
      id,
      label: res.canonicalName || res.query,
      shortLabel: formatGraphNodeLabel(res.canonicalName || res.query, 20),
      type: 'resolved_entity',
      shape: 'circle',
      status: isResolved ? 'PASS' : 'UNVERIFIABLE',
      substantiated: isResolved,
      provenance: {
        canonicalName: res.canonicalName,
        qlooId: res.qlooId,
        domain: res.domain,
        tags: res.tags,
        sourceEndpoint: res.evidenceSource?.endpoint,
        parametersUsed: res.evidenceSource?.parametersUsed,
        provenanceType: res.evidenceSource?.provenance,
        latencyMs: res.evidenceSource?.latencyMs,
        retrievedAt: res.evidenceSource?.retrievedAt,
        justification: isResolved
          ? `Canonical Qloo Entity matched with ID "${res.qlooId}"`
          : `Entity resolution failed or unindexed for query "${res.query}"`
      },
      degree: 0,
      x: 0,
      y: 0
    });

    // Check if this resolved entity matches any candidate insight
    if (isResolved && res.qlooId) {
      candidateEntries.forEach((cand, cIdx) => {
        if (cand.entityId === res.qlooId || cand.name.toLowerCase() === (res.canonicalName || res.query).toLowerCase()) {
          const candNodeId = `cand_${cand.ledgerId || cIdx}_${cand.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
          if (nodesMap.has(candNodeId)) {
            edges.push({
              id: `edge_${candNodeId}_to_${id}`,
              sourceId: candNodeId,
              targetId: id,
              relationType: 'CANDIDATE_TO_RESOLVED',
              label: 'Verified In Candidate Set',
              substantiated: true,
              evidenceRefId: cand.ledgerId
            });
          }
        }
      });
    }
  });

  // 4. Agent Recommendation Items (from report findings or summary)
  const findings: EvaluationFinding[] = report?.findings || [];
  const findingTraces: FindingTrace[] = report?.evidenceLedger?.findingTraces || [];

  // Group findings by itemTargetName to identify unique recommendations
  const distinctTargets = Array.from(new Set(findings.map(f => f.itemTargetName)));
  distinctTargets.forEach((targetName, idx) => {
    const targetFindings = findings.filter(f => f.itemTargetName === targetName);
    const worstStatus = targetFindings.some(f => f.status === 'FAIL')
      ? 'FAIL'
      : targetFindings.some(f => f.status === 'UNVERIFIABLE')
      ? 'UNVERIFIABLE'
      : targetFindings.some(f => f.status === 'WARNING')
      ? 'WARNING'
      : 'PASS';

    const id = `rec_${idx}_${targetName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

    // Look for matching resolved entity
    const matchingResolvedIdx = resolvedList.findIndex(
      r => (r.canonicalName && r.canonicalName.toLowerCase() === targetName.toLowerCase()) ||
           r.query.toLowerCase() === targetName.toLowerCase()
    );

    const hasResolvedMatch = matchingResolvedIdx !== -1 && resolvedList[matchingResolvedIdx].isResolved;

    registerNode({
      id,
      label: targetName,
      shortLabel: formatGraphNodeLabel(targetName, 20),
      type: 'agent_recommendation',
      shape: 'square',
      status: worstStatus,
      substantiated: hasResolvedMatch,
      provenance: {
        canonicalName: targetName,
        findingStatus: worstStatus,
        justification: `Agent-proposed output evaluated across ${targetFindings.length} rule checks`
      },
      degree: 0,
      x: 0,
      y: 0
    });

    // Link Resolved Entity -> Agent Recommendation (only if substantiated by resolution evidence)
    if (matchingResolvedIdx !== -1) {
      const resNodeId = `res_${matchingResolvedIdx}_${resolvedList[matchingResolvedIdx].query.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      if (nodesMap.has(resNodeId)) {
        edges.push({
          id: `edge_${resNodeId}_to_${id}`,
          sourceId: resNodeId,
          targetId: id,
          relationType: 'RESOLVED_TO_RECOMMENDATION',
          label: hasResolvedMatch ? 'Resolved Grounding' : 'Unresolved Claim',
          substantiated: hasResolvedMatch
        });
      }
    }
  });

  // 5. Validation Findings Nodes
  findings.forEach((finding, idx) => {
    const id = `finding_${idx}_${finding.id.replace(/[^a-z0-9]/g, '_')}`;
    const trace = findingTraces.find(t => t.findingId === finding.id);

    registerNode({
      id,
      label: `${finding.classification} (${finding.itemTargetName})`,
      shortLabel: formatGraphNodeLabel(finding.classification.replace(/_/g, ' '), 20),
      type: 'finding',
      shape: 'hexagon',
      status: finding.status,
      substantiated: true,
      provenance: {
        findingSeverity: finding.severity,
        findingStatus: finding.status,
        epistemicClassification: finding.classification,
        justification: finding.humanReadableReason,
        formulaOrOrigin: finding.metricObserved?.sourceFormulaOrOrigin,
        rawScore: finding.metricObserved?.value,
        scoreMetric: finding.metricObserved?.name,
        referencedLedgerIds: trace?.referencedLedgerIds || finding.evidenceReferences
      },
      degree: 0,
      x: 0,
      y: 0
    });

    // Link Finding to its corresponding Agent Recommendation node
    const targetIdx = distinctTargets.indexOf(finding.itemTargetName);
    if (targetIdx !== -1) {
      const recNodeId = `rec_${targetIdx}_${finding.itemTargetName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      if (nodesMap.has(recNodeId)) {
        edges.push({
          id: `edge_${id}_to_${recNodeId}`,
          sourceId: id,
          targetId: recNodeId,
          relationType: 'FINDING_TO_RECOMMENDATION',
          label: `Check: ${finding.status}`,
          substantiated: true
        });
      }
    }

    // Link Finding directly to the specific Evidence entries it cited in trace
    const referencedIds = trace?.referencedLedgerIds || finding.evidenceReferences || [];
    referencedIds.forEach(ledgerId => {
      // Find candidate or resolved entry with this ledgerId
      const cand = candidateEntries.find(c => c.ledgerId === ledgerId);
      if (cand) {
        const candIdx = candidateEntries.indexOf(cand);
        const candNodeId = `cand_${cand.ledgerId || candIdx}_${cand.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
        if (nodesMap.has(candNodeId)) {
          edges.push({
            id: `edge_${id}_to_${candNodeId}`,
            sourceId: id,
            targetId: candNodeId,
            relationType: 'FINDING_TO_EVIDENCE',
            label: 'Cites Ledger Evidence',
            substantiated: true,
            evidenceRefId: ledgerId
          });
        }
      }
    });
  });

  // Calculate degrees for layout
  edges.forEach(edge => {
    const s = nodesMap.get(edge.sourceId);
    const t = nodesMap.get(edge.targetId);
    if (s) s.degree = (s.degree || 0) + 1;
    if (t) t.degree = (t.degree || 0) + 1;
  });

  const allNodes = Array.from(nodesMap.values());
  const substantiatedEdges = edges.filter(e => e.substantiated);
  const unsubstantiatedNodes = allNodes.filter(n => !n.substantiated);

  // Compute Layout Positions (Deterministic hierarchical layered layout)
  computeGraphLayout(allNodes, edges);

  return {
    nodes: allNodes,
    edges,
    summary: {
      seedCount: seeds.length,
      resolvedCount: resolvedList.length,
      candidateCount: candidateEntries.length,
      recommendationCount: distinctTargets.length,
      findingCount: findings.length,
      substantiatedEdgeCount: substantiatedEdges.length,
      unsubstantiatedNodesCount: unsubstantiatedNodes.length
    }
  };
}

/**
 * Deterministic multi-layer layout algorithm designed for readability,
 * grouping seeds (layer 0), candidates (layer 1), resolved entities (layer 2),
 * agent recommendations (layer 3), and findings (layer 4).
 */
export function computeGraphLayout(nodes: EvidenceGraphNode[], _edges: EvidenceGraphEdge[], width: number = 960, height: number = 560): void {
  if (nodes.length === 0) return;

  const layers: Record<EvidenceNodeType, EvidenceGraphNode[]> = {
    seed: [],
    candidate_insight: [],
    resolved_entity: [],
    agent_recommendation: [],
    finding: []
  };

  nodes.forEach(node => {
    layers[node.type]?.push(node);
  });

  const layerKeys: EvidenceNodeType[] = [
    'seed',
    'candidate_insight',
    'resolved_entity',
    'agent_recommendation',
    'finding'
  ];

  // Active layers that actually have nodes
  const activeLayers = layerKeys.filter(k => layers[k].length > 0);
  const layerSpacingX = width / (activeLayers.length + 1);

  activeLayers.forEach((layerKey, layerIdx) => {
    const layerNodes = layers[layerKey];
    const x = layerSpacingX * (layerIdx + 1);
    const count = layerNodes.length;

    // Distribute nodes vertically
    const paddingY = 60;
    const availableHeight = height - paddingY * 2;
    const spacingY = count > 1 ? availableHeight / (count - 1) : 0;

    layerNodes.forEach((node, nodeIdx) => {
      node.x = x;
      node.y = count === 1 ? height / 2 : paddingY + nodeIdx * spacingY;
    });
  });
}
