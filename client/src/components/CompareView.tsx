import React, { useState, useMemo } from 'react';
import { Panel } from './common/Panel.js';
import { Button } from './common/Button.js';
import { StatusBadge } from './common/StatusBadge.js';
import { VibecodeCanvasLayout } from './common/VibecodeCanvasLayout.js';
import { TargetScanner } from './common/TargetScanner.js';
import {
  compareEvaluationReports,
  type ComprehensiveReportDiff
} from './compare/scenarioComparisonEngine.js';
import type { EvaluationReport } from '@shared/index';

interface CompareViewProps {
  currentReport: EvaluationReport | null;
  historyReports: EvaluationReport[];
}

export const CompareView: React.FC<CompareViewProps> = ({
  currentReport,
  historyReports
}) => {
  const availableRuns = useMemo(() => {
    const list: EvaluationReport[] = [];
    if (currentReport) list.push(currentReport);
    for (const r of historyReports) {
      if (!list.some(existing => existing.id === r.id)) {
        list.push(r);
      }
    }
    return list;
  }, [currentReport, historyReports]);

  const [selectedRunIdA, setSelectedRunIdA] = useState<string>(availableRuns[0]?.id || '');
  const [selectedRunIdB, setSelectedRunIdB] = useState<string>(availableRuns[1]?.id || availableRuns[0]?.id || '');
  const [evidenceTab, setEvidenceTab] = useState<'retained' | 'added' | 'removed' | 'uncomparable'>('retained');

  const runA = availableRuns.find(r => r.id === selectedRunIdA) || availableRuns[0];
  const runB = availableRuns.find(r => r.id === selectedRunIdB) || (availableRuns.length > 1 ? availableRuns[1] : availableRuns[0]);

  const comparison: ComprehensiveReportDiff | null = useMemo(() => {
    if (!runA || !runB) return null;
    return compareEvaluationReports(runA, runB);
  }, [runA, runB]);

  if (availableRuns.length < 2) {
    return (
      <VibecodeCanvasLayout className="flex flex-col gap-6 bg-transparent">
        <TargetScanner
          badgeLabel="COMPARISON ENGINE // STANDBY"
          title="Comparative Diff Requires At Least Two Runs"
          description="Run multiple evaluation iterations with different inputs or agent outputs in the Testbench to compare empirical affinities, pass rates, and evidence diffs side-by-side."
          actionLabel="Re-Run Demo Pass"
          onAction={() => {}}
          steps={[
            { step: '01 // BASELINE', title: 'Primary Run', desc: 'Execute baseline persona evaluation run in Testbench.' },
            { step: '02 // CANDIDATE', title: 'Secondary Run', desc: 'Modify seeds, location, or adapter output to generate run B.' },
            { step: '03 // DIFF', title: 'Epistemic Diff', desc: 'Inspect candidate additions, score deltas, and methodology notes.' }
          ]}
        />
      </VibecodeCanvasLayout>
    );
  }

  if (!comparison) return null;

  const { inputDiff, evidenceDiff, findingChanges, uncomparableItems, scorecardDelta } = comparison;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header and Methodological Guardrail Notice */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Evaluation Run Comparison & Evidence Diff
          </h1>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            Compare input scenarios, added/removed retrieved evidence, finding status changes, and uncomparable missing data.
          </p>
        </div>

        {/* Methodological Guardrail Alert */}
        <div
          style={{
            background: 'var(--bg-surface-1)',
            padding: '0.5rem 0.85rem',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
            fontSize: '0.72rem',
            color: 'var(--text-muted)',
            maxWidth: '540px'
          }}
        >
          <strong style={{ color: 'var(--text-secondary)' }}>Methodology Notice:</strong> {comparison.methodologicalNotice}
        </div>
      </div>

      {/* Selectors */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <Panel title="Baseline Run (A)" subtitle={`ID: ${runA.id.slice(-12)}`}>
          <select
            value={runA.id}
            onChange={(e) => setSelectedRunIdA(e.target.value)}
            style={{
              width: '100%',
              background: 'var(--bg-surface-0)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-medium)',
              padding: '0.5rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.82rem',
              fontFamily: 'var(--font-mono)'
            }}
          >
            {availableRuns.map(r => (
              <option key={r.id} value={r.id}>
                {r.scenarioTitle} ({r.id.slice(-8)}) — Pass: {r.summaryCounts.passCount}/{r.summaryCounts.totalChecks}
              </option>
            ))}
          </select>
        </Panel>

        <Panel title="Comparison Run (B)" subtitle={`ID: ${runB.id.slice(-12)}`}>
          <select
            value={runB.id}
            onChange={(e) => setSelectedRunIdB(e.target.value)}
            style={{
              width: '100%',
              background: 'var(--bg-surface-0)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-medium)',
              padding: '0.5rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.82rem',
              fontFamily: 'var(--font-mono)'
            }}
          >
            {availableRuns.map(r => (
              <option key={r.id} value={r.id}>
                {r.scenarioTitle} ({r.id.slice(-8)}) — Pass: {r.summaryCounts.passCount}/{r.summaryCounts.totalChecks}
              </option>
            ))}
          </select>
        </Panel>
      </div>

      {/* 1. Input Differences (Seeds, Location, Categories, Agent Output) */}
      <Panel
        title="Input & Scenario Differences"
        subtitle="Contrasting seeds, geographic scope, categories, and agent outputs between both runs"
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
          {/* Seeds Diff */}
          <div style={{ background: 'var(--bg-surface-0)', padding: '0.75rem', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Cultural Seeds</span>
            <div style={{ marginTop: '0.35rem', fontSize: '0.78rem' }}>
              <div><strong>Shared:</strong> {inputDiff.seedsShared.map(s => s.name).join(', ') || 'None'}</div>
              {inputDiff.seedsAdded.length > 0 && (
                <div style={{ color: 'var(--status-pass)', marginTop: '0.2rem' }}>
                  + Added in B: {inputDiff.seedsAdded.map(s => s.name).join(', ')}
                </div>
              )}
              {inputDiff.seedsRemoved.length > 0 && (
                <div style={{ color: 'var(--status-fail)', marginTop: '0.2rem' }}>
                  - Removed from A: {inputDiff.seedsRemoved.map(s => s.name).join(', ')}
                </div>
              )}
            </div>
          </div>

          {/* Location Scope */}
          <div style={{ background: 'var(--bg-surface-0)', padding: '0.75rem', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Location Scope</span>
            <div style={{ marginTop: '0.35rem', fontSize: '0.78rem' }}>
              <div>Run A: {inputDiff.scenarioA.location?.city || 'Unconstrained'}</div>
              <div>Run B: {inputDiff.scenarioB.location?.city || 'Unconstrained'}</div>
              <div style={{ color: inputDiff.locationChanged ? 'var(--status-warn)' : 'var(--text-muted)', fontSize: '0.72rem', marginTop: '0.25rem' }}>
                {inputDiff.locationChanged ? 'Location changed between runs' : 'Identical location constraint'}
              </div>
            </div>
          </div>

          {/* Target Category & Domain */}
          <div style={{ background: 'var(--bg-surface-0)', padding: '0.75rem', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Target Domain</span>
            <div style={{ marginTop: '0.35rem', fontSize: '0.78rem' }}>
              <div>Run A: {inputDiff.scenarioA.targetDomain}</div>
              <div>Run B: {inputDiff.scenarioB.targetDomain}</div>
              {inputDiff.domainChanged && (
                <div style={{ color: 'var(--status-fail)', fontSize: '0.72rem', marginTop: '0.25rem' }}>
                  Cross-domain comparison (not directly comparable)
                </div>
              )}
            </div>
          </div>

          {/* Agent Output Mode */}
          <div style={{ background: 'var(--bg-surface-0)', padding: '0.75rem', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Agent Input Output</span>
            <div style={{ marginTop: '0.35rem', fontSize: '0.78rem' }}>
              <div>Mode A: {inputDiff.scenarioA.agentOutputMode || 'direct_text'}</div>
              <div>Mode B: {inputDiff.scenarioB.agentOutputMode || 'direct_text'}</div>
              <div style={{ color: inputDiff.agentInputChanged ? 'var(--cyan-primary)' : 'var(--text-muted)', fontSize: '0.72rem', marginTop: '0.25rem' }}>
                {inputDiff.agentInputChanged ? 'Outputs differ' : 'Identical agent payload'}
              </div>
            </div>
          </div>
        </div>
      </Panel>

      {/* Scorecard Deltas Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.75rem' }}>
        <div style={{ background: 'var(--bg-surface-1)', padding: '0.75rem', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Pass Delta</span>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: scorecardDelta.passDelta >= 0 ? 'var(--status-pass)' : 'var(--status-fail)', marginTop: '0.2rem' }}>
            {scorecardDelta.passDelta > 0 ? `+${scorecardDelta.passDelta}` : scorecardDelta.passDelta}
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{runA.summaryCounts.passCount} → {runB.summaryCounts.passCount}</div>
        </div>

        <div style={{ background: 'var(--bg-surface-1)', padding: '0.75rem', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Warning Delta</span>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: scorecardDelta.warningDelta <= 0 ? 'var(--status-pass)' : 'var(--status-warn)', marginTop: '0.2rem' }}>
            {scorecardDelta.warningDelta > 0 ? `+${scorecardDelta.warningDelta}` : scorecardDelta.warningDelta}
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{runA.summaryCounts.warningCount} → {runB.summaryCounts.warningCount}</div>
        </div>

        <div style={{ background: 'var(--bg-surface-1)', padding: '0.75rem', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Fail Delta</span>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: scorecardDelta.failDelta <= 0 ? 'var(--status-pass)' : 'var(--status-fail)', marginTop: '0.2rem' }}>
            {scorecardDelta.failDelta > 0 ? `+${scorecardDelta.failDelta}` : scorecardDelta.failDelta}
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{runA.summaryCounts.failCount} → {runB.summaryCounts.failCount}</div>
        </div>

        <div style={{ background: 'var(--bg-surface-1)', padding: '0.75rem', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Unverified Delta</span>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--status-unverified)', marginTop: '0.2rem' }}>
            {scorecardDelta.unverifiableDelta > 0 ? `+${scorecardDelta.unverifiableDelta}` : scorecardDelta.unverifiableDelta}
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{runA.summaryCounts.unverifiableCount} → {runB.summaryCounts.unverifiableCount}</div>
        </div>

        <div style={{ background: 'var(--bg-surface-1)', padding: '0.75rem', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Checks Delta</span>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--cyan-primary)', marginTop: '0.2rem' }}>
            {scorecardDelta.totalChecksDelta > 0 ? `+${scorecardDelta.totalChecksDelta}` : scorecardDelta.totalChecksDelta}
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{runA.summaryCounts.totalChecks} → {runB.summaryCounts.totalChecks}</div>
        </div>
      </div>

      {/* 2. Finding Status Changes & Why */}
      <Panel
        title="Finding Status Transitions & Diagnostics"
        subtitle={`${findingChanges.length} rule finding status or classification changes observed`}
      >
        {findingChanges.length === 0 ? (
          <div style={{ padding: '1.25rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
            No status changes detected between shared findings in Run A and Run B.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {findingChanges.map((change, idx) => (
              <div
                key={idx}
                style={{
                  background: 'var(--bg-surface-0)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-xs)',
                  padding: '0.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.88rem' }}>
                    {change.itemTargetName}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <StatusBadge status={change.statusA as any} label={`Run A: ${change.statusA}`} showIcon={false} />
                    <span style={{ color: 'var(--text-muted)' }}>&rarr;</span>
                    <StatusBadge status={change.statusB as any} label={`Run B: ${change.statusB}`} showIcon={false} />
                  </div>
                </div>

                <div style={{ fontSize: '0.75rem', color: 'var(--cyan-primary)', fontWeight: 500 }}>
                  Why Changed: {change.whyChanged}
                </div>

                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                  <div><strong>Run A Reasoning:</strong> {change.reasonA}</div>
                  <div><strong>Run B Reasoning:</strong> {change.reasonB}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {/* 3. Evidence Ledger Comparison (Added, Removed, Retained, Uncomparable) */}
      <Panel
        title="Retrieved Evidence Ledger Comparison"
        subtitle="Audit candidate entities retrieved through Qloo API between runs"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <Button
              size="sm"
              variant={evidenceTab === 'retained' ? 'primary' : 'outline'}
              onClick={() => setEvidenceTab('retained')}
            >
              Retained & Score Delta ({evidenceDiff.retainedEntries.length})
            </Button>
            <Button
              size="sm"
              variant={evidenceTab === 'added' ? 'primary' : 'outline'}
              onClick={() => setEvidenceTab('added')}
            >
              Added in Run B ({evidenceDiff.addedEntries.length})
            </Button>
            <Button
              size="sm"
              variant={evidenceTab === 'removed' ? 'primary' : 'outline'}
              onClick={() => setEvidenceTab('removed')}
            >
              Removed from Run A ({evidenceDiff.removedEntries.length})
            </Button>
            <Button
              size="sm"
              variant={evidenceTab === 'uncomparable' ? 'primary' : 'outline'}
              onClick={() => setEvidenceTab('uncomparable')}
            >
              Uncomparable Missing Data ({uncomparableItems.length})
            </Button>
          </div>

          {evidenceTab === 'retained' && (
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-surface-0)', borderBottom: '1px solid var(--border-subtle)' }}>
                    <th style={{ padding: '0.4rem 0.6rem', color: 'var(--text-muted)' }}>Entity Name</th>
                    <th style={{ padding: '0.4rem 0.6rem', color: 'var(--text-muted)' }}>Run A Score</th>
                    <th style={{ padding: '0.4rem 0.6rem', color: 'var(--text-muted)' }}>Run B Score</th>
                    <th style={{ padding: '0.4rem 0.6rem', color: 'var(--text-muted)' }}>Score Delta</th>
                    <th style={{ padding: '0.4rem 0.6rem', color: 'var(--text-muted)' }}>Comparability Status</th>
                  </tr>
                </thead>
                <tbody>
                  {evidenceDiff.retainedEntries.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No overlapping candidate evidence found in both runs.
                      </td>
                    </tr>
                  ) : (
                    evidenceDiff.retainedEntries.map((e, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '0.4rem 0.6rem', fontWeight: 600, color: 'var(--text-primary)' }}>{e.entityName}</td>
                        <td style={{ padding: '0.4rem 0.6rem', fontFamily: 'var(--font-mono)' }}>{e.scoreA !== undefined ? e.scoreA.toFixed(3) : 'N/A'}</td>
                        <td style={{ padding: '0.4rem 0.6rem', fontFamily: 'var(--font-mono)' }}>{e.scoreB !== undefined ? e.scoreB.toFixed(3) : 'N/A'}</td>
                        <td style={{ padding: '0.4rem 0.6rem', fontFamily: 'var(--font-mono)', color: e.scoreDelta && e.scoreDelta > 0 ? 'var(--status-pass)' : 'var(--status-warn)' }}>
                          {e.scoreDelta !== undefined ? (e.scoreDelta > 0 ? `+${e.scoreDelta.toFixed(3)}` : e.scoreDelta.toFixed(3)) : '—'}
                        </td>
                        <td style={{ padding: '0.4rem 0.6rem' }}>
                          {e.isComparable ? (
                            <span style={{ color: 'var(--status-pass)' }}>&check; Comparable</span>
                          ) : (
                            <span style={{ color: 'var(--status-fail)' }}>&times; {e.nonComparableReason}</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {evidenceTab === 'added' && (
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {evidenceDiff.addedEntries.length === 0 ? (
                  <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                    No new entities retrieved in Run B.
                  </div>
                ) : (
                  evidenceDiff.addedEntries.map((e, i) => (
                    <div key={i} style={{ padding: '0.45rem 0.65rem', background: 'var(--bg-surface-0)', borderRadius: 'var(--radius-xs)', display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{e.entityName}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--cyan-primary)' }}>
                        {e.scoreB !== undefined ? `Score: ${e.scoreB.toFixed(3)}` : 'Retrieved entity'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {evidenceTab === 'removed' && (
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {evidenceDiff.removedEntries.length === 0 ? (
                  <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                    No entities removed from Run A.
                  </div>
                ) : (
                  evidenceDiff.removedEntries.map((e, i) => (
                    <div key={i} style={{ padding: '0.45rem 0.65rem', background: 'var(--bg-surface-0)', borderRadius: 'var(--radius-xs)', display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{e.entityName}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                        {e.scoreA !== undefined ? `Prior Score: ${e.scoreA.toFixed(3)}` : 'Prior entity'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {evidenceTab === 'uncomparable' && (
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {uncomparableItems.length === 0 ? (
                  <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                    All evidence schemas and findings are fully comparable.
                  </div>
                ) : (
                  uncomparableItems.map((u, i) => (
                    <div key={i} style={{ padding: '0.45rem 0.65rem', background: 'var(--bg-surface-0)', borderRadius: 'var(--radius-xs)', display: 'flex', flexDirection: 'column', gap: '0.2rem', fontSize: '0.78rem' }}>
                      <span style={{ fontWeight: 600, color: 'var(--status-fail)' }}>{u.itemName}</span>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.72rem' }}>{u.reason}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
};
