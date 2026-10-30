import {
  type EvaluationScenario,
  type CapturedAgentOutput,
  type ResolvedEntityEvidence,
  type CandidateEntityEvidence,
  type EvaluationFinding,
  type EvaluationReport,
  isVerifiedFilterCombination
} from '../../../shared/src/evaluationModel.js';
import {
  type EvidenceLedgerRecord,
  type LedgerEvidenceEntry,
  type FindingTrace,
  validateReportIntegrity
} from '../../../shared/src/evidenceLedger.js';

export interface EvaluationEngineInput {
  scenario: EvaluationScenario;
  agentOutput: CapturedAgentOutput;
  resolvedEntities: ResolvedEntityEvidence[];
  candidateSet: CandidateEntityEvidence[];
}

export interface ScenarioDiffResult {
  addedItemNames: string[];
  removedItemNames: string[];
  retainedItemNames: string[];
  statusChanges: Array<{
    itemName: string;
    previousStatus: string;
    currentStatus: string;
    previousClassification: string;
    currentClassification: string;
  }>;
  scoreDeltas: Array<{
    itemName: string;
    previousScore?: number;
    currentScore?: number;
    delta?: number;
  }>;
}

/**
 * Deterministic Evaluation Engine for TASTESPEC
 * Operates purely on stored inputs, candidate sets, and empirical evidence without requiring any LLM.
 */
export class DeterministicEvalEngine {
  /**
   * Run the full evaluation pass over an agent output against provided Qloo evidence
   */
  public evaluate(input: EvaluationEngineInput): EvaluationReport {
    const { scenario, agentOutput, resolvedEntities, candidateSet } = input;
    const findings: EvaluationFinding[] = [];
    const now = new Date().toISOString();

    // Check 1: Request Contract Check (Verified combinations rule)
    const filterType = scenario.constraints.targetCategoryUrn;
    const contractValid = isVerifiedFilterCombination(filterType);

    if (!contractValid) {
      findings.push({
        id: `finding_contract_urn_${Date.now()}`,
        itemTargetName: scenario.title,
        status: 'UNVERIFIABLE',
        severity: 'high',
        classification: 'UNSUPPORTED_COMBINATION_OR_MISSING_EVIDENCE',
        humanReadableReason: `Target category URN "${filterType}" is not among verified documented Qloo filter types. Check cannot be evaluated deterministically.`,
        evidenceReferences: []
      });

      return this.buildReport(scenario, agentOutput, findings, resolvedEntities, candidateSet, now);
    }

    // Evaluate each recommended item individually
    for (const item of agentOutput.recommendations) {
      const targetName = item.rawName.trim();
      const findingId = `find_${targetName.toLowerCase().replace(/[^a-z0-9_]/g, '_')}`;

      // Check 2: Entity Identity Check
      const resolved = resolvedEntities.find(
        r => r.query.toLowerCase() === targetName.toLowerCase() ||
             (r.canonicalName && r.canonicalName.toLowerCase() === targetName.toLowerCase())
      );

      if (!resolved || !resolved.isResolved || !resolved.qlooId) {
        findings.push({
          id: `${findingId}_identity`,
          itemTargetName: targetName,
          status: 'UNVERIFIABLE',
          severity: 'medium',
          classification: 'UNRESOLVED_ENTITY',
          humanReadableReason: `Entity "${targetName}" could not be resolved to a known entity in the Qloo taste catalog. It is unverified in this run's evidence.`,
          evidenceReferences: resolved ? [resolved.evidenceSource.endpoint] : []
        });
        continue;
      }

      // Check 3: Candidate Provenance Check (Presence in scenario's retrieved candidate set)
      const candidateMatch = candidateSet.find(
        c => (c.candidateId && c.candidateId === resolved.qlooId) ||
             c.name.toLowerCase() === targetName.toLowerCase()
      );

      if (!candidateMatch) {
        findings.push({
          id: `${findingId}_candidate_provenance`,
          itemTargetName: targetName,
          status: 'WARNING',
          severity: 'low',
          classification: 'NOT_PRESENT_IN_RETRIEVED_SET',
          humanReadableReason: `Entity "${targetName}" is resolved as ${resolved.qlooId}, but was not present in the candidate set retrieved for this scenario. It is unsupported by this run's retrieved evidence.`,
          evidenceReferences: [resolved.evidenceSource.endpoint]
        });
      } else {
        // Candidate is present in retrieved set. Evaluate empirical affinity if returned.
        const returnedScore = candidateMatch.returnedScore;
        const minAffinity = scenario.constraints.minEmpiricalAffinity ?? 0.5;

        if (returnedScore !== undefined) {
          if (returnedScore >= minAffinity) {
            findings.push({
              id: `${findingId}_affinity`,
              itemTargetName: targetName,
              status: 'PASS',
              severity: 'info',
              classification: 'VERIFIED_SUPPORTED',
              humanReadableReason: `Entity "${targetName}" empirical affinity (${returnedScore.toFixed(2)}) meets or exceeds scenario threshold (${minAffinity.toFixed(2)}).`,
              evidenceReferences: [`qloo:candidate:${candidateMatch.candidateId}`, candidateMatch.evidenceSource.endpoint],
              metricObserved: {
                name: candidateMatch.scoreMetricName || 'affinity',
                value: returnedScore,
                sourceFormulaOrOrigin: `Qloo API response payload: ${candidateMatch.scoreMetricName || 'score'}`
              }
            });
          } else {
            findings.push({
              id: `${findingId}_affinity`,
              itemTargetName: targetName,
              status: 'FAIL',
              severity: 'high',
              classification: 'KNOWN_LOW_AFFINITY',
              humanReadableReason: `Entity "${targetName}" empirical affinity (${returnedScore.toFixed(2)}) falls below required threshold (${minAffinity.toFixed(2)}).`,
              evidenceReferences: [`qloo:candidate:${candidateMatch.candidateId}`, candidateMatch.evidenceSource.endpoint],
              metricObserved: {
                name: candidateMatch.scoreMetricName || 'affinity',
                value: returnedScore,
                sourceFormulaOrOrigin: `Qloo API response payload: ${candidateMatch.scoreMetricName || 'score'}`
              }
            });
          }
        } else {
          // Score was not returned in Qloo candidate record
          findings.push({
            id: `${findingId}_candidate_presence`,
            itemTargetName: targetName,
            status: 'PASS',
            severity: 'info',
            classification: 'VERIFIED_SUPPORTED',
            humanReadableReason: `Entity "${targetName}" is present in the retrieved candidate set for this scenario. No numerical affinity score was returned in the payload.`,
            evidenceReferences: [`qloo:candidate:${candidateMatch.candidateId}`]
          });
        }
      }

      // Check 4: Numeric Provenance Check (Did agent claim an affinity that differs from evidence?)
      if (item.agentClaimedAffinity !== undefined) {
        if (!candidateMatch || candidateMatch.returnedScore === undefined) {
          findings.push({
            id: `${findingId}_numeric_provenance`,
            itemTargetName: targetName,
            status: 'UNVERIFIABLE',
            severity: 'medium',
            classification: 'UNSUPPORTED_COMBINATION_OR_MISSING_EVIDENCE',
            humanReadableReason: `Agent claimed affinity score ${item.agentClaimedAffinity}, but no ground-truth score was returned in the retrieved Qloo evidence to verify it.`,
            evidenceReferences: candidateMatch ? [`qloo:candidate:${candidateMatch.candidateId}`] : []
          });
        } else {
          const delta = Math.abs(item.agentClaimedAffinity - candidateMatch.returnedScore);
          if (delta > 0.15) {
            findings.push({
              id: `${findingId}_numeric_provenance`,
              itemTargetName: targetName,
              status: 'WARNING',
              severity: 'medium',
              classification: 'KNOWN_LOW_AFFINITY',
              humanReadableReason: `Agent claimed affinity ${item.agentClaimedAffinity.toFixed(2)}, which diverges significantly (delta=${delta.toFixed(2)}) from empirical Qloo score (${candidateMatch.returnedScore.toFixed(2)}).`,
              evidenceReferences: [`qloo:candidate:${candidateMatch.candidateId}`],
              metricObserved: {
                name: 'affinity_delta',
                value: delta,
                sourceFormulaOrOrigin: '|agentClaimedAffinity - returnedScore|'
              }
            });
          }
        }
      }

      // Check 5: Constraint Contradiction Check (forbidden attributes)
      if (scenario.constraints.forbiddenAttributes && scenario.constraints.forbiddenAttributes.length > 0) {
        const forbiddenMatched = resolved.tags.filter(t =>
          scenario.constraints.forbiddenAttributes.includes(t)
        );

        if (forbiddenMatched.length > 0) {
          findings.push({
            id: `${findingId}_constraint_violation`,
            itemTargetName: targetName,
            status: 'FAIL',
            severity: 'critical',
            classification: 'CONTRADICTS_CONSTRAINT',
            humanReadableReason: `Entity "${targetName}" possesses forbidden attribute(s): [${forbiddenMatched.join(', ')}].`,
            evidenceReferences: [resolved.evidenceSource.endpoint]
          });
        }
      }
    }

    return this.buildReport(scenario, agentOutput, findings, resolvedEntities, candidateSet, now);
  }

  /**
   * Compute deterministic diff between two real evaluation reports
   */
  public diffReports(previousReport: EvaluationReport, currentReport: EvaluationReport): ScenarioDiffResult {
    const prevItems = new Set(previousReport.findings.map(f => f.itemTargetName));
    const currItems = new Set(currentReport.findings.map(f => f.itemTargetName));

    const addedItemNames = [...currItems].filter(name => !prevItems.has(name));
    const removedItemNames = [...prevItems].filter(name => !currItems.has(name));
    const retainedItemNames = [...currItems].filter(name => prevItems.has(name));

    const statusChanges: ScenarioDiffResult['statusChanges'] = [];
    const scoreDeltas: ScenarioDiffResult['scoreDeltas'] = [];

    for (const name of retainedItemNames) {
      const prevFinding = previousReport.findings.find(f => f.itemTargetName === name);
      const currFinding = currentReport.findings.find(f => f.itemTargetName === name);

      if (prevFinding && currFinding) {
        if (prevFinding.status !== currFinding.status || prevFinding.classification !== currFinding.classification) {
          statusChanges.push({
            itemName: name,
            previousStatus: prevFinding.status,
            currentStatus: currFinding.status,
            previousClassification: prevFinding.classification,
            currentClassification: currFinding.classification
          });
        }

        const prevScore = prevFinding.metricObserved?.value;
        const currScore = currFinding.metricObserved?.value;

        if (prevScore !== undefined || currScore !== undefined) {
          scoreDeltas.push({
            itemName: name,
            previousScore: prevScore,
            currentScore: currScore,
            delta: (currScore !== undefined && prevScore !== undefined) ? currScore - prevScore : undefined
          });
        }
      }
    }

    return {
      addedItemNames,
      removedItemNames,
      retainedItemNames,
      statusChanges,
      scoreDeltas
    };
  }

  private buildReport(
    scenario: EvaluationScenario,
    agentOutput: CapturedAgentOutput,
    findings: EvaluationFinding[],
    resolvedEntities: ResolvedEntityEvidence[],
    candidateSet: CandidateEntityEvidence[],
    timestamp: string
  ): EvaluationReport {
    const passCount = findings.filter(f => f.status === 'PASS').length;
    const warningCount = findings.filter(f => f.status === 'WARNING').length;
    const failCount = findings.filter(f => f.status === 'FAIL').length;
    const unverifiableCount = findings.filter(f => f.status === 'UNVERIFIABLE').length;

    const runId = `run_${scenario.id}_${Date.now()}`;

    // Construct Evidence Ledger
    const evidenceEntries: LedgerEvidenceEntry[] = [];
    const entityToLedgerId = new Map<string, string>();

    // 1. Ledger entries for resolved entities
    for (const resolved of resolvedEntities) {
      const ledgerId = `ledg_res_${resolved.query.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      evidenceEntries.push({
        ledgerId,
        evidenceType: resolved.evidenceSource.provenance === 'fixture' ? 'demo_fixture' : 'resolved_entity',
        entityId: resolved.qlooId,
        name: resolved.canonicalName || resolved.query,
        source: resolved.evidenceSource
      });
      entityToLedgerId.set(resolved.query.toLowerCase(), ledgerId);
      if (resolved.qlooId) {
        entityToLedgerId.set(resolved.qlooId, ledgerId);
      }
    }

    // 2. Ledger entries for candidate insights
    for (const cand of candidateSet) {
      const ledgerId = `ledg_cand_${cand.candidateId.replace(/[^a-z0-9]/g, '_')}`;
      evidenceEntries.push({
        ledgerId,
        evidenceType: cand.evidenceSource.provenance === 'fixture' ? 'demo_fixture' : 'candidate_insight',
        entityId: cand.candidateId,
        name: cand.name,
        source: cand.evidenceSource,
        rawScore: cand.returnedScore,
        scoreMetric: cand.scoreMetricName
      });
      entityToLedgerId.set(`cand:${cand.candidateId}`, ledgerId);
    }

    // 3. Finding traces linking findings to ledger entries
    const findingTraces: FindingTrace[] = findings.map(f => {
      const referencedLedgerIds: string[] = [];

      // Link by resolved query or entity
      const resLedgerId = entityToLedgerId.get(f.itemTargetName.toLowerCase());
      if (resLedgerId && !referencedLedgerIds.includes(resLedgerId)) {
        referencedLedgerIds.push(resLedgerId);
      }

      // Link any candidate references
      for (const cand of candidateSet) {
        if (cand.name.toLowerCase() === f.itemTargetName.toLowerCase()) {
          const candLedgerId = entityToLedgerId.get(`cand:${cand.candidateId}`);
          if (candLedgerId && !referencedLedgerIds.includes(candLedgerId)) {
            referencedLedgerIds.push(candLedgerId);
          }
        }
      }

      return {
        findingId: f.id,
        itemTargetName: f.itemTargetName,
        ruleName: f.classification,
        referencedLedgerIds,
        status: f.status,
        classification: f.classification,
        numericClaimSource: f.metricObserved?.sourceFormulaOrOrigin
      };
    });

    const evidenceLedger: EvidenceLedgerRecord = {
      runId,
      scenarioId: scenario.id,
      createdAt: timestamp,
      evidenceEntries,
      findingTraces
    };

    return {
      id: `report_${scenario.id}_${Date.now()}`,
      scenarioId: scenario.id,
      scenarioTitle: scenario.title,
      createdAt: timestamp,
      completedAt: new Date().toISOString(),
      finalState: 'COMPLETED',
      agentOutputSummary: {
        mode: agentOutput.mode,
        itemCount: agentOutput.recommendations.length
      },
      summaryCounts: {
        totalChecks: findings.length,
        passCount,
        warningCount,
        failCount,
        unverifiableCount
      },
      findings,
      resolvedEntitiesEvidence: resolvedEntities,
      lifecycleTimeline: [
        { state: 'CONFIGURED', timestamp },
        { state: 'RESOLVING_ENTITIES', timestamp },
        { state: 'FETCHING_QLOO_EVIDENCE', timestamp },
        { state: 'EVALUATING_RULES', timestamp },
        { state: 'COMPLETED', timestamp: new Date().toISOString() }
      ],
      evidenceLedger,
      scenarioSnapshot: scenario,
      rawAgentOutputSnapshot: agentOutput.rawPayload
    };
  }
}
