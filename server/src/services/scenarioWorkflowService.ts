import {
  EvaluationScenarioSchema,
  CapturedAgentOutputSchema,
  type EvaluationScenario,
  type CapturedAgentOutput,
  type EvaluationReport,
  type ResolvedEntityEvidence,
  type CandidateEntityEvidence,
  type AgentRecommendationItem
} from '../../../shared/src/evaluationModel.js';
import { QlooClient } from './qlooClient.js';
import { DeterministicEvalEngine } from './evalEngine.js';
import { DEMO_SCENARIO_FIXTURES } from './scenarioFixtures.js';
import { invokeAgentAdapter } from './agentAdapter.js';

export interface WorkflowRunRequest {
  scenario: EvaluationScenario;
  inputMode: 'paste_output' | 'configured_adapter';
  rawAgentOutput?: string;
  adapterUrl?: string;
  forceOfflineFixtureMode?: boolean;
}

export interface WorkflowRunResponse {
  report: EvaluationReport;
  executionMode: 'LIVE_QLOO_VERIFICATION' | 'OFFLINE_DEMO_FIXTURE';
  notice?: string;
}

export class ScenarioWorkflowService {
  private readonly qlooClient: QlooClient;
  private readonly evalEngine: DeterministicEvalEngine;

  constructor(qlooClient: QlooClient) {
    this.qlooClient = qlooClient;
    this.evalEngine = new DeterministicEvalEngine();
  }

  public getTemplates(): EvaluationScenario[] {
    return DEMO_SCENARIO_FIXTURES.map(f => f.scenario);
  }

  public getTemplateBundle(scenarioId: string) {
    return DEMO_SCENARIO_FIXTURES.find(f => f.scenario.id === scenarioId);
  }

  public async runEvaluation(request: WorkflowRunRequest): Promise<WorkflowRunResponse> {
    // 1. Validate Scenario
    const parsedScenario = EvaluationScenarioSchema.safeParse(request.scenario);
    if (!parsedScenario.success) {
      throw new Error(`Invalid scenario input: ${parsedScenario.error.issues.map(i => i.message).join(', ')}`);
    }
    const scenario = parsedScenario.data;

    // 2. Extract Agent Output Items based on Input Mode
    let recommendations: AgentRecommendationItem[] = [];
    let rawPayload = '';

    if (request.inputMode === 'paste_output') {
      rawPayload = request.rawAgentOutput?.trim() || '';
      if (!rawPayload) {
        throw new Error('Agent output text is required in paste_output mode.');
      }
      recommendations = this.parsePastedOutput(rawPayload, scenario.targetDomain);
    } else if (request.inputMode === 'configured_adapter') {
      if (!request.adapterUrl) {
        throw new Error('Adapter URL is required in configured_adapter mode.');
      }
      const adapterResult = await invokeAgentAdapter(request.adapterUrl, {
        personaName: scenario.personaName,
        seeds: scenario.seeds.map(s => ({ name: s.name, domain: s.domain })),
        targetDomain: scenario.targetDomain
      });
      recommendations = adapterResult.recommendations;
      rawPayload = adapterResult.rawResponseText;
    }

    if (recommendations.length === 0) {
      throw new Error('No recommendation items could be parsed from the agent output.');
    }

    const capturedOutput: CapturedAgentOutput = {
      mode: request.inputMode === 'paste_output' ? 'direct_text' : 'remote_adapter',
      rawPayload,
      recommendations,
      capturedAt: new Date().toISOString()
    };

    // 3. Check Live API Key vs Offline Fixture Fallback
    const isKeyConfigured = this.qlooClient.isKeyConfigured();
    const useOffline = request.forceOfflineFixtureMode || !isKeyConfigured;

    if (useOffline) {
      // Offline Fixture Evaluator Mode
      const matchedBundle = DEMO_SCENARIO_FIXTURES.find(f => f.scenario.id === scenario.id);
      const demoResolved = matchedBundle?.demoResolvedEntities || [];
      const demoCandidates = matchedBundle?.demoCandidates || [];

      // Check whether agent items match demo fixtures or need fallback unindexed resolution
      const resolvedEvidence: ResolvedEntityEvidence[] = recommendations.map(rec => {
        const found = demoResolved.find(d => d.query.toLowerCase() === rec.rawName.toLowerCase());
        if (found) return found;

        return {
          query: rec.rawName,
          isResolved: false,
          tags: [],
          evidenceSource: {
            endpoint: '/search [DEMO FIXTURE]',
            parametersUsed: { query: rec.rawName },
            provenance: 'fixture',
            latencyMs: 0,
            retrievedAt: new Date().toISOString()
          }
        };
      });

      const report = this.evalEngine.evaluate({
        scenario,
        agentOutput: capturedOutput,
        resolvedEntities: resolvedEvidence,
        candidateSet: demoCandidates
      });

      return {
        report,
        executionMode: 'OFFLINE_DEMO_FIXTURE',
        notice: !isKeyConfigured
          ? 'QLOO_API_KEY is not configured on the server. Live stage was bypassed and evaluated against verified DEMO FIXTURES.'
          : 'Executed under requested offline fixture mode.'
      };
    }

    // 4. Live Qloo Network Resolution & Evidence Gathering
    const resolvedEvidence: ResolvedEntityEvidence[] = [];

    // Step A: Resolve each recommended entity
    for (const rec of recommendations) {
      try {
        const searchResult = await this.qlooClient.searchEntities({
          query: rec.rawName,
          type: rec.domain || (scenario.targetDomain as any)
        });

        const topMatch = searchResult.data[0];
        if (topMatch && topMatch.id) {
          resolvedEvidence.push({
            query: rec.rawName,
            isResolved: true,
            qlooId: topMatch.id,
            canonicalName: topMatch.name,
            domain: (topMatch.domain || rec.domain) as any,
            tags: topMatch.attributes || [],
            evidenceSource: {
              endpoint: '/search',
              parametersUsed: { query: rec.rawName },
              provenance: searchResult.metadata.provenance,
              latencyMs: searchResult.metadata.latencyMs,
              retrievedAt: searchResult.metadata.timestamp
            }
          });
        } else {
          resolvedEvidence.push({
            query: rec.rawName,
            isResolved: false,
            tags: [],
            evidenceSource: {
              endpoint: '/search',
              parametersUsed: { query: rec.rawName },
              provenance: searchResult.metadata.provenance,
              latencyMs: searchResult.metadata.latencyMs,
              retrievedAt: searchResult.metadata.timestamp
            }
          });
        }
      } catch (err: any) {
        resolvedEvidence.push({
          query: rec.rawName,
          isResolved: false,
          tags: [],
          evidenceSource: {
            endpoint: '/search',
            parametersUsed: { query: rec.rawName },
            provenance: 'live_network',
            latencyMs: 0,
            retrievedAt: new Date().toISOString()
          }
        });
      }
    }

    // Step B: Fetch Insights Candidate Set for Seed Entities
    const candidateSet: CandidateEntityEvidence[] = [];
    const seedIds = scenario.seeds.map(s => s.resolvedQlooId).filter(Boolean) as string[];

    if (seedIds.length > 0) {
      try {
        const insightsResult = await this.qlooClient.getInsights({
          seedEntityIds: seedIds,
          filterType: scenario.constraints.targetCategoryUrn
        });

        for (const item of insightsResult.data) {
          candidateSet.push({
            candidateId: item.id,
            name: item.name,
            type: item.type,
            returnedScore: item.affinityScore,
            scoreMetricName: 'affinity',
            evidenceSource: {
              endpoint: '/insights',
              parametersUsed: {
                'signal.interests.entities': seedIds.join(','),
                'filter.type': scenario.constraints.targetCategoryUrn
              },
              provenance: insightsResult.metadata.provenance,
              latencyMs: insightsResult.metadata.latencyMs,
              retrievedAt: insightsResult.metadata.timestamp
            }
          });
        }
      } catch (err: any) {
        // Insights failed or empty
      }
    }

    // 5. Evaluate against live retrieved evidence
    const report = this.evalEngine.evaluate({
      scenario,
      agentOutput: capturedOutput,
      resolvedEntities: resolvedEvidence,
      candidateSet
    });

    return {
      report,
      executionMode: 'LIVE_QLOO_VERIFICATION'
    };
  }

  private parsePastedOutput(rawText: string, defaultDomain: string): AgentRecommendationItem[] {
    // Attempt JSON parse first
    try {
      const data = JSON.parse(rawText);
      const items = Array.isArray(data) ? data : data.recommendations || data.items || [];
      if (items.length > 0) {
        return items.map((it: any) => ({
          rawName: typeof it === 'string' ? it.trim() : (it.name || it.rawName || 'Unknown').trim(),
          domain: (it.domain || defaultDomain) as any,
          agentClaimedReasoning: it.reasoning || it.agentClaimedReasoning,
          agentClaimedAffinity: typeof it.claimedAffinity === 'number' ? it.claimedAffinity : it.agentClaimedAffinity
        }));
      }
    } catch {
      // Not JSON; fall back to line-by-line / bullet extraction
    }

    const lines = rawText.split('\n')
      .map(l => l.replace(/^[-*•\d.)\]\s]+/, '').trim())
      .filter(l => l.length > 0 && !l.toLowerCase().startsWith('here are') && !l.toLowerCase().startsWith('recommendations:'));

    return lines.map(line => ({
      rawName: line,
      domain: defaultDomain as any
    }));
  }
}
