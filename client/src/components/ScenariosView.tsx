import React from 'react';
import { Panel } from './common/Panel.js';
import { StatusBadge } from './common/StatusBadge.js';
import { Button } from './common/Button.js';
import { VibecodeCanvasLayout } from './common/VibecodeCanvasLayout.js';
import type { EvaluationScenario } from '@shared/index';

interface ScenariosViewProps {
  scenarios: EvaluationScenario[];
  selectedScenario: EvaluationScenario | null;
  onSelectScenario: (scenario: EvaluationScenario) => void;
  onRunTestbench: (scenario: EvaluationScenario) => void;
}

export const ScenariosView: React.FC<ScenariosViewProps> = ({
  scenarios,
  selectedScenario,
  onSelectScenario,
  onRunTestbench
}) => {
  return (
    <VibecodeCanvasLayout className="flex flex-col gap-6 bg-transparent">
      {/* Top Header Card */}
      <div className="cyber-glass-panel p-5 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
            Benchmark Scenario Catalog
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Multi-domain cultural persona templates with verified Qloo seed entities and empirical evaluation constraints.
          </p>
        </div>
        <StatusBadge status="NEUTRAL" label={`${scenarios.length} Pre-configured Scenarios`} showIcon={false} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1rem' }}>
        {scenarios.map((scen) => {
          const isSelected = selectedScenario?.id === scen.id;

          return (
            <Panel
              key={scen.id}
              className="cyber-glass-panel"
              style={{
                borderColor: isSelected ? 'var(--cyan-primary)' : 'var(--border-subtle)',
                transition: 'border-color var(--transition-fast)'
              }}
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>{scen.title}</span>
                  <StatusBadge status="NEUTRAL" label={scen.targetDomain.toUpperCase()} showIcon={false} />
                </div>
              }
              footer={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    Threshold: &ge; {scen.constraints.minEmpiricalAffinity ?? 0.5}
                  </span>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <Button
                      size="sm"
                      variant={isSelected ? 'outline' : 'secondary'}
                      onClick={() => onSelectScenario(scen)}
                    >
                      {isSelected ? 'Active' : 'Select'}
                    </Button>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => onRunTestbench(scen)}
                    >
                      Launch Test
                    </Button>
                  </div>
                </div>
              }
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.8rem' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Persona Target
                  </span>
                  <div style={{ color: 'var(--cyan-primary)', fontWeight: 600, marginTop: '0.1rem' }}>
                    {scen.personaName}
                  </div>
                </div>

                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Seed Cultural Anchors
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.25rem' }}>
                    {scen.seeds.map((s, idx) => (
                      <span
                        key={idx}
                        style={{
                          background: 'rgba(255, 255, 255, 0.04)',
                          border: '1px solid var(--border-subtle)',
                          padding: '0.15rem 0.45rem',
                          borderRadius: 'var(--radius-xs)',
                          fontSize: '0.74rem',
                          color: 'var(--text-secondary)'
                        }}
                      >
                        {s.name} <span style={{ color: 'var(--text-muted)' }}>({s.domain})</span>
                      </span>
                    ))}
                  </div>
                </div>

                {scen.constraints.forbiddenAttributes && scen.constraints.forbiddenAttributes.length > 0 && (
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Forbidden Constraints
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.2rem' }}>
                      {scen.constraints.forbiddenAttributes.map((attr, idx) => (
                        <span
                          key={idx}
                          style={{
                            color: 'var(--status-fail)',
                            background: 'var(--status-fail-subtle)',
                            border: '1px solid var(--status-fail-border)',
                            padding: '0.1rem 0.4rem',
                            borderRadius: 'var(--radius-xs)',
                            fontSize: '0.7rem'
                          }}
                        >
                          &times; {attr}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Panel>
          );
        })}
      </div>
    </VibecodeCanvasLayout>
  );
};
