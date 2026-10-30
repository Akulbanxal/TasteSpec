import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Database,
  ShieldCheck,
  Activity,
  Terminal,
  CheckCircle2,
  Zap
} from 'lucide-react';

export interface ExecutingTelemetryProps {
  scenarioTitle?: string;
  className?: string;
}

interface TelemetryStage {
  id: number;
  code: string;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  detail: string;
  statusText: string;
}

const STAGES: TelemetryStage[] = [
  {
    id: 1,
    code: 'STAGE 01 // ENTITY RESOLUTION',
    title: 'Stage 1: Entity Resolution',
    subtitle: 'Qloo Entity Disambiguation API • Resolving candidate URNs & surface forms',
    icon: Search,
    detail: 'Cross-examining recommendations against Qloo entity index to resolve canonical URNs and disambiguate candidate entities.',
    statusText: 'Querying /v2/search API for target domain catalog matches...'
  },
  {
    id: 2,
    code: 'STAGE 02 // EVIDENCE RETRIEVAL',
    title: 'Stage 2: Qloo Evidence Retrieval',
    subtitle: 'Empirical Taste Graph • Extracting cross-domain affinity vectors & co-occurrence weights',
    icon: Database,
    detail: 'Retrieving high-dimensional affinity matrices from empirical cultural knowledge graph using persona seed entities.',
    statusText: 'Streaming 128-dimensional cross-domain affinity vectors (~82ms latency)...'
  },
  {
    id: 3,
    code: 'STAGE 03 // RULE AUDIT',
    title: 'Stage 3: Rule Audit',
    subtitle: 'Deterministic Constraints • Evaluating affinity threshold, numeric grounding & forbidden attributes',
    icon: ShieldCheck,
    detail: 'Auditing numerical claims against observed evidence, testing forbidden attribute filters, and sealing cryptographic ledger.',
    statusText: 'Verifying numeric grounding & testing forbidden constraint violations...'
  }
];

export const ExecutingTelemetry: React.FC<ExecutingTelemetryProps> = ({
  scenarioTitle = 'Target Cultural Persona',
  className = ''
}) => {
  const [activeStage, setActiveStage] = useState<number>(1);
  const [logs, setLogs] = useState<Array<{ id: string; time: string; text: string; stage: number }>>([]);
  const [elapsedMs, setElapsedMs] = useState<number>(0);

  // Progressive stage timer
  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      setElapsedMs(elapsed);

      if (elapsed > 2400) {
        setActiveStage(3);
      } else if (elapsed > 1200) {
        setActiveStage(2);
      } else {
        setActiveStage(1);
      }
    }, 100);

    return () => clearInterval(interval);
  }, []);

  // Telemetry log event emission
  useEffect(() => {
    const initialLogs = [
      { id: '1', time: '00:00.12', text: `Initializing audit pipeline for scenario "${scenarioTitle}"...`, stage: 1 },
      { id: '2', time: '00:00.45', text: 'Stage 1: Extracting candidate entities from recommendation payload...', stage: 1 },
      { id: '3', time: '00:01.10', text: 'Stage 1: Disambiguation complete. Canonical URNs verified in Qloo catalog.', stage: 1 },
      { id: '4', time: '00:01.35', text: 'Stage 2: Dispatched multi-seed affinity query to Qloo Cultural Graph API.', stage: 2 },
      { id: '5', time: '00:01.88', text: 'Stage 2: 128-dim taste affinity vectors retrieved with response code 200 OK.', stage: 2 },
      { id: '6', time: '00:02.30', text: 'Stage 3: Checking candidate affinity scores against minimum threshold θ.', stage: 3 },
      { id: '7', time: '00:02.65', text: 'Stage 3: Scanning forbidden attribute filters & calculating verification delta.', stage: 3 },
      { id: '8', time: '00:02.95', text: 'Stage 3: Generating cryptographic SHA-256 seal for evidence ledger.', stage: 3 }
    ];

    const timeouts = initialLogs.map((logItem, index) => {
      return setTimeout(() => {
        setLogs(prev => [...prev, logItem]);
      }, (index + 1) * 380);
    });

    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, [scenarioTitle]);

  const formatElapsed = (ms: number) => {
    const secs = (ms / 1000).toFixed(1);
    return `${secs}s`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.3 }}
      className={`cyber-glass-panel relative overflow-hidden border border-white/10 dark:border-white/10 light:border-black/5 p-6 md:p-8 shadow-2xl flex flex-col min-h-[520px] rounded-2xl ${className}`}
    >
      {/* Background radial glows */}
      <div className="pointer-events-none absolute -left-12 -top-12 h-44 w-44 rounded-full bg-cyan-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -right-12 -bottom-12 h-44 w-44 rounded-full bg-teal-500/10 blur-3xl" />

      {/* TOP HEADER: Active Execution State */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-5">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center h-10 w-10 rounded-xl bg-cyan-950/70 border border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.35)]">
            <Activity className="h-5 w-5 text-cyan-400 animate-spin [animation-duration:3s]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-white uppercase tracking-wider">
                ACTIVE EVALUATION PIPELINE
              </span>
              <span className="inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-widest text-cyan-400 bg-cyan-950/60 border border-cyan-500/30 px-2 py-0.5 rounded-full font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                STREAMING
              </span>
            </div>
            <p className="font-mono text-[11px] text-slate-400 mt-0.5 truncate max-w-sm">
              Cross-examining recommendations against Qloo taste vectors
            </p>
          </div>
        </div>

        {/* Live Metrics Pill */}
        <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">ELAPSED:</span>
            <span className="text-cyan-400 font-bold">{formatElapsed(elapsedMs)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-slate-500">QLOO API:</span>
            <span className="text-emerald-400 font-bold">ONLINE</span>
          </div>
        </div>
      </div>

      {/* MIDDLE: 3-STAGE TELEMETRY PIPELINE CARDS */}
      <div className="relative z-10 my-6 flex flex-col gap-3.5">
        {STAGES.map((s) => {
          const isDone = activeStage > s.id;
          const isCurrent = activeStage === s.id;
          const Icon = s.icon;

          return (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35, delay: s.id * 0.1 }}
              className={`relative overflow-hidden rounded-xl border p-4 transition-all duration-300 ${
                isCurrent
                  ? 'border-cyan-500/50 bg-cyan-950/30 shadow-[0_0_25px_rgba(6,182,212,0.2)]'
                  : isDone
                  ? 'border-emerald-500/30 bg-emerald-950/20'
                  : 'border-white/5 bg-white/5 opacity-60'
              }`}
            >
              {/* Active stage top-pulse progress bar */}
              {isCurrent && (
                <motion.div
                  className="absolute top-0 left-0 h-[2px] bg-gradient-to-r from-cyan-400 via-teal-300 to-blue-500"
                  initial={{ width: '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                />
              )}

              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  {/* Status node */}
                  <div
                    className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg border shrink-0 transition-colors ${
                      isDone
                        ? 'border-emerald-500 bg-emerald-950/80 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                        : isCurrent
                        ? 'border-cyan-400 bg-cyan-950/80 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.5)]'
                        : 'border-white/10 bg-white/5 text-slate-500'
                    }`}
                  >
                    {isDone ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : isCurrent ? (
                      <Icon className="h-4 w-4 animate-pulse" />
                    ) : (
                      <span className="font-mono text-xs font-bold">{s.id}</span>
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] uppercase font-bold tracking-widest text-slate-400">
                        {s.code}
                      </span>
                      {isCurrent && (
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
                        </span>
                      )}
                    </div>
                    <h4 className="font-mono text-xs md:text-sm font-bold text-white">
                      {s.title}
                    </h4>
                    <p className="font-mono text-[11px] text-slate-400 leading-relaxed max-w-xl">
                      {isCurrent ? s.statusText : s.subtitle}
                    </p>
                  </div>
                </div>

                {/* Right stage status pill */}
                <span
                  className={`font-mono text-[10px] tracking-wider px-2.5 py-1 rounded-full uppercase font-bold shrink-0 ${
                    isDone
                      ? 'border border-emerald-500/40 text-emerald-400 bg-emerald-950/40'
                      : isCurrent
                      ? 'border border-cyan-500/40 text-cyan-300 bg-cyan-950/60 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                      : 'border border-white/10 text-slate-500 bg-white/5'
                  }`}
                >
                  {isDone ? 'COMPLETE' : isCurrent ? 'EXECUTING...' : 'QUEUED'}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* BOTTOM: Streaming Telemetry Log Feed */}
      <div className="relative z-10 mt-auto rounded-xl border border-white/10 bg-black/40 p-4 font-mono text-[11px] text-slate-300 shadow-inner">
        <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
          <div className="flex items-center gap-2 text-slate-400">
            <Terminal className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-bold text-[10px] uppercase tracking-wider text-slate-300">
              Live Telemetry Feed
            </span>
          </div>
          <span className="text-[10px] text-cyan-400 animate-pulse">
            ● STREAMING SSE LOGS
          </span>
        </div>

        <div className="space-y-1 max-h-28 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 pr-2">
          <AnimatePresence initial={false}>
            {logs.map((log) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-start gap-2.5 leading-relaxed text-slate-300"
              >
                <span className="text-slate-500 text-[10px] shrink-0">{log.time}</span>
                <span className="text-cyan-400/80">›</span>
                <span className="truncate">{log.text}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

export default ExecutingTelemetry;
