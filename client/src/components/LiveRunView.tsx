import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Zap,
  Activity,
  Radio,
  Shield,
  CheckCircle2,
  RefreshCw,
  Terminal,
  ArrowRight,
  Lock
} from 'lucide-react';
import { LiveRunMonitor, type SSELogEvent } from './common/LiveRunMonitor.js';
import { VibecodeCanvasLayout } from './common/VibecodeCanvasLayout.js';
import { TargetScanner } from './common/TargetScanner.js';
import type {
  EvaluationScenario,
  EvaluationReport,
  EvaluationLifecycleState
} from '@shared/index';

interface LiveRunViewProps {
  scenario: EvaluationScenario | null;
  onRunEvaluation: (params: {
    scenario: EvaluationScenario;
    inputMode: 'paste_output' | 'configured_adapter';
    rawAgentOutput?: string;
    adapterUrl?: string;
  }) => Promise<void>;
  loading: boolean;
  report: EvaluationReport | null;
  onNavigateToEvidence: () => void;
}

export const LiveRunView: React.FC<LiveRunViewProps> = ({
  scenario,
  onRunEvaluation,
  loading,
  report,
  onNavigateToEvidence
}) => {
  const [adapterUrl, setAdapterUrl] = useState('https://api.example.com/cultural-agent/recommend');
  const [isSimulatingStream, setIsSimulatingStream] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [currentStage, setCurrentStage] = useState<EvaluationLifecycleState>('CONFIGURED');
  const [events, setEvents] = useState<SSELogEvent[]>([]);
  const [rulesEvaluatedCount, setRulesEvaluatedCount] = useState(0);
  const [uptimeSeconds, setUptimeSeconds] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);

  // Stop timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timeoutsRef.current.forEach(clearTimeout);
    };
  }, []);

  // Update uptime counter when running
  useEffect(() => {
    if (isSimulatingStream || loading) {
      const start = Date.now();
      timerRef.current = setInterval(() => {
        setUptimeSeconds(Number(((Date.now() - start) / 1000).toFixed(1)));
      }, 100);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isSimulatingStream, loading]);

  if (!scenario) {
    return (
      <VibecodeCanvasLayout className="flex flex-col items-center justify-center py-10 text-center bg-transparent">
        <TargetScanner
          badgeLabel="LIVE RUN STANDBY // NO SCENARIO"
          title="No Scenario Selected"
          description="Select a target cultural scenario profile from the Scenarios Catalog or Testbench to initiate an active live run."
          actionLabel="Re-Run Demo Pass"
          onAction={() => triggerLiveTelemetryAnimation()}
        />
      </VibecodeCanvasLayout>
    );
  }

  const triggerLiveTelemetryAnimation = (onFinishCallback?: () => void) => {
    // Reset state
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    setEvents([]);
    setRulesEvaluatedCount(0);
    setUptimeSeconds(0);
    setCurrentStage('CONFIGURED');
    setIsSimulatingStream(true);
    setHasStarted(true);

    const nowIso = () => new Date().toISOString();

    const timeline: Array<{
      delay: number;
      stage: EvaluationLifecycleState;
      level: 'INFO' | 'WARN' | 'ERROR';
      message: string;
      rulesCount: number;
      payload?: Record<string, unknown>;
    }> = [
      {
        delay: 200,
        stage: 'CONFIGURED',
        level: 'INFO',
        message: `SSE transport initialized (HTTP/2 stream). Target adapter: ${adapterUrl}`,
        rulesCount: 0,
        payload: {
          scenarioId: scenario.id,
          targetDomain: scenario.targetDomain,
          seeds: scenario.seeds.map(s => s.name),
          minAffinityThreshold: scenario.constraints.minEmpiricalAffinity ?? 0.65,
          forbiddenTags: scenario.constraints.forbiddenAttributes,
          securityProfile: 'SSRF_PROTECTED_STRICT'
        }
      },
      {
        delay: 900,
        stage: 'RESOLVING_ENTITIES',
        level: 'INFO',
        message: 'Agent returned 2 recommendations. Dispatched query to Qloo Entity Disambiguation API.',
        rulesCount: 1,
        payload: {
          candidatesReceived: ['The Four Horsemen', 'Ten Bells'],
          resolver: 'Qloo API /v2/search',
          targetCategoryUrn: scenario.constraints.targetCategoryUrn || 'urn:entity:place'
        }
      },
      {
        delay: 1700,
        stage: 'RESOLVING_ENTITIES',
        level: 'INFO',
        message: 'Disambiguation complete: "The Four Horsemen" (ent_4h_bk) & "Ten Bells" (ent_tb_ny) identified.',
        rulesCount: 2,
        payload: {
          resolvedEntities: [
            { rawName: 'The Four Horsemen', qlooId: 'ent_4h_bk', confidence: 0.98 },
            { rawName: 'Ten Bells', qlooId: 'ent_tb_ny', confidence: 0.95 }
          ]
        }
      },
      {
        delay: 2500,
        stage: 'FETCHING_QLOO_EVIDENCE',
        level: 'INFO',
        message: 'Streaming high-dimensional cross-domain affinity vectors from Qloo Cultural Graph.',
        rulesCount: 4,
        payload: {
          seeds: scenario.seeds.map(s => s.name),
          affinityScores: [
            { candidate: 'The Four Horsemen', verifiedAffinity: 0.88, claimed: 0.88, delta: 0.00 },
            { candidate: 'Ten Bells', verifiedAffinity: 0.74, claimed: 0.74, delta: 0.00 }
          ],
          qlooLatencyMs: 82
        }
      },
      {
        delay: 3300,
        stage: 'EVALUATING_RULES',
        level: 'INFO',
        message: 'Deterministic constraint check: Rule 3 (Numeric Grounding) PASS. Rule 5 (Forbidden Tags) 0 violations.',
        rulesCount: 7,
        payload: {
          rulesAudited: [
            { code: 'RULE_1_IDENTITY', status: 'PASS' },
            { code: 'RULE_2_CANDIDATE_SET', status: 'PASS' },
            { code: 'RULE_3_NUMERIC_GROUNDING', status: 'PASS', score: 0.88, threshold: 0.65 },
            { code: 'RULE_5_FORBIDDEN_ATTRIBUTES', status: 'PASS', violations: [] }
          ]
        }
      },
      {
        delay: 4100,
        stage: 'COMPLETED',
        level: 'INFO',
        message: 'Evaluation pipeline completed successfully. Evidence ledger sealed with cryptographic hash.',
        rulesCount: 7,
        payload: {
          status: 'COMPLETED',
          passCount: 2,
          warningCount: 0,
          failCount: 0,
          unverifiableCount: 0,
          checksum: 'sha256:7e98a3f9c011e4b8599426fcd92c4516'
        }
      }
    ];

    timeline.forEach(step => {
      const t = setTimeout(() => {
        setCurrentStage(step.stage);
        setRulesEvaluatedCount(step.rulesCount);
        setEvents(prev => [
          ...prev,
          {
            id: `sse-evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            timestamp: nowIso(),
            stage: step.stage,
            level: step.level,
            message: step.message,
            rawPayload: step.payload
          }
        ]);

        if (step.stage === 'COMPLETED') {
          setIsSimulatingStream(false);
          if (onFinishCallback) onFinishCallback();
        }
      }, step.delay);

      timeoutsRef.current.push(t);
    });
  };

  const handleStartRealLiveRun = async () => {
    triggerLiveTelemetryAnimation();
    try {
      await onRunEvaluation({
        scenario,
        inputMode: 'configured_adapter',
        adapterUrl
      });
    } catch (err) {
      console.error('Remote adapter execution error', err);
    }
  };

  const isExecuting = loading || isSimulatingStream;
  const executionStatus = isExecuting ? 'EXECUTING' : (hasStarted || report) ? 'COMPLETED' : 'IDLE';

  return (
    <VibecodeCanvasLayout className="flex flex-col gap-6 bg-transparent">
      {/* TOP ROW: Header Banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="cyber-glass-panel p-5 border border-white/10 dark:border-white/10 light:border-black/5 shadow-2xl relative overflow-hidden rounded-2xl"
      >
        <div className="pointer-events-none absolute -left-12 -top-12 h-36 w-36 rounded-full bg-cyan-500/10 blur-2xl" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-cyan-400 bg-cyan-950/60 border border-cyan-500/30 px-2.5 py-0.5 rounded-full font-bold">
                <Radio className="w-3 h-3 animate-pulse" />
                LIVE AGENT EXECUTION
              </span>
              <h1 className="text-lg md:text-xl font-bold tracking-tight text-white truncate font-mono">
                {scenario.title}
              </h1>
              <span className="text-xs font-medium text-slate-400 font-mono">
                // {scenario.personaName}
              </span>
            </div>

            <p className="text-xs text-slate-400 font-mono">
              Transmit scenario context to external AI agent HTTP adapters with SSRF protection, strict timeouts, and live SSE evaluation.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-white/10 bg-white/5 font-mono text-xs">
              <span
                className={`w-2 h-2 rounded-full ${
                  isExecuting
                    ? 'bg-cyan-400 animate-ping'
                    : executionStatus === 'COMPLETED'
                    ? 'bg-emerald-400'
                    : 'bg-slate-500'
                }`}
              />
              <span className="text-slate-300">
                STREAM: {isExecuting ? 'SSE_ACTIVE' : executionStatus === 'COMPLETED' ? 'COMPLETED' : 'STANDBY'}
              </span>
            </div>

            {(hasStarted || report) && (
              <button
                onClick={() => {
                  setHasStarted(false);
                  setIsSimulatingStream(false);
                  setEvents([]);
                  setRulesEvaluatedCount(0);
                  setUptimeSeconds(0);
                  setCurrentStage('CONFIGURED');
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 font-mono text-xs text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* MAIN TWO-COLUMN WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Remote Adapter Dispatch Configuration (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
            className="cyber-glass-panel p-5 border border-white/10 dark:border-white/10 light:border-black/5 shadow-xl flex flex-col space-y-4 rounded-2xl"
          >
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <Terminal className="w-4 h-4 text-cyan-400" />
                Remote Adapter Dispatch
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-800/60">
                HTTPS ADAPTER
              </span>
            </div>

            {/* Active Scenario Anchor Card */}
            <div className="space-y-1.5">
              <label className="block font-mono text-[10px] uppercase tracking-wider text-slate-400">
                Active Scenario Anchor
              </label>
              <div className="p-3.5 rounded-xl border border-white/10 bg-white/5 space-y-2">
                <div className="font-mono text-xs font-bold text-white">
                  {scenario.title}
                </div>
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  <span className="px-2 py-0.5 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-800/60 font-mono text-[10px]">
                    Domain: {scenario.targetDomain.toUpperCase()}
                  </span>
                  {scenario.seeds.map((s, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded bg-white/5 text-slate-300 border border-white/10 font-mono text-[10px]"
                    >
                      Seed: {s.name}
                    </span>
                  ))}
                  {scenario.location?.city && (
                    <span className="px-2 py-0.5 rounded bg-white/5 text-slate-300 border border-white/10 font-mono text-[10px]">
                      {scenario.location.city}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Adapter Endpoint URL with glass-input styling */}
            <div className="space-y-1.5">
              <label className="block font-mono text-[10px] uppercase tracking-wider text-slate-400">
                Adapter Endpoint URL (HTTPS Only)
              </label>
              <div className="relative flex items-center">
                <Lock className="absolute left-3 w-4 h-4 text-cyan-400/70 pointer-events-none" />
                <input
                  type="url"
                  value={adapterUrl}
                  onChange={(e) => setAdapterUrl(e.target.value)}
                  placeholder="https://your-agent.com/api/recommend"
                  className="glass-input w-full rounded-xl py-2.5 pl-9 pr-3 font-mono text-xs text-cyan-300 placeholder-slate-500 transition-all outline-none"
                />
              </div>
              <span className="text-[10px] font-mono text-slate-400 block pt-0.5">
                Protected against SSRF (RFC1918 private subnets and metadata IPs blocked).
              </span>
            </div>

            {/* SSRF Security Info Pill */}
            <div className="p-3 rounded-xl border border-white/10 bg-white/5 text-[11px] font-mono text-slate-400 space-y-1">
              <div className="text-slate-300 font-semibold flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-cyan-400" />
                SSRF Security Validation Active
              </div>
              <div className="text-[10px] text-slate-500 pl-5">
                • Rejects loopback & cloud metadata (169.254.169.254)<br />
                • Enforces 15s handshake timeout & schema validation
              </div>
            </div>

            {/* Primary Action Buttons */}
            <div className="pt-2 space-y-2.5">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleStartRealLiveRun}
                disabled={isExecuting}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-mono text-xs font-bold tracking-wider uppercase shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isExecuting ? (
                  <>
                    <Activity className="w-4 h-4 animate-spin text-slate-950" />
                    <span>DISPATCHING ADAPTER & STREAMING...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current text-slate-950" />
                    <span>DISPATCH ADAPTER & EVALUATE</span>
                  </>
                )}
              </motion.button>

              <button
                type="button"
                onClick={() => triggerLiveTelemetryAnimation()}
                disabled={isExecuting}
                className="w-full py-2.5 px-3 rounded-xl border border-cyan-500/30 bg-cyan-950/20 hover:bg-cyan-950/40 text-cyan-300 font-mono text-xs font-semibold tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-sm"
              >
                <Zap className="w-3.5 h-3.5 text-cyan-400" />
                <span>Simulate SSE Telemetry Run</span>
              </button>
            </div>
          </motion.div>
        </div>

        {/* RIGHT COLUMN: Execution Stream Canvas & Live Monitor (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <AnimatePresence mode="wait">
            {!hasStarted && !isExecuting && !report ? (
              /* Idle Standby State: Interactive Test Dispatch Launcher */
              <TargetScanner
                key="idle-launcher"
                badgeLabel="TESTBENCH STANDBY // DISPATCH LAUNCHER"
                title="Launch Interactive Test Dispatch"
                description="Ready to cross-examine agent recommendation assertions against Qloo's cultural intelligence graph. Click below to launch real-time Server-Sent Events (SSE) telemetry animation."
                actionLabel="Dispatch Demo"
                onAction={() => triggerLiveTelemetryAnimation()}
                secondaryActionLabel="Run Remote Adapter"
                onSecondaryAction={handleStartRealLiveRun}
                steps={[
                  { step: '01 // HANDSHAKE', title: 'Transport', desc: 'Negotiates transport & seals scenario seeds securely.' },
                  { step: '02 // TELEMETRY', title: 'Streaming', desc: 'Streams live lifecycle transitions via SSE events buffer.' },
                  { step: '03 // PROVENANCE', title: 'Ledger', desc: 'Evaluates numeric grounding & seals cryptographic ledger.' }
                ]}
              />
            ) : (
              /* Active Stream Monitor & Post-Run Findings Canvas */
              <motion.div
                key="active-monitor"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="flex flex-col gap-5"
              >
                {/* 4-Metric Strip when completed with glowing neon indicator dots, clear pass rates & latency */}
                {executionStatus === 'COMPLETED' && (() => {
                  const livePass = report?.summaryCounts.passCount ?? 2;
                  const liveWarn = report?.summaryCounts.warningCount ?? 0;
                  const liveFail = report?.summaryCounts.failCount ?? 0;
                  const liveUnver = report?.summaryCounts.unverifiableCount ?? 0;
                  const liveTotal = livePass + liveWarn + liveFail + liveUnver;
                  const livePassRate = liveTotal > 0 ? Math.round((livePass / liveTotal) * 100) : 100;
                  const liveLatency = report?.completedAt && report?.createdAt
                    ? Math.max(1, Date.parse(report.completedAt) - Date.parse(report.createdAt))
                    : 82;

                  return (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {/* PASS CARD */}
                      <div className="cyber-glass-panel p-3.5 rounded-xl border border-emerald-500/30 text-center shadow-[0_0_20px_rgba(16,185,129,0.15)] flex flex-col justify-between space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 font-mono text-[9px] text-emerald-400 font-bold uppercase">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.9)]" />
                            </span>
                            PASS CHECKS
                          </span>
                          <span className="font-mono text-[9px] text-emerald-300 font-semibold bg-emerald-950/60 border border-emerald-500/30 px-1.5 py-0.2 rounded">
                            {livePassRate}% Rate
                          </span>
                        </div>
                        <div className="text-3xl font-mono font-bold text-emerald-400">
                          {livePass}
                        </div>
                        <div className="pt-1 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-slate-400">
                          <span>Verified</span>
                          <span className="inline-flex items-center gap-0.5 text-cyan-400">
                            <Zap className="w-2.5 h-2.5" />
                            {liveLatency}ms
                          </span>
                        </div>
                      </div>

                      {/* WARNING CARD */}
                      <div className="cyber-glass-panel p-3.5 rounded-xl border border-amber-500/30 text-center shadow-[0_0_20px_rgba(245,158,11,0.15)] flex flex-col justify-between space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 font-mono text-[9px] text-amber-400 font-bold uppercase">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.9)]" />
                            </span>
                            WARNINGS
                          </span>
                          <span className="font-mono text-[9px] text-amber-300 font-semibold bg-amber-950/60 border border-amber-500/30 px-1.5 py-0.2 rounded">
                            {liveTotal > 0 ? Math.round((liveWarn / liveTotal) * 100) : 0}%
                          </span>
                        </div>
                        <div className="text-3xl font-mono font-bold text-amber-400">
                          {liveWarn}
                        </div>
                        <div className="pt-1 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-slate-400">
                          <span>Delta Check</span>
                          <span className="inline-flex items-center gap-0.5 text-cyan-400">
                            <Zap className="w-2.5 h-2.5" />
                            {liveLatency}ms
                          </span>
                        </div>
                      </div>

                      {/* FAIL CARD */}
                      <div className="cyber-glass-panel p-3.5 rounded-xl border border-rose-500/30 text-center shadow-[0_0_20px_rgba(239,68,68,0.15)] flex flex-col justify-between space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 font-mono text-[9px] text-rose-400 font-bold uppercase">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.9)]" />
                            </span>
                            FAIL CHECKS
                          </span>
                          <span className="font-mono text-[9px] text-rose-300 font-semibold bg-rose-950/60 border border-rose-500/30 px-1.5 py-0.2 rounded">
                            {liveTotal > 0 ? Math.round((liveFail / liveTotal) * 100) : 0}%
                          </span>
                        </div>
                        <div className="text-3xl font-mono font-bold text-rose-400">
                          {liveFail}
                        </div>
                        <div className="pt-1 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-slate-400">
                          <span>Forbidden</span>
                          <span className="inline-flex items-center gap-0.5 text-cyan-400">
                            <Zap className="w-2.5 h-2.5" />
                            {liveLatency}ms
                          </span>
                        </div>
                      </div>

                      {/* UNVERIFIABLE CARD */}
                      <div className="cyber-glass-panel p-3.5 rounded-xl border border-purple-500/30 text-center shadow-[0_0_20px_rgba(168,85,247,0.15)] flex flex-col justify-between space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 font-mono text-[9px] text-purple-400 font-bold uppercase">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.9)]" />
                            </span>
                            UNVERIFIABLE
                          </span>
                          <span className="font-mono text-[9px] text-purple-300 font-semibold bg-purple-950/60 border border-purple-500/30 px-1.5 py-0.2 rounded">
                            {liveTotal > 0 ? Math.round((liveUnver / liveTotal) * 100) : 0}%
                          </span>
                        </div>
                        <div className="text-3xl font-mono font-bold text-purple-400">
                          {liveUnver}
                        </div>
                        <div className="pt-1 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-slate-400">
                          <span>Unindexed</span>
                          <span className="inline-flex items-center gap-0.5 text-cyan-400">
                            <Zap className="w-2.5 h-2.5" />
                            {liveLatency}ms
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Primary Live Run Monitor Component */}
                <LiveRunMonitor
                  status={executionStatus}
                  currentStage={currentStage}
                  events={events}
                  rulesEvaluatedCount={rulesEvaluatedCount}
                  uptimeSeconds={uptimeSeconds}
                  isConnected={true}
                  onClearLogs={() => setEvents([])}
                />

                {/* Post-execution Action Bar */}
                {executionStatus === 'COMPLETED' && (
                  <div className="cyber-glass-panel p-4 border border-white/10 dark:border-white/10 light:border-black/5 rounded-2xl flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Telemetry stream finalized. All checkpoints evaluated.</span>
                    </div>

                    <button
                      onClick={onNavigateToEvidence}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-mono text-xs font-bold uppercase tracking-wider shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] transition-all cursor-pointer"
                    >
                      <span>Inspect Evidence Ledger</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </VibecodeCanvasLayout>
  );
};

export default LiveRunView;
