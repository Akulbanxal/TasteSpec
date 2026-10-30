import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  FileCode,
  Link,
  Play,
  Zap,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Terminal
} from 'lucide-react';

export type InputMode = 'paste_output' | 'configured_adapter';

export interface AgentOutputEditorProps {
  inputMode: InputMode;
  setInputMode: (mode: InputMode) => void;
  agentOutputText: string;
  setAgentOutputText: (text: string) => void;
  adapterUrl: string;
  setAdapterUrl: (url: string) => void;
  onLoadSample: (type: 'valid' | 'forbidden' | 'unindexed') => void;
  onRunEvaluation: () => void;
  loading: boolean;
  error?: string | null;
}

export const AgentOutputEditor: React.FC<AgentOutputEditorProps> = ({
  inputMode,
  setInputMode,
  agentOutputText,
  setAgentOutputText,
  adapterUrl,
  setAdapterUrl,
  onLoadSample,
  onRunEvaluation,
  loading,
  error
}) => {
  // Generate line numbers based on text content
  const lineNumbers = useMemo(() => {
    const count = Math.max(agentOutputText.split('\n').length, 1);
    return Array.from({ length: count }, (_, i) => i + 1);
  }, [agentOutputText]);

  return (
    <div className="cyber-glass-panel rounded-2xl relative overflow-hidden border border-white/10 dark:border-white/10 light:border-black/5 p-5 flex flex-col space-y-3.5">
      {/* Cyberpunk corner accent highlight */}
      <div className="pointer-events-none absolute -right-12 -top-12 h-28 w-28 rounded-full bg-cyan-500/10 blur-xl" />

      {/* HEADER BAR: Segmented Tab Switcher with Framer Motion layoutId */}
      <div className="flex items-center justify-between pb-1 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-cyan-400" />
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-200">
            Agent Output Feed
          </span>
        </div>

        {/* Segmented Tab Slider */}
        <div className="relative flex rounded-xl border border-white/10 dark:border-white/10 light:border-black/5 bg-slate-900/40 dark:bg-slate-900/40 light:bg-slate-200/50 p-0.5 text-xs font-mono">
          <button
            type="button"
            onClick={() => setInputMode('paste_output')}
            className={`relative z-10 flex items-center gap-1.5 px-3 py-1 rounded-md transition-colors ${
              inputMode === 'paste_output' ? 'text-cyan-300 font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {inputMode === 'paste_output' && (
              <motion.div
                layoutId="editorTabSlider"
                className="absolute inset-0 rounded-md bg-white/10 border border-white/20 shadow-inner"
                transition={{ type: 'spring', bounce: 0.15, duration: 0.35 }}
              />
            )}
            <FileCode className="relative z-10 w-3.5 h-3.5" />
            <span className="relative z-10">Paste Output</span>
          </button>

          <button
            type="button"
            onClick={() => setInputMode('configured_adapter')}
            className={`relative z-10 flex items-center gap-1.5 px-3 py-1 rounded-md transition-colors ${
              inputMode === 'configured_adapter' ? 'text-cyan-300 font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {inputMode === 'configured_adapter' && (
              <motion.div
                layoutId="editorTabSlider"
                className="absolute inset-0 rounded-md bg-white/10 border border-white/20 shadow-inner"
                transition={{ type: 'spring', bounce: 0.15, duration: 0.35 }}
              />
            )}
            <Link className="relative z-10 w-3.5 h-3.5" />
            <span className="relative z-10">Remote Adapter</span>
          </button>
        </div>
      </div>

      {/* QUICK-FILL PRESET BUTTONS (Glowing Micro-Badges) */}
      {inputMode === 'paste_output' && (
        <div className="flex items-center justify-between text-xs">
          <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500 flex items-center gap-1">
            Presets:
          </span>
          <div className="flex items-center gap-1.5 font-mono text-[10px]">
            <motion.button
              type="button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onLoadSample('valid')}
              className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-950/40 px-2.5 py-0.5 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)] hover:border-emerald-500/60 hover:bg-emerald-900/50 transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>Valid</span>
            </motion.button>

            <motion.button
              type="button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onLoadSample('forbidden')}
              className="inline-flex items-center gap-1 rounded-full border border-rose-500/30 bg-rose-950/40 px-2.5 py-0.5 text-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.2)] hover:border-rose-500/60 hover:bg-rose-900/50 transition-all cursor-pointer"
            >
              <AlertTriangle className="w-3 h-3 text-rose-400" />
              <span>Forbidden</span>
            </motion.button>

            <motion.button
              type="button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onLoadSample('unindexed')}
              className="inline-flex items-center gap-1 rounded-full border border-violet-500/30 bg-violet-950/40 px-2.5 py-0.5 text-violet-400 shadow-[0_0_10px_rgba(139,92,246,0.2)] hover:border-violet-500/60 hover:bg-violet-900/50 transition-all cursor-pointer"
            >
              <HelpCircle className="w-3 h-3 text-violet-400" />
              <span>Unindexed</span>
            </motion.button>
          </div>
        </div>
      )}

      {/* CODE TEXTAREA WITH LINE NUMBERS OR ADAPTER INPUT */}
      {inputMode === 'paste_output' ? (
        <div className="glass-input relative flex rounded-xl border border-white/10 dark:border-white/10 light:border-black/5 shadow-inner overflow-hidden focus-within:border-cyan-500 focus-within:ring-2 focus-within:ring-cyan-500/35 transition-all">
          {/* Line Numbers Column */}
          <div
            aria-hidden="true"
            className="select-none border-r border-white/10 bg-transparent px-2.5 py-3 font-mono text-[11px] text-slate-500 text-right leading-relaxed"
          >
            {lineNumbers.map((num) => (
              <div key={num} className="h-5">
                {num}
              </div>
            ))}
          </div>

          {/* Code Textarea */}
          <textarea
            value={agentOutputText}
            onChange={(e) => setAgentOutputText(e.target.value)}
            placeholder='{"recommendations": [{"rawName": "The Four Horsemen", "domain": "place"}]}'
            rows={10}
            className="flex-1 resize-y bg-transparent p-3 font-mono text-xs text-cyan-300 placeholder-slate-600 outline-none leading-relaxed scrollbar-thin scrollbar-thumb-slate-800"
            spellCheck={false}
          />

          <div className="pointer-events-none absolute right-3 bottom-2 font-mono text-[10px] text-slate-600">
            PAYLOAD // JSON
          </div>
        </div>
      ) : (
        /* Remote Adapter Configuration */
        <div className="space-y-2 py-1">
          <label className="block font-mono text-[10px] uppercase tracking-wider text-slate-400">
            Remote Agent Endpoint URL (HTTPS)
          </label>
          <div className="relative flex items-center">
            <Link className="absolute left-3 w-4 h-4 text-slate-500 pointer-events-none" />
            <input
              type="url"
              value={adapterUrl}
              onChange={(e) => setAdapterUrl(e.target.value)}
              placeholder="https://api.example.com/cultural-agent"
              className="glass-input w-full rounded-xl py-2.5 pl-9 pr-3 font-mono text-xs text-cyan-300 placeholder-slate-500 outline-none transition-all"
            />
          </div>
          <div className="rounded-md border border-white/10 bg-white/5 p-2.5 text-[11px] text-slate-400 font-mono space-y-1">
            <div className="text-slate-300 font-semibold">SSRF Security Validation Active:</div>
            <div>&bull; Rejects loopback (127.0.0.1, localhost)</div>
            <div>&bull; Rejects private network ranges (10.0.0.0/8, 192.168.0.0/16)</div>
            <div>&bull; Rejects cloud metadata addresses (169.254.169.254)</div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="rounded-lg border border-rose-500/30 bg-rose-950/40 p-2.5 text-xs font-mono text-rose-300">
          <strong>Execution Error:</strong> {error}
        </div>
      )}

      {/* PRIMARY CTA: Execute Evaluation Pass with Vibrant Neon Gradient Glow */}
      <motion.button
        type="button"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        disabled={loading}
        onClick={onRunEvaluation}
        className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-mono text-xs font-bold tracking-wider uppercase shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed outline-none cursor-pointer"
      >
        {loading ? (
          <>
            <Zap className="h-4 w-4 animate-spin text-slate-950" />
            <span className="text-slate-950">CROSS-EXAMINING EVIDENCE...</span>
          </>
        ) : (
          <>
            <Play className="h-4 w-4 fill-current text-slate-950" />
            <span className="text-slate-950">EXECUTE EVALUATION PASS</span>
          </>
        )}
      </motion.button>
    </div>
  );
};

export default AgentOutputEditor;
