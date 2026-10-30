import React, { useEffect, useState, lazy, Suspense } from 'react';
import { AppHeader, type NavTabId } from './components/common/AppHeader.js';
import { TestbenchView } from './components/TestbenchView.js';
import { ScenariosView } from './components/ScenariosView.js';
import { LiveRunView } from './components/LiveRunView.js';
import { ResultsView } from './components/ResultsView.js';
import { CulturalEvidenceGraphView } from './components/CulturalEvidenceGraphView.js';
import { EvidenceExplorerView } from './components/EvidenceExplorerView.js';
import { CompareView } from './components/CompareView.js';
import { ReportsView } from './components/ReportsView.js';
import { StateFeedback } from './components/common/StateFeedback.js';
import { LandingHeroView } from './components/LandingHeroView.js';
import { ErrorBoundary } from './components/common/ErrorBoundary.js';

// Separately lazy-loaded 3D Mission component to protect initial bundle weight
const LazyMission3DView = lazy(() => import('./components/mission3d/Mission3DView.js'));
import type {
  EvaluationScenario,
  EvaluationReport,
  SystemHealthStatus
} from '@shared/index';
import {
  DEMO_BROOKLYN_SCENARIO,
  DEMO_KYOTO_SCENARIO,
  INITIAL_DEMO_REPORT,
  SECONDARY_COMPARE_REPORT,
  INITIAL_DEMO_RESULT,
  INITIAL_DEMO_PAYLOAD_TEXT
} from './data/demoEvaluationRun.js';

interface WorkflowResponse {
  report: EvaluationReport;
  executionMode: 'LIVE_QLOO_VERIFICATION' | 'OFFLINE_DEMO_FIXTURE';
  notice?: string;
  error?: string;
}

export const App: React.FC = () => {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('tastespec_theme');
        if (saved === 'light' || saved === 'dark') return saved;
      } catch {
        // fallback
      }
    }
    return 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem('tastespec_theme', theme);
    } catch {
      // ignore
    }
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const [activeTab, setActiveTab] = useState<NavTabId>('testbench');
  const [health, setHealth] = useState<SystemHealthStatus | null>(null);
  const [templates, setTemplates] = useState<EvaluationScenario[]>([DEMO_BROOKLYN_SCENARIO, DEMO_KYOTO_SCENARIO]);
  const [selectedScenario, setSelectedScenario] = useState<EvaluationScenario | null>(DEMO_BROOKLYN_SCENARIO);
  const [inputMode, setInputMode] = useState<'paste_output' | 'configured_adapter'>('paste_output');
  const [agentOutputText, setAgentOutputText] = useState<string>(INITIAL_DEMO_PAYLOAD_TEXT);
  const [adapterUrl, setAdapterUrl] = useState<string>('https://api.example.com/cultural-agent/recommend');
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<WorkflowResponse | null>(INITIAL_DEMO_RESULT);
  const [error, setError] = useState<string | null>(null);
  const [historyReports, setHistoryReports] = useState<EvaluationReport[]>([
    INITIAL_DEMO_REPORT,
    SECONDARY_COMPARE_REPORT
  ]);

  useEffect(() => {
    // 1. Fetch System Health
    fetch('/api/health')
      .then(res => res.json())
      .then(data => setHealth(data))
      .catch(err => console.error('Health fetch failed', err));

    // 2. Fetch Scenario Templates
    fetch('/api/scenarios')
      .then(res => res.json())
      .then(data => {
        if (data.templates && data.templates.length > 0) {
          setTemplates(data.templates);
          const brooklyn = data.templates.find((t: EvaluationScenario) => t.id.includes('brooklyn')) || data.templates[0];
          setSelectedScenario(brooklyn);
        }
      })
      .catch(err => console.error('Templates fetch failed', err));
  }, []);

  const loadSampleForScenario = (scenario: EvaluationScenario, type: 'valid' | 'forbidden' | 'unindexed') => {
    if (scenario.id.includes('brooklyn')) {
      if (type === 'valid') {
        setAgentOutputText(INITIAL_DEMO_PAYLOAD_TEXT);
      } else if (type === 'forbidden') {
        setAgentOutputText(JSON.stringify({
          recommendations: [
            { rawName: 'Dave & Busters', domain: 'place', agentClaimedReasoning: 'Sports venue with drinks and arcade.' }
          ]
        }, null, 2));
      } else {
        setAgentOutputText(JSON.stringify({
          recommendations: [
            { rawName: 'Hypothetical Secret Loft Bar', domain: 'place' }
          ]
        }, null, 2));
      }
    } else {
      if (type === 'valid') {
        setAgentOutputText(JSON.stringify({
          recommendations: [
            { rawName: 'Dries Van Noten', domain: 'brand', agentClaimedReasoning: 'Artisanal texture and avant-garde tailoring.', agentClaimedAffinity: 0.85 }
          ]
        }, null, 2));
      } else if (type === 'forbidden') {
        setAgentOutputText(JSON.stringify({
          recommendations: [
            { rawName: 'Fast Fashion Outlet', domain: 'brand' }
          ]
        }, null, 2));
      } else {
        setAgentOutputText(JSON.stringify({
          recommendations: [
            { rawName: 'Imaginary Cyberpunk Atelier', domain: 'brand' }
          ]
        }, null, 2));
      }
    }
  };

  const handleRunEvaluation = async (overrideParams?: {
    scenario: EvaluationScenario;
    inputMode: 'paste_output' | 'configured_adapter';
    rawAgentOutput?: string;
    adapterUrl?: string;
  }) => {
    const scen = overrideParams?.scenario || selectedScenario;
    if (!scen) return;

    setLoading(true);
    setError(null);

    const mode = overrideParams?.inputMode || inputMode;
    const rawOutput = overrideParams?.rawAgentOutput ?? (mode === 'paste_output' ? agentOutputText : undefined);
    const targetAdapter = overrideParams?.adapterUrl ?? (mode === 'configured_adapter' ? adapterUrl : undefined);

    try {
      const res = await fetch('/api/eval/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenario: scen,
          inputMode: mode,
          rawAgentOutput: rawOutput,
          adapterUrl: targetAdapter
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `HTTP error ${res.status}`);
      }

      setResult(data);
      if (data.report) {
        setHistoryReports(prev => [data.report, ...prev]);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'transparent', position: 'relative' }}>
      {/* 1. Global Fixed-Position Canvas Background Layer */}
      <div className="fixed inset-0 pointer-events-none z-0" aria-hidden="true">
        {/* 2. Multi-color Radial Mesh Light Pools */}
        <div className="absolute inset-0 ambient-mesh-overlay" />

        {/* 3. Perspective Grid Pattern (36px x 36px) with Subtle Radial Fade Mask */}
        <div className="absolute inset-0 perspective-grid-overlay opacity-60 dark:opacity-60" />

        {/* Subtle scanline screen texture layer */}
        <div className="absolute inset-0 scanline-layer opacity-10 dark:opacity-15" />
      </div>

      {/* Cinematic Top Navigation Shell */}
      <AppHeader
        activeTab={activeTab}
        onTabChange={setActiveTab}
        health={health}
        executionMode={result?.executionMode}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      {/* Main Container Shell */}
      <main
        style={{
          flex: 1,
          maxWidth: '1600px',
          width: '100%',
          margin: '0 auto',
          padding: '1.5rem',
          boxSizing: 'border-box',
          position: 'relative',
          zIndex: 1,
          background: 'transparent'
        }}
      >
        <ErrorBoundary>
        {activeTab === 'landing' && (
          <LandingHeroView
            onNavigateToTestbench={() => setActiveTab('testbench')}
            onNavigateToEvidence={() => setActiveTab('graph')}
            onNavigateToScenarios={() => setActiveTab('scenarios')}
            onNavigateToMission3D={() => setActiveTab('mission3d')}
          />
        )}

        {activeTab === 'testbench' && (
          <TestbenchView
            scenarios={templates}
            selectedScenario={selectedScenario}
            onSelectScenario={(s) => {
              setSelectedScenario(s);
              loadSampleForScenario(s, 'valid');
            }}
            inputMode={inputMode}
            setInputMode={setInputMode}
            agentOutputText={agentOutputText}
            setAgentOutputText={setAgentOutputText}
            adapterUrl={adapterUrl}
            setAdapterUrl={setAdapterUrl}
            onRunEvaluation={() => handleRunEvaluation()}
            loading={loading}
            result={result}
            error={error}
            onLoadSample={(type) => {
              if (selectedScenario) loadSampleForScenario(selectedScenario, type);
            }}
            onNavigateToEvidence={() => setActiveTab('evidence')}
            onNavigateToResults={() => setActiveTab('results')}
            onAddCustomScenario={(customScenario) => {
              setTemplates(prev => [customScenario, ...prev]);
              setSelectedScenario(customScenario);
            }}
          />
        )}

        {activeTab === 'scenarios' && (
          <ScenariosView
            scenarios={templates}
            selectedScenario={selectedScenario}
            onSelectScenario={(s) => {
              setSelectedScenario(s);
              loadSampleForScenario(s, 'valid');
              setActiveTab('testbench');
            }}
            onRunTestbench={(s) => {
              setSelectedScenario(s);
              loadSampleForScenario(s, 'valid');
              setActiveTab('testbench');
            }}
          />
        )}

        {activeTab === 'liverun' && (
          <LiveRunView
            scenario={selectedScenario}
            onRunEvaluation={async (params) => {
              await handleRunEvaluation(params);
              setActiveTab('results');
            }}
            loading={loading}
            report={result?.report || null}
            onNavigateToEvidence={() => setActiveTab('evidence')}
          />
        )}

        {activeTab === 'results' && (
          <ResultsView
            report={result?.report || null}
            executionMode={result?.executionMode}
            onNavigateToTestbench={() => setActiveTab('testbench')}
          />
        )}

        {activeTab === 'mission3d' && (
          <Suspense
            fallback={
              <StateFeedback
                type="loading"
                title="Loading 3D Mission Chamber..."
                description="Dynamically initializing procedural test environment and WebGL canvas."
              />
            }
          >
            <LazyMission3DView
              selectedScenario={selectedScenario}
              onNavigateToTestbench={() => setActiveTab('testbench')}
              onNavigateToResults={() => setActiveTab('results')}
            />
          </Suspense>
        )}

        {activeTab === 'graph' && (
          <CulturalEvidenceGraphView
            report={result?.report || null}
            selectedScenario={selectedScenario}
            onNavigateToTestbench={() => setActiveTab('testbench')}
          />
        )}

        {activeTab === 'evidence' && (
          <EvidenceExplorerView
            report={result?.report || null}
            onNavigateToTestbench={() => setActiveTab('testbench')}
          />
        )}

        {activeTab === 'compare' && (
          <CompareView
            currentReport={result?.report || null}
            historyReports={historyReports}
          />
        )}

        {activeTab === 'reports' && (
          <ReportsView
            report={result?.report || null}
            onNavigateToTestbench={() => setActiveTab('testbench')}
          />
        )}
        </ErrorBoundary>
      </main>
    </div>
  );
};
