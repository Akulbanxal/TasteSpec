import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Play, Terminal, ArrowRight } from 'lucide-react';

export interface TargetScannerStep {
  step: string;
  title: string;
  desc: string;
}

export interface TargetScannerProps {
  badgeLabel?: string;
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  steps?: TargetScannerStep[];
  className?: string;
}

export const TargetScanner: React.FC<TargetScannerProps> = ({
  badgeLabel = 'TESTBENCH STANDBY // TARGET ACQUISITION READY',
  title = 'Autonomous Cultural Target Scanner',
  description = 'Audit radar is actively scanning for agent recommendation assertions. Dispatch recommendations to benchmark candidate sets and numeric grounding against empirical Qloo intelligence.',
  actionLabel = 'Re-Run Demo Pass',
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  steps = [
    { step: '01 // SELECT', title: 'Persona Profile', desc: 'Choose cultural seeds, target domain & affinity threshold.' },
    { step: '02 // FEED', title: 'Agent Payload', desc: 'Paste recommendation output or attach live HTTPS adapter.' },
    { step: '03 // AUDIT', title: 'Evidence Matrix', desc: 'Cross-examine empirical affinity scores & forbidden constraints.' }
  ],
  className = ''
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className={`cyber-glass-panel relative overflow-hidden border border-white/10 dark:border-white/10 light:border-black/5 p-8 md:p-12 shadow-2xl flex flex-col items-center justify-center text-center min-h-[520px] rounded-2xl ${className}`}
    >
      {/* Background radial ambient lights */}
      <div className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full bg-cyan-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 -bottom-16 h-48 w-48 rounded-full bg-violet-500/10 blur-3xl" />

      {/* CENTRAL TARGET SCANNER GRAPHIC */}
      <div className="relative mb-8 flex items-center justify-center w-52 h-52">
        {/* Outermost expanding pulse wave 1 */}
        <motion.div
          animate={{ scale: [1, 2.3], opacity: [0.55, 0] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: 'easeOut' }}
          className="absolute inset-0 m-auto h-48 w-48 rounded-full border border-cyan-400/40 bg-cyan-500/5 pointer-events-none"
        />

        {/* Expanding pulse wave 2 (staggered) */}
        <motion.div
          animate={{ scale: [1, 1.9], opacity: [0.45, 0] }}
          transition={{ duration: 3.2, repeat: Infinity, delay: 1.1, ease: 'easeOut' }}
          className="absolute inset-0 m-auto h-44 w-44 rounded-full border border-violet-400/30 bg-violet-500/5 pointer-events-none"
        />

        {/* Central Pulsing Energy Ring */}
        <motion.div
          animate={{
            scale: [0.96, 1.06, 0.96],
            boxShadow: [
              '0 0 15px rgba(6, 182, 212, 0.4)',
              '0 0 35px rgba(6, 182, 212, 0.8), inset 0 0 15px rgba(6, 182, 212, 0.4)',
              '0 0 15px rgba(6, 182, 212, 0.4)'
            ]
          }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute inset-0 m-auto h-36 w-36 rounded-full border-2 border-cyan-400/60 bg-cyan-500/10 pointer-events-none z-10"
        />

        {/* Outer dashed radar ring with slow counter-clockwise rotation */}
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-0 m-auto h-48 w-48 rounded-full border border-white/15 border-dashed"
        >
          {/* Degree angle indicator dots */}
          <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.9)]" />
          <span className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.9)]" />
          <span className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.9)]" />
          <span className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.9)]" />
        </motion.div>

        {/* Sweeping Radar Scanner Beam */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-0 m-auto h-44 w-44 rounded-full pointer-events-none overflow-hidden"
        >
          <div
            className="w-full h-full rounded-full"
            style={{
              background: 'conic-gradient(from 0deg at 50% 50%, rgba(6, 182, 212, 0.35) 0deg, rgba(6, 182, 212, 0.08) 45deg, transparent 90deg, transparent 360deg)'
            }}
          />
        </motion.div>

        {/* Intermediate Reticle Ring */}
        <div className="absolute inset-0 m-auto h-32 w-32 rounded-full border border-cyan-500/30 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center">
          {/* Target Reticle Crosshairs */}
          <div className="absolute w-full h-[1px] bg-cyan-500/20" />
          <div className="absolute h-full w-[1px] bg-cyan-500/20" />

          {/* Inner Rotating Wireframe Core Icon */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
            className="relative h-20 w-20 flex items-center justify-center"
          >
            {/* Wireframe Rotating Hexagon / Octagon SVG */}
            <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full text-cyan-400/60 drop-shadow-[0_0_12px_rgba(6,182,212,0.6)]">
              {/* Outer Wireframe Hexagon */}
              <polygon
                points="50 5, 90 27.5, 90 72.5, 50 95, 10 72.5, 10 27.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray="4 3"
              />
              {/* Inner Wireframe Diamond */}
              <polygon
                points="50 18, 82 50, 50 82, 18 50"
                fill="rgba(6, 182, 212, 0.08)"
                stroke="rgba(139, 92, 246, 0.8)"
                strokeWidth="1.5"
              />
            </svg>

            {/* Central Pulsing Core Sensor */}
            <div className="relative z-10 h-10 w-10 rounded-xl border border-cyan-400 bg-slate-900/90 shadow-[0_0_20px_rgba(6,182,212,0.5)] flex items-center justify-center">
              <motion.div
                animate={{ scale: [0.85, 1.15, 0.85] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Sparkles className="w-5 h-5 text-cyan-300" />
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Target Acquisition Status Badge */}
      <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-400 font-mono text-[10px] uppercase font-bold tracking-widest mb-3.5">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500 shadow-[0_0_6px_rgba(6,182,212,0.9)]" />
        </span>
        <span>{badgeLabel}</span>
      </div>

      {/* Title */}
      <h3 className="font-mono text-base md:text-lg font-bold tracking-widest text-zinc-100 uppercase max-w-xl">
        {title}
      </h3>

      {/* Description */}
      <p className="mt-2 max-w-lg font-mono text-xs text-slate-400 leading-relaxed mb-6">
        {description}
      </p>

      {/* Primary 1-Click Action CTA Button */}
      <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
        {onAction && (
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={onAction}
            className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 via-teal-500 to-blue-600 text-slate-950 font-mono text-xs font-bold uppercase tracking-wider shadow-[0_0_25px_rgba(6,182,212,0.4)] hover:shadow-[0_0_35px_rgba(6,182,212,0.6)] transition-all flex items-center gap-2 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current text-slate-950" />
            <span>{actionLabel}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </motion.button>
        )}

        {secondaryActionLabel && onSecondaryAction && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onSecondaryAction}
            className="px-5 py-3.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 font-mono text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer"
          >
            <Terminal className="w-4 h-4 text-cyan-400" />
            <span>{secondaryActionLabel}</span>
          </motion.button>
        )}
      </div>

      {/* 3-Checkpoint Features Strip */}
      {steps.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full max-w-2xl text-left font-mono text-[11px]">
          {steps.map((s, idx) => (
            <div key={idx} className="rounded-xl border border-white/10 bg-white/5 p-3.5 space-y-1 hover:border-cyan-500/30 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-cyan-400 font-bold">{s.step}</span>
                <span className="text-[10px] text-slate-500">{s.title}</span>
              </div>
              <div className="text-slate-400 text-[11px] leading-relaxed">{s.desc}</div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default TargetScanner;
