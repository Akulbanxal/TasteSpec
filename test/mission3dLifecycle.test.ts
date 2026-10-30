import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mapJobStatusToMissionState,
  getCheckpointIdForStage,
  MISSION_CHECKPOINTS
} from '../client/src/components/mission3d/missionState.js';
import type { EvaluationJobStatus } from '../shared/src/progressEvents.js';
import type { EvaluationReport } from '../shared/src/evaluationModel.js';

test('3D Mission real backend state mapping: Handles idle/initial state cleanly', () => {
  const state = mapJobStatusToMissionState(null);

  assert.equal(state.currentStage, 'idle');
  assert.equal(state.activeCheckpointIndex, 0);
  assert.equal(state.hasFailure, false);
  assert.equal(state.isTerminal, false);
  assert.equal(state.checkpointStatuses.contract_validation, 'idle');
  assert.equal(state.checkpointStatuses.report_ready, 'idle');
});

test('3D Mission real backend state mapping: Maps progressive live stages accurately', () => {
  const jobResolving: EvaluationJobStatus = {
    runId: 'run_test_101',
    stage: 'resolving_entities',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    events: [
      {
        runId: 'run_test_101',
        stage: 'evaluation_started',
        timestamp: new Date().toISOString(),
        summary: 'Evaluation initialized and parameters validated.',
        progressPercent: 10
      },
      {
        runId: 'run_test_101',
        stage: 'validating_contract',
        timestamp: new Date().toISOString(),
        summary: 'Validating scenario constraints and Qloo endpoint URN.',
        progressPercent: 20
      },
      {
        runId: 'run_test_101',
        stage: 'resolving_entities',
        timestamp: new Date().toISOString(),
        summary: 'Resolving 2 recommended entities via Qloo /search.',
        progressPercent: 40
      }
    ],
    isTerminal: false
  };

  const state = mapJobStatusToMissionState(jobResolving);

  assert.equal(state.currentStage, 'resolving_entities');
  // Checkpoint 1: contract_validation is completed
  assert.equal(state.checkpointStatuses.contract_validation, 'completed');
  // Checkpoint 2: entity_resolution is currently active
  assert.equal(state.checkpointStatuses.entity_resolution, 'active');
  // Subsequent checkpoints remain idle
  assert.equal(state.checkpointStatuses.evidence_retrieval, 'idle');
  assert.equal(state.checkpointStatuses.recommendation_grounding, 'idle');
  assert.equal(state.checkpointStatuses.report_ready, 'idle');
  assert.equal(state.activeCheckpointIndex, 1);
  assert.equal(state.hasFailure, false);

  // Diagnostics populated from real events
  assert(state.diagnostics.entity_resolution);
  assert.equal(state.diagnostics.entity_resolution.stage, 'resolving_entities');
  assert.equal(state.diagnostics.contract_validation.stage, 'validating_contract');
});

test('3D Mission real backend state mapping: Successful run completes all checkpoints and attaches real report', () => {
  const mockReport: EvaluationReport = {
    id: 'report_real_complete',
    scenarioId: 'scen_brooklyn_music',
    scenarioTitle: 'Brooklyn Indie to Natural Wine',
    createdAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    finalState: 'COMPLETED',
    agentOutputSummary: { mode: 'direct_text', itemCount: 2 },
    summaryCounts: {
      totalChecks: 2,
      passCount: 2,
      warningCount: 0,
      failCount: 0,
      unverifiableCount: 0
    },
    findings: [],
    resolvedEntitiesEvidence: [],
    lifecycleTimeline: []
  };

  const jobCompleted: EvaluationJobStatus = {
    runId: 'run_test_complete',
    stage: 'evaluation_completed',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    events: [
      { runId: 'run_test_complete', stage: 'validating_contract', timestamp: new Date().toISOString(), summary: 'Contract valid.', progressPercent: 20 },
      { runId: 'run_test_complete', stage: 'resolving_entities', timestamp: new Date().toISOString(), summary: 'Entities resolved.', progressPercent: 40 },
      { runId: 'run_test_complete', stage: 'fetching_evidence', timestamp: new Date().toISOString(), summary: 'Evidence retrieved.', progressPercent: 60 },
      { runId: 'run_test_complete', stage: 'evaluating_output', timestamp: new Date().toISOString(), summary: 'Output evaluated.', progressPercent: 80 },
      { runId: 'run_test_complete', stage: 'evaluation_completed', timestamp: new Date().toISOString(), summary: 'Completed successfully.', progressPercent: 100 }
    ],
    report: mockReport,
    isTerminal: true
  };

  const state = mapJobStatusToMissionState(jobCompleted);

  assert.equal(state.currentStage, 'evaluation_completed');
  assert.equal(state.isTerminal, true);
  assert.equal(state.hasFailure, false);
  assert.equal(state.activeCheckpointIndex, 4);

  // All 5 checkpoints completed
  assert.equal(state.checkpointStatuses.contract_validation, 'completed');
  assert.equal(state.checkpointStatuses.entity_resolution, 'completed');
  assert.equal(state.checkpointStatuses.evidence_retrieval, 'completed');
  assert.equal(state.checkpointStatuses.recommendation_grounding, 'completed');
  assert.equal(state.checkpointStatuses.report_ready, 'completed');
  assert.equal(state.report?.id, 'report_real_complete');
});

test('3D Mission real backend state mapping: Early failure stops at the true failed checkpoint with diagnostic', () => {
  const jobFailedEarly: EvaluationJobStatus = {
    runId: 'run_test_fail_early',
    stage: 'evaluation_failed',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    error: 'Target category URN "urn:invalid:unsupported_urn" is not a verified documented Qloo filter type.',
    events: [
      {
        runId: 'run_test_fail_early',
        stage: 'evaluation_started',
        timestamp: new Date().toISOString(),
        summary: 'Evaluation initialized and parameters validated.',
        progressPercent: 10
      },
      {
        runId: 'run_test_fail_early',
        stage: 'validating_contract',
        timestamp: new Date().toISOString(),
        summary: 'Validating scenario constraints and Qloo endpoint URN.',
        progressPercent: 20
      },
      {
        runId: 'run_test_fail_early',
        stage: 'evaluation_failed',
        timestamp: new Date().toISOString(),
        summary: 'Evaluation stage failed: Target category URN "urn:invalid:unsupported_urn" is not a verified documented Qloo filter type.',
        progressPercent: 100,
        errorCode: 'CONTRACT_VIOLATION'
      }
    ],
    isTerminal: true
  };

  const state = mapJobStatusToMissionState(jobFailedEarly);

  assert.equal(state.currentStage, 'evaluation_failed');
  assert.equal(state.isTerminal, true);
  assert.equal(state.hasFailure, true);
  assert.equal(state.activeCheckpointIndex, 0); // Stopped immediately at Checkpoint 1 (contract_validation)
  assert.equal(state.checkpointStatuses.contract_validation, 'failed');
  assert.equal(state.checkpointStatuses.entity_resolution, 'idle');
  assert.equal(state.checkpointStatuses.evidence_retrieval, 'idle');
  assert.equal(state.checkpointStatuses.recommendation_grounding, 'idle');
  assert.equal(state.checkpointStatuses.report_ready, 'idle');

  // Verify diagnostic contains error details
  const contractDiag = state.diagnostics.contract_validation;
  assert(contractDiag);
  assert.equal(contractDiag.isError, true);
  assert.equal(contractDiag.errorCode, 'CONTRACT_VIOLATION');
  assert(contractDiag.summary.includes('Target category URN'));
});

test('Stage URN helper correctly identifies stage to checkpoint mapping', () => {
  assert.equal(getCheckpointIdForStage('validating_contract'), 'contract_validation');
  assert.equal(getCheckpointIdForStage('resolving_entities'), 'entity_resolution');
  assert.equal(getCheckpointIdForStage('fetching_evidence'), 'evidence_retrieval');
  assert.equal(getCheckpointIdForStage('evaluating_output'), 'recommendation_grounding');
  assert.equal(getCheckpointIdForStage('evaluation_completed'), 'report_ready');
});
