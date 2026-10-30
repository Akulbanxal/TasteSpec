import { z } from 'zod';

// ============================================================================
// 1. Versioned Parameter Combination Rules (Verified from Official Docs)
// ============================================================================

export const SUPPORTED_COMBINATIONS_VERSION = '2026.1';

export const SupportedDomainEnum = z.enum([
  'music',
  'film',
  'brand',
  'place',
  'book',
  'podcast',
  'tv',
  'person'
]);

export type SupportedDomain = z.infer<typeof SupportedDomainEnum>;

/**
 * Filter URN prefixes officially documented for Qloo Insights.
 * Anything outside these verified patterns is classified as UNVERIFIABLE.
 */
export const VERIFIED_FILTER_TYPES = [
  'urn:tag',
  'urn:demographics',
  'urn:entity:brand',
  'urn:entity:artist',
  'urn:entity:place',
  'urn:entity:film',
  'urn:entity:book'
] as const;

export function isVerifiedFilterCombination(filterType: string): boolean {
  return VERIFIED_FILTER_TYPES.includes(filterType as any) ||
    filterType.startsWith('urn:entity:') ||
    filterType === 'urn:tag' ||
    filterType === 'urn:demographics';
}

// ============================================================================
// 2. Cultural Seeds & Scenarios
// ============================================================================

export const CulturalSeedSchema = z.object({
  name: z.string().trim().min(1, 'Seed name is required'),
  domain: SupportedDomainEnum,
  resolvedQlooId: z.string().optional()
});

export type CulturalSeed = z.infer<typeof CulturalSeedSchema>;

export const LocationConstraintSchema = z.object({
  city: z.string().trim().min(1).optional(),
  countryCode: z.string().trim().length(2).optional(),
  neighborhood: z.string().trim().optional()
});

export type LocationConstraint = z.infer<typeof LocationConstraintSchema>;

export const ScenarioConstraintsSchema = z.object({
  minEmpiricalAffinity: z.number().min(0).max(1).optional(),
  forbiddenAttributes: z.array(z.string().trim()).default([]),
  requiredAttributes: z.array(z.string().trim()).default([]),
  targetCategoryUrn: z.string().trim().regex(/^urn:[a-z0-9_:-]+$/, 'Must be valid URN')
});

export type ScenarioConstraints = z.infer<typeof ScenarioConstraintsSchema>;

export const EvaluationScenarioSchema = z.object({
  id: z.string().trim().min(1),
  title: z.string().trim().min(1),
  personaName: z.string().trim().min(1),
  description: z.string().trim(),
  seeds: z.array(CulturalSeedSchema).min(1, 'At least one cultural seed is required'),
  targetDomain: SupportedDomainEnum,
  location: LocationConstraintSchema.optional(),
  constraints: ScenarioConstraintsSchema
});

export type EvaluationScenario = z.infer<typeof EvaluationScenarioSchema>;

// ============================================================================
// 3. Agent Input Mode and Captured Output
// ============================================================================

export const AgentInputModeEnum = z.enum([
  'direct_text',
  'structured_json',
  'remote_adapter'
]);

export type AgentInputMode = z.infer<typeof AgentInputModeEnum>;

export const AgentRecommendationItemSchema = z.object({
  rawName: z.string().trim().min(1),
  domain: SupportedDomainEnum.optional(),
  agentClaimedReasoning: z.string().trim().optional(),
  agentClaimedAffinity: z.number().optional()
});

export type AgentRecommendationItem = z.infer<typeof AgentRecommendationItemSchema>;

export const CapturedAgentOutputSchema = z.object({
  mode: AgentInputModeEnum,
  rawPayload: z.string(),
  recommendations: z.array(AgentRecommendationItemSchema).min(1, 'At least one recommendation is required'),
  capturedAt: z.string().datetime()
});

export type CapturedAgentOutput = z.infer<typeof CapturedAgentOutputSchema>;

// ============================================================================
// 4. Qloo Evidence & Resolution
// ============================================================================

export const QlooProvenanceEnum = z.enum([
  'live_network',
  'cache',
  'fixture'
]);

export type QlooProvenance = z.infer<typeof QlooProvenanceEnum>;

export const EvidenceSourceSchema = z.object({
  endpoint: z.string(),
  parametersUsed: z.record(z.string(), z.string()),
  provenance: QlooProvenanceEnum,
  latencyMs: z.number().nonnegative(),
  retrievedAt: z.string()
});

export type EvidenceSource = z.infer<typeof EvidenceSourceSchema>;

export const ResolvedEntityEvidenceSchema = z.object({
  query: z.string(),
  isResolved: z.boolean(),
  qlooId: z.string().optional(),
  canonicalName: z.string().optional(),
  domain: SupportedDomainEnum.optional(),
  tags: z.array(z.string()).default([]),
  evidenceSource: EvidenceSourceSchema
});

export type ResolvedEntityEvidence = z.infer<typeof ResolvedEntityEvidenceSchema>;

export const CandidateEntityEvidenceSchema = z.object({
  candidateId: z.string(),
  name: z.string(),
  type: z.string(),
  /**
   * Only present if Qloo explicitly returned a score in the response.
   * Never manufactured or fabricated.
   */
  returnedScore: z.number().optional(),
  scoreMetricName: z.enum(['affinity', 'score', 'correlation', 'unknown']).optional(),
  evidenceSource: EvidenceSourceSchema
});

export type CandidateEntityEvidence = z.infer<typeof CandidateEntityEvidenceSchema>;

// ============================================================================
// 5. Findings, Severities, and Check Statuses
// ============================================================================

export const CheckStatusEnum = z.enum([
  'PASS',
  'WARNING',
  'FAIL',
  'UNVERIFIABLE'
]);

export type CheckStatus = z.infer<typeof CheckStatusEnum>;

export const FindingSeverityEnum = z.enum([
  'info',
  'low',
  'medium',
  'high',
  'critical'
]);

export type FindingSeverity = z.infer<typeof FindingSeverityEnum>;

export const EpistemicClassificationEnum = z.enum([
  'VERIFIED_SUPPORTED',
  'NOT_PRESENT_IN_RETRIEVED_SET',
  'KNOWN_LOW_AFFINITY',
  'CONTRADICTS_CONSTRAINT',
  'UNRESOLVED_ENTITY',
  'UNSUPPORTED_COMBINATION_OR_MISSING_EVIDENCE'
]);

export type EpistemicClassification = z.infer<typeof EpistemicClassificationEnum>;

export const EvaluationFindingSchema = z.object({
  id: z.string(),
  itemTargetName: z.string(),
  status: CheckStatusEnum,
  severity: FindingSeverityEnum,
  classification: EpistemicClassificationEnum,
  humanReadableReason: z.string(),
  evidenceReferences: z.array(z.string()).default([]),
  metricObserved: z.object({
    name: z.string(),
    value: z.number(),
    sourceFormulaOrOrigin: z.string()
  }).optional()
});

export type EvaluationFinding = z.infer<typeof EvaluationFindingSchema>;

// ============================================================================
// 6. Lifecycle Events and Final Evaluation Report
// ============================================================================

export const EvaluationLifecycleStateEnum = z.enum([
  'CONFIGURED',
  'RESOLVING_ENTITIES',
  'FETCHING_QLOO_EVIDENCE',
  'EVALUATING_RULES',
  'COMPLETED',
  'FAILED'
]);

export type EvaluationLifecycleState = z.infer<typeof EvaluationLifecycleStateEnum>;

/**
 * Valid state transitions for the evaluation lifecycle
 */
export const VALID_LIFECYCLE_TRANSITIONS: Record<EvaluationLifecycleState, EvaluationLifecycleState[]> = {
  CONFIGURED: ['RESOLVING_ENTITIES', 'FAILED'],
  RESOLVING_ENTITIES: ['FETCHING_QLOO_EVIDENCE', 'FAILED'],
  FETCHING_QLOO_EVIDENCE: ['EVALUATING_RULES', 'FAILED'],
  EVALUATING_RULES: ['COMPLETED', 'FAILED'],
  COMPLETED: [],
  FAILED: []
};

export function isValidLifecycleTransition(
  current: EvaluationLifecycleState,
  next: EvaluationLifecycleState
): boolean {
  return VALID_LIFECYCLE_TRANSITIONS[current]?.includes(next) ?? false;
}

export const EvaluationLifecycleEventSchema = z.object({
  state: EvaluationLifecycleStateEnum,
  timestamp: z.string(),
  details: z.string().optional()
});

export type EvaluationLifecycleEvent = z.infer<typeof EvaluationLifecycleEventSchema>;

export const EvaluationReportSchema = z.object({
  id: z.string(),
  scenarioId: z.string(),
  scenarioTitle: z.string(),
  createdAt: z.string(),
  completedAt: z.string().optional(),
  finalState: EvaluationLifecycleStateEnum,
  agentOutputSummary: z.object({
    mode: AgentInputModeEnum,
    itemCount: z.number()
  }),
  summaryCounts: z.object({
    totalChecks: z.number().nonnegative(),
    passCount: z.number().nonnegative(),
    warningCount: z.number().nonnegative(),
    failCount: z.number().nonnegative(),
    unverifiableCount: z.number().nonnegative()
  }),
  findings: z.array(EvaluationFindingSchema),
  resolvedEntitiesEvidence: z.array(ResolvedEntityEvidenceSchema),
  lifecycleTimeline: z.array(EvaluationLifecycleEventSchema),
  evidenceLedger: z.any().optional(),
  scenarioSnapshot: EvaluationScenarioSchema.optional(),
  rawAgentOutputSnapshot: z.string().optional()
});

export type EvaluationReport = z.infer<typeof EvaluationReportSchema>;
