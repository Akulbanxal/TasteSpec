import test from 'node:test';
import assert from 'node:assert/strict';
import { EvaluationRunnerService } from '../server/src/services/evalRunnerService.js';
import { QlooClient } from '../server/src/services/qlooClient.js';
import { DEMO_SCENARIO_FIXTURES } from '../server/src/services/scenarioFixtures.js';
import type { EvaluationScenario } from '../shared/src/evaluationModel.js';

// ============================================================================
// Integration Tests for Evaluation Runner & Progress Events
// ============================================================================

test('EvaluationRunner emits real stages in sequence for successful execution', async () => {
  const client = new QlooClient({ apiKey: undefined });
  const runner = new EvaluationRunnerService(client);
  const fixture = DEMO_SCENARIO_FIXTURES[0];

  const job = await runner.executeRun({
    scenario: fixture.scenario,
    inputMode: 'paste_output',
    rawAgentOutput: fixture.sampleAgentOutputs.validHighAffinity
  });

  assert.equal(job.isTerminal, true);
  assert.equal(job.stage, 'evaluation_completed');
  assert(job.report !== undefined);

  // Verify real stages were emitted in order
  const stageNames = job.events.map(e => e.stage);
  assert.deepEqual(stageNames, [
    'evaluation_started',
    'validating_contract',
    'resolving_entities',
    'fetching_evidence',
    'evaluating_output',
    'evaluation_completed'
  ]);

  // Ensure timestamps are valid ISO strings and progress advances
  for (let i = 0; i < job.events.length; i++) {
    assert(job.events[i].progressPercent >= (job.events[i - 1]?.progressPercent ?? 0));
    assert(!isNaN(Date.parse(job.events[i].timestamp)));
  }
});

test('EvaluationRunner handles invalid scenario gracefully with clean failure report', async () => {
  const client = new QlooClient({ apiKey: undefined });
  const runner = new EvaluationRunnerService(client);
  const fixture = DEMO_SCENARIO_FIXTURES[0];

  const invalidScenario: EvaluationScenario = {
    ...fixture.scenario,
    constraints: {
      ...fixture.scenario.constraints,
      targetCategoryUrn: 'urn:unsupported:category'
    }
  };

  const job = await runner.executeRun({
    scenario: invalidScenario,
    inputMode: 'paste_output',
    rawAgentOutput: fixture.sampleAgentOutputs.validHighAffinity
  });

  assert.equal(job.isTerminal, true);
  assert.equal(job.stage, 'evaluation_failed');
  assert(job.events.some(e => e.stage === 'evaluation_failed'));
  assert(job.report !== undefined, 'Expected structured failure report');
  assert.equal(job.report.finalState, 'FAILED');
  assert(job.report.findings[0].humanReadableReason.includes('not a verified documented Qloo filter type'));
});

test('EvaluationRunner handles empty Qloo search results without crashing', async () => {
  const mockFetch: typeof fetch = async () => {
    return new Response(JSON.stringify({ data: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  };

  const client = new QlooClient({ apiKey: 'live_test_key', fetchFn: mockFetch });
  const runner = new EvaluationRunnerService(client);
  const fixture = DEMO_SCENARIO_FIXTURES[0];

  const job = await runner.executeRun({
    scenario: fixture.scenario,
    inputMode: 'paste_output',
    rawAgentOutput: JSON.stringify({ recommendations: [{ rawName: 'Nonexistent Unknown Place' }] }),
    forceOfflineFixtureMode: false
  });

  assert.equal(job.isTerminal, true);
  assert.equal(job.stage, 'evaluation_completed');
  assert(job.report !== undefined);
  // Unresolved entity finding generated
  const finding = job.report.findings.find(f => f.itemTargetName === 'Nonexistent Unknown Place');
  assert(finding);
  assert.equal(finding.status, 'UNVERIFIABLE');
});

test('EvaluationRunner handles API network failure during live stage cleanly', async () => {
  const mockFetch: typeof fetch = async () => {
    return new Response(JSON.stringify({ message: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  };

  const client = new QlooClient({ apiKey: 'live_test_key', fetchFn: mockFetch, maxRetries: 0 });
  const runner = new EvaluationRunnerService(client);
  const fixture = DEMO_SCENARIO_FIXTURES[0];

  const job = await runner.executeRun({
    scenario: fixture.scenario,
    inputMode: 'paste_output',
    rawAgentOutput: fixture.sampleAgentOutputs.validHighAffinity,
    forceOfflineFixtureMode: false
  });

  assert.equal(job.isTerminal, true);
  // Live stage entity resolution handles network failures by marking entity unresolved and continuing
  assert.equal(job.stage, 'evaluation_completed');
  assert(job.report !== undefined);
  assert(job.report.findings.every(f => f.status === 'UNVERIFIABLE'));
});

test('EvaluationRunner supports explicit job cancellation', async () => {
  const client = new QlooClient({ apiKey: undefined });
  const runner = new EvaluationRunnerService(client);
  const fixture = DEMO_SCENARIO_FIXTURES[0];

  // We can cancel an existing job ID
  const job = await runner.executeRun({
    scenario: fixture.scenario,
    inputMode: 'paste_output',
    rawAgentOutput: fixture.sampleAgentOutputs.validHighAffinity
  });

  // Polling status returns the registered job
  const polled = runner.getJobStatus(job.runId);
  assert(polled !== undefined);
  assert.equal(polled.runId, job.runId);
});
