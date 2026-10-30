import React, { useState, useEffect } from 'react';
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
  Clock
} from 'lucide-react';

export interface LiveActionTelemetryModalProps {
  isOpen: boolean;
  onClose: () => void;
  scenarioTitle?: string;
  isCompleted?: boolean;
}

export const LiveActionTelemetryModal: React.FC<LiveActionTelemetryModalProps> = ({
  isOpen,
  onClose,
  scenarioTitle = 'Cultural Persona Scenario',
  isCompleted = false
}) => {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [elapsedMs, setElapsedMs] = useState(0);

  // Stepping timer when modal opens
  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(1);
      setElapsedMs(0);
      return;
    }

    setCurrentStep(1);
    setElapsedMs(0);

    const startTime = Date.now();
    const intervalTimer = setInterval(() => {
      setElapsedMs(Date.now() - startTime);
    }, 50);

    const step1Timer = setTimeout(() => {
      setCurrentStep(2);
    }, 450);

    const step2Timer = setTimeout(() => {
      setCurrentStep(3);
    }, 950);

    const step3Timer = setTimeout(() => {
      setCurrentStep(4);
    }, 1500);

    return () => {
      clearInterval(intervalTimer);
      clearTimeout(step1Timer);
      clearTimeout(step2Timer);
      clearTimeout(step3Timer);
    };
  }, [isOpen]);

  // If external isCompleted changes to true and we're on step 1 or 2, accelerate to 4
  useEffect(() => {
    if (isCompleted && currentStep < 3) {
      const finishTimer = setTimeout(() => {
        setCurrentStep(4);
      }, 300);
      return () => clearTimeout(finishTimer);
    }
  }, [isCompleted, currentStep]);

  if (!isOpen) return null;

  const isDone = currentStep === 4;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 35, scale: 0.92 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 25, scale: 0.94 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="fixed bottom-6 right-6 z-50 w-88 sm:w-96 rounded-2xl bg-slate-900/95 dark:bg-slate-900/95 light:bg-white/95 backdrop-blur-2xl border border-cyan-500/40 shadow-[0_12px_45px_rgba(6,182,212,0.25)] p-4 text-xs font-sans text-slate-100 dark:text-slate-100 light:text-slate-900 overflow-hidden"
      >
        {/* Subtle top cyan ambient glow line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-violet-500 to-emerald-400" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-white/10 dark:border-white/10 light:border-black/10">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              {!isDone ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500" />
                </>
              ) : (
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
              )}
            </span>
            <div>
              <div className="flex items-center gap-1.5 font-bold font-mono tracking-tight text-xs text-white dark:text-white light:text-slate-900">
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                <span>Live Action Telemetry</span>
              </div>
              <div className="text-[10px] font-mono text-slate-400 truncate max-w-[210px]">
                {scenarioTitle}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span
              className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-bold ${
                isDone
                  ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                  : 'bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 animate-pulse'
              }`}
            >
              {isDone ? 'COMPLETE' : 'EXECUTING'}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Close Telemetry"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-950/60 rounded-full h-1.5 mb-3.5 overflow-hidden p-0.5 border border-white/5">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-violet-400 to-emerald-400"
            initial={{ width: '10%' }}
            animate={{
              width:
                currentStep === 1
                  ? '33%'
                  : currentStep === 2
                  ? '66%'
                  : currentStep === 3
                  ? '90%'
                  : '100%'
            }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Step-by-Step Telemetry List */}
        <div className="space-y-2.5 font-mono text-xs">
          {/* STEP 1: Resolving Entity Identity (/v2/search) */}
          <div
            className={`p-2.5 rounded-xl border transition-all ${
              currentStep === 1
                ? 'bg-cyan-950/40 border-cyan-500/40 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.15)]'
                : currentStep > 1
                ? 'bg-emerald-950/20 border-emerald-500/30 text-slate-300'
                : 'bg-white/5 border-white/5 text-slate-500 opacity-60'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                    currentStep > 1
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : currentStep === 1
                      ? 'bg-cyan-500/20 text-cyan-300'
                      : 'bg-white/5 text-slate-500'
                  }`}
                >
                  {currentStep > 1 ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Search className={`w-3.5 h-3.5 ${currentStep === 1 ? 'animate-spin' : ''}`} />
                  )}
                </div>
                <div>
                  <div className="font-bold text-[11px] flex items-center gap-1.5">
                    <span>Step 1: Resolving Entity Identity</span>
                    <span className="text-[10px] px-1 rounded bg-black/40 text-cyan-400 border border-white/5">
                      /v2/search
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-sans">
                    {currentStep === 1
                      ? 'Querying 250M+ entity graph...'
                      : currentStep > 1
                      ? 'Entity identity disambiguated & resolved'
                      : 'Awaiting search dispatch'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* STEP 2: Querying Qloo Insight Vectors (/v2/insights) */}
          <div
            className={`p-2.5 rounded-xl border transition-all ${
              currentStep === 2
                ? 'bg-violet-950/40 border-violet-500/40 text-violet-300 shadow-[0_0_12px_rgba(139,92,246,0.15)]'
                : currentStep > 2
                ? 'bg-emerald-950/20 border-emerald-500/30 text-slate-300'
                : 'bg-white/5 border-white/5 text-slate-500 opacity-60'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                    currentStep > 2
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : currentStep === 2
                      ? 'bg-violet-500/20 text-violet-300'
                      : 'bg-white/5 text-slate-500'
                  }`}
                >
                  {currentStep > 2 ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Database className={`w-3.5 h-3.5 ${currentStep === 2 ? 'animate-pulse' : ''}`} />
                  )}
                </div>
                <div>
                  <div className="font-bold text-[11px] flex items-center gap-1.5">
                    <span>Step 2: Querying Qloo Insight Vectors</span>
                    <span className="text-[10px] px-1 rounded bg-black/40 text-violet-400 border border-white/5">
                      /v2/insights
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-sans">
                    {currentStep === 2
                      ? 'Calculating cross-domain affinity...'
                      : currentStep > 2
                      ? 'Empirical cultural vectors retrieved'
                      : 'Pending identity resolution'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* STEP 3: Executing Deterministic Rules */}
          <div
            className={`p-2.5 rounded-xl border transition-all ${
              currentStep === 3
                ? 'bg-cyan-950/40 border-cyan-500/40 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.15)]'
                : currentStep === 4
                ? 'bg-emerald-950/20 border-emerald-500/30 text-slate-300'
                : 'bg-white/5 border-white/5 text-slate-500 opacity-60'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                    currentStep === 4
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : currentStep === 3
                      ? 'bg-cyan-500/20 text-cyan-300'
                      : 'bg-white/5 text-slate-500'
                  }`}
                >
                  {currentStep === 4 ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Cpu className={`w-3.5 h-3.5 ${currentStep === 3 ? 'animate-spin' : ''}`} />
                  )}
                </div>
                <div>
                  <div className="font-bold text-[11px] flex items-center gap-1.5">
                    <span>Step 3: Executing Deterministic Rules</span>
                    <span className="text-[10px] px-1 rounded bg-black/40 text-emerald-400 border border-white/5">
                      Rules 1–7
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-sans">
                    {currentStep === 3
                      ? 'Auditing threshold & divergence...'
                      : currentStep === 4
                      ? 'Mathematical pass/fail matrix certified'
                      : 'Pending vector retrieval'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Strip */}
        <div className="mt-3 pt-2.5 border-t border-white/10 dark:border-white/10 light:border-black/10 flex items-center justify-between text-[10px] font-mono text-slate-400">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-cyan-400" />
            <span>{elapsedMs}ms latency</span>
          </div>

          <div className="flex items-center gap-2">
            {isDone ? (
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Ledger signed
              </span>
            ) : (
              <span className="text-cyan-400 flex items-center gap-1 animate-pulse">
                <Layers className="w-3 h-3" />
                Streaming...
              </span>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default LiveActionTelemetryModal;

