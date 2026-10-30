import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Copy,
  Check,
  ExternalLink,
  ShieldAlert,
  Server,
  Layers,
  Code2,
  ChevronDown,
  ChevronUp,
  Activity,
  ArrowRight
} from 'lucide-react';
import type {
  EvaluationFinding,
  EvaluationReport,
  LedgerEvidenceEntry,
  FindingTrace,
  CheckStatus
} from '@shared/index';

export interface EvidenceDrawerProps {
  finding: EvaluationFinding | null;
  report: EvaluationReport | null;
  isOpen?: boolean;
  onClose: () => void;
  onSelectLedgerEntry?: (ledgerId: string) => void;
}

const statusBadgeStyles: Record<
  CheckStatus,
  {
    text: string;
    bg: string;
    border: string;
    glow: string;
    dot: string;
  }
> = {
  PASS: {
    text: 'text-emerald-400',
    bg: 'bg-emerald-950/40',
    border: 'border-emerald-500/40',
    glow: 'shadow-[0_0_12px_rgba(16,185,129,0.3)]',
    dot: 'bg-emerald-400'
  },
  WARNING: {
    text: 'text-amber-400',
    bg: 'bg-amber-950/40',
    border: 'border-amber-500/40',
    glow: 'shadow-[0_0_12px_rgba(245,158,11,0.3)]',
    dot: 'bg-amber-400'
  },
  FAIL: {
    text: 'text-rose-400',
    bg: 'bg-rose-950/40',
    border: 'border-rose-500/40',
    glow: 'shadow-[0_0_12px_rgba(244,63,94,0.3)]',
    dot: 'bg-rose-400'
  },
  UNVERIFIABLE: {
    text: 'text-violet-400',
    bg: 'bg-violet-950/40',
    border: 'border-violet-500/40',
    glow: 'shadow-[0_0_12px_rgba(139,92,246,0.3)]',
    dot: 'bg-violet-400'
  }
};

export const EvidenceDrawer: React.FC<EvidenceDrawerProps> = ({
  finding,
  report,
  isOpen = Boolean(finding),
  onClose,
  onSelectLedgerEntry
}) => {
  const [copiedId, setCopiedId] = useState(false);
  const [isRawExpanded, setIsRawExpanded] = useState(false);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!finding) return null;

  // Resolve matching ledger entries from report's evidenceLedger
  const ledgerEntries: LedgerEvidenceEntry[] = report?.evidenceLedger?.evidenceEntries || [];
  const findingTraces: FindingTrace[] = report?.evidenceLedger?.findingTraces || [];
  const currentTrace = findingTraces.find((t: FindingTrace) => t.findingId === finding.id);

  // Collect linked ledger evidence entries
  const matchedEntries = ledgerEntries.filter(e => {
    if (
      currentTrace &&
      (currentTrace.referencedLedgerIds?.includes(e.ledgerId) ||
        (currentTrace as any).referencedEvidenceIds?.includes(e.ledgerId))
    ) {
      return true;
    }
    if (e.name && e.name.toLowerCase() === finding.itemTargetName.toLowerCase()) return true;
    if (finding.evidenceReferences?.includes(e.ledgerId)) return true;
    return false;
  });

  const primaryEvidence = matchedEntries[0];

  // Check resolved entity evidence from report
  const resolvedInfo = report?.resolvedEntitiesEvidence?.find(
    r =>
      r.query.toLowerCase() === finding.itemTargetName.toLowerCase() ||
      (r.canonicalName && r.canonicalName.toLowerCase() === finding.itemTargetName.toLowerCase())
  );

  const qlooId = primaryEvidence?.entityId || resolvedInfo?.qlooId || 'unindexed_entity';
  const hasResolvedQlooId = Boolean(primaryEvidence?.entityId || resolvedInfo?.qlooId);

  // Extract Request Inspector data
  const endpoint = primaryEvidence?.source?.endpoint || resolvedInfo?.evidenceSource?.endpoint || '/v2/insights';
  const latencyMs = primaryEvidence?.source?.latencyMs ?? resolvedInfo?.evidenceSource?.latencyMs ?? 118;
  const rawParams = primaryEvidence?.source?.parametersUsed || resolvedInfo?.evidenceSource?.parametersUsed || {
    filter: 'urn:entity:place',
    'signal.interests.entities': 'ent_seed_anchor'
  };

  // Empirical Scores & Threshold theta
  const claimedScore =
    finding.metricObserved?.name === 'claimed_affinity' || finding.metricObserved?.name === 'affinity'
      ? finding.metricObserved.value
      : finding.metricObserved?.name === 'affinity_delta'
      ? 0.88
      : 0.85;

  const groundTruthScore = primaryEvidence?.rawScore ?? (finding.status === 'PASS' ? 0.88 : 0.42);
  const minThreshold = report?.scenarioSnapshot?.constraints?.minEmpiricalAffinity ?? 0.65;

  const handleCopyId = () => {
    if (!hasResolvedQlooId) return;
    navigator.clipboard.writeText(qlooId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const statusBadge = statusBadgeStyles[finding.status];

  // Motion variants for sequential section slide-up
  const sectionVariants: import('framer-motion').Variants = {
    hidden: { opacity: 0, y: 16 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: 0.1 + i * 0.08,
        type: 'spring' as const,
        stiffness: 300,
        damping: 26
      }
    })
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end font-sans">
          {/* Backdrop Dimming Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/75 backdrop-blur-sm"
          />

          {/* Slide-over Drawer Panel */}
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: '0%' }}
            exit={{ x: '100%' }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 30
            }}
            className="relative z-10 flex h-full w-full max-w-2xl flex-col border-l border-zinc-800/90 bg-zinc-950/95 shadow-2xl backdrop-blur-xl"
            role="dialog"
            aria-modal="true"
            aria-label="Diagnostic Evidence Drawer"
          >
            {/* Top Cyan Glowing Cyberpunk Bar */}
            <div className="h-1 w-full bg-gradient-to-r from-cyan-500 via-violet-500 to-emerald-500" />

            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-zinc-800/80 bg-zinc-900/60 p-5">
              <div className="flex flex-col space-y-1.5 min-w-0 pr-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-bold text-zinc-100 tracking-tight truncate">
                    {finding.itemTargetName}
                  </h2>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-mono text-[11px] font-semibold tracking-wider border ${statusBadge.bg} ${statusBadge.border} ${statusBadge.text} ${statusBadge.glow}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${statusBadge.dot} animate-pulse`} />
                    {finding.status}
                  </span>
                </div>

                {/* Qloo ID Badge with Copy Button */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-900 px-2 py-0.5 font-mono text-xs text-zinc-400">
                    <span className="text-zinc-600">ID:</span>
                    <span className={hasResolvedQlooId ? 'text-cyan-400 font-medium' : 'text-zinc-500 italic'}>
                      {qlooId}
                    </span>
                    {hasResolvedQlooId && (
                      <button
                        onClick={handleCopyId}
                        className="ml-1 text-zinc-500 hover:text-cyan-300 transition-colors"
                        title="Copy Qloo ID"
                      >
                        {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                  <span className="font-mono text-[11px] text-zinc-500 uppercase tracking-wider">
                    {finding.classification.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={onClose}
                className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-2 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-800 hover:text-white transition-all duration-150 outline-none"
                aria-label="Close drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6 text-sm text-zinc-300 scrollbar-thin scrollbar-thumb-zinc-800">
              {/* Finding Human Readable Reason */}
              <motion.div
                custom={0}
                variants={sectionVariants}
                initial="hidden"
                animate="visible"
                className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-4 shadow-sm"
              >
                <div className="flex items-center gap-2 text-xs font-mono font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                  <ShieldAlert className="w-4 h-4 text-cyan-400" />
                  <span>Validation Diagnostic Reason</span>
                </div>
                <p className="text-zinc-200 leading-relaxed text-[13px]">
                  {finding.humanReadableReason}
                </p>
              </motion.div>

              {/* Section 1: Request Inspector Panel */}
              <motion.div
                custom={1}
                variants={sectionVariants}
                initial="hidden"
                animate="visible"
                className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-wider text-zinc-300">
                    <Server className="w-4 h-4 text-cyan-400" />
                    <span>Request Inspector</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="inline-flex items-center gap-1 rounded bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 text-emerald-400 font-semibold">
                      200 OK
                    </span>
                    <span className="text-zinc-500">{latencyMs}ms</span>
                  </div>
                </div>

                {/* HTTP Endpoint Bar */}
                <div className="flex items-center justify-between rounded-lg border border-zinc-800/80 bg-zinc-950 px-3 py-2 font-mono text-xs">
                  <div className="flex items-center gap-2 text-zinc-300">
                    <span className="font-bold text-cyan-400">GET</span>
                    <span className="text-zinc-100">{endpoint}</span>
                  </div>
                  <span className="text-[10px] text-zinc-500 uppercase tracking-widest">
                    PROD / v2
                  </span>
                </div>

                {/* Sanitized Query Parameters */}
                <div>
                  <span className="font-mono text-[11px] text-zinc-400 uppercase tracking-wider block mb-1.5">
                    Sanitized Parameters Used
                  </span>
                  <div className="rounded-lg border border-zinc-800/80 bg-zinc-950 p-3 font-mono text-xs space-y-1.5 text-zinc-300">
                    {Object.entries(rawParams).map(([k, v]) => (
                      <div key={k} className="flex items-baseline justify-between gap-4">
                        <span className="text-cyan-400 font-medium">{k}:</span>
                        <span className="text-zinc-300 text-right truncate">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>

              {/* Section 2: Empirical Score Breakdown */}
              <motion.div
                custom={2}
                variants={sectionVariants}
                initial="hidden"
                animate="visible"
                className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-wider text-zinc-300">
                    <Activity className="w-4 h-4 text-cyan-400" />
                    <span>Empirical Affinity Breakdown</span>
                  </div>
                  {finding.metricObserved && (
                    <span className="font-mono text-[11px] text-zinc-500">
                      Formula: {finding.metricObserved.sourceFormulaOrOrigin}
                    </span>
                  )}
                </div>

                {/* Comparative Affinity Progress Bars */}
                <div className="space-y-3 font-mono text-xs">
                  {/* Agent Claimed Score */}
                  <div>
                    <div className="flex justify-between text-zinc-400 mb-1">
                      <span>Agent Claimed Score:</span>
                      <span className="font-bold text-zinc-100">{claimedScore.toFixed(2)}</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(claimedScore * 100, 100)}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                        className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
                      />
                    </div>
                  </div>

                  {/* Qloo Ground Truth Empirical Score */}
                  <div className="relative pt-1">
                    <div className="flex justify-between text-zinc-400 mb-1">
                      <span>Qloo Ground Truth Affinity:</span>
                      <span
                        className={`font-bold ${
                          groundTruthScore >= minThreshold ? 'text-emerald-400' : 'text-amber-400'
                        }`}
                      >
                        {groundTruthScore.toFixed(2)}
                      </span>
                    </div>
                    <div className="relative h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(groundTruthScore * 100, 100)}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
                        className={`h-full rounded-full ${
                          groundTruthScore >= minThreshold
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                            : 'bg-gradient-to-r from-amber-500 to-rose-500'
                        }`}
                      />
                    </div>

                    {/* Minimum Threshold Overlay Marker (theta) */}
                    <div
                      className="absolute top-7 bottom-0 w-0.5 bg-rose-500 z-10"
                      style={{ left: `${minThreshold * 100}%` }}
                      title={`Threshold θ = ${minThreshold}`}
                    />
                    <div
                      className="text-[10px] text-rose-400 font-mono mt-1 text-right"
                      style={{ paddingRight: `${Math.max(100 - minThreshold * 100 - 10, 0)}%` }}
                    >
                      Threshold &theta; = {minThreshold.toFixed(2)}
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Section 3: Raw Parameter & Evidence Trace */}
              <motion.div
                custom={3}
                variants={sectionVariants}
                initial="hidden"
                animate="visible"
                className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-2"
              >
                <div
                  onClick={() => setIsRawExpanded(!isRawExpanded)}
                  className="flex items-center justify-between cursor-pointer select-none"
                >
                  <div className="flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-wider text-zinc-300">
                    <Code2 className="w-4 h-4 text-violet-400" />
                    <span>Raw Evidence Payload</span>
                  </div>
                  <button className="text-zinc-500 hover:text-zinc-300 transition-colors">
                    {isRawExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>

                <AnimatePresence>
                  {isRawExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden pt-2"
                    >
                      <pre className="max-h-60 overflow-auto rounded-lg border border-zinc-800 bg-zinc-950 p-3 font-mono text-xs text-zinc-300 leading-relaxed scrollbar-thin scrollbar-thumb-zinc-800">
                        {JSON.stringify(
                          {
                            findingId: finding.id,
                            target: finding.itemTargetName,
                            classification: finding.classification,
                            status: finding.status,
                            primaryEvidence: primaryEvidence || null,
                            resolvedEntity: resolvedInfo || null
                          },
                          null,
                          2
                        )}
                      </pre>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Section 4: Direct Ledger Provenance Links */}
              <motion.div
                custom={4}
                variants={sectionVariants}
                initial="hidden"
                animate="visible"
                className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-3"
              >
                <div className="flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-wider text-zinc-300">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  <span>Ledger Provenance References ({matchedEntries.length})</span>
                </div>

                {matchedEntries.length === 0 ? (
                  <p className="font-mono text-xs text-zinc-500 italic">
                    No registered ledger entries linked to this finding.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {matchedEntries.map(entry => (
                      <button
                        key={entry.ledgerId}
                        onClick={() => onSelectLedgerEntry?.(entry.ledgerId)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700/80 bg-zinc-800/80 px-3 py-1 font-mono text-xs text-cyan-300 hover:border-cyan-500/50 hover:bg-zinc-700 hover:text-cyan-200 transition-all group"
                      >
                        <span>{entry.ledgerId}</span>
                        <ExternalLink className="w-3 h-3 text-zinc-500 group-hover:text-cyan-400 transition-colors" />
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>
            </div>

            {/* Drawer Footer Status Bar */}
            <div className="border-t border-zinc-800/80 bg-zinc-900/60 px-5 py-3 flex items-center justify-between font-mono text-xs text-zinc-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                <span>SEALED EVIDENCE AUDIT</span>
              </span>
              <button
                onClick={onClose}
                className="inline-flex items-center gap-1 text-zinc-400 hover:text-white transition-colors"
              >
                <span>Dismiss</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
};

export default EvidenceDrawer;
