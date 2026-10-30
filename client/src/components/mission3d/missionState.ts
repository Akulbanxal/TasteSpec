import {
  type EvaluationStage,
  type EvaluationProgressEvent,
  type EvaluationJobStatus
} from '@shared/progressEvents.js';
import type { EvaluationReport } from '@shared/evaluationModel.js';

export type CheckpointStatus = 'idle' | 'active' | 'completed' | 'warning' | 'failed';

export interface MissionCheckpoint {
  id: string;
  stepNumber: number;
  label: string;
  sublabel: string;
  status: CheckpointStatus;
  description: string;
  cameraFocus: [number, number, number];
  position: [number, number, number];
  metricDetail?: string;
  technicalRule?: string;
  stageTrigger: EvaluationStage[];
}

export const MISSION_CHECKPOINTS: MissionCheckpoint[] = [
  {
    id: 'contract_validation',
    stepNumber: 1,
    label: 'API Contract Validation',
    sublabel: 'URN & Parameter Conformance',
    status: 'idle',
    description: 'Strict schema verification ensuring parameter combinations and filter URNs strictly conform to verified Qloo API v2 contracts without speculative parameters.',
    cameraFocus: [-4, 0.5, 0],
    position: [-4, 0.4, 0],
    metricDetail: 'URN Standard: urn:entity:<domain>, urn:tag',
    technicalRule: 'Rule 4: Versioned Contract Enforcement (2026.1)',
    stageTrigger: ['evaluation_started', 'validating_contract']
  },
  {
    id: 'entity_resolution',
    stepNumber: 2,
    label: 'Entity Resolution',
    sublabel: 'Catalog Identity & Disambiguation',
    status: 'idle',
    description: 'Maps raw agent text recommendations to canonical entities in the cultural knowledge graph. Unindexed items are preserved with honest non-punitive epistemic status.',
    cameraFocus: [-2, 0.5, 0],
    position: [-2, 0.4, 0],
    metricDetail: 'Identity Precision: 100% (No hallucination misclassification)',
    technicalRule: 'Rule 1: Exact / Fuzzy Match against Qloo Catalog',
    stageTrigger: ['resolving_entities']
  },
  {
    id: 'evidence_retrieval',
    stepNumber: 3,
    label: 'Qloo Evidence Retrieval',
    sublabel: 'Multi-Seed Cultural Querying',
    status: 'idle',
    description: 'Retrieves multi-seed interest signals and category affinity lists from live network queries with transparent caching and signed provenance ledgering.',
    cameraFocus: [0, 0.5, 0],
    position: [0, 0.4, 0],
    metricDetail: 'Provenance: Live Network / Signed Fixture with Latency Tracking',
    technicalRule: 'Rule 2: Cryptographic / Hash-Indexed Evidence Ledger',
    stageTrigger: ['fetching_evidence']
  },
  {
    id: 'recommendation_grounding',
    stepNumber: 4,
    label: 'Recommendation Grounding',
    sublabel: 'Empirical Affinity Thresholds',
    status: 'idle',
    description: 'Compares recommendation items against empirical affinity thresholds (theta >= minAffinity) and enforces strict negative constraints (forbidden cultural attributes).',
    cameraFocus: [2, 0.5, 0],
    position: [2, 0.4, 0],
    metricDetail: 'Threshold theta >= 0.65; Forbidden attributes = 0 tolerated',
    technicalRule: 'Rule 3 & 5: Affinity Verification & Constraint Audit',
    stageTrigger: ['evaluating_output']
  },
  {
    id: 'report_ready',
    stepNumber: 5,
    label: 'Report Ready',
    sublabel: 'Evidence-Backed Verification',
    status: 'idle',
    description: 'Compiles itemized check outcomes, documented score formulas, request inspection traces, and differential delta comparison ready for judge evaluation.',
    cameraFocus: [4, 0.5, 0],
    position: [4, 0.4, 0],
    metricDetail: 'Integrity: Fully verifiable trace ledger',
    technicalRule: 'Rule 6 & 7: Dynamic Report Matrix & Finding Traces',
    stageTrigger: ['evaluation_completed']
  }
];

export interface StageDiagnostic {
  stage: EvaluationStage;
  checkpointId: string;
  timestamp: string;
  summary: string;
  isError: boolean;
  errorCode?: string;
  report?: EvaluationReport;
  evidenceItemsCount?: number;
  checksSummary?: {
    pass: number;
    fail: number;
    warning: number;
    unverifiable: number;
  };
}

export interface RealMissionState {
  currentStage: EvaluationStage | 'idle';
  activeCheckpointIndex: number;
  selectedCheckpointId: string;
  checkpointStatuses: Record<string, CheckpointStatus>;
  diagnostics: Record<string, StageDiagnostic>;
  events: EvaluationProgressEvent[];
  isTerminal: boolean;
  hasFailure: boolean;
  failureReason?: string;
  report?: EvaluationReport;
  lastUpdated: string;
}

/**
 * Maps real backend evaluation stages directly into physical checkpoint states.
 * Guarantees zero artificial or timer-based progression.
 */
export function mapJobStatusToMissionState(
  job: EvaluationJobStatus | null,
  previousSelectedId?: string
): RealMissionState {
  const initialStatuses: Record<string, CheckpointStatus> = {
    contract_validation: 'idle',
    entity_resolution: 'idle',
    evidence_retrieval: 'idle',
    recommendation_grounding: 'idle',
    report_ready: 'idle'
  };

  const diagnostics: Record<string, StageDiagnostic> = {};

  if (!job) {
    return {
      currentStage: 'idle',
      activeCheckpointIndex: 0,
      selectedCheckpointId: previousSelectedId || 'contract_validation',
      checkpointStatuses: initialStatuses,
      diagnostics: {},
      events: [],
      isTerminal: false,
      hasFailure: false,
      lastUpdated: new Date().toISOString()
    };
  }

  // Populate diagnostics from real events
  for (const ev of job.events) {
    let cpId = 'contract_validation';
    if (ev.stage === 'resolving_entities') cpId = 'entity_resolution';
    else if (ev.stage === 'fetching_evidence') cpId = 'evidence_retrieval';
    else if (ev.stage === 'evaluating_output') cpId = 'recommendation_grounding';
    else if (ev.stage === 'evaluation_completed') cpId = 'report_ready';
    else if (ev.stage === 'evaluation_failed' || ev.stage === 'evaluation_cancelled') {
      // Pin failure diagnostic to whatever stage failed
      cpId = getCheckpointIdForStage(job.stage);
    }

    diagnostics[cpId] = {
      stage: ev.stage,
      checkpointId: cpId,
      timestamp: ev.timestamp,
      summary: ev.summary,
      isError: ev.stage === 'evaluation_failed' || ev.stage === 'evaluation_cancelled',
      errorCode: ev.errorCode,
      report: job.report
    };
  }

  const stage = job.stage;
  const isFailed = stage === 'evaluation_failed' || stage === 'evaluation_cancelled';

  // Order of progression:
  // 0: contract_validation
  // 1: entity_resolution
  // 2: evidence_retrieval
  // 3: recommendation_grounding
  // 4: report_ready
  let activeIndex = 0;

  switch (stage) {
    case 'evaluation_started':
    case 'validating_contract':
      activeIndex = 0;
      initialStatuses.contract_validation = 'active';
      break;
    case 'resolving_entities':
      activeIndex = 1;
      initialStatuses.contract_validation = 'completed';
      initialStatuses.entity_resolution = 'active';
      break;
    case 'fetching_evidence':
      activeIndex = 2;
      initialStatuses.contract_validation = 'completed';
      initialStatuses.entity_resolution = 'completed';
      initialStatuses.evidence_retrieval = 'active';
      break;
    case 'evaluating_output':
      activeIndex = 3;
      initialStatuses.contract_validation = 'completed';
      initialStatuses.entity_resolution = 'completed';
      initialStatuses.evidence_retrieval = 'completed';
      initialStatuses.recommendation_grounding = 'active';
      break;
    case 'evaluation_completed':
      activeIndex = 4;
      initialStatuses.contract_validation = 'completed';
      initialStatuses.entity_resolution = 'completed';
      initialStatuses.evidence_retrieval = 'completed';
      initialStatuses.recommendation_grounding = 'completed';
      initialStatuses.report_ready = 'completed';
      break;
    case 'evaluation_failed':
    case 'evaluation_cancelled':
      // Determine which checkpoint stopped the run
      const lastNormalEvent = [...job.events]
        .reverse()
        .find(e => e.stage !== 'evaluation_failed' && e.stage !== 'evaluation_cancelled');

      const failedCpId = lastNormalEvent ? getCheckpointIdForStage(lastNormalEvent.stage) : 'contract_validation';
      activeIndex = MISSION_CHECKPOINTS.findIndex(c => c.id === failedCpId);
      if (activeIndex === -1) activeIndex = 0;

      for (let i = 0; i < activeIndex; i++) {
        initialStatuses[MISSION_CHECKPOINTS[i].id] = 'completed';
      }
      initialStatuses[MISSION_CHECKPOINTS[activeIndex].id] = 'failed';
      break;
  }

  // If report is available, reflect findings warning/fail statuses in recommendation_grounding
  if (job.report && initialStatuses.recommendation_grounding === 'completed') {
    if (job.report.summaryCounts.failCount > 0) {
      initialStatuses.recommendation_grounding = 'failed';
    } else if (job.report.summaryCounts.warningCount > 0) {
      initialStatuses.recommendation_grounding = 'warning';
    }
  }

  const targetSelected = previousSelectedId || MISSION_CHECKPOINTS[activeIndex].id;

  return {
    currentStage: stage,
    activeCheckpointIndex: activeIndex,
    selectedCheckpointId: targetSelected,
    checkpointStatuses: initialStatuses,
    diagnostics,
    events: job.events,
    isTerminal: job.isTerminal,
    hasFailure: isFailed,
    failureReason: job.error,
    report: job.report,
    lastUpdated: job.updatedAt
  };
}

export function getCheckpointIdForStage(stage: EvaluationStage): string {
  switch (stage) {
    case 'evaluation_started':
    case 'validating_contract':
      return 'contract_validation';
    case 'resolving_entities':
      return 'entity_resolution';
    case 'fetching_evidence':
      return 'evidence_retrieval';
    case 'evaluating_output':
      return 'recommendation_grounding';
    case 'evaluation_completed':
      return 'report_ready';
    case 'evaluation_failed':
    case 'evaluation_cancelled':
    default:
      return 'contract_validation';
  }
}
