import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Radar,
  Search,
  ArrowRight,
  RefreshCw,
  X,
  Radio,
  FileSearch,
  Zap
} from 'lucide-react';
import { EvidenceDrawer } from './EvidenceDrawer.js';
import { VibecodeCanvasLayout } from './common/VibecodeCanvasLayout.js';
import { TargetScanner } from './common/TargetScanner.js';
import type { EvaluationReport, EvaluationFinding } from '@shared/index';

interface ResultsViewProps {
  report: EvaluationReport | null;
  executionMode?: 'LIVE_QLOO_VERIFICATION' | 'OFFLINE_DEMO_FIXTURE';
  onNavigateToTestbench: () => void;
}

export const ResultsView: React.FC<ResultsViewProps> = ({
  report,
  executionMode,
  onNavigateToTestbench
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PASS' | 'WARNING' | 'FAIL' | 'UNVERIFIABLE'>('ALL');
  const [selectedFinding, setSelectedFinding] = useState<EvaluationFinding | null>(null);

  // Dynamic Radar Scan Visualizer when no evaluation report is present
  if (!report) {
    return (
      <VibecodeCanvasLayout className="flex flex-col gap-6 bg-transparent">
        <TargetScanner
          badgeLabel="AUDIT MATRIX // RADAR STANDBY"
          title="No Evaluation Report Acquired"
          description="Audit radar is actively scanning for telemetry. Execute an evaluation pass from the Testbench or trigger Live Run telemetry to cross-examine agent recommendation assertions against Qloo's cultural intelligence graph."
          actionLabel="Re-Run Demo Pass"
          onAction={onNavigateToTestbench}
          steps={[
            { step: '01 // CONFIGURE', title: 'Persona Profile', desc: 'Establish cultural seeds, target domain & affinity threshold.' },
            { step: '02 // DISPATCH', title: 'Agent Payload', desc: 'Feed agent recommendations or attach live HTTPS adapter.' },
            { step: '03 // AUDIT', title: 'Evidence Matrix', desc: 'Cross-examine empirical affinity scores & forbidden constraints.' }
          ]}
        />
      </VibecodeCanvasLayout>
    );
  }

  // Derive counts strictly from this run's report
  const summaryCounts = report.summaryCounts;
  const findings = report.findings || [];
  const totalChecks = summaryCounts.totalChecks || (
    summaryCounts.passCount + summaryCounts.warningCount + summaryCounts.failCount + summaryCounts.unverifiableCount
  );
  const passRatePct = totalChecks > 0 ? Math.round((summaryCounts.passCount / totalChecks) * 100) : 0;
  const latencyMs = report.completedAt && report.createdAt
    ? Math.max(1, Date.parse(report.completedAt) - Date.parse(report.createdAt))
    : 114;

  // Filter findings based on search and status
  const filteredFindings = useMemo(() => {
    return findings.filter((f) => {
      const matchesSearch =
        f.itemTargetName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.humanReadableReason.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.classification.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'ALL' || f.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [findings, searchQuery, statusFilter]);

  return (
    <VibecodeCanvasLayout className="flex flex-col gap-6 bg-transparent">
      {/* Page Header Banner */}
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
                RESULTS & AUDIT MATRIX
              </span>
              <h1 className="text-lg md:text-xl font-bold tracking-tight text-white truncate font-mono">
                {report.scenarioTitle}
              </h1>
              <span className="text-xs font-mono text-slate-400">
                ({report.scenarioId})
              </span>
            </div>
            <p className="text-xs font-mono text-slate-400">
              Itemized epistemic constraint audit cross-examined against empirical Qloo knowledge graph vectors.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {executionMode && (
              <div
                className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-1.5 font-mono text-xs font-semibold tracking-wider ${
                  executionMode === 'LIVE_QLOO_VERIFICATION'
                    ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.25)]'
                    : 'border-amber-500/40 bg-amber-950/40 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.25)]'
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    executionMode === 'LIVE_QLOO_VERIFICATION'
                      ? 'bg-emerald-400 animate-pulse'
                      : 'bg-amber-400'
                  }`}
                />
                <span>{executionMode.replace(/_/g, ' ')}</span>
              </div>
            )}

            <button
              onClick={onNavigateToTestbench}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-white/10 bg-white/5 font-mono text-xs text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Re-run Scenario</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* Summary Scorecard Cards (4 Cards) with glowing neon indicator dots, clear pass rates & latency */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* PASS CARD */}
        <motion.div
          whileHover={{ y: -2 }}
          className="cyber-glass-panel p-4 border border-emerald-500/30 rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.15)] flex flex-col justify-between space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.9)]" />
              </span>
              <span className="text-xs font-bold font-mono text-white">Supported (PASS)</span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-500/30 font-mono text-[10px] font-bold">
              {passRatePct}% Pass Rate
            </span>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-mono font-bold text-xl shrink-0">
              {summaryCounts.passCount}
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-mono text-slate-300 truncate">
                Verified Qloo affinity &ge; &theta;
              </div>
              <div className="text-[10px] font-mono text-slate-500 truncate mt-0.5">
                Empirical vector matches
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>Grounding: VERIFIED</span>
            <span className="inline-flex items-center gap-1 text-cyan-400">
              <Zap className="w-2.5 h-2.5" />
              {latencyMs}ms
            </span>
          </div>
        </motion.div>

        {/* WARNING CARD */}
        <motion.div
          whileHover={{ y: -2 }}
          className="cyber-glass-panel p-4 border border-amber-500/30 rounded-2xl shadow-[0_0_20px_rgba(245,158,11,0.15)] flex flex-col justify-between space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.9)]" />
              </span>
              <span className="text-xs font-bold font-mono text-white">Warning Checks</span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-amber-950/80 text-amber-400 border border-amber-500/30 font-mono text-[10px] font-bold">
              {totalChecks > 0 ? Math.round((summaryCounts.warningCount / totalChecks) * 100) : 0}% of total
            </span>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-amber-950/60 border border-amber-500/30 flex items-center justify-center text-amber-400 font-mono font-bold text-xl shrink-0">
              {summaryCounts.warningCount}
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-mono text-slate-300 truncate">
                Score divergence or missing top-K
              </div>
              <div className="text-[10px] font-mono text-slate-500 truncate mt-0.5">
                Divergent claimed scores
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>Threshold: DELTA &gt; 0.15</span>
            <span className="inline-flex items-center gap-1 text-cyan-400">
              <Zap className="w-2.5 h-2.5" />
              {latencyMs}ms
            </span>
          </div>
        </motion.div>

        {/* FAIL CARD */}
        <motion.div
          whileHover={{ y: -2 }}
          className="cyber-glass-panel p-4 border border-rose-500/30 rounded-2xl shadow-[0_0_20px_rgba(239,68,68,0.15)] flex flex-col justify-between space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.9)]" />
              </span>
              <span className="text-xs font-bold font-mono text-white">Contradiction / Fail</span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-rose-950/80 text-rose-400 border border-rose-500/30 font-mono text-[10px] font-bold">
              {totalChecks > 0 ? Math.round((summaryCounts.failCount / totalChecks) * 100) : 0}% of total
            </span>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-rose-950/60 border border-rose-500/30 flex items-center justify-center text-rose-400 font-mono font-bold text-xl shrink-0">
              {summaryCounts.failCount}
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-mono text-slate-300 truncate">
                Low affinity or forbidden filter
              </div>
              <div className="text-[10px] font-mono text-slate-500 truncate mt-0.5">
                Violates negative constraint
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>Filter: HARD_VIOLATION</span>
            <span className="inline-flex items-center gap-1 text-cyan-400">
              <Zap className="w-2.5 h-2.5" />
              {latencyMs}ms
            </span>
          </div>
        </motion.div>

        {/* UNVERIFIABLE CARD */}
        <motion.div
          whileHover={{ y: -2 }}
          className="cyber-glass-panel p-4 border border-purple-500/30 rounded-2xl shadow-[0_0_20px_rgba(168,85,247,0.15)] flex flex-col justify-between space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.9)]" />
              </span>
              <span className="text-xs font-bold font-mono text-white">Unverifiable</span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-purple-950/80 text-purple-400 border border-purple-500/30 font-mono text-[10px] font-bold">
              {totalChecks > 0 ? Math.round((summaryCounts.unverifiableCount / totalChecks) * 100) : 0}% of total
            </span>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-purple-950/60 border border-purple-500/30 flex items-center justify-center text-purple-400 font-mono font-bold text-xl shrink-0">
              {summaryCounts.unverifiableCount}
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-mono text-slate-300 truncate">
                Unindexed item or missing evidence
              </div>
              <div className="text-[10px] font-mono text-slate-500 truncate mt-0.5">
                Missing entity URN
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>Index: ZERO_EVIDENCE</span>
            <span className="inline-flex items-center gap-1 text-cyan-400">
              <Zap className="w-2.5 h-2.5" />
              {latencyMs}ms
            </span>
          </div>
        </motion.div>
      </div>

      {/* Findings Table Panel */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1 }}
        className="cyber-glass-panel p-5 border border-white/10 dark:border-white/10 light:border-black/5 shadow-2xl rounded-2xl space-y-4"
      >
        {/* Table Console Header & Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <FileSearch className="w-4 h-4 text-cyan-400" />
            <h2 className="text-xs font-bold font-mono text-white uppercase tracking-wider">
              Findings Audit Table
            </h2>
            <span className="text-[11px] font-mono text-slate-400">
              ({filteredFindings.length} of {findings.length} checks shown)
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input Box */}
            <div className="relative flex items-center min-w-[220px]">
              <Search className="absolute left-3 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by entity name..."
                className="glass-input w-full rounded-xl py-1.5 pl-8 pr-7 font-mono text-xs text-cyan-300 placeholder-slate-500 outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 text-slate-500 hover:text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Status Filter Selector */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="glass-input rounded-xl px-3 py-1.5 font-mono text-xs text-slate-200 outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-slate-900 text-slate-200 dark:bg-slate-900 light:bg-white light:text-slate-900">All Outcomes ({findings.length})</option>
              <option value="PASS" className="bg-slate-900 text-emerald-400 dark:bg-slate-900 light:bg-white light:text-emerald-700">PASS ({summaryCounts.passCount})</option>
              <option value="WARNING" className="bg-slate-900 text-amber-400 dark:bg-slate-900 light:bg-white light:text-amber-700">WARNING ({summaryCounts.warningCount})</option>
              <option value="FAIL" className="bg-slate-900 text-rose-400 dark:bg-slate-900 light:bg-white light:text-rose-700">FAIL ({summaryCounts.failCount})</option>
              <option value="UNVERIFIABLE" className="bg-slate-900 text-purple-400 dark:bg-slate-900 light:bg-white light:text-purple-700">UNVERIFIABLE ({summaryCounts.unverifiableCount})</option>
            </select>
          </div>
        </div>

        {/* Table Content or Dynamic Empty State */}
        {filteredFindings.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-center font-mono">
            <div className="relative mb-4 flex items-center justify-center">
              <motion.div
                animate={{ scale: [1, 2], opacity: [0.6, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
                className="absolute w-12 h-12 rounded-full border border-cyan-500/40 bg-cyan-500/10"
              />
              <motion.div
                animate={{
                  scale: [0.95, 1.15, 0.95],
                  boxShadow: [
                    '0 0 10px rgba(6, 182, 212, 0.3)',
                    '0 0 25px rgba(6, 182, 212, 0.7)',
                    '0 0 10px rgba(6, 182, 212, 0.3)'
                  ]
                }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute w-14 h-14 rounded-full border border-cyan-400/60 bg-cyan-500/10 pointer-events-none"
              />
              <div className="relative z-10 p-3 rounded-full border border-white/10 dark:border-white/10 light:border-black/5 bg-slate-900/50 backdrop-blur-md text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                <Radar className="w-6 h-6 animate-spin [animation-duration:4s]" />
              </div>
            </div>
            <div className="text-sm font-semibold uppercase tracking-wider text-slate-300">
              No Matching Findings
            </div>
            <p className="mt-1 text-xs text-slate-500 max-w-sm">
              No evaluation check in this active run matched your search query or status filter.
            </p>
            {(searchQuery || statusFilter !== 'ALL') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('ALL');
                }}
                className="mt-4 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 font-mono text-xs text-cyan-400 hover:bg-white/10 transition-colors cursor-pointer"
              >
                Clear Search & Filter
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-sans text-xs">
              <thead>
                <tr className="border-b border-white/10 text-[11px] font-mono uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-3.5 font-semibold">Entity Candidate</th>
                  <th className="py-3 px-3.5 font-semibold">Outcome</th>
                  <th className="py-3 px-3.5 font-semibold">Epistemic Rule</th>
                  <th className="py-3 px-3.5 font-semibold">Metric / Affinity</th>
                  <th className="py-3 px-3.5 font-semibold">Reason Summary</th>
                  <th className="py-3 px-3.5 font-semibold text-right">Evidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                <AnimatePresence mode="popLayout">
                  {filteredFindings.map((finding) => (
                    <motion.tr
                      key={finding.id}
                      id={`finding-row-${finding.id}`}
                      onClick={() => setSelectedFinding(finding)}
                      className="group transition-colors hover:bg-white/5 cursor-pointer"
                    >
                      {/* Entity Name & ID */}
                      <td className="py-3.5 px-3.5">
                        <div className="font-semibold text-white group-hover:text-cyan-300 transition-colors">
                          {finding.itemTargetName}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                          ID: {finding.id}
                        </div>
                      </td>

                      {/* Status Outcome Badge */}
                      <td className="py-3.5 px-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md font-mono text-[10px] font-bold border ${
                            finding.status === 'PASS'
                              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                              : finding.status === 'WARNING'
                              ? 'bg-amber-950/60 border-amber-500/40 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                              : finding.status === 'FAIL'
                              ? 'bg-rose-950/60 border-rose-500/40 text-rose-400 shadow-[0_0_10px_rgba(239,68,68,0.2)]'
                              : 'bg-purple-950/60 border-purple-500/40 text-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.2)]'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              finding.status === 'PASS'
                                ? 'bg-emerald-400'
                                : finding.status === 'WARNING'
                                ? 'bg-amber-400'
                                : finding.status === 'FAIL'
                                ? 'bg-rose-400'
                                : 'bg-purple-400'
                            }`}
                          />
                          {finding.status}
                        </span>
                      </td>

                      {/* Rule Classification */}
                      <td className="py-3.5 px-3.5 font-mono text-[11px] text-slate-300">
                        <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10">
                          {finding.classification}
                        </span>
                      </td>

                      {/* Observed Metric & Documented Formula */}
                      <td className="py-3.5 px-3.5 text-xs">
                        {finding.metricObserved ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-cyan-300 font-semibold font-mono text-[11px]">
                              {finding.metricObserved.name}: {finding.metricObserved.value}
                            </span>
                            <span
                              title={`Source formula: ${finding.metricObserved.sourceFormulaOrOrigin}`}
                              className="text-[10px] text-slate-500 max-w-[160px] truncate font-mono"
                            >
                              Src: {finding.metricObserved.sourceFormulaOrOrigin}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-500 font-mono text-[11px] italic">
                            Presence check
                          </span>
                        )}
                      </td>

                      {/* Short Reason */}
                      <td className="py-3.5 px-3.5 text-slate-300 max-w-[340px]">
                        <div className="truncate text-xs font-mono" title={finding.humanReadableReason}>
                          {finding.humanReadableReason}
                        </div>
                      </td>

                      {/* View Evidence Action Button */}
                      <td className="py-3.5 px-3.5 text-right">
                        <button
                          id={`view-evidence-${finding.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFinding(finding);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-white/10 bg-white/5 hover:border-cyan-500/50 hover:bg-cyan-500/10 hover:text-cyan-300 text-slate-300 font-mono text-[11px] transition-all cursor-pointer shadow-sm"
                        >
                          <span>Evidence</span>
                          <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Slide-over Diagnostic Evidence Drawer */}
      <EvidenceDrawer
        finding={selectedFinding}
        report={report}
        onClose={() => setSelectedFinding(null)}
      />
    </VibecodeCanvasLayout>
  );
};

export default ResultsView;
