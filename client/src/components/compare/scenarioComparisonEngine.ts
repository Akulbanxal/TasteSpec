import type {
  EvaluationReport,
  CulturalSeed,
  LocationConstraint
} from '@shared/index';

export interface InputDiff {
  scenarioA: {
    title: string;
    personaName?: string;
    targetDomain?: string;
    location?: LocationConstraint;
    seeds: CulturalSeed[];
    agentOutputMode?: string;
    rawOutput?: string;
  };
  scenarioB: {
    title: string;
    personaName?: string;
    targetDomain?: string;
    location?: LocationConstraint;
    seeds: CulturalSeed[];
    agentOutputMode?: string;
    rawOutput?: string;
  };
  seedsAdded: CulturalSeed[];
  seedsRemoved: CulturalSeed[];
  seedsShared: CulturalSeed[];
  locationChanged: boolean;
  domainChanged: boolean;
  agentInputChanged: boolean;
  nonComparableReason?: string;
}

export interface EvidenceDiffEntry {
  entityName: string;
  type: 'added' | 'removed' | 'retained';
  scoreA?: number;
  scoreB?: number;
  scoreDelta?: number;
  provenanceA?: string;
  provenanceB?: string;
  endpointA?: string;
  endpointB?: string;
  isComparable: boolean;
  nonComparableReason?: string;
}

export interface FindingStatusChange {
  itemTargetName: string;
  statusA: string;
  statusB: string;
  classificationA: string;
  classificationB: string;
  reasonA: string;
  reasonB: string;
  whyChanged: string;
}

export interface UncomparableItem {
  itemName: string;
  reason: string;
}

export interface ComprehensiveReportDiff {
  runAId: string;
  runBId: string;
  runATimestamp: string;
  runBTimestamp: string;
  inputDiff: InputDiff;
  evidenceDiff: {
    addedEntries: EvidenceDiffEntry[];
    removedEntries: EvidenceDiffEntry[];
    retainedEntries: EvidenceDiffEntry[];
    totalComparable: number;
    totalNonComparable: number;
  };
  findingChanges: FindingStatusChange[];
  uncomparableItems: UncomparableItem[];
  scorecardDelta: {
    passDelta: number;
    warningDelta: number;
    failDelta: number;
    unverifiableDelta: number;
    totalChecksDelta: number;
  };
  methodologicalNotice: string;
}

/**
 * Compare two real Evaluation Reports and produce an honest, evidence-based diff.
 * 
 * Rules:
 * - Does not claim causal cultural effects from simple before/after comparisons.
 * - Does not assume a different seed or location MUST produce a different answer.
 * - Explicitly surfaces items that cannot be compared because evidence is missing
 *   or schemas differ.
 */
export function compareEvaluationReports(
  runA: EvaluationReport,
  runB: EvaluationReport
): ComprehensiveReportDiff {
  // 1. Extract Scenario Inputs (from snapshot or scenario title/seeds)
  const scenA = runA.scenarioSnapshot;
  const scenB = runB.scenarioSnapshot;

  const seedsA: CulturalSeed[] = scenA?.seeds || [];
  const seedsB: CulturalSeed[] = scenB?.seeds || [];

  const seedMapA = new Map(seedsA.map(s => [s.name.toLowerCase(), s]));
  const seedMapB = new Map(seedsB.map(s => [s.name.toLowerCase(), s]));

  const seedsAdded = seedsB.filter(s => !seedMapA.has(s.name.toLowerCase()));
  const seedsRemoved = seedsA.filter(s => !seedMapB.has(s.name.toLowerCase()));
  const seedsShared = seedsA.filter(s => seedMapB.has(s.name.toLowerCase()));

  const locAStr = scenA?.location ? `${scenA.location.city || ''}, ${scenA.location.neighborhood || ''}, ${scenA.location.countryCode || ''}`.trim() : '';
  const locBStr = scenB?.location ? `${scenB.location.city || ''}, ${scenB.location.neighborhood || ''}, ${scenB.location.countryCode || ''}`.trim() : '';
  const locationChanged = locAStr !== locBStr;

  const domainA = scenA?.targetDomain || 'unknown';
  const domainB = scenB?.targetDomain || 'unknown';
  const domainChanged = domainA !== domainB && domainA !== 'unknown' && domainB !== 'unknown';

  const rawOutA = runA.rawAgentOutputSnapshot || '';
  const rawOutB = runB.rawAgentOutputSnapshot || '';
  const agentInputChanged = rawOutA !== rawOutB || runA.agentOutputSummary.mode !== runB.agentOutputSummary.mode;

  const inputDiff: InputDiff = {
    scenarioA: {
      title: runA.scenarioTitle,
      personaName: scenA?.personaName,
      targetDomain: domainA,
      location: scenA?.location,
      seeds: seedsA,
      agentOutputMode: runA.agentOutputSummary.mode,
      rawOutput: rawOutA
    },
    scenarioB: {
      title: runB.scenarioTitle,
      personaName: scenB?.personaName,
      targetDomain: domainB,
      location: scenB?.location,
      seeds: seedsB,
      agentOutputMode: runB.agentOutputSummary.mode,
      rawOutput: rawOutB
    },
    seedsAdded,
    seedsRemoved,
    seedsShared,
    locationChanged,
    domainChanged,
    agentInputChanged
  };

  if (domainChanged) {
    inputDiff.nonComparableReason = `Target domain changed from ${domainA} to ${domainB}; candidate affinity metrics represent different cultural spaces.`;
  }

  // 2. Evidence Ledger Comparison
  const entriesA = runA.evidenceLedger?.evidenceEntries || [];
  const entriesB = runB.evidenceLedger?.evidenceEntries || [];

  const mapEntriesA = new Map<string, typeof entriesA[0]>();
  for (const e of entriesA) {
    mapEntriesA.set(e.name.toLowerCase(), e);
  }

  const mapEntriesB = new Map<string, typeof entriesB[0]>();
  for (const e of entriesB) {
    mapEntriesB.set(e.name.toLowerCase(), e);
  }

  const addedEntries: EvidenceDiffEntry[] = [];
  const removedEntries: EvidenceDiffEntry[] = [];
  const retainedEntries: EvidenceDiffEntry[] = [];
  const uncomparableItems: UncomparableItem[] = [];

  // Items in B not in A (Added)
  for (const [nameLower, eb] of mapEntriesB.entries()) {
    if (!mapEntriesA.has(nameLower)) {
      addedEntries.push({
        entityName: eb.name,
        type: 'added',
        scoreB: eb.rawScore,
        provenanceB: eb.source?.provenance,
        endpointB: eb.source?.endpoint,
        isComparable: true
      });
    }
  }

  // Items in A not in B (Removed)
  for (const [nameLower, ea] of mapEntriesA.entries()) {
    if (!mapEntriesB.has(nameLower)) {
      removedEntries.push({
        entityName: ea.name,
        type: 'removed',
        scoreA: ea.rawScore,
        provenanceA: ea.source?.provenance,
        endpointA: ea.source?.endpoint,
        isComparable: true
      });
    }
  }

  // Items in both A and B (Retained)
  for (const [nameLower, ea] of mapEntriesA.entries()) {
    const eb = mapEntriesB.get(nameLower);
    if (eb) {
      // Check if scores are comparable
      const metricA = ea.scoreMetric || 'affinity';
      const metricB = eb.scoreMetric || 'affinity';
      const isMetricSame = metricA === metricB;

      const scoreA = ea.rawScore;
      const scoreB = eb.rawScore;

      let scoreDelta: number | undefined = undefined;
      let isComparable = true;
      let nonComparableReason: string | undefined = undefined;

      if (!isMetricSame) {
        isComparable = false;
        nonComparableReason = `Incompatible score metrics: Run A recorded "${metricA}" while Run B recorded "${metricB}".`;
        uncomparableItems.push({
          itemName: ea.name,
          reason: nonComparableReason
        });
      } else if (scoreA !== undefined && scoreB !== undefined) {
        scoreDelta = scoreB - scoreA;
      } else if (scoreA === undefined || scoreB === undefined) {
        nonComparableReason = `Missing score data in ${scoreA === undefined ? 'Run A' : 'Run B'}.`;
      }

      retainedEntries.push({
        entityName: ea.name,
        type: 'retained',
        scoreA,
        scoreB,
        scoreDelta,
        provenanceA: ea.source?.provenance,
        provenanceB: eb.source?.provenance,
        endpointA: ea.source?.endpoint,
        endpointB: eb.source?.endpoint,
        isComparable,
        nonComparableReason
      });
    }
  }

  // 3. Finding Status Changes
  const findingChanges: FindingStatusChange[] = [];
  const findingsA = runA.findings || [];
  const findingsB = runB.findings || [];

  const findingsMapA = new Map(findingsA.map(f => [f.itemTargetName.toLowerCase(), f]));
  const findingsMapB = new Map(findingsB.map(f => [f.itemTargetName.toLowerCase(), f]));

  for (const [targetName, fa] of findingsMapA.entries()) {
    const fb = findingsMapB.get(targetName);
    if (fb) {
      if (fa.status !== fb.status || fa.classification !== fb.classification) {
        let whyChanged = `Status shifted from ${fa.status} to ${fb.status}.`;
        if (fa.status !== fb.status) {
          if (fa.status === 'FAIL' && fb.status === 'PASS') {
            whyChanged = `Constraint or affinity threshold satisfied in Run B (${fb.humanReadableReason}).`;
          } else if (fa.status === 'PASS' && fb.status === 'FAIL') {
            whyChanged = `Failed compliance in Run B (${fb.humanReadableReason}).`;
          } else if (fb.status === 'UNVERIFIABLE') {
            whyChanged = `Evidence became missing or unindexed in Run B (${fb.humanReadableReason}).`;
          } else if (fa.status === 'UNVERIFIABLE' && fb.status === 'PASS') {
            whyChanged = `Entity resolved and verified in Run B (${fb.humanReadableReason}).`;
          }
        } else {
          whyChanged = `Classification updated from ${fa.classification} to ${fb.classification}.`;
        }

        findingChanges.push({
          itemTargetName: fa.itemTargetName,
          statusA: fa.status,
          statusB: fb.status,
          classificationA: fa.classification,
          classificationB: fb.classification,
          reasonA: fa.humanReadableReason,
          reasonB: fb.humanReadableReason,
          whyChanged
        });
      }
    }
  }

  // Detect uncomparable finding items (e.g. Unresolved entities in either run)
  for (const f of [...findingsA, ...findingsB]) {
    if (f.classification === 'UNRESOLVED_ENTITY' || f.classification === 'UNSUPPORTED_COMBINATION_OR_MISSING_EVIDENCE') {
      if (!uncomparableItems.some(u => u.itemName === f.itemTargetName)) {
        uncomparableItems.push({
          itemName: f.itemTargetName,
          reason: `Unverifiable finding in evaluation pass: ${f.humanReadableReason}`
        });
      }
    }
  }

  // 4. Scorecard Deltas
  const scorecardDelta = {
    passDelta: runB.summaryCounts.passCount - runA.summaryCounts.passCount,
    warningDelta: runB.summaryCounts.warningCount - runA.summaryCounts.warningCount,
    failDelta: runB.summaryCounts.failCount - runA.summaryCounts.failCount,
    unverifiableDelta: runB.summaryCounts.unverifiableCount - runA.summaryCounts.unverifiableCount,
    totalChecksDelta: runB.summaryCounts.totalChecks - runA.summaryCounts.totalChecks
  };

  return {
    runAId: runA.id,
    runBId: runB.id,
    runATimestamp: runA.completedAt || runA.createdAt,
    runBTimestamp: runB.completedAt || runB.createdAt,
    inputDiff,
    evidenceDiff: {
      addedEntries,
      removedEntries,
      retainedEntries,
      totalComparable: retainedEntries.filter(e => e.isComparable).length,
      totalNonComparable: retainedEntries.filter(e => !e.isComparable).length + uncomparableItems.length
    },
    findingChanges,
    uncomparableItems,
    scorecardDelta,
    methodologicalNotice:
      'Comparison reflects empirical differences between evaluation runs. Differing inputs (e.g., location or seeds) do not guarantee different outputs, and differences should not be interpreted as causal cultural effects.'
  };
}
