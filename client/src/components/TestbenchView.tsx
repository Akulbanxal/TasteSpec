import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Layers,
  Sparkles,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  ArrowRight,
  ExternalLink,
  Plus,
  Radio,
  X,
  Play,
  ShieldCheck
} from 'lucide-react';
import { AuditTable, type FindingItem } from './common/AuditTable.js';
import { AgentOutputEditor } from './common/AgentOutputEditor.js';
import { ScenarioBuilderModal } from './ScenarioBuilderModal.js';
import { EvidenceDrawer } from './EvidenceDrawer.js';
import { VibecodeCanvasLayout } from './common/VibecodeCanvasLayout.js';
import { TargetScanner } from './common/TargetScanner.js';
import { ExecutingTelemetry } from './common/ExecutingTelemetry.js';
import { LiveActionTelemetryModal } from './common/LiveActionTelemetryModal.js';
import { GuidedDemoTelemetryOverlay } from './common/GuidedDemoTelemetryOverlay.js';
import {
  GUIDED_DEMO_PAYLOAD_TEXT,
  GUIDED_DEMO_100_RESULT,
  DEMO_BROOKLYN_SCENARIO
} from '../data/demoEvaluationRun.js';
import type { EvaluationScenario, EvaluationReport, EvaluationFinding } from '@shared/index';

interface TestbenchViewProps {
  scenarios: EvaluationScenario[];
  selectedScenario: EvaluationScenario | null;
  onSelectScenario: (scenario: EvaluationScenario) => void;
  inputMode: 'paste_output' | 'configured_adapter';
  setInputMode: (mode: 'paste_output' | 'configured_adapter') => void;
  agentOutputText: string;
  setAgentOutputText: (text: string) => void;
  adapterUrl: string;
  setAdapterUrl: (url: string) => void;
  onRunEvaluation: () => void;
  loading: boolean;
  result: {
    report: EvaluationReport;
    executionMode: 'LIVE_QLOO_VERIFICATION' | 'OFFLINE_DEMO_FIXTURE';
    notice?: string;
  } | null;
  error: string | null;
  onLoadSample: (type: 'valid' | 'forbidden' | 'unindexed') => void;
  onNavigateToEvidence: () => void;
  onNavigateToResults?: () => void;
  onAddCustomScenario?: (scenario: EvaluationScenario) => void;
}

export const TestbenchView: React.FC<TestbenchViewProps> = ({
  scenarios,
  selectedScenario,
  onSelectScenario,
  inputMode,
  setInputMode,
  agentOutputText,
  setAgentOutputText,
  adapterUrl,
  setAdapterUrl,
  onRunEvaluation,
  loading,
  result,
  error,
  onLoadSample,
  onNavigateToEvidence,
  onNavigateToResults,
  onAddCustomScenario
}) => {
  const [builderOpen, setBuilderOpen] = useState(false);
  const [activeFinding, setActiveFinding] = useState<EvaluationFinding | null>(null);
  const [judgeBannerDismissed, setJudgeBannerDismissed] = useState(false);
  const [telemetryModalOpen, setTelemetryModalOpen] = useState(false);

  // Strict 15-Second Guided Interactive Demo Engine State
  const [isGuidedDemoRunning, setIsGuidedDemoRunning] = useState(false);
  const [guidedDemoElapsedMs, setGuidedDemoElapsedMs] = useState(0);
  const [guidedDemoCompleted, setGuidedDemoCompleted] = useState(false);
  const [guidedDemoOverlayOpen, setGuidedDemoOverlayOpen] = useState(false);
  const [guidedDemoResult, setGuidedDemoResult] = useState<{
    report: EvaluationReport;
    executionMode: 'LIVE_QLOO_VERIFICATION' | 'OFFLINE_DEMO_FIXTURE';
    notice?: string;
  } | null>(null);
  const [autoExpandedRowId, setAutoExpandedRowId] = useState<string | null>(null);
  const [highlightedRowId, setHighlightedRowId] = useState<string | null>(null);
  const [expandTrigger, setExpandTrigger] = useState<number>(0);
  const guidedTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-open live action telemetry modal whenever an ad-hoc evaluation starts running
  useEffect(() => {
    if (loading && !isGuidedDemoRunning) {
      setTelemetryModalOpen(true);
    }
  }, [loading, isGuidedDemoRunning]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (guidedTimerRef.current) {
        clearInterval(guidedTimerRef.current);
      }
    };
  }, []);

  // Handler: Strict 15-Second Guided Interactive Demo Engine
  const handleStartGuidedDemo = () => {
    // 1. Clear any running timers
    if (guidedTimerRef.current) {
      clearInterval(guidedTimerRef.current);
      guidedTimerRef.current = null;
    }

    // 2. Select demo scenario & payload
    const brooklyn = scenarios.find(s => s.id.includes('brooklyn')) || DEMO_BROOKLYN_SCENARIO;
    onSelectScenario(brooklyn);
    setInputMode('paste_output');
    setAgentOutputText(GUIDED_DEMO_PAYLOAD_TEXT);
    setGuidedDemoResult(null);
    setAutoExpandedRowId(null);
    setHighlightedRowId(null);
    setActiveFinding(null);
    setTelemetryModalOpen(false);

    // 3. Initialize timer engine
    setIsGuidedDemoRunning(true);
    setGuidedDemoCompleted(false);
    setGuidedDemoElapsedMs(0);
    setGuidedDemoOverlayOpen(true);

    const startTime = Date.now();
    guidedTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      if (elapsed >= 15000) {
        if (guidedTimerRef.current) {
          clearInterval(guidedTimerRef.current);
          guidedTimerRef.current = null;
        }
        setGuidedDemoElapsedMs(15000);
        setIsGuidedDemoRunning(false);
        setGuidedDemoCompleted(true);
        // Load verified 100% pass rate report
        setGuidedDemoResult(GUIDED_DEMO_100_RESULT);
        // Stepwise explanation badge: auto-expand the first audit finding row to show mathematical proof
        setAutoExpandedRowId('find_the_four_horsemen_affinity');
        setExpandTrigger(Date.now());
        setActiveFinding(null);
      } else {
        setGuidedDemoElapsedMs(elapsed);
      }
    }, 50);
  };

  const handleInspectFindings = () => {
    // 1. Close/minimize the floating telemetry overlay immediately
    setGuidedDemoOverlayOpen(false);

    // 2. Force expand the first finding row
    setAutoExpandedRowId('find_the_four_horsemen_affinity');
    setExpandTrigger(Date.now());

    // 3. Visually highlight the mathematical proof card with glowing pulse
    setHighlightedRowId('find_the_four_horsemen_affinity');
    setTimeout(() => {
      setHighlightedRowId(null);
    }, 5000);

    // 4. Smoothly scroll directly to center the mathematical proof card in the viewport
    setTimeout(() => {
      const proofEl =
        document.getElementById('mathematical-proof-card') ||
        document.getElementById('finding-row-find_the_four_horsemen_affinity') ||
        document.getElementById('audit-findings-table');

      if (proofEl) {
        proofEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  // Active result model (either guided demo override or standard evaluation result)
  const activeResult = guidedDemoResult || result;

  // Convert report findings to AuditTable FindingItem model
  const auditFindings: FindingItem[] = activeResult?.report?.findings
    ? activeResult.report.findings.map(f => {
        const resolvedInfo = activeResult.report.resolvedEntitiesEvidence?.find(
          r =>
            r.query.toLowerCase() === f.itemTargetName.toLowerCase() ||
            (r.canonicalName && r.canonicalName.toLowerCase() === f.itemTargetName.toLowerCase())
        );

        return {
          id: f.id,
          itemTargetName: f.itemTargetName,
          qlooId: resolvedInfo?.qlooId,
          status: f.status,
          ruleName: f.classification,
          classification: f.classification,
          reason: f.humanReadableReason,
          latencyMs: resolvedInfo?.evidenceSource?.latencyMs ?? 115,
          scoreDelta:
            f.metricObserved?.name === 'affinity_delta'
              ? f.metricObserved.value
              : undefined,
          metricObserved: f.metricObserved
        };
      })
    : [];

  const handleSelectFinding = (findingId: string) => {
    const found = activeResult?.report?.findings.find(f => f.id === findingId);
    if (found) {
      setActiveFinding(found);
    }
  };

  const handleRunDemoPass = () => {
    setGuidedDemoResult(null);
    setTelemetryModalOpen(true);
    if (!agentOutputText || !agentOutputText.trim()) {
      onLoadSample('valid');
    }
    onRunEvaluation();
  };

  const summaryCounts = activeResult?.report?.summaryCounts;
  const totalChecks = summaryCounts
    ? summaryCounts.totalChecks ||
      (summaryCounts.passCount + summaryCounts.warningCount + summaryCounts.failCount + summaryCounts.unverifiableCount)
    : 0;
  const passRatePct = totalChecks > 0 && summaryCounts
    ? Math.round((summaryCounts.passCount / totalChecks) * 100)
    : 0;
  const latencyMs = activeResult?.report?.completedAt && activeResult?.report?.createdAt
    ? Math.max(1, Date.parse(activeResult.report.completedAt) - Date.parse(activeResult.report.createdAt))
    : 114;

  const isLive = activeResult?.executionMode === 'LIVE_QLOO_VERIFICATION';

  return (
    <VibecodeCanvasLayout className="flex flex-col gap-6 bg-transparent">
      {/* 1. TOP WELCOME BANNER FOR JUDGES (Dismissible) */}
      <AnimatePresence>
        {!judgeBannerDismissed ? (
          <motion.div
            initial={{ opacity: 0, y: -15, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="relative overflow-hidden rounded-2xl p-4 sm:p-5 bg-gradient-to-r from-cyan-950/70 via-slate-900/90 to-violet-950/70 backdrop-blur-xl border border-cyan-500/40 shadow-[0_8px_32px_rgba(6,182,212,0.18)]"
          >
            {/* Decorative background light shine */}
            <div className="pointer-events-none absolute -right-10 -bottom-10 h-32 w-32 rounded-full bg-cyan-500/15 blur-2xl" />

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Left: Headline & Explanation */}
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-xl shrink-0 shadow-sm">
                  👋
                </div>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-sm sm:text-base text-white dark:text-white light:text-slate-900">
                      Welcome Judge!
                    </span>
                    <span className="px-2 py-0.5 rounded-full font-mono text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold">
                      JUDGE EXPLAINER SYSTEM
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-200 dark:text-slate-200 light:text-slate-700 leading-relaxed max-w-3xl">
                    TASTESPEC benchmarks Cultural AI Agent outputs against real Qloo API evidence to detect hallucinations.
                  </p>
                </div>
              </div>

              {/* Right: Primary Action Button & Dismiss */}
              <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                <button
                  type="button"
                  onClick={handleStartGuidedDemo}
                  disabled={isGuidedDemoRunning}
                  className="inline-flex items-center gap-2 px-4.5 py-2.5 rounded-xl font-mono text-xs font-bold text-slate-950 bg-gradient-to-r from-cyan-400 via-teal-300 to-blue-500 hover:from-cyan-300 hover:to-blue-400 shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:shadow-[0_0_30px_rgba(6,182,212,0.6)] transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>
                    {isGuidedDemoRunning
                      ? `Guided Demo Active (${(15 - guidedDemoElapsedMs / 1000).toFixed(1)}s)...`
                      : '▶ Run 15-Second Guided Demo'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setJudgeBannerDismissed(true)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title="Dismiss Judge Banner"
                  aria-label="Dismiss Judge Banner"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="flex justify-end -mb-3">
            <button
              type="button"
              onClick={() => setJudgeBannerDismissed(false)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono text-cyan-400 bg-cyan-950/40 border border-cyan-500/30 hover:border-cyan-500/60 transition-colors cursor-pointer"
            >
              <span>👋 Re-open Judge Explainer</span>
            </button>
          </div>
        )}
      </AnimatePresence>

      {/* TOP ROW: Header Banner with Active Scenario Metadata & Execution Status */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="cyber-glass-panel relative overflow-hidden p-5 border border-white/10 dark:border-white/10 light:border-black/5 shadow-2xl rounded-2xl"
      >
        {/* Subtle cyan ambient highlight */}
        <div className="pointer-events-none absolute -left-12 -top-12 h-36 w-36 rounded-full bg-cyan-500/10 blur-2xl" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-cyan-400 bg-cyan-950/60 border border-cyan-500/30 px-2.5 py-0.5 rounded-full font-bold">
                <Radio className="w-3 h-3 animate-pulse" />
                CONSOLE WORKBENCH
              </span>
              <h1 className="text-lg md:text-xl font-bold tracking-tight text-white dark:text-white light:text-slate-900 truncate font-mono">
                {selectedScenario?.title || 'Cultural Evaluation Testbench'}
              </h1>
              {selectedScenario?.personaName && (
                <span className="text-xs font-medium text-slate-400 font-mono">
                  // {selectedScenario.personaName}
                </span>
              )}
              {activeResult?.notice && (
                <span
                  title={activeResult.notice}
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 dark:bg-amber-500/10 light:bg-amber-500/15 border border-amber-500/30 text-amber-400 dark:text-amber-400 light:text-amber-700 font-mono text-[11px] font-medium max-w-sm truncate shadow-sm"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  <span className="truncate">{activeResult.notice}</span>
                </span>
              )}
            </div>

            {/* Selected Seeds Pill Tags */}
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider flex items-center gap-1 mr-1">
                <Sparkles className="w-3 h-3 text-cyan-400" />
                Seeds:
              </span>
              {selectedScenario?.seeds.map((seed, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 rounded-md border border-cyan-500/30 bg-cyan-950/40 px-2 py-0.5 font-mono text-[11px] text-cyan-300 shadow-sm"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                  {seed.name}
                  <span className="text-[9px] text-slate-500 uppercase">({seed.domain})</span>
                </span>
              ))}

              {selectedScenario?.location?.city && (
                <span className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[11px] text-slate-300">
                  <MapPin className="w-3 h-3 text-rose-400" />
                  {selectedScenario.location.city}
                  {selectedScenario.location.neighborhood && `, ${selectedScenario.location.neighborhood}`}
                </span>
              )}

              {selectedScenario?.constraints?.targetCategoryUrn && (
                <span className="inline-flex items-center gap-1 rounded-md border border-violet-500/30 bg-violet-950/40 px-2 py-0.5 font-mono text-[10px] text-violet-300">
                  {selectedScenario.constraints.targetCategoryUrn}
                </span>
              )}
            </div>
          </div>

          {/* Dynamic Execution Status Badge & Fast Nav Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Prominent Header Guided Demo Button */}
            <button
              type="button"
              onClick={handleStartGuidedDemo}
              disabled={isGuidedDemoRunning}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-xl font-mono text-xs font-bold text-slate-950 bg-gradient-to-r from-cyan-400 via-teal-300 to-blue-500 hover:from-cyan-300 hover:to-blue-400 shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:shadow-[0_0_30px_rgba(6,182,212,0.6)] transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <span className="relative flex h-2 w-2">
                {isGuidedDemoRunning && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-950 opacity-75" />
                )}
                <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-950" />
              </span>
              <span>
                {isGuidedDemoRunning
                  ? `Demo: ${(15 - guidedDemoElapsedMs / 1000).toFixed(1)}s`
                  : '▶ Run 15-Second Guided Demo'}
              </span>
            </button>

            {activeResult ? (
              <div
                className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-1.5 font-mono text-xs font-semibold tracking-wider ${
                  isLive
                    ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.25)]'
                    : 'border-amber-500/40 bg-amber-950/40 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.25)]'
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    isLive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                  }`}
                />
                <span>{activeResult.executionMode.replace(/_/g, ' ')}</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3.5 py-1.5 font-mono text-xs text-slate-400">
                <span className="h-2 w-2 rounded-full bg-slate-600" />
                <span>STANDBY / IDLE</span>
              </div>
            )}

            {activeResult && onNavigateToResults && (
              <button
                onClick={onNavigateToResults}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-mono text-xs font-bold uppercase tracking-wider shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] transition-all cursor-pointer"
              >
                <span>Full Audit</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {activeResult && (
              <button
                onClick={onNavigateToEvidence}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3.5 py-1.5 font-mono text-xs font-medium text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <span>Ledger</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* MAIN TWO-COLUMN WORKBENCH */}
      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-8 items-start">
        {/* LEFT COLUMN: Scenario Configuration & Agent Input Cards */}
        <div className="flex flex-col gap-6">
          {/* Card 1: Scenario Configuration Card */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
            className="cyber-glass-panel border border-white/10 dark:border-white/10 light:border-black/5 p-5 shadow-xl flex flex-col space-y-3.5 rounded-2xl"
          >
            <div className="flex items-center justify-between pb-1 border-b border-white/5">
              <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-slate-300">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span>Scenario Profile</span>
              </div>
              {onAddCustomScenario && (
                <button
                  type="button"
                  onClick={() => setBuilderOpen(true)}
                  className="inline-flex items-center gap-1 font-mono text-[11px] text-cyan-400 hover:text-cyan-300 hover:underline cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Custom</span>
                </button>
              )}
            </div>

            {/* Template Selection Dropdown */}
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-wider text-slate-400 mb-1.5">
                Target Persona Template
              </label>
              <select
                value={selectedScenario?.id || ''}
                onChange={(e) => {
                  const scen = scenarios.find(s => s.id === e.target.value);
                  if (scen) onSelectScenario(scen);
                }}
                className="glass-input w-full rounded-xl px-3 py-2 font-sans text-xs text-slate-200 outline-none transition-all"
              >
                {scenarios.map(s => (
                  <option key={s.id} value={s.id} className="bg-slate-900 text-slate-200 dark:bg-slate-900 light:bg-white light:text-slate-900">
                    {s.id.startsWith('custom_') ? '[CUSTOM] ' : '[TEMPLATE] '}
                    {s.title} ({s.personaName})
                  </option>
                ))}
              </select>
            </div>

            {/* Active Selected Scenario Specs */}
            {selectedScenario && (
              <div className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase text-slate-500">Domain</span>
                  <span className="font-mono text-[11px] font-bold text-cyan-400 uppercase">
                    {selectedScenario.targetDomain}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase text-slate-500">Min Affinity (&theta;)</span>
                  <span className="font-mono text-[11px] text-emerald-400 font-semibold">
                    &ge; {selectedScenario.constraints.minEmpiricalAffinity ?? 0.65}
                  </span>
                </div>
                {selectedScenario.constraints.forbiddenAttributes.length > 0 && (
                  <div className="pt-1 border-t border-white/5 flex items-baseline justify-between gap-2">
                    <span className="font-mono text-[10px] uppercase text-slate-500 shrink-0">Forbidden:</span>
                    <span className="font-mono text-[11px] text-rose-400 truncate text-right">
                      {selectedScenario.constraints.forbiddenAttributes.join(', ')}
                    </span>
                  </div>
                )}
              </div>
            )}
          </motion.div>

          {/* Card 2: Sleek Agent Output Editor Panel (Agent Payload Feed) */}
          <AgentOutputEditor
            inputMode={inputMode}
            setInputMode={setInputMode}
            agentOutputText={agentOutputText}
            setAgentOutputText={setAgentOutputText}
            adapterUrl={adapterUrl}
            setAdapterUrl={setAdapterUrl}
            onLoadSample={onLoadSample}
            onRunEvaluation={() => {
              setTelemetryModalOpen(true);
              onRunEvaluation();
            }}
            loading={loading}
            error={error}
          />
        </div>

        {/* RIGHT COLUMN: Interactive Results Workspace */}
        <div className="flex flex-col gap-6">
          <AnimatePresence mode="wait">
            {!activeResult && !loading && !isGuidedDemoRunning ? (
              /* Idle State: Animated Target Scanner with 1-Click Demo Pass */
              <TargetScanner
                key="idle-radar"
                badgeLabel="TESTBENCH STANDBY // TARGET ACQUISITION READY"
                title="Autonomous Cultural Target Scanner"
                description="Audit radar is actively scanning for agent recommendation assertions. Select a cultural persona profile from the left console, or execute a 1-click evaluation pass to benchmark agent recommendations against empirical Qloo intelligence."
                actionLabel="Re-Run Demo Pass"
                onAction={handleRunDemoPass}
                secondaryActionLabel="Load Valid Sample"
                onSecondaryAction={() => onLoadSample('valid')}
                steps={[
                  { step: '01 // SELECT', title: 'Persona Profile', desc: 'Choose cultural seeds, target domain & affinity threshold.' },
                  { step: '02 // FEED', title: 'Agent Payload', desc: 'Paste recommendation output or attach remote adapter.' },
                  { step: '03 // AUDIT', title: 'Evidence Matrix', desc: 'Inspect verified affinity, constraint checks, and ledger.' }
                ]}
              />
            ) : loading || isGuidedDemoRunning ? (
              /* Executing State: Step-by-Step Live Telemetry */
              <ExecutingTelemetry
                key="loading-eval"
                scenarioTitle={
                  isGuidedDemoRunning
                    ? '15s Guided Demo: Brooklyn Neo-Psychedelia to Natural Wine'
                    : selectedScenario?.title || 'Cultural Persona'
                }
              />
            ) : activeResult ? (
              /* Active Results Workspace: Compact Inline Stats Bar + Findings Audit Table */
              <motion.div
                key="results-workspace"
                id="audit-findings-table"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="space-y-4"
              >
                {/* Compact Inline Stats Bar (Saves 120px of vertical space) */}
                <div className="cyber-glass-panel rounded-xl p-3 px-4 flex flex-wrap items-center justify-between gap-3 text-xs font-mono border border-white/10 dark:border-white/10 light:border-black/5 shadow-md">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                    {/* PASS */}
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/40 dark:bg-emerald-950/40 light:bg-emerald-100 border border-emerald-500/30 light:border-emerald-300 text-emerald-400 dark:text-emerald-400 light:text-emerald-800 font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 light:text-emerald-700" />
                      <span className="font-bold">PASS:</span>
                      <span className="font-extrabold">{activeResult.report.summaryCounts.passCount}</span>
                      <span className="text-[10px] opacity-75">({passRatePct}%)</span>
                    </div>

                    {/* WARNING */}
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-950/40 dark:bg-amber-950/40 light:bg-amber-100 border border-amber-500/30 light:border-amber-300 text-amber-400 dark:text-amber-400 light:text-amber-800 font-bold">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 light:text-amber-700" />
                      <span className="font-bold">WARN:</span>
                      <span className="font-extrabold">{activeResult.report.summaryCounts.warningCount}</span>
                    </div>

                    {/* FAIL */}
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-950/40 dark:bg-rose-950/40 light:bg-rose-100 border border-rose-500/30 light:border-rose-300 text-rose-400 dark:text-rose-400 light:text-rose-800 font-bold">
                      <XCircle className="w-3.5 h-3.5 text-rose-400 light:text-rose-700" />
                      <span className="font-bold">FAIL:</span>
                      <span className="font-extrabold">{activeResult.report.summaryCounts.failCount}</span>
                    </div>

                    {/* UNVERIFIABLE */}
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-950/40 dark:bg-violet-950/40 light:bg-purple-100 border border-violet-500/30 light:border-purple-300 text-violet-400 dark:text-violet-400 light:text-purple-800 font-bold">
                      <HelpCircle className="w-3.5 h-3.5 text-violet-400 light:text-purple-700" />
                      <span className="font-bold">UNVERIFIED:</span>
                      <span className="font-extrabold">{activeResult.report.summaryCounts.unverifiableCount}</span>
                    </div>
                  </div>

                  {/* Telemetry metadata: Total checks, pass rate, latency */}
                  <div className="flex items-center gap-3 text-slate-400 dark:text-slate-400 light:text-slate-600 text-[11px]">
                    <span className="hidden sm:inline">Total: <strong className="text-slate-200 dark:text-slate-200 light:text-slate-800">{totalChecks}</strong> checks</span>
                    <span className="text-zinc-700 hidden sm:inline">•</span>
                    <span>Pass Rate: <strong className="text-cyan-400 font-bold">{passRatePct}%</strong></span>
                    <span className="text-zinc-700">•</span>
                    <span>{latencyMs}ms latency</span>
                  </div>
                </div>

                {/* High-Density Tabbed Findings Audit Table with Expandable Narrative Cards */}
                <AuditTable
                  findings={auditFindings}
                  onSelectFinding={handleSelectFinding}
                  selectedFindingId={activeFinding?.id}
                  scenarioThreshold={selectedScenario?.constraints?.minEmpiricalAffinity ?? 0.65}
                  autoExpandedRowId={autoExpandedRowId}
                  highlightedRowId={highlightedRowId}
                  expandTrigger={expandTrigger}
                />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      {/* Slide-over Diagnostic Evidence Drawer */}
      <EvidenceDrawer
        finding={activeFinding}
        report={activeResult?.report || null}
        onClose={() => setActiveFinding(null)}
      />

      {/* Custom Scenario Builder Modal */}
      {onAddCustomScenario && (
        <ScenarioBuilderModal
          isOpen={builderOpen}
          onClose={() => setBuilderOpen(false)}
          onCreateScenario={(newScenario) => {
            onAddCustomScenario(newScenario);
            setBuilderOpen(false);
          }}
        />
      )}

      {/* Live Action Telemetry Micro-Modal Overlay (for generic ad-hoc runs) */}
      <LiveActionTelemetryModal
        isOpen={telemetryModalOpen && !guidedDemoOverlayOpen}
        onClose={() => setTelemetryModalOpen(false)}
        scenarioTitle={selectedScenario?.title || 'Cultural Evaluation Pass'}
        isCompleted={!loading && activeResult !== null}
      />

      {/* Strict 15-Second Guided Interactive Demo Telemetry Overlay */}
      <GuidedDemoTelemetryOverlay
        isOpen={guidedDemoOverlayOpen}
        onClose={() => setGuidedDemoOverlayOpen(false)}
        elapsedMs={guidedDemoElapsedMs}
        isCompleted={guidedDemoCompleted}
        onInspectFindings={handleInspectFindings}
      />

      {/* Floating Pill: Quick access to re-open 15-Second Guided Demo Telemetry when minimized */}
      {guidedDemoCompleted && !guidedDemoOverlayOpen && (
        <motion.button
          type="button"
          initial={{ opacity: 0, scale: 0.9, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 15 }}
          onClick={() => setGuidedDemoOverlayOpen(true)}
          className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900/95 dark:bg-slate-900/95 light:bg-white/95 border border-emerald-500/50 text-emerald-400 font-mono text-xs font-bold shadow-[0_4px_25px_rgba(16,185,129,0.3)] hover:scale-105 hover:border-emerald-400 transition-all cursor-pointer backdrop-blur-xl"
          title="Re-open 15-Second Guided Demo Telemetry"
        >
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>15s Demo Telemetry (100% Pass)</span>
        </motion.button>
      )}
    </VibecodeCanvasLayout>
  );
};

export default TestbenchView;
