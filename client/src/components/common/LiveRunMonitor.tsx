import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Terminal,
  Activity,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  ArrowDownToLine,
  Radio,
  Cpu
} from 'lucide-react';
import type { EvaluationLifecycleState } from '@shared/index';

export type ExecutionStatus = 'IDLE' | 'EXECUTING' | 'COMPLETED' | 'FAILED';
export type LogLevel = 'INFO' | 'WARN' | 'ERROR';

export interface SSELogEvent {
  id: string;
  timestamp: string; // ISO or HH:mm:ss.SSS
  stage: EvaluationLifecycleState;
  level: LogLevel;
  message: string;
  rawPayload?: Record<string, unknown> | unknown;
}

export interface StageState {
  stage: EvaluationLifecycleState;
  label: string;
  description: string;
}

export interface LiveRunMonitorProps {
  status: ExecutionStatus;
  currentStage: EvaluationLifecycleState;
  events: SSELogEvent[];
  rulesEvaluatedCount?: number;
  uptimeSeconds?: number;
  isConnected?: boolean;
  onClearLogs?: () => void;
}

export const EVALUATION_STAGES: StageState[] = [
  { stage: 'CONFIGURED', label: '1. CONFIGURED', description: 'Scenario parameters sealed' },
  { stage: 'RESOLVING_ENTITIES', label: '2. RESOLVING', description: 'Qloo catalog identity mapping' },
  { stage: 'FETCHING_QLOO_EVIDENCE', label: '3. EVIDENCE', description: 'Empirical taste affinity vectors' },
  { stage: 'EVALUATING_RULES', label: '4. RULES AUDIT', description: 'Deterministic constraint evaluation' },
  { stage: 'COMPLETED', label: '5. COMPLETED', description: 'Evidence ledger sealed' }
];

export const LiveRunMonitor: React.FC<LiveRunMonitorProps> = ({
  status = 'IDLE',
  currentStage = 'CONFIGURED',
  events = [],
  rulesEvaluatedCount = 0,
  uptimeSeconds = 0,
  isConnected = true,
  onClearLogs
}) => {
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [copiedLogId, setCopiedLogId] = useState<string | null>(null);
  const [lockToBottom, setLockToBottom] = useState<boolean>(true);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom if locked
  useEffect(() => {
    if (lockToBottom && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [events, lockToBottom]);

  const handleCopyPayload = (logId: string, payload: unknown) => {
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setCopiedLogId(logId);
    setTimeout(() => setCopiedLogId(null), 2000);
  };

  const currentStageIndex = EVALUATION_STAGES.findIndex(s => s.stage === currentStage);
  const effectiveStageIndex = currentStageIndex >= 0 ? currentStageIndex : 0;

  // Format uptime HH:mm:ss
  const formatUptime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    const ms = Math.floor((totalSeconds * 10) % 10);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms}`;
  };

  const statusBadgeColor =
    status === 'COMPLETED'
      ? 'border-emerald-500/40 text-emerald-400 bg-emerald-950/40 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
      : status === 'FAILED'
      ? 'border-rose-500/40 text-rose-400 bg-rose-950/40 shadow-[0_0_12px_rgba(244,63,94,0.3)]'
      : status === 'EXECUTING'
      ? 'border-cyan-500/40 text-cyan-400 bg-cyan-950/40 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
      : 'border-zinc-700 text-zinc-400 bg-zinc-900/60';

  return (
    <div className="cyber-glass-panel rounded-2xl relative w-full overflow-hidden border border-white/10 dark:border-white/10 light:border-black/5 font-mono text-zinc-300 shadow-2xl">
      {/* Retro-futuristic scanline CSS overlay */}
      <div
        className="pointer-events-none absolute inset-0 z-30 opacity-[0.04]"
        style={{
          background:
            'repeating-linear-gradient(0deg, rgba(255,255,255,0.15), rgba(255,255,255,0.15) 1px, transparent 1px, transparent 2px)'
        }}
      />

      {/* Cyber cyan ambient corner lighting */}
      <div className="pointer-events-none absolute -left-20 -top-20 h-48 w-48 rounded-full bg-cyan-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 -bottom-20 h-48 w-48 rounded-full bg-violet-500/10 blur-3xl" />

      {/* TOP BAR: Mission Control Execution Status */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 bg-white/5 p-4 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Terminal className="h-5 w-5 text-cyan-400 animate-pulse" />
            <span className="font-bold tracking-wider text-zinc-100 text-sm">
              TASTESPEC LIVE MONITOR
            </span>
          </div>

          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold tracking-widest ${statusBadgeColor}`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                status === 'EXECUTING'
                  ? 'bg-cyan-400 animate-ping'
                  : status === 'COMPLETED'
                  ? 'bg-emerald-400'
                  : status === 'FAILED'
                  ? 'bg-rose-400'
                  : 'bg-zinc-500'
              }`}
            />
            {status}
          </span>
        </div>

        {/* Telemetry Stats Strip */}
        <div className="flex flex-wrap items-center gap-5 text-xs text-zinc-400">
          {/* Uptime */}
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-500">UPTIME:</span>
            <span className="font-bold text-zinc-200">{formatUptime(uptimeSeconds)}</span>
          </div>

          {/* Rules Evaluated */}
          <div className="flex items-center gap-1.5">
            <Cpu className="h-3.5 w-3.5 text-cyan-400" />
            <span className="text-zinc-500">RULES:</span>
            <span className="font-bold text-cyan-400">{rulesEvaluatedCount}</span>
          </div>

          {/* SSE Stream Status Indicator */}
          <div className="flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2 py-1">
            <Radio
              className={`h-3 w-3 ${isConnected ? 'text-emerald-400 animate-pulse' : 'text-zinc-600'}`}
            />
            <span className="text-[10px] tracking-wider text-zinc-300 uppercase">
              {isConnected ? 'SSE STREAM ACTIVE' : 'DISCONNECTED'}
            </span>
          </div>
        </div>
      </div>

      {/* MIDDLE: 5-Stage Stepper Progress Tracker */}
      <div className="relative z-10 border-b border-white/10 bg-black/20 px-6 py-5">
        <div className="relative flex items-center justify-between">
          {/* Connecting Line between stages */}
          <div className="absolute left-6 right-6 top-4 h-0.5 bg-white/10">
            <motion.div
              className="h-full bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400"
              initial={{ width: '0%' }}
              animate={{
                width: `${(effectiveStageIndex / (EVALUATION_STAGES.length - 1)) * 100}%`
              }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>

          {/* Stages */}
          {EVALUATION_STAGES.map((s, index) => {
            const isCompleted = index < effectiveStageIndex || status === 'COMPLETED';
            const isActive = index === effectiveStageIndex && status !== 'COMPLETED';
            const isFailed = status === 'FAILED' && index === effectiveStageIndex;

            return (
              <div key={s.stage} className="relative z-10 flex flex-col items-center">
                {/* Stage Circular Node */}
                <motion.div
                  animate={isActive ? { scale: [1, 1.1, 1] } : {}}
                  transition={isActive ? { repeat: Infinity, duration: 2 } : {}}
                  className={`flex h-8 w-8 items-center justify-center rounded-full border transition-all duration-300 ${
                    isFailed
                      ? 'border-rose-500 bg-rose-950/80 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.5)]'
                      : isCompleted
                      ? 'border-emerald-500 bg-emerald-950/80 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                      : isActive
                      ? 'border-cyan-400 bg-cyan-950/80 text-cyan-300 shadow-[0_0_18px_rgba(6,182,212,0.6)]'
                      : 'border-white/10 bg-white/5 text-zinc-600'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : isFailed ? (
                    <XCircle className="h-4 w-4" />
                  ) : isActive ? (
                    <Activity className="h-4 w-4 animate-spin" />
                  ) : (
                    <span className="text-xs font-bold">{index + 1}</span>
                  )}
                </motion.div>

                {/* Stage Label */}
                <span
                  className={`mt-2 font-mono text-[11px] font-semibold tracking-wider uppercase ${
                    isActive
                      ? 'text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]'
                      : isCompleted
                      ? 'text-emerald-400'
                      : isFailed
                      ? 'text-rose-400'
                      : 'text-zinc-500'
                  }`}
                >
                  {s.label}
                </span>

                {/* Micro description */}
                <span className="hidden text-[10px] text-zinc-400 sm:block text-center max-w-[110px]">
                  {s.description}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* BOTTOM CONSOLE: Terminal Feed Toolbar */}
      <div className="relative z-10 flex items-center justify-between border-b border-white/10 bg-white/5 px-4 py-2 text-xs">
        <div className="flex items-center gap-2 text-zinc-400">
          <Terminal className="h-3.5 w-3.5 text-cyan-400" />
          <span className="text-[11px] uppercase tracking-wider text-zinc-300">
            EXECUTION EVENT LOGS ({events.length})
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Lock to Bottom Button */}
          <button
            onClick={() => setLockToBottom(!lockToBottom)}
            className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors cursor-pointer ${
              lockToBottom
                ? 'border-cyan-500/50 bg-cyan-950/40 text-cyan-300'
                : 'border-white/10 bg-white/5 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <ArrowDownToLine className="h-3 w-3" />
            <span>{lockToBottom ? 'LOCKED TO BOTTOM' : 'FREE SCROLL'}</span>
          </button>

          {/* Clear Logs */}
          {onClearLogs && (
            <button
              onClick={onClearLogs}
              className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-zinc-400 hover:border-white/20 hover:text-zinc-200 transition-colors cursor-pointer"
            >
              CLEAR
            </button>
          )}
        </div>
      </div>

      {/* TERMINAL LOG FEED: Auto-Scrolling Event Feed */}
      <div
        ref={logContainerRef}
        className="relative z-10 max-h-[380px] min-h-[240px] overflow-y-auto p-4 space-y-1.5 text-xs scrollbar-thin scrollbar-thumb-white/10"
      >
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center font-mono">
            {/* Animated Target Scanner Icon */}
            <div className="relative mb-3 flex items-center justify-center">
              <motion.div
                animate={{ scale: [1, 2], opacity: [0.5, 0] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeOut' }}
                className="absolute h-20 w-20 rounded-full border border-cyan-500/30 bg-cyan-500/5"
              />
              <div className="h-16 w-16 rounded-full border border-white/10 border-dashed flex items-center justify-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                  className="h-9 w-9 rounded-full border border-cyan-400/40 bg-slate-900/60 backdrop-blur-md flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.3)] text-cyan-400"
                >
                  <Activity className="h-4 w-4 animate-pulse" />
                </motion.div>
              </div>
            </div>

            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-950/50 border border-cyan-500/30 text-cyan-400 text-[10px] uppercase font-bold tracking-widest mb-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              TELEMETRY STANDBY // AWAITING STREAM
            </div>

            <p className="text-[11px] text-slate-400 max-w-xs leading-relaxed">
              Target acquisition active. Stream will log real-time SSE packets upon dispatch.
            </p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {events.map((event) => {
              const isExpanded = expandedLogId === event.id;
              const hasPayload = Boolean(event.rawPayload);

              const levelBadge =
                event.level === 'ERROR'
                  ? 'text-rose-400 bg-rose-950/60 border-rose-500/30'
                  : event.level === 'WARN'
                  ? 'text-amber-400 bg-amber-950/60 border-amber-500/30'
                  : 'text-cyan-400 bg-cyan-950/60 border-cyan-500/30';

              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: -10, backgroundColor: 'rgba(6,182,212,0.15)' }}
                  animate={{ opacity: 1, x: 0, backgroundColor: 'transparent' }}
                  transition={{ duration: 0.3 }}
                  className="group rounded-md border border-white/10 bg-black/30 p-2.5 hover:border-cyan-500/30 hover:bg-white/5 transition-colors"
                >
                  <div
                    onClick={() => hasPayload && setExpandedLogId(isExpanded ? null : event.id)}
                    className={`flex items-start justify-between gap-3 ${hasPayload ? 'cursor-pointer select-none' : ''}`}
                  >
                    <div className="flex flex-wrap items-baseline gap-2.5">
                      {/* Timestamp */}
                      <span className="font-mono text-[10px] text-zinc-500">
                        {event.timestamp.includes('T')
                          ? event.timestamp.split('T')[1]?.slice(0, 12)
                          : event.timestamp}
                      </span>

                      {/* Log Level Badge */}
                      <span
                        className={`rounded border px-1.5 py-0.2 text-[9px] font-bold tracking-widest ${levelBadge}`}
                      >
                        {event.level}
                      </span>

                      {/* Stage Name */}
                      <span className="text-[10px] text-zinc-400 font-semibold tracking-wide">
                        [{event.stage}]
                      </span>

                      {/* Event Log Message */}
                      <span className="text-zinc-200 text-xs">
                        {event.message}
                      </span>
                    </div>

                    {/* Expandable Indicator */}
                    {hasPayload && (
                      <div className="flex items-center gap-1 text-[10px] text-zinc-500 group-hover:text-cyan-400 transition-colors">
                        <span>DATA</span>
                        {isExpanded ? (
                          <ChevronDown className="h-3 w-3" />
                        ) : (
                          <ChevronRight className="h-3 w-3" />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Collapsible JSON Payload Chunk */}
                  <AnimatePresence>
                    {isExpanded && hasPayload && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="mt-2.5 overflow-hidden"
                      >
                        <div className="relative rounded-lg border border-white/10 bg-black/60 p-3 text-[11px] text-zinc-300">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyPayload(event.id, event.rawPayload);
                            }}
                            className="absolute right-2 top-2 rounded border border-white/10 bg-white/10 p-1 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                            title="Copy payload"
                          >
                            {copiedLogId === event.id ? (
                              <Check className="h-3.5 w-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                          <pre className="max-h-48 overflow-auto font-mono text-[10px] leading-relaxed scrollbar-thin scrollbar-thumb-white/10">
                            {JSON.stringify(event.rawPayload, null, 2)}
                          </pre>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Terminal Footer Console Bar */}
      <div className="relative z-10 flex items-center justify-between border-t border-white/10 bg-white/5 px-4 py-2 text-[10px] text-zinc-500">
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
          <span className="text-zinc-400">QLOO RUNNER SSE PIPELINE READY</span>
        </span>
        <span className="text-zinc-500">BUFFER: {events.length} EVENTS</span>
      </div>
    </div>
  );
};

export default LiveRunMonitor;
