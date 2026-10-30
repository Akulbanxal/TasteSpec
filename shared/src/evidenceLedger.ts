import {
  type EvaluationFinding,
  type ResolvedEntityEvidence,
  type CandidateEntityEvidence,
  EvidenceSourceSchema
} from './evaluationModel.js';

import { z } from 'zod';

export const LedgerEvidenceEntrySchema = z.object({
  ledgerId: z.string(),
  evidenceType: z.enum(['resolved_entity', 'candidate_insight', 'demo_fixture']),
  entityId: z.string().optional(),
  name: z.string(),
  source: EvidenceSourceSchema,
  rawScore: z.number().optional(),
  scoreMetric: z.string().optional()
});

export type LedgerEvidenceEntry = z.infer<typeof LedgerEvidenceEntrySchema>;

export const FindingTraceSchema = z.object({
  findingId: z.string(),
  itemTargetName: z.string(),
  ruleName: z.string(),
  referencedLedgerIds: z.array(z.string()),
  status: z.string(),
  classification: z.string(),
  numericClaimSource: z.string().optional()
});

export type FindingTrace = z.infer<typeof FindingTraceSchema>;

export const EvidenceLedgerRecordSchema = z.object({
  runId: z.string(),
  scenarioId: z.string(),
  createdAt: z.string(),
  evidenceEntries: z.array(LedgerEvidenceEntrySchema),
  findingTraces: z.array(FindingTraceSchema)
});

export type EvidenceLedgerRecord = z.infer<typeof EvidenceLedgerRecordSchema>;

export interface LedgerIntegrityValidationResult {
  isValid: boolean;
  violations: string[];
  auditedCount: number;
}

/**
 * Validates the internal integrity of an evaluation report and its evidence ledger.
 * Does not claim cryptographic immutability; this is an application-level evidence audit.
 */
export function validateReportIntegrity(
  ledger: EvidenceLedgerRecord,
  findings: EvaluationFinding[],
  resolvedEvidence: ResolvedEntityEvidence[],
  candidateSet: CandidateEntityEvidence[]
): LedgerIntegrityValidationResult {
  const violations: string[] = [];
  const knownLedgerIds = new Set(ledger.evidenceEntries.map(e => e.ledgerId));
  const knownResolvedIds = new Set(resolvedEvidence.map(r => r.qlooId).filter(Boolean));
  const knownCandidateIds = new Set(candidateSet.map(c => c.candidateId));

  // Check 1: Check duplicate ledger IDs
  const seenIds = new Set<string>();
  for (const entry of ledger.evidenceEntries) {
    if (seenIds.has(entry.ledgerId)) {
      violations.push(`Duplicate ledger evidence entry ID detected: "${entry.ledgerId}".`);
    }
    seenIds.add(entry.ledgerId);
  }

  // Check 2: Check finding references and rule mappings
  for (const finding of findings) {
    const trace = ledger.findingTraces.find(t => t.findingId === finding.id);

    if (!trace) {
      violations.push(`Finding "${finding.id}" has no registered trace in the evidence ledger.`);
      continue;
    }

    // Ensure all referenced ledger IDs actually exist in the ledger
    for (const refId of trace.referencedLedgerIds) {
      if (!knownLedgerIds.has(refId)) {
        violations.push(`Finding "${finding.id}" references nonexistent ledger evidence ID: "${refId}".`);
      }
    }

    // Check 3: Numeric claims must have documented source or origin formula
    if (finding.metricObserved) {
      if (!finding.metricObserved.sourceFormulaOrOrigin || finding.metricObserved.sourceFormulaOrOrigin.trim().length === 0) {
        violations.push(`Finding "${finding.id}" claims numeric score ${finding.metricObserved.value} without documented sourceFormulaOrOrigin.`);
      }
    }

    // Check 4: Unresolved entities or unverified combinations must be marked UNVERIFIABLE
    if (finding.classification === 'UNRESOLVED_ENTITY' || finding.classification === 'UNSUPPORTED_COMBINATION_OR_MISSING_EVIDENCE') {
      if (finding.status !== 'UNVERIFIABLE') {
        violations.push(`Finding "${finding.id}" is classified as ${finding.classification} but status is "${finding.status}" instead of UNVERIFIABLE.`);
      }
    }

    // Check 5: Claimed entities in PASS findings must be backed by resolved entities or candidates
    if (finding.status === 'PASS' && finding.classification === 'VERIFIED_SUPPORTED') {
      const hasBackingEvidence = trace.referencedLedgerIds.some(refId => {
        const entry = ledger.evidenceEntries.find(e => e.ledgerId === refId);
        return entry && (
          (entry.entityId && (knownResolvedIds.has(entry.entityId) || knownCandidateIds.has(entry.entityId))) ||
          entry.evidenceType === 'demo_fixture'
        );
      });

      if (!hasBackingEvidence) {
        violations.push(`Passing finding "${finding.id}" for "${finding.itemTargetName}" has no backing resolved entity or candidate in evidence ledger.`);
      }
    }

    // Check 6: Demo fixtures must be labelled explicitly as fixtures
    for (const refId of trace.referencedLedgerIds) {
      const entry = ledger.evidenceEntries.find(e => e.ledgerId === refId);
      if (entry && entry.source.provenance === 'fixture') {
        if (!entry.source.endpoint.includes('fixture') && !entry.source.endpoint.includes('FIXTURE') && entry.evidenceType !== 'demo_fixture') {
          violations.push(`Evidence "${entry.ledgerId}" is marked with fixture provenance but lacks explicit fixture labelling.`);
        }
      }
    }
  }

  return {
    isValid: violations.length === 0,
    violations,
    auditedCount: findings.length
  };
}
