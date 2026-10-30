import React, { useEffect, useRef, useState, type ReactNode } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Zap } from 'lucide-react';

export type MetricStatus = 'PASS' | 'WARNING' | 'FAIL' | 'UNVERIFIABLE';

export interface MetricCardProps {
  title: string;
  value: number;
  status: MetricStatus;
  subtitle?: string;
  icon: ReactNode;
  index?: number;
  passRate?: string | number;
  rate?: string | number;
  latencyMs?: number;
}

const statusConfig: Record<
  MetricStatus,
  {
    text: string;
    shadow: string;
    border: string;
    badgeBg: string;
    glowRgb: string;
    statusLabel: string;
  }
> = {
  PASS: {
    text: 'text-emerald-400 dark:text-emerald-400 light:text-emerald-800 font-bold',
    shadow: 'shadow-emerald-500/10',
    border: 'border-emerald-500/30 light:border-emerald-300',
    badgeBg: 'bg-emerald-500/10 light:bg-emerald-100',
    glowRgb: '16, 185, 129',
    statusLabel: 'VERIFIED'
  },
  WARNING: {
    text: 'text-amber-400 dark:text-amber-400 light:text-amber-800 font-bold',
    shadow: 'shadow-amber-500/10',
    border: 'border-amber-500/30 light:border-amber-300',
    badgeBg: 'bg-amber-500/10 light:bg-amber-100',
    glowRgb: '245, 158, 11',
    statusLabel: 'WARNING'
  },
  FAIL: {
    text: 'text-rose-400 dark:text-rose-400 light:text-rose-800 font-bold',
    shadow: 'shadow-rose-500/10',
    border: 'border-rose-500/30 light:border-rose-300',
    badgeBg: 'bg-rose-500/10 light:bg-rose-100',
    glowRgb: '244, 63, 94',
    statusLabel: 'FAILED'
  },
  UNVERIFIABLE: {
    text: 'text-violet-400 dark:text-violet-400 light:text-purple-800 font-bold',
    shadow: 'shadow-violet-500/10',
    border: 'border-violet-500/30 light:border-purple-300',
    badgeBg: 'bg-violet-500/10 light:bg-purple-100',
    glowRgb: '139, 92, 246',
    statusLabel: 'UNVERIFIED'
  }
};

/**
 * Animated numerical counter smoothly interpolating numerical values with spring physics
 */
function AnimatedCounter({ value }: { value: number }) {
  const springValue = useSpring(0, {
    stiffness: 75,
    damping: 18,
    mass: 0.8
  });

  const displayValue = useTransform(springValue, (latest) =>
    Math.round(latest).toLocaleString()
  );

  useEffect(() => {
    springValue.set(value);
  }, [value, springValue]);

  return <motion.span>{displayValue}</motion.span>;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  status,
  subtitle,
  icon,
  index = 0,
  passRate,
  rate,
  latencyMs
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Dynamic light overlay coordinates following cursor
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);
  };

  const config = statusConfig[status];

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      initial={{ opacity: 0, scale: 0.88, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 22,
        delay: index * 0.08
      }}
      className={`cyber-glass-panel rounded-2xl group relative overflow-hidden p-5 transition-all duration-300 ${config.shadow} ${
        isHovered ? `shadow-xl ${config.border}` : ''
      }`}
    >
      {/* Dynamic radial gradient light overlay following cursor */}
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: useTransform(
            [mouseX, mouseY],
            ([x, y]) =>
              `radial-gradient(240px circle at ${x}px ${y}px, rgba(${config.glowRgb}, 0.15), transparent 80%)`
          )
        }}
      />

      {/* Cyberpunk corner accent line */}
      <div
        className="absolute top-0 right-0 h-10 w-10 overflow-hidden pointer-events-none"
      >
        <div
          className={`absolute transform rotate-45 bg-gradient-to-r from-transparent to-white/10 -top-6 -right-6 h-12 w-12 border-b ${config.border}`}
        />
      </div>

      <div className="relative z-10 flex flex-col justify-between h-full space-y-3">
        {/* Top row: Monospace small uppercase title with icon, glowing neon dot, and status tag */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span
              className={`p-1.5 rounded-lg border border-white/10 bg-white/5 ${config.text}`}
            >
              {icon}
            </span>
            <span className="font-mono text-xs font-semibold tracking-wider text-slate-400 uppercase">
              {title}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Glowing neon indicator dot */}
            <span className="relative flex h-2 w-2">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  status === 'PASS'
                    ? 'bg-emerald-400'
                    : status === 'WARNING'
                    ? 'bg-amber-400'
                    : status === 'FAIL'
                    ? 'bg-rose-400'
                    : 'bg-violet-400'
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  status === 'PASS'
                    ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.9)]'
                    : status === 'WARNING'
                    ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.9)]'
                    : status === 'FAIL'
                    ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.9)]'
                    : 'bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.9)]'
                }`}
              />
            </span>

            <span
              className={`font-mono text-[10px] tracking-widest px-2 py-0.5 rounded-full border ${config.border} ${config.badgeBg} ${config.text} uppercase font-semibold`}
            >
              {config.statusLabel}
            </span>
          </div>
        </div>

        {/* Middle: Large monospace numerical counter + Pass Rate / Share pill */}
        <div className="py-1 flex items-baseline justify-between">
          <div
            className={`font-mono text-4xl font-extrabold tracking-tight ${config.text} drop-shadow-sm`}
          >
            <AnimatedCounter value={value} />
          </div>

          {(passRate !== undefined || rate !== undefined) && (
            <span className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded-md border ${config.border} ${config.badgeBg} ${config.text}`}>
              {passRate !== undefined ? `${passRate} Pass Rate` : `${rate}`}
            </span>
          )}
        </div>

        {/* Bottom: Small muted status subtitle or latency metric */}
        <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs">
          <span className="text-slate-400 font-medium truncate">
            {subtitle || `Evaluation check: ${status}`}
          </span>
          {latencyMs !== undefined ? (
            <span className="inline-flex items-center gap-1 font-mono text-[10px] text-cyan-400 font-semibold bg-cyan-950/40 border border-cyan-500/20 px-1.5 py-0.5 rounded">
              <Zap className="w-2.5 h-2.5 text-cyan-400" />
              <span>{latencyMs}ms</span>
            </span>
          ) : (
            <span className="font-mono text-[11px] text-slate-500 group-hover:text-slate-300 transition-colors">
              EMPIRICAL
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default MetricCard;
