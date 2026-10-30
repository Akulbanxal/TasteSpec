// src/components/testbench/VibecodeTestbenchView.tsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  Sliders, 
  Activity,
  ArrowRight,
  Search
} from 'lucide-react';

export interface VibecodeTestbenchViewProps {
  onRunEvaluationPass?: () => void;
  isExternalRunning?: boolean;
}

export const VibecodeTestbenchView: React.FC<VibecodeTestbenchViewProps> = ({
  onRunEvaluationPass,
  isExternalRunning
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [hasEvaluated, setHasEvaluated] = useState(false);
  const [activePreset, setActivePreset] = useState<'valid' | 'forbidden' | 'unindexed'>('unindexed');
  const [searchQuery, setSearchQuery] = useState('');

  const running = isExternalRunning !== undefined ? isExternalRunning : isRunning;

  const payloads = {
    valid: `{
  "recommendations": [
    {
      "rawName": "The Four Horsemen",
      "domain": "place",
      "agentClaimedReasoning": "Intimate dining with natural wine curation.",
      "agentClaimedAffinity": 0.88
    },
    {
      "rawName": "Ten Bells",
      "domain": "place",
      "agentClaimedReasoning": "Cozy natural wine bar in Lower Manhattan.",
      "agentClaimedAffinity": 0.74
    }
  ]
}`,
    forbidden: `{
  "recommendations": [
    {
      "rawName": "Dave & Busters",
      "domain": "place",
      "agentClaimedReasoning": "Sports venue with drinks and arcade games.",
      "agentClaimedAffinity": 0.32
    }
  ]
}`,
    unindexed: `{
  "recommendations": [
    {
      "rawName": "Dave & Busters",
      "domain": "place",
      "agentClaimedReasoning": "Sports venue with drinks",
      "agentClaimedAffinity": 0.88
    }
  ]
}`
  };

  const handleRunEvaluation = () => {
    if (onRunEvaluationPass) {
      onRunEvaluationPass();
      return;
    }
    setIsRunning(true);
    setTimeout(() => {
      setIsRunning(false);
      setHasEvaluated(true);
    }, 1200);
  };

  // Mock finding items based on preset
  const getFindings = () => {
    if (!hasEvaluated) {
      if (activePreset === 'unindexed') {
        return [
          {
            id: 'f-1',
            name: 'Dave & Busters',
            status: 'UNVERIFIABLE',
            classification: 'UNRESOLVED_ENTITY',
            rule: 'Rule 1: Entity identity resolution returned 0 results in Qloo knowledge graph.',
            statusColor: 'purple'
          }
        ];
      }
      return [];
    }

    if (activePreset === 'valid') {
      return [
        {
          id: 'f-1',
          name: 'The Four Horsemen',
          status: 'PASS',
          classification: 'NUMERIC_GROUNDING',
          rule: 'Rule 3: Verified Score 0.88 ≥ Threshold 0.65',
          statusColor: 'emerald'
        },
        {
          id: 'f-2',
          name: 'Ten Bells',
          status: 'PASS',
          classification: 'NUMERIC_GROUNDING',
          rule: 'Rule 3: Verified Score 0.74 ≥ Threshold 0.65',
          statusColor: 'emerald'
        }
      ];
    }

    if (activePreset === 'forbidden') {
      return [
        {
          id: 'f-1',
          name: 'Dave & Busters',
          status: 'FAIL',
          classification: 'FORBIDDEN_TAG',
          rule: "Rule 5: Forbidden attribute tag matched ['sports_bar']",
          statusColor: 'rose'
        }
      ];
    }

    return [
      {
        id: 'f-1',
        name: 'Dave & Busters',
        status: 'UNVERIFIABLE',
        classification: 'UNRESOLVED_ENTITY',
        rule: 'Rule 1: Entity identity resolution returned 0 results in Qloo knowledge graph.',
        statusColor: 'purple'
      }
    ];
  };

  const allFindings = getFindings();
  const filteredFindings = allFindings.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.classification.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.rule.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const passCount = hasEvaluated && activePreset === 'valid' ? 2 : 0;
  const warnCount = 0;
  const failCount = hasEvaluated && activePreset === 'forbidden' ? 1 : 0;
  const unverifiableCount = (!hasEvaluated && activePreset === 'unindexed') || (hasEvaluated && activePreset === 'unindexed') ? 1 : 0;

  return (
    <div className="vibecode-bg-canvas min-h-screen text-slate-100 font-sans relative overflow-x-hidden selection:bg-cyan-500/30 p-2 sm:p-4 rounded-2xl">
      {/* Scanline Screen Effect Layer */}
      <div className="fixed inset-0 pointer-events-none scanline-layer z-50 opacity-30" />

      {/* Background Animated Mesh Light Orbs */}
      <div className="fixed top-[-10%] left-[-5%] w-[450px] h-[450px] bg-cyan-500/15 rounded-full blur-[140px] pointer-events-none animate-glow-drift" />
      <div className="fixed top-[30%] right-[-10%] w-[550px] h-[550px] bg-purple-600/15 rounded-full blur-[160px] pointer-events-none animate-glow-drift [animation-delay:-5s]" />
      <div className="fixed bottom-[-10%] left-[20%] w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[150px] pointer-events-none animate-glow-drift [animation-delay:-10s]" />

      {/* Grid Perspective Background Overlay */}
      <div className="fixed inset-0 cyber-grid-overlay pointer-events-none opacity-60" />

      {/* Workspace Banner */}
      <motion.div 
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="cyber-panel-v2 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden mb-6 z-10"
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-mono text-sm font-bold shadow-[0_0_15px_rgba(6,182,212,0.2)] shrink-0">
            //
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] font-mono text-cyan-400 tracking-wider uppercase">ACTIVE WORKSPACE BENCHMARK</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">urn:entity:place</span>
            </div>
            <h1 className="text-sm md:text-base font-bold text-white tracking-tight font-mono">
              Brooklyn Neo-Psychedelia to Natural Wine // East Williamsburg Audiophile
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-mono text-slate-400">SEEDS:</span>
          <span className="px-2.5 py-1 rounded-lg bg-cyan-950/60 border border-cyan-800/80 text-cyan-300 text-xs font-mono shadow-[0_0_10px_rgba(6,182,212,0.15)] flex items-center gap-1.5">
            Stereolab <span className="text-[10px] text-slate-400">(MUSIC)</span>
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-cyan-950/60 border border-cyan-800/80 text-cyan-300 text-xs font-mono shadow-[0_0_10px_rgba(6,182,212,0.15)] flex items-center gap-1.5">
            Crumb <span className="text-[10px] text-slate-400">(MUSIC)</span>
          </span>
        </div>
      </motion.div>

      {/* Main Grid Workspace */}
      <div className="grid grid-cols-12 gap-6 relative z-10">
        
        {/* Left Control Panel (4 Cols) */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          
          {/* Scenario Profile Card */}
          <div className="cyber-panel-v2 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <span className="text-xs font-mono text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                // Scenario Profile
              </span>
              <span className="text-xs font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-800/80 px-2 py-0.5 rounded">
                θ ≥ 0.65
              </span>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div>
                <div className="text-[10px] text-slate-500 uppercase mb-1">Target Persona Template</div>
                <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 text-slate-200">
                  Brooklyn Neo-Psychedelia to Natural Wine
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-[10px] text-slate-500 uppercase mb-1">Target Domain</div>
                  <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800/80 text-cyan-400 font-bold">
                    PLACE
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 uppercase mb-1">Forbidden Tags</div>
                  <div className="p-2 rounded-lg bg-rose-950/40 border border-rose-900/60 text-rose-400 font-bold">
                    sports_bar
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Agent Payload Input Card */}
          <div className="cyber-panel-v2 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">// Agent Payload Feed</span>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => { setActivePreset('valid'); setHasEvaluated(false); }}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono transition-all cursor-pointer ${
                    activePreset === 'valid'
                      ? 'bg-emerald-900/70 border border-emerald-400 text-emerald-300 ring-1 ring-cyan-400'
                      : 'bg-emerald-950/50 border border-emerald-800 text-emerald-400 hover:bg-emerald-900/40'
                  }`}
                >
                  Valid
                </button>
                <button 
                  onClick={() => { setActivePreset('forbidden'); setHasEvaluated(false); }}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono transition-all cursor-pointer ${
                    activePreset === 'forbidden'
                      ? 'bg-rose-900/70 border border-rose-400 text-rose-300 ring-1 ring-cyan-400'
                      : 'bg-rose-950/50 border border-rose-800 text-rose-400 hover:bg-rose-900/40'
                  }`}
                >
                  Forbidden
                </button>
                <button 
                  onClick={() => { setActivePreset('unindexed'); setHasEvaluated(false); }}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono transition-all cursor-pointer ${
                    activePreset === 'unindexed'
                      ? 'bg-purple-900/70 border border-purple-400 text-purple-300 ring-1 ring-cyan-400'
                      : 'bg-purple-950/50 border border-purple-800 text-purple-400 hover:bg-purple-900/40'
                  }`}
                >
                  Unindexed
                </button>
              </div>
            </div>

            <div className="relative p-3 rounded-xl bg-[#030508] border border-slate-800/80 font-mono text-xs leading-relaxed text-cyan-200/90 shadow-inner overflow-x-auto">
              <pre className="text-[11px] whitespace-pre">
                {payloads[activePreset]}
              </pre>
            </div>

            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleRunEvaluation}
              disabled={running}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold font-mono text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {running ? (
                <>
                  <Activity className="w-4 h-4 animate-spin text-slate-950" />
                  <span>EVALUATING PIPELINE...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current text-slate-950" />
                  <span>Execute Evaluation Pass</span>
                </>
              )}
            </motion.button>
          </div>

        </div>

        {/* Right Results Canvas (8 Cols) */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          
          {/* Scorecard Metric Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            
            <motion.div 
              whileHover={{ y: -2 }}
              className="cyber-panel-v2 p-4 border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.08)]"
            >
              <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
                <span>PASS CHECKS</span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800 text-[10px]">VERIFIED</span>
              </div>
              <div className="text-3xl font-mono font-bold text-emerald-400">{passCount}</div>
            </motion.div>

            <motion.div 
              whileHover={{ y: -2 }}
              className="cyber-panel-v2 p-4 border-amber-500/20 shadow-[0_0_20px_rgba(245,158,11,0.08)]"
            >
              <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
                <span>WARNINGS</span>
                <span className="px-1.5 py-0.5 rounded bg-amber-950/60 text-amber-400 border border-amber-800 text-[10px]">WARNING</span>
              </div>
              <div className="text-3xl font-mono font-bold text-amber-400">{warnCount}</div>
            </motion.div>

            <motion.div 
              whileHover={{ y: -2 }}
              className="cyber-panel-v2 p-4 border-rose-500/20 shadow-[0_0_20px_rgba(239,68,68,0.08)]"
            >
              <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
                <span>FAIL CHECKS</span>
                <span className="px-1.5 py-0.5 rounded bg-rose-950/60 text-rose-400 border border-rose-800 text-[10px]">FAILED</span>
              </div>
              <div className="text-3xl font-mono font-bold text-rose-400">{failCount}</div>
            </motion.div>

            <motion.div 
              whileHover={{ y: -2 }}
              className="cyber-panel-v2 p-4 border-purple-500/30 shadow-[0_0_20px_rgba(168,85,247,0.15)]"
            >
              <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
                <span>UNVERIFIABLE</span>
                <span className="px-1.5 py-0.5 rounded bg-purple-950/60 text-purple-400 border border-purple-800 text-[10px]">UNVERIFIED</span>
              </div>
              <div className="text-3xl font-mono font-bold text-purple-400">{unverifiableCount}</div>
            </motion.div>

          </div>

          {/* Findings Table Container */}
          <div className="cyber-panel-v2 p-5 space-y-4 min-h-[360px]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3 font-mono text-xs">
              <div className="flex items-center gap-3">
                <span className="text-white font-bold">ALL FINDINGS ({allFindings.length})</span>
                <span className="text-slate-500">|</span>
                <span className={
                  activePreset === 'valid' && hasEvaluated
                    ? 'text-emerald-400'
                    : activePreset === 'forbidden' && hasEvaluated
                    ? 'text-rose-400'
                    : 'text-purple-400'
                }>
                  {activePreset === 'valid' && hasEvaluated
                    ? 'PASS: 2 (100%)'
                    : activePreset === 'forbidden' && hasEvaluated
                    ? 'FAIL: 1'
                    : 'UNVERIFIABLE: 1'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <Search className="w-3.5 h-3.5 text-slate-500" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter findings..." 
                  className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-200 outline-none focus:border-cyan-500 transition-colors w-44"
                />
              </div>
            </div>

            {/* Findings List */}
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {filteredFindings.map((finding) => (
                  <motion.div 
                    key={finding.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className={`p-4 rounded-xl bg-slate-950/80 border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                      finding.statusColor === 'emerald'
                        ? 'border-emerald-500/30 hover:border-emerald-500/60 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                        : finding.statusColor === 'rose'
                        ? 'border-rose-500/30 hover:border-rose-500/60 shadow-[0_0_15px_rgba(239,68,68,0.1)]'
                        : 'border-purple-500/30 hover:border-purple-500/60 shadow-[0_0_15px_rgba(168,85,247,0.1)]'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-white text-sm">{finding.name}</span>
                        <span className={`px-2 py-0.5 rounded font-mono text-[10px] border ${
                          finding.statusColor === 'emerald'
                            ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                            : finding.statusColor === 'rose'
                            ? 'bg-rose-950 text-rose-400 border-rose-800'
                            : 'bg-purple-950 text-purple-400 border-purple-800'
                        }`}>
                          {finding.status}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-400 font-mono text-[10px]">
                          {finding.classification}
                        </span>
                      </div>
                      <p className="text-xs font-mono text-slate-400">
                        {finding.rule}
                      </p>
                    </div>

                    <button className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-all flex items-center gap-1.5 shrink-0 self-start sm:self-auto cursor-pointer ${
                      finding.statusColor === 'emerald'
                        ? 'bg-emerald-950/50 border-emerald-700/60 text-emerald-300 hover:bg-emerald-900/60'
                        : finding.statusColor === 'rose'
                        ? 'bg-rose-950/50 border-rose-700/60 text-rose-300 hover:bg-rose-900/60'
                        : 'bg-purple-950/50 border-purple-700/60 text-purple-300 hover:bg-purple-900/60'
                    }`}>
                      <span>Inspect Evidence</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>

              {filteredFindings.length === 0 && (
                <div className="text-center py-12 text-slate-500 font-mono text-xs">
                  No findings matching "{searchQuery}"
                </div>
              )}
            </div>

          </div>

        </div>

      </div>

    </div>
  );
};
