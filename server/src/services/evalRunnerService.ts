import {
  type EvaluationScenario,
  type CapturedAgentOutput,
  type EvaluationReport,
  type ResolvedEntityEvidence,
  type CandidateEntityEvidence,
  type AgentRecommendationItem,
  isVerifiedFilterCombination
} from '../../../shared/src/evaluationModel.js';
import {
  type EvaluationProgressEvent,
  type EvaluationStage,
  type EvaluationJobStatus
} from '../../../shared/src/progressEvents.js';
import { QlooClient } from './qlooClient.js';
import { DeterministicEvalEngine } from './evalEngine.js';
import { DEMO_SCENARIO_FIXTURES } from './scenarioFixtures.js';
import { invokeAgentAdapter } from './agentAdapter.js';

export interface RunnerJobOptions {
  scenario: EvaluationScenario;
  inputMode: 'paste_output' | 'configured_adapter';
  rawAgentOutput?: string;
  adapterUrl?: string;
  forceOfflineFixtureMode?: boolean;
}

export class EvaluationRunnerService {
  private readonly qlooClient: QlooClient;
  private readonly evalEngine: DeterministicEvalEngine;
  private readonly jobs = new Map<string, EvaluationJobStatus>();
  private readonly abortControllers = new Map<string, AbortController>();

  constructor(qlooClient: QlooClient) {
    this.qlooClient = qlooClient;
    this.evalEngine = new DeterministicEvalEngine();
  }

  public getJobStatus(runId: string): EvaluationJobStatus | undefined {
    return this.jobs.get(runId);
  }

  public cancelJob(runId: string): boolean {
    const controller = this.abortControllers.get(runId);
    const job = this.jobs.get(runId);

    if (controller && job && !job.isTerminal) {
      controller.abort();
      this.emitEvent(job, 'evaluation_cancelled', 'Evaluation was explicitly cancelled by user.', 100);
      job.isTerminal = true;
      job.error = 'Evaluation cancelled by user.';
      return true;
    }

    return false;
  }

  /**
   * Execute evaluation runner tracking real lifecycle progress stages.
   * Never emits artificial timer-based progress.
   */
  public async executeRun(options: RunnerJobOptions): Promise<EvaluationJobStatus> {
    const runId = `run_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const controller = new AbortController();
    this.abortControllers.set(runId, controller);

    const job: EvaluationJobStatus = {
      runId,
      stage: 'evaluation_started',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      events: [],
      isTerminal: false
    };
    this.jobs.set(runId, job);

    this.emitEvent(job, 'evaluation_started', 'Evaluation initialized and parameters validated.', 10);

    // Run execution pipeline asynchronously or synchronously
    try {
      this.checkAborted(controller);

      // 1. Stage: Validating Contract
      this.emitEvent(job, 'validating_contract', 'Validating scenario constraints and Qloo endpoint URN.', 20);
      const filterType = options.scenario.constraints.targetCategoryUrn;
      const contractValid = isVerifiedFilterCombination(filterType);

      if (!contractValid) {
        throw new Error(`Target category URN "${filterType}" is not a verified documented Qloo filter type.`);
      }

      this.checkAborted(controller);

      // 2. Extract Agent Recommendations
      let recommendations: AgentRecommendationItem[] = [];
      let rawPayload = '';

      if (options.inputMode === 'paste_output') {
        rawPayload = options.rawAgentOutput?.trim() || '';
        if (!rawPayload) throw new Error('Agent output text is required.');
        recommendations = this.parsePastedOutput(rawPayload, options.scenario.targetDomain);
      } else {
        if (!options.adapterUrl) throw new Error('Adapter URL is required in configured_adapter mode.');
        const adapterRes = await invokeAgentAdapter(options.adapterUrl, {
          personaName: options.scenario.personaName,
          seeds: options.scenario.seeds.map(s => ({ name: s.name, domain: s.domain })),
          targetDomain: options.scenario.targetDomain
        });
        recommendations = adapterRes.recommendations;
        rawPayload = adapterRes.rawResponseText;
      }

      if (recommendations.length === 0) {
        throw new Error('No recommendations extracted from agent output.');
      }

      const capturedOutput: CapturedAgentOutput = {
        mode: options.inputMode === 'paste_output' ? 'direct_text' : 'remote_adapter',
        rawPayload,
        recommendations,
        capturedAt: new Date().toISOString()
      };

      this.checkAborted(controller);

      const isKeyConfigured = this.qlooClient.isKeyConfigured();
      const useOffline = options.forceOfflineFixtureMode || !isKeyConfigured;

      let resolvedEntities: ResolvedEntityEvidence[] = [];
      let candidateSet: CandidateEntityEvidence[] = [];

      if (useOffline) {
        // Offline fixture mode
        this.emitEvent(job, 'resolving_entities', 'Resolving entities against offline demo fixtures (Missing API key or fixture mode requested).', 40);
        const demoBundle = DEMO_SCENARIO_FIXTURES.find(f => f.scenario.id === options.scenario.id);
        const demoResolved = demoBundle?.demoResolvedEntities || [];
        candidateSet = demoBundle?.demoCandidates || [];

        resolvedEntities = recommendations.map(rec => {
          const match = demoResolved.find(d => d.query.toLowerCase() === rec.rawName.toLowerCase());
          if (match) return match;

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

        this.checkAborted(controller);
        this.emitEvent(job, 'fetching_evidence', 'Matched candidate set from verified offline fixtures.', 60);
      } else {
        // Live Qloo stages
        this.emitEvent(job, 'resolving_entities', `Resolving ${recommendations.length} recommended entities via Qloo /search.`, 40);

        for (const rec of recommendations) {
          this.checkAborted(controller);
          try {
            const res = await this.qlooClient.searchEntities({
              query: rec.rawName,
              type: rec.domain || (options.scenario.targetDomain as any)
            });

            const topMatch = res.data[0];
            resolvedEntities.push({
              query: rec.rawName,
              isResolved: Boolean(topMatch?.id),
              qlooId: topMatch?.id,
              canonicalName: topMatch?.name,
              domain: (topMatch?.domain || rec.domain) as any,
              tags: topMatch?.attributes || [],
              evidenceSource: {
                endpoint: '/search',
                parametersUsed: { query: rec.rawName },
                provenance: res.metadata.provenance,
                latencyMs: res.metadata.latencyMs,
                retrievedAt: res.metadata.timestamp
              }
            });
          } catch (err: any) {
            resolvedEntities.push({
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

        this.checkAborted(controller);
        this.emitEvent(job, 'fetching_evidence', 'Querying Qloo /insights cross-domain affinity graph.', 60);

        const seedIds = options.scenario.seeds.map(s => s.resolvedQlooId).filter(Boolean) as string[];
        if (seedIds.length > 0) {
          try {
            const insightsRes = await this.qlooClient.getInsights({
              seedEntityIds: seedIds,
              filterType: options.scenario.constraints.targetCategoryUrn
            });

            for (const item of insightsRes.data) {
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
                    'filter.type': options.scenario.constraints.targetCategoryUrn
                  },
                  provenance: insightsRes.metadata.provenance,
                  latencyMs: insightsRes.metadata.latencyMs,
                  retrievedAt: insightsRes.metadata.timestamp
                }
              });
            }
          } catch (err: any) {
            // Non-fatal: candidate set remains empty (evaluated as missing evidence)
          }
        }
      }

      this.checkAborted(controller);

      // 3. Stage: Evaluating Output
      this.emitEvent(job, 'evaluating_output', 'Evaluating findings against deterministic provenance rules.', 80);

      const report = this.evalEngine.evaluate({
        scenario: options.scenario,
        agentOutput: capturedOutput,
        resolvedEntities,
        candidateSet
      });

      this.checkAborted(controller);

      // 4. Stage: Completed
      this.emitEvent(job, 'evaluation_completed', `Completed with ${report.summaryCounts.passCount} PASS, ${report.summaryCounts.failCount} FAIL, ${report.summaryCounts.warningCount} WARNING, ${report.summaryCounts.unverifiableCount} UNVERIFIED.`, 100);
      job.report = report;
      job.isTerminal = true;
    } catch (err: any) {
      if (err.name === 'AbortError' || job.stage === 'evaluation_cancelled') {
        // Handled in cancel
        return job;
      }

      this.emitEvent(job, 'evaluation_failed', `Evaluation stage failed: ${err.message}`, 100, err.code || 'RUNNER_ERROR');
      job.isTerminal = true;
      job.error = err.message;

      // Provide structured failure report even on fatal stage error
      job.report = {
        id: `report_failed_${Date.now()}`,
        scenarioId: options.scenario.id,
        scenarioTitle: options.scenario.title,
        createdAt: job.createdAt,
        completedAt: new Date().toISOString(),
        finalState: 'FAILED',
        agentOutputSummary: {
          mode: options.inputMode === 'paste_output' ? 'direct_text' : 'remote_adapter',
          itemCount: 0
        },
        summaryCounts: {
          totalChecks: 1,
          passCount: 0,
          warningCount: 0,
          failCount: 1,
          unverifiableCount: 0
        },
        findings: [
          {
            id: `fatal_${Date.now()}`,
            itemTargetName: options.scenario.title,
            status: 'FAIL',
            severity: 'critical',
            classification: 'UNSUPPORTED_COMBINATION_OR_MISSING_EVIDENCE',
            humanReadableReason: `Evaluation failed during stage ${job.stage}: ${err.message}`,
            evidenceReferences: []
          }
        ],
        resolvedEntitiesEvidence: [],
        lifecycleTimeline: job.events.map(e => ({
          state: e.stage === 'evaluation_completed' ? 'COMPLETED' : e.stage === 'evaluation_failed' ? 'FAILED' : 'CONFIGURED',
          timestamp: e.timestamp,
          details: e.summary
        }))
      };
    } finally {
      this.abortControllers.delete(runId);
    }

    return job;
  }

  private checkAborted(controller: AbortController): void {
    if (controller.signal.aborted) {
      const abortError = new Error('Operation aborted');
      abortError.name = 'AbortError';
      throw abortError;
    }
  }

  private emitEvent(
    job: EvaluationJobStatus,
    stage: EvaluationStage,
    summary: string,
    progressPercent: number,
    errorCode?: string
  ): void {
    job.stage = stage;
    job.updatedAt = new Date().toISOString();

    const event: EvaluationProgressEvent = {
      runId: job.runId,
      stage,
      timestamp: job.updatedAt,
      summary,
      progressPercent,
      errorCode
    };

    job.events.push(event);
  }

  private parsePastedOutput(rawText: string, defaultDomain: string): AgentRecommendationItem[] {
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
      // Line fallback
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
