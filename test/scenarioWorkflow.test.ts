import test from 'node:test';
import assert from 'node:assert/strict';
import { validateAdapterUrl } from '../server/src/services/agentAdapter.js';
import { ScenarioWorkflowService } from '../server/src/services/scenarioWorkflowService.js';
import { QlooClient } from '../server/src/services/qlooClient.js';
import { DEMO_SCENARIO_FIXTURES } from '../server/src/services/scenarioFixtures.js';

// ============================================================================
// 1. SSRF Protection Tests
// ============================================================================

test('validateAdapterUrl rejects insecure http protocol', () => {
  assert.throws(
    () => validateAdapterUrl('http://my-agent.com/api/recommend'),
    /HTTPS protocol/
  );
});

test('validateAdapterUrl rejects loopback and local hostnames', () => {
  assert.throws(() => validateAdapterUrl('https://localhost:8000/eval'), /Loopback/);
  assert.throws(() => validateAdapterUrl('https://127.0.0.1:8000/eval'), /private or reserved/);
  assert.throws(() => validateAdapterUrl('https://agent.local/eval'), /Loopback/);
});

test('validateAdapterUrl rejects cloud metadata endpoints', () => {
  assert.throws(() => validateAdapterUrl('https://169.254.169.254/latest/meta-data'), /metadata/);
  assert.throws(() => validateAdapterUrl('https://metadata.google.internal/computeMetadata'), /metadata/);
});

test('validateAdapterUrl rejects private RFC1918 IP addresses', () => {
  assert.throws(() => validateAdapterUrl('https://10.0.1.5:8080/eval'), /private or reserved/);
  assert.throws(() => validateAdapterUrl('https://192.168.1.100/eval'), /private or reserved/);
  assert.throws(() => validateAdapterUrl('https://172.20.0.1/eval'), /private or reserved/);
});

test('validateAdapterUrl accepts legitimate public HTTPS URLs', () => {
  const url = validateAdapterUrl('https://api.my-agent-platform.com/v1/recommend');
  assert.equal(url.hostname, 'api.my-agent-platform.com');
  assert.equal(url.protocol, 'https:');
});

// ============================================================================
// 2. Scenario Workflow Tests (Paste-Output & Missing Key State)
// ============================================================================

test('ScenarioWorkflowService executes offline fixture evaluation when API key is missing', async () => {
  // Client without key
  const qlooClient = new QlooClient({ apiKey: undefined });
  const workflow = new ScenarioWorkflowService(qlooClient);

  const demoFixture = DEMO_SCENARIO_FIXTURES[0];
  const response = await workflow.runEvaluation({
    scenario: demoFixture.scenario,
    inputMode: 'paste_output',
    rawAgentOutput: demoFixture.sampleAgentOutputs.validHighAffinity
  });

  // Verify explicit offline execution mode
  assert.equal(response.executionMode, 'OFFLINE_DEMO_FIXTURE');
  assert(response.notice?.includes('QLOO_API_KEY is not configured'));

  // Findings should reflect the demo fixture evidence
  assert(response.report.findings.length > 0);
  const horsemenFinding = response.report.findings.find(f => f.itemTargetName === 'The Four Horsemen');
  assert(horsemenFinding, 'Expected finding for The Four Horsemen');
  assert.equal(horsemenFinding.status, 'PASS');
  assert.equal(horsemenFinding.classification, 'VERIFIED_SUPPORTED');
});

test('ScenarioWorkflowService parses unstructured multi-line text input', async () => {
  const qlooClient = new QlooClient({ apiKey: undefined });
  const workflow = new ScenarioWorkflowService(qlooClient);

  const demoFixture = DEMO_SCENARIO_FIXTURES[0];
  const pastedText = `
Here are my recommendations:
- The Four Horsemen
- Ten Bells
- Hypothetical Secret Loft Bar
  `;

  const response = await workflow.runEvaluation({
    scenario: demoFixture.scenario,
    inputMode: 'paste_output',
    rawAgentOutput: pastedText
  });

  assert.equal(response.executionMode, 'OFFLINE_DEMO_FIXTURE');
  assert.equal(response.report.agentOutputSummary.itemCount, 3);

  // Unindexed entity should be unverifiable
  const loftFinding = response.report.findings.find(f => f.itemTargetName === 'Hypothetical Secret Loft Bar');
  assert(loftFinding);
  assert.equal(loftFinding.status, 'UNVERIFIABLE');
});

test('ScenarioWorkflowService rejects empty paste input', async () => {
  const qlooClient = new QlooClient({ apiKey: undefined });
  const workflow = new ScenarioWorkflowService(qlooClient);

  const demoFixture = DEMO_SCENARIO_FIXTURES[0];

  await assert.rejects(
    async () => {
      await workflow.runEvaluation({
        scenario: demoFixture.scenario,
        inputMode: 'paste_output',
        rawAgentOutput: '   '
      });
    },
    /Agent output text is required/
  );
});

test('ScenarioWorkflowService executes custom scenario and validates findings deterministically', async () => {
  const qlooClient = new QlooClient({ apiKey: undefined });
  const workflow = new ScenarioWorkflowService(qlooClient);

  const customScenario = {
    id: 'custom_paris_fashion',
    title: 'Parisian Minimalist Tailoring',
    personaName: 'Le Marais Modernist',
    description: 'Custom evaluation scenario created by user.',
    seeds: [{ name: 'Lemaire', domain: 'brand' as const }],
    targetDomain: 'brand' as const,
    location: { city: 'Paris', countryCode: 'FR' },
    constraints: {
      minEmpiricalAffinity: 0.65,
      forbiddenAttributes: ['fast-fashion'],
      requiredAttributes: [],
      targetCategoryUrn: 'urn:entity:brand'
    }
  };

  const response = await workflow.runEvaluation({
    scenario: customScenario,
    inputMode: 'paste_output',
    rawAgentOutput: 'Dries Van Noten\nUnindexed Unknown Brand'
  });

  assert.equal(response.report.scenarioId, 'custom_paris_fashion');
  assert.equal(response.report.findings.length, 2);
  assert.equal(response.report.findings[0].itemTargetName, 'Dries Van Noten');
  // Since unindexed, must be classified as UNVERIFIABLE
  assert.equal(response.report.findings[1].status, 'UNVERIFIABLE');
});

test('ScenarioWorkflowService rejects scenario with invalid constraints', async () => {
  const qlooClient = new QlooClient({ apiKey: undefined });
  const workflow = new ScenarioWorkflowService(qlooClient);

  const invalidScenario = {
    id: 'invalid_scenario',
    title: 'Invalid',
    personaName: 'Invalid',
    description: 'Invalid',
    seeds: [], // EMPTY SEEDS!
    targetDomain: 'place' as const,
    constraints: {
      targetCategoryUrn: 'invalid-urn-without-prefix'
    }
  };

  await assert.rejects(
    async () => {
      await workflow.runEvaluation({
        scenario: invalidScenario as any,
        inputMode: 'paste_output',
        rawAgentOutput: 'Something'
      });
    },
    /Invalid scenario input/
  );
});

