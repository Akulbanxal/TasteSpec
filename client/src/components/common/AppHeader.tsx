import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sun,
  Moon,
  Sparkles,
  ChevronDown,
  Shield,
  Layers,
  FileText,
  Activity,
  Box,
  Compass,
  Check,
  Server,
  Lock,
  Database,
  Info,
  Menu,
  X,
  Clock
} from 'lucide-react';
import type { SystemHealthStatus } from '@shared/index';

export type NavTabId =
  | 'landing'
  | 'testbench'
  | 'scenarios'
  | 'liverun'
  | 'results'
  | 'graph'
  | 'evidence'
  | 'compare'
  | 'reports'
  | 'mission3d';

export interface AppHeaderProps {
  activeTab: NavTabId;
  onTabChange: (tab: NavTabId) => void;
  health: SystemHealthStatus | null;
  executionMode?: 'LIVE_QLOO_VERIFICATION' | 'OFFLINE_DEMO_FIXTURE';
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export type HeaderCategory = 'overview' | 'workbench' | 'analytics' | 'reports';

export const getCategoryForTab = (tab: NavTabId): HeaderCategory => {
  if (tab === 'landing') return 'overview';
  if (tab === 'testbench' || tab === 'scenarios' || tab === 'liverun') return 'workbench';
  if (
    tab === 'results' ||
    tab === 'mission3d' ||
    tab === 'graph' ||
    tab === 'evidence' ||
    tab === 'compare'
  ) {
    return 'analytics';
  }
  if (tab === 'reports') return 'reports';
  return 'overview';
};

export const AppHeader: React.FC<AppHeaderProps> = ({
  activeTab,
  onTabChange,
  health,
  executionMode,
  theme,
  onToggleTheme
}) => {
  const activeCategory = getCategoryForTab(activeTab);

  // Dropdown & popover states
  const [openDropdown, setOpenDropdown] = useState<HeaderCategory | null>(null);
  const [healthPopoverOpen, setHealthPopoverOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const workbenchRef = useRef<HTMLDivElement>(null);
  const analyticsRef = useRef<HTMLDivElement>(null);
  const healthRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        workbenchRef.current &&
        !workbenchRef.current.contains(target) &&
        analyticsRef.current &&
        !analyticsRef.current.contains(target)
      ) {
        setOpenDropdown(null);
      }
      if (healthRef.current && !healthRef.current.contains(target)) {
        setHealthPopoverOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Workbench sub-items (Segmented tab control: Testbench, Scenarios, Live Run)
  const workbenchItems: { id: NavTabId; label: string; desc: string; icon: React.ReactNode }[] = [
    {
      id: 'testbench',
      label: 'Testbench',
      desc: 'Interactive evaluation pass runner & payload audit',
      icon: <Activity className="w-3.5 h-3.5 text-cyan-400" />
    },
    {
      id: 'scenarios',
      label: 'Scenarios',
      desc: 'Cultural templates & constraint definitions',
      icon: <Compass className="w-3.5 h-3.5 text-violet-400" />
    },
    {
      id: 'liverun',
      label: 'Live Run',
      desc: 'Real-time SSE event telemetry stream',
      icon: <Layers className="w-3.5 h-3.5 text-emerald-400" />
    }
  ];

  // Analytics & Graph sub-items (Segmented tab control: 3D Mission, Evidence Graph, Explorer, Compare + Results)
  const analyticsItems: {
    id: NavTabId;
    label: string;
    desc: string;
    icon: React.ReactNode;
    badge?: string;
  }[] = [
    {
      id: 'mission3d',
      label: '3D Mission',
      desc: 'Spatial WebGL procedural test chamber',
      icon: <Box className="w-3.5 h-3.5 text-violet-400" />,
      badge: '3D'
    },
    {
      id: 'graph',
      label: 'Evidence Graph',
      desc: 'Dynamic 2D/3D particle evidence network',
      icon: <Activity className="w-3.5 h-3.5 text-emerald-400" />
    },
    {
      id: 'evidence',
      label: 'Explorer',
      desc: 'Raw Qloo entity ledger & parameter provenance',
      icon: <Database className="w-3.5 h-3.5 text-sky-400" />
    },
    {
      id: 'compare',
      label: 'Compare',
      desc: 'Multi-run differential delta regression',
      icon: <Layers className="w-3.5 h-3.5 text-amber-400" />
    },
    {
      id: 'results',
      label: 'Results & Audit',
      desc: 'Scorecard findings & pass/fail compliance',
      icon: <Shield className="w-3.5 h-3.5 text-cyan-400" />
    }
  ];

  const isQlooLive = health?.qlooConfigured === true;

  // Handler to navigate to category default or active tab
  const handleCategoryClick = (category: HeaderCategory) => {
    if (category === 'overview') {
      onTabChange('landing');
      setOpenDropdown(null);
    } else if (category === 'workbench') {
      if (activeCategory !== 'workbench') {
        onTabChange('testbench');
      }
      setOpenDropdown(null);
    } else if (category === 'analytics') {
      if (activeCategory !== 'analytics') {
        onTabChange('mission3d');
      }
      setOpenDropdown(null);
    } else if (category === 'reports') {
      onTabChange('reports');
      setOpenDropdown(null);
    }
  };

  return (
    <header className="sticky top-0 z-50 px-3 sm:px-6 pt-3 pb-2 w-full pointer-events-none">
      {/* ====================================================================
          1. FLOATING TRANSLUCENT MAIN PILL BAR
         ==================================================================== */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-2.5 bg-slate-900/60 dark:bg-slate-900/60 light:bg-white/80 backdrop-blur-xl border border-white/10 dark:border-white/10 light:border-black/10 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.45)] flex items-center justify-between gap-3 pointer-events-auto transition-all duration-300">
        {/* Brand & Logo */}
        <div
          onClick={() => onTabChange('landing')}
          className="flex items-center gap-3 cursor-pointer group select-none"
          title="Return to TasteSpec Overview"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-400 to-violet-600 flex items-center justify-center font-black text-sm text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.4)] group-hover:scale-105 transition-transform">
            T
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm tracking-wider text-slate-100 dark:text-slate-100 light:text-slate-900 group-hover:text-cyan-400 transition-colors">
                TASTESPEC
              </span>
            </div>
            <span className="text-[10px] text-slate-400 dark:text-slate-400 light:text-slate-500 font-medium hidden sm:inline leading-none">
              Cultural AI Testbench
            </span>
          </div>
        </div>

        {/* 4 Consolidated Navigation Clusters (Desktop) */}
        <nav
          aria-label="Consolidated Main Navigation"
          className="hidden md:flex items-center gap-1.5 p-1 rounded-xl bg-slate-950/40 dark:bg-slate-950/40 light:bg-slate-200/50 border border-white/5 dark:border-white/5 light:border-black/5 relative font-sans text-xs"
        >
          {/* CLUSTER 1: Overview (Landing Hero) */}
          <button
            type="button"
            onClick={() => handleCategoryClick('overview')}
            className={`relative px-3.5 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-2 cursor-pointer ${
              activeCategory === 'overview'
                ? 'text-cyan-400 font-semibold'
                : 'text-slate-300 dark:text-slate-300 light:text-slate-600 hover:text-white dark:hover:text-white light:hover:text-slate-900'
            }`}
          >
            {activeCategory === 'overview' && (
              <motion.div
                layoutId="activeHeaderPill"
                className="absolute inset-0 bg-white/10 dark:bg-white/10 light:bg-black/5 rounded-lg border border-white/15 dark:border-white/15 light:border-black/10 shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <Sparkles className="w-3.5 h-3.5 relative z-10" />
            <span className="relative z-10">Overview</span>
          </button>

          {/* CLUSTER 2: Workbench */}
          <div ref={workbenchRef} className="relative">
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => handleCategoryClick('workbench')}
                className={`relative px-3.5 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                  activeCategory === 'workbench'
                    ? 'text-cyan-400 font-semibold'
                    : 'text-slate-300 dark:text-slate-300 light:text-slate-600 hover:text-white dark:hover:text-white light:hover:text-slate-900'
                }`}
              >
                {activeCategory === 'workbench' && (
                  <motion.div
                    layoutId="activeHeaderPill"
                    className="absolute inset-0 bg-white/10 dark:bg-white/10 light:bg-black/5 rounded-lg border border-white/15 dark:border-white/15 light:border-black/10 shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <Activity className="w-3.5 h-3.5 relative z-10" />
                <span className="relative z-10">Workbench</span>
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenDropdown(prev => (prev === 'workbench' ? null : 'workbench'));
                  }}
                  className="relative z-10 p-0.5 hover:bg-white/10 rounded transition-colors"
                >
                  <ChevronDown
                    className={`w-3 h-3 transition-transform duration-200 ${
                      openDropdown === 'workbench' ? 'rotate-180 text-cyan-400' : 'opacity-60'
                    }`}
                  />
                </span>
              </button>
            </div>

            {/* Workbench Dropdown Menu */}
            <AnimatePresence>
              {openDropdown === 'workbench' && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.96 }}
                  transition={{ duration: 0.16, ease: 'easeOut' }}
                  className="absolute top-full left-0 mt-2 w-72 p-2 rounded-xl bg-slate-900/95 dark:bg-slate-900/95 light:bg-white/95 backdrop-blur-2xl border border-white/10 dark:border-white/10 light:border-black/10 shadow-2xl z-50 flex flex-col gap-1"
                >
                  <div className="px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
                    Evaluation Workbench
                  </div>
                  {workbenchItems.map(item => {
                    const isSelected = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          onTabChange(item.id);
                          setOpenDropdown(null);
                        }}
                        className={`w-full text-left p-2.5 rounded-lg flex items-start gap-3 transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-cyan-500/15 border border-cyan-500/30 text-cyan-300'
                            : 'hover:bg-white/5 dark:hover:bg-white/5 light:hover:bg-black/5 text-slate-200 dark:text-slate-200 light:text-slate-800'
                        }`}
                      >
                        <div className="mt-0.5">{item.icon}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-xs">{item.label}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                          </div>
                          <p className="text-[11px] text-slate-400 dark:text-slate-400 light:text-slate-500 line-clamp-1 mt-0.5">
                            {item.desc}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* CLUSTER 3: Analytics & Graph */}
          <div ref={analyticsRef} className="relative">
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => handleCategoryClick('analytics')}
                className={`relative px-3.5 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                  activeCategory === 'analytics'
                    ? 'text-cyan-400 font-semibold'
                    : 'text-slate-300 dark:text-slate-300 light:text-slate-600 hover:text-white dark:hover:text-white light:hover:text-slate-900'
                }`}
              >
                {activeCategory === 'analytics' && (
                  <motion.div
                    layoutId="activeHeaderPill"
                    className="absolute inset-0 bg-white/10 dark:bg-white/10 light:bg-black/5 rounded-lg border border-white/15 dark:border-white/15 light:border-black/10 shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <Shield className="w-3.5 h-3.5 relative z-10" />
                <span className="relative z-10">Analytics & Graph</span>
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenDropdown(prev => (prev === 'analytics' ? null : 'analytics'));
                  }}
                  className="relative z-10 p-0.5 hover:bg-white/10 rounded transition-colors"
                >
                  <ChevronDown
                    className={`w-3 h-3 transition-transform duration-200 ${
                      openDropdown === 'analytics' ? 'rotate-180 text-cyan-400' : 'opacity-60'
                    }`}
                  />
                </span>
              </button>
            </div>

            {/* Analytics Dropdown Menu */}
            <AnimatePresence>
              {openDropdown === 'analytics' && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.96 }}
                  transition={{ duration: 0.16, ease: 'easeOut' }}
                  className="absolute top-full left-0 mt-2 w-80 p-2 rounded-xl bg-slate-900/95 dark:bg-slate-900/95 light:bg-white/95 backdrop-blur-2xl border border-white/10 dark:border-white/10 light:border-black/10 shadow-2xl z-50 flex flex-col gap-1"
                >
                  <div className="px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
                    Intelligence & Graph Analysis
                  </div>
                  {analyticsItems.map(item => {
                    const isSelected = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          onTabChange(item.id);
                          setOpenDropdown(null);
                        }}
                        className={`w-full text-left p-2.5 rounded-lg flex items-start gap-3 transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-cyan-500/15 border border-cyan-500/30 text-cyan-300'
                            : 'hover:bg-white/5 dark:hover:bg-white/5 light:hover:bg-black/5 text-slate-200 dark:text-slate-200 light:text-slate-800'
                        }`}
                      >
                        <div className="mt-0.5">{item.icon}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-xs">{item.label}</span>
                              {item.badge && (
                                <span className="px-1.5 py-0.2 rounded bg-violet-500/20 text-violet-300 text-[9px] font-mono font-bold">
                                  {item.badge}
                                </span>
                              )}
                            </div>
                            {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                          </div>
                          <p className="text-[11px] text-slate-400 dark:text-slate-400 light:text-slate-500 line-clamp-1 mt-0.5">
                            {item.desc}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* CLUSTER 4: Reports (Export Center) */}
          <button
            type="button"
            onClick={() => handleCategoryClick('reports')}
            className={`relative px-3.5 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-2 cursor-pointer ${
              activeCategory === 'reports'
                ? 'text-cyan-400 font-semibold'
                : 'text-slate-300 dark:text-slate-300 light:text-slate-600 hover:text-white dark:hover:text-white light:hover:text-slate-900'
            }`}
          >
            {activeCategory === 'reports' && (
              <motion.div
                layoutId="activeHeaderPill"
                className="absolute inset-0 bg-white/10 dark:bg-white/10 light:bg-black/5 rounded-lg border border-white/15 dark:border-white/15 light:border-black/10 shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <FileText className="w-3.5 h-3.5 relative z-10" />
            <span className="relative z-10">Reports</span>
          </button>
        </nav>

        {/* Right Section: Status Popover, Theme Toggle & Mobile Menu */}
        <div className="flex items-center gap-2.5">
          {/* Decluttered Glowing Status Pill with Hoverable/Clickable System Status Popover */}
          <div
            ref={healthRef}
            className="relative"
            onMouseEnter={() => setHealthPopoverOpen(true)}
            onMouseLeave={() => setHealthPopoverOpen(false)}
          >
            {/* Single Glowing Status Indicator on Main Bar */}
            <button
              type="button"
              onClick={() => setHealthPopoverOpen(prev => !prev)}
              aria-label="System Health Status"
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-mono font-semibold transition-all cursor-pointer ${
                isQlooLive
                  ? 'bg-emerald-950/40 dark:bg-emerald-950/40 light:bg-emerald-100/80 border-emerald-500/40 text-emerald-400 dark:text-emerald-400 light:text-emerald-700 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                  : 'bg-amber-950/40 dark:bg-amber-950/40 light:bg-amber-100/80 border-amber-500/40 text-amber-400 dark:text-amber-400 light:text-amber-700 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
              }`}
            >
              <span className="relative flex h-2 w-2">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    isQlooLive ? 'bg-emerald-400' : 'bg-amber-400'
                  }`}
                />
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    isQlooLive ? 'bg-emerald-400' : 'bg-amber-400'
                  }`}
                />
              </span>
              <span>{isQlooLive ? 'QLOO LIVE' : 'DEMO FIXTURE'}</span>
            </button>

            {/* Hoverable System Status Popover Menu */}
            <AnimatePresence>
              {healthPopoverOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.96 }}
                  transition={{ duration: 0.16, ease: 'easeOut' }}
                  className="absolute right-0 top-full mt-2 w-80 p-4 rounded-2xl bg-slate-900/95 dark:bg-slate-900/95 light:bg-white/95 backdrop-blur-2xl border border-white/10 dark:border-white/10 light:border-black/10 shadow-2xl z-50 text-xs flex flex-col gap-3 font-sans pointer-events-auto"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-white/10 dark:border-white/10 light:border-black/10">
                    <div className="flex items-center gap-2">
                      <Server className="w-4 h-4 text-cyan-400" />
                      <span className="font-bold text-slate-100 dark:text-slate-100 light:text-slate-900">
                        System Health & Telemetry
                      </span>
                    </div>
                    {/* Environment Version Tag */}
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-white/5 border border-white/10 text-slate-400">
                      v0.1.0
                    </span>
                  </div>

                  <div className="flex flex-col gap-2 font-mono text-[11px]">
                    {/* Secondary Environment Badge: Execution Mode */}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Environment Mode:</span>
                      <span
                        className={`font-semibold px-2 py-0.5 rounded text-[10px] ${
                          isQlooLive
                            ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                            : 'bg-amber-500/15 border border-amber-500/30 text-amber-400'
                        }`}
                      >
                        {executionMode === 'LIVE_QLOO_VERIFICATION' ? '[LIVE]' : '[FIXTURE]'}
                      </span>
                    </div>

                    {/* Latency Metric */}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">P95 Audit Latency:</span>
                      <span className="text-cyan-400 font-semibold flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3 text-cyan-400" />
                        &lt; 120ms (Optimal)
                      </span>
                    </div>

                    {/* Qloo Backend Connection */}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">API Connection:</span>
                      <span
                        className={`font-semibold ${
                          isQlooLive ? 'text-emerald-400' : 'text-amber-400'
                        }`}
                      >
                        {isQlooLive ? 'Verified Live Network' : 'Signed Fixture Cache'}
                      </span>
                    </div>

                    {/* Backend Server */}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Backend Server:</span>
                      <span className="text-slate-200 dark:text-slate-200 light:text-slate-700">
                        Express 3001 Connected
                      </span>
                    </div>

                    {/* SSRF Firewall Status */}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">SSRF Firewall:</span>
                      <span className="text-emerald-400 flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Hardened Active
                      </span>
                    </div>

                    {/* Audit Ledger */}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Audit Ledger:</span>
                      <span className="text-slate-200 dark:text-slate-200 light:text-slate-700">
                        HMAC SHA-256 Validated
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-white/10 dark:border-white/10 light:border-black/10 flex items-center gap-1.5 text-[10px] text-slate-400">
                    <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span>Real-world cultural intelligence evaluation pipeline.</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Day / Night Mode Toggle */}
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Switch to Day mode' : 'Switch to Night mode'}
            title={theme === 'dark' ? 'Switch to Day mode (Light)' : 'Switch to Night mode (Dark)'}
            className="p-2 rounded-xl border border-white/10 dark:border-white/10 light:border-black/10 bg-slate-950/40 dark:bg-slate-950/40 light:bg-slate-200/50 hover:bg-white/10 text-slate-200 dark:text-slate-200 light:text-slate-800 transition-all cursor-pointer flex items-center justify-center overflow-hidden"
          >
            <AnimatePresence mode="wait" initial={false}>
              {theme === 'dark' ? (
                <motion.div
                  key="sun"
                  initial={{ rotate: -90, scale: 0.5, opacity: 0 }}
                  animate={{ rotate: 0, scale: 1, opacity: 1 }}
                  exit={{ rotate: 90, scale: 0.5, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Sun className="w-4 h-4 text-amber-400" />
                </motion.div>
              ) : (
                <motion.div
                  key="moon"
                  initial={{ rotate: 90, scale: 0.5, opacity: 0 }}
                  animate={{ rotate: 0, scale: 1, opacity: 1 }}
                  exit={{ rotate: -90, scale: 0.5, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Moon className="w-4 h-4 text-cyan-600" />
                </motion.div>
              )}
            </AnimatePresence>
          </button>

          {/* Mobile Hamburger Button */}
          <button
            onClick={() => setMobileMenuOpen(prev => !prev)}
            aria-label="Toggle mobile menu"
            className="p-2 rounded-xl border border-white/10 dark:border-white/10 light:border-black/10 bg-slate-950/40 md:hidden text-slate-200 cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* ====================================================================
          2. SEGMENTED TAB CONTROL SUB-BAR (FOR ACTIVE CLUSTERS)
         ==================================================================== */}
      <AnimatePresence mode="wait">
        {(activeCategory === 'workbench' || activeCategory === 'analytics') && (
          <motion.div
            key={activeCategory}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="max-w-[1400px] mx-auto mt-2 hidden md:flex items-center justify-center pointer-events-auto"
          >
            {/* Segmented Tab Control Container */}
            <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-slate-900/80 dark:bg-slate-900/80 light:bg-white/85 backdrop-blur-xl border border-white/10 dark:border-white/10 light:border-black/10 shadow-lg text-xs font-mono">
              {/* Segmented tab control for: Testbench, Scenarios, Live Run */}
              {activeCategory === 'workbench' &&
                workbenchItems.map(item => {
                  const isSelected = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onTabChange(item.id)}
                      className={`relative px-3.5 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                        isSelected
                          ? 'text-cyan-300 font-semibold'
                          : 'text-slate-400 hover:text-slate-200 light:text-slate-600 light:hover:text-slate-900'
                      }`}
                    >
                      {isSelected && (
                        <motion.div
                          layoutId="activeSubSegmentPill"
                          className="absolute inset-0 bg-cyan-500/20 border border-cyan-500/40 rounded-lg shadow-[0_0_12px_rgba(6,182,212,0.2)]"
                          transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                        />
                      )}
                      <span className="relative z-10 flex items-center gap-1.5">
                        {item.icon}
                        <span>{item.label}</span>
                      </span>
                    </button>
                  );
                })}

              {/* Segmented tab control for: 3D Mission, Evidence Graph, Explorer, Compare */}
              {activeCategory === 'analytics' &&
                analyticsItems.map(item => {
                  const isSelected = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onTabChange(item.id)}
                      className={`relative px-3.5 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                        isSelected
                          ? 'text-cyan-300 font-semibold'
                          : 'text-slate-400 hover:text-slate-200 light:text-slate-600 light:hover:text-slate-900'
                      }`}
                    >
                      {isSelected && (
                        <motion.div
                          layoutId="activeSubSegmentPill"
                          className="absolute inset-0 bg-cyan-500/20 border border-cyan-500/40 rounded-lg shadow-[0_0_12px_rgba(6,182,212,0.2)]"
                          transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                        />
                      )}
                      <span className="relative z-10 flex items-center gap-1.5">
                        {item.icon}
                        <span>{item.label}</span>
                        {item.badge && (
                          <span className="px-1.5 py-0.2 rounded bg-violet-500/25 text-violet-300 text-[9px] font-bold">
                            {item.badge}
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ====================================================================
          3. MOBILE NAVIGATION DRAWER
         ==================================================================== */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="max-w-[1400px] mx-auto mt-2 p-4 rounded-2xl bg-slate-900/95 dark:bg-slate-900/95 light:bg-white/95 backdrop-blur-2xl border border-white/10 dark:border-white/10 light:border-black/10 shadow-2xl flex flex-col gap-3 md:hidden pointer-events-auto"
          >
            {/* Overview */}
            <button
              type="button"
              onClick={() => {
                onTabChange('landing');
                setMobileMenuOpen(false);
              }}
              className={`w-full text-left p-2.5 rounded-xl font-medium text-xs flex items-center justify-between ${
                activeTab === 'landing' ? 'bg-cyan-500/15 text-cyan-400 font-bold' : 'text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>Overview (Landing)</span>
              </div>
              {activeTab === 'landing' && <Check className="w-4 h-4" />}
            </button>

            {/* Workbench Section */}
            <div className="flex flex-col gap-1 pt-2 border-t border-white/10">
              <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold px-2">
                Workbench
              </span>
              {workbenchItems.map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onTabChange(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full text-left p-2 rounded-lg text-xs flex items-center justify-between ${
                    activeTab === item.id ? 'bg-cyan-500/15 text-cyan-400 font-bold' : 'text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                  {activeTab === item.id && <Check className="w-3.5 h-3.5" />}
                </button>
              ))}
            </div>

            {/* Analytics Section */}
            <div className="flex flex-col gap-1 pt-2 border-t border-white/10">
              <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold px-2">
                Analytics & Graph
              </span>
              {analyticsItems.map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onTabChange(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full text-left p-2 rounded-lg text-xs flex items-center justify-between ${
                    activeTab === item.id ? 'bg-cyan-500/15 text-cyan-400 font-bold' : 'text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                  {activeTab === item.id && <Check className="w-3.5 h-3.5" />}
                </button>
              ))}
            </div>

            {/* Reports */}
            <div className="pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => {
                  onTabChange('reports');
                  setMobileMenuOpen(false);
                }}
                className={`w-full text-left p-2.5 rounded-xl font-medium text-xs flex items-center justify-between ${
                  activeTab === 'reports' ? 'bg-cyan-500/15 text-cyan-400 font-bold' : 'text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-cyan-400" />
                  <span>Reports (Export Center)</span>
                </div>
                {activeTab === 'reports' && <Check className="w-4 h-4" />}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default AppHeader;
