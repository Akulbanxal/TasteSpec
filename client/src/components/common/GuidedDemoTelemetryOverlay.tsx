import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  CheckCircle2,
  Database,
  Search,
  Cpu,
  X,
  Sparkles,
  Layers,
  Clock,
  ArrowRight,
  ShieldCheck,
  Check
} from 'lucide-react';

export interface GuidedDemoTelemetryOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  elapsedMs: number; // 0 to 15000
  isCompleted: boolean;
  onInspectFindings?: () => void;
}

export const GuidedDemoTelemetryOverlay: React.FC<GuidedDemoTelemetryOverlayProps> = ({
  isOpen,
  onClose,
  elapsedMs,
  isCompleted,
  onInspectFindings
}) => {
  if (!isOpen) return null;

  const seconds = Math.min(15, elapsedMs / 1000);
  const remainingSeconds = Math.max(0, 15 - seconds);
  const progressPct = Math.min(100, (elapsedMs / 15000) * 100);

  // Compute stage states:
  // [00s - 05s]: Stage 1
  // [05s - 10s]: Stage 2
  // [10s - 15s]: Stage 3
  const isStage1Active = seconds < 5 && !isCompleted;
  const isStage1Done = seconds >= 5 || isCompleted;

  const isStage2Active = seconds >= 5 && seconds < 10 && !isCompleted;
  const isStage2Done = seconds >= 10 || isCompleted;

  const isStage3Active = seconds >= 10 && seconds < 15 && !isCompleted;
  const isStage3Done = isCompleted || seconds >= 15;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 35, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 25, scale: 0.94 }}
        transition={{ duration: 0.28, ease: 'easeOut' }}
        className="fixed bottom-6 right-6 z-50 w-[360px] sm:w-[420px] rounded-2xl bg-slate-900/95 dark:bg-slate-900/95 light:bg-white/95 backdrop-blur-2xl border border-cyan-500/40 shadow-[0_16px_50px_rgba(6,182,212,0.28)] p-4 sm:p-5 text-xs font-sans text-slate-100 dark:text-slate-100 light:text-slate-900 overflow-hidden"
      >
        {/* Dynamic top gradient accent line */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-cyan-400 via-teal-300 to-violet-500" />

        {/* Header Section */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10 dark:border-white/10 light:border-black/10">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-3 w-3">
              {!isCompleted ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500" />
                </>
              ) : (
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400" />
              )}
            </span>
            <div>
              <div className="flex items-center gap-1.5 font-bold font-mono tracking-tight text-xs sm:text-sm text-white dark:text-white light:text-slate-900">
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                <span>15-Second Guided Interactive Demo</span>
              </div>
              <div className="text-[10px] font-mono text-cyan-400/90 dark:text-cyan-400/90 light:text-cyan-700">
                {!isCompleted ? 'Empirical Grounding Pipeline Active' : 'Pipeline Execution Completed'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isCompleted ? (
              <span className="px-2.5 py-1 rounded-full font-mono text-[11px] font-bold bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 animate-pulse flex items-center gap-1">
                <Clock className="w-3 h-3 text-cyan-400" />
                <span>{remainingSeconds.toFixed(1)}s</span>
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full font-mono text-[11px] font-extrabold bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center gap-1 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>100% PASS RATE</span>
              </span>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Close Demo Overlay"
              aria-label="Close Demo Overlay"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 15-Second Countdown Progress Bar */}
        <div className="w-full bg-slate-950/60 dark:bg-slate-950/60 light:bg-slate-200/80 rounded-full h-2 mb-3.5 overflow-hidden p-0.5 border border-white/5 dark:border-white/5 light:border-black/5">
          <motion.div
            className={`h-full rounded-full transition-all duration-75 ${
              isCompleted
                ? 'bg-gradient-to-r from-emerald-400 to-cyan-400'
                : 'bg-gradient-to-r from-cyan-400 via-teal-300 to-violet-400'
            }`}
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Guided Demo 3 Stages List */}
        <div className="space-y-2.5 font-mono text-xs">
          {/* [00s - 05s] STAGE 1: RESOLVING ENTITIES */}
          <div
            className={`p-2.5 rounded-xl border transition-all ${
              isStage1Active
                ? 'bg-cyan-950/50 border-cyan-500/50 text-cyan-200 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                : isStage1Done
                ? 'bg-emerald-950/20 dark:bg-emerald-950/20 light:bg-emerald-50/70 border-emerald-500/30 text-slate-300 dark:text-slate-300 light:text-slate-700'
                : 'bg-white/5 border-white/5 text-slate-500 opacity-60'
            }`}
          >
            <div className="flex items-start gap-2.5">
              <div
                className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                  isStage1Done
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : isStage1Active
                    ? 'bg-cyan-500/20 text-cyan-300'
                    : 'bg-white/5 text-slate-500'
                }`}
              >
                {isStage1Done ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Search className={`w-3.5 h-3.5 ${isStage1Active ? 'animate-spin' : ''}`} />
                )}
              </div>
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[11px] text-white dark:text-white light:text-slate-900">
                    [00s - 05s] STAGE 1: RESOLVING ENTITIES
                  </span>
                  {isStage1Done && (
                    <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-0.5">
                      <Check className="w-3 h-3" /> VERIFIED
                    </span>
                  )}
                </div>
                <p className="text-[10.5px] leading-relaxed text-slate-300 dark:text-slate-300 light:text-slate-600 font-sans">
                  Sending targets ('The Four Horsemen', 'Ten Bells') to Qloo /v2/search API...
                </p>
              </div>
            </div>
          </div>

          {/* [05s - 10s] STAGE 2: FETCHING VECTOR EVIDENCE */}
          <div
            className={`p-2.5 rounded-xl border transition-all ${
              isStage2Active
                ? 'bg-violet-950/50 border-violet-500/50 text-violet-200 shadow-[0_0_15px_rgba(139,92,246,0.2)]'
                : isStage2Done
                ? 'bg-emerald-950/20 dark:bg-emerald-950/20 light:bg-emerald-50/70 border-emerald-500/30 text-slate-300 dark:text-slate-300 light:text-slate-700'
                : 'bg-white/5 border-white/5 text-slate-500 opacity-60'
            }`}
          >
            <div className="flex items-start gap-2.5">
              <div
                className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                  isStage2Done
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : isStage2Active
                    ? 'bg-violet-500/20 text-violet-300'
                    : 'bg-white/5 text-slate-500'
                }`}
              >
                {isStage2Done ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Database className={`w-3.5 h-3.5 ${isStage2Active ? 'animate-pulse' : ''}`} />
                )}
              </div>
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[11px] text-white dark:text-white light:text-slate-900">
                    [05s - 10s] STAGE 2: FETCHING VECTOR EVIDENCE
                  </span>
                  {isStage2Done && (
                    <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-0.5">
                      <Check className="w-3 h-3" /> RETRIEVED
                    </span>
                  )}
                </div>
                <p className="text-[10.5px] leading-relaxed text-slate-300 dark:text-slate-300 light:text-slate-600 font-sans">
                  Retrieving empirical affinity vectors from Qloo /v2/insights for persona seeds ('Stereolab', 'Crumb')...
                </p>
              </div>
            </div>
          </div>

          {/* [10s - 15s] STAGE 3: EXECUTING DETERMINISTIC RULES */}
          <div
            className={`p-2.5 rounded-xl border transition-all ${
              isStage3Active
                ? 'bg-cyan-950/50 border-cyan-500/50 text-cyan-200 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                : isStage3Done
                ? 'bg-emerald-950/20 dark:bg-emerald-950/20 light:bg-emerald-50/70 border-emerald-500/30 text-slate-300 dark:text-slate-300 light:text-slate-700'
                : 'bg-white/5 border-white/5 text-slate-500 opacity-60'
            }`}
          >
            <div className="flex items-start gap-2.5">
              <div
                className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                  isStage3Done
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : isStage3Active
                    ? 'bg-cyan-500/20 text-cyan-300'
                    : 'bg-white/5 text-slate-500'
                }`}
              >
                {isStage3Done ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Cpu className={`w-3.5 h-3.5 ${isStage3Active ? 'animate-spin' : ''}`} />
                )}
              </div>
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[11px] text-white dark:text-white light:text-slate-900">
                    [10s - 15s] STAGE 3: EXECUTING DETERMINISTIC RULES
                  </span>
                  {isStage3Done && (
                    <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-0.5">
                      <Check className="w-3 h-3" /> AUDITED
                    </span>
                  )}
                </div>
                <p className="text-[10.5px] leading-relaxed text-slate-300 dark:text-slate-300 light:text-slate-600 font-sans">
                  Auditing agent affinity claims against scenario threshold (θ ≥ 0.65)...
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Completion Banner & Action Section */}
        {isCompleted ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3.5 pt-3 border-t border-emerald-500/30 space-y-2.5 bg-emerald-950/30 dark:bg-emerald-950/30 light:bg-emerald-50/90 -mx-4 -mb-4 p-4 rounded-b-2xl"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold font-mono text-emerald-400 text-xs">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>[15s] COMPLETED: 100% Pass Rate</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                INSPECTION UNLOCKED
              </span>
            </div>

            <p className="text-[11px] text-slate-200 dark:text-slate-200 light:text-slate-700 font-sans">
              All agent recommendations mathematically substantiated against Qloo graph evidence. The first audit finding row is auto-expanded below.
            </p>

            {onInspectFindings && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onInspectFindings();
                }}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-3.5 rounded-xl font-mono text-xs font-bold text-slate-950 bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 hover:from-emerald-300 hover:to-cyan-300 shadow-[0_0_20px_rgba(16,185,129,0.35)] hover:shadow-[0_0_30px_rgba(16,185,129,0.55)] active:scale-95 transition-all cursor-pointer"
              >
                <span>Inspect Mathematical Proof Below</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </motion.div>
        ) : (
          <div className="mt-3 pt-2.5 border-t border-white/10 dark:border-white/10 light:border-black/10 flex items-center justify-between text-[10px] font-mono text-slate-400">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-cyan-400" />
              <span>Elapsed: {seconds.toFixed(1)}s / 15.0s</span>
            </div>
            <div className="flex items-center gap-1 text-cyan-400 animate-pulse">
              <Layers className="w-3 h-3" />
              <span>Real-Time Evaluation Engine</span>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default GuidedDemoTelemetryOverlay;
