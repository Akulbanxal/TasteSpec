import React, { useState } from 'react';
import { Panel } from './common/Panel.js';
import { StatusBadge } from './common/StatusBadge.js';
import { CodeViewer } from './common/CodeViewer.js';
import { StateFeedback } from './common/StateFeedback.js';
import { VibecodeCanvasLayout } from './common/VibecodeCanvasLayout.js';
import { TargetScanner } from './common/TargetScanner.js';
import type { EvaluationReport, LedgerEvidenceEntry, FindingTrace } from '@shared/index';

interface EvidenceExplorerViewProps {
  report: EvaluationReport | null;
  onNavigateToTestbench: () => void;
}

export const EvidenceExplorerView: React.FC<EvidenceExplorerViewProps> = ({
  report,
  onNavigateToTestbench
}) => {
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [activeLedgerTab, setActiveLedgerTab] = useState<'entries' | 'traces'>('entries');
  const [searchTerm, setSearchTerm] = useState('');

  if (!report) {
    return (
      <VibecodeCanvasLayout className="flex flex-col gap-6 bg-transparent">
        <TargetScanner
          badgeLabel="EVIDENCE EXPLORER // STANDBY"
          title="No Evidence Available"
          description="Execute an evaluation pass in the Testbench or Live Run screen to inspect retrieved Qloo entities and the evidence ledger."
          actionLabel="Re-Run Demo Pass"
          onAction={onNavigateToTestbench}
          steps={[
            { step: '01 // RESOLVE', title: 'Entity Catalog', desc: 'Identify canonical URNs and tags in Qloo taste graph.' },
            { step: '02 // RETRIEVE', title: 'Empirical Vectors', desc: 'Extract high-dimensional cross-domain affinity scores.' },
            { step: '03 // SEAL', title: 'Evidence Ledger', desc: 'Verify tamper-evident cryptographic hash ledger.' }
          ]}
        />
      </VibecodeCanvasLayout>
    );
  }

  const ledger = report.evidenceLedger;
  const entries: LedgerEvidenceEntry[] = ledger?.evidenceEntries || [];
  const findingTraces = ledger?.findingTraces || [];

  const filteredEntries = entries.filter((e: LedgerEvidenceEntry) => {
    if (!searchTerm.trim()) return true;
    return e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.entityId && e.entityId.toLowerCase().includes(searchTerm.toLowerCase())) ||
      e.source.endpoint.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const selectedEntry = entries.find((e: LedgerEvidenceEntry) => e.ledgerId === selectedEntryId) || filteredEntries[0] || entries[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Evidence Explorer & Trace Ledger
          </h1>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            Inspect empirical Qloo API request parameters, entity resolution records, candidate affinity scores, and audit traces.
          </p>
        </div>

        {/* Disclaimer Notice */}
        <div
          style={{
            background: 'var(--bg-surface-1)',
            padding: '0.4rem 0.75rem',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
            fontSize: '0.72rem',
            color: 'var(--text-muted)'
          }}
        >
          TASTESPEC audit ledger of collected API responses.
        </div>
      </div>

      {/* Mode Tabs & Search Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', gap: '0.35rem' }}>
          <button
            type="button"
            onClick={() => setActiveLedgerTab('entries')}
            style={{
              padding: '0.35rem 0.75rem',
              borderRadius: 'var(--radius-xs)',
              fontSize: '0.78rem',
              fontWeight: 600,
              background: activeLedgerTab === 'entries' ? 'var(--cyan-glow)' : 'var(--bg-surface-1)',
              color: activeLedgerTab === 'entries' ? 'var(--cyan-primary)' : 'var(--text-secondary)',
              border: `1px solid ${activeLedgerTab === 'entries' ? 'var(--border-cyan)' : 'var(--border-subtle)'}`,
              cursor: 'pointer'
            }}
          >
            Ledger Entries ({entries.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveLedgerTab('traces')}
            style={{
              padding: '0.35rem 0.75rem',
              borderRadius: 'var(--radius-xs)',
              fontSize: '0.78rem',
              fontWeight: 600,
              background: activeLedgerTab === 'traces' ? 'var(--cyan-glow)' : 'var(--bg-surface-1)',
              color: activeLedgerTab === 'traces' ? 'var(--cyan-primary)' : 'var(--text-secondary)',
              border: `1px solid ${activeLedgerTab === 'traces' ? 'var(--border-cyan)' : 'var(--border-subtle)'}`,
              cursor: 'pointer'
            }}
          >
            Finding Traces ({findingTraces.length})
          </button>
        </div>

        <input
          type="text"
          placeholder="Search by entity, ID, or endpoint..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            background: 'var(--bg-surface-0)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-xs)',
            padding: '0.35rem 0.65rem',
            color: 'var(--text-primary)',
            fontSize: '0.78rem',
            width: '260px'
          }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1.1fr) minmax(400px, 1.4fr)', gap: '1rem' }}>
        {/* Evidence List */}
        <Panel
          title={activeLedgerTab === 'entries' ? 'Recorded Evidence Entries' : 'Rule Finding Traces'}
          badge={<StatusBadge status="NEUTRAL" label={`${activeLedgerTab === 'entries' ? filteredEntries.length : findingTraces.length} Records`} showIcon={false} />}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', maxHeight: '520px', overflowY: 'auto' }}>
            {activeLedgerTab === 'entries' ? (
              filteredEntries.length === 0 ? (
                <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  No evidence entries match the search filter.
                </div>
              ) : (
                filteredEntries.map((entry: LedgerEvidenceEntry) => {
                  const isSelected = selectedEntry?.ledgerId === entry.ledgerId;

                  return (
                    <div
                      key={entry.ledgerId}
                      tabIndex={0}
                      role="button"
                      aria-pressed={isSelected}
                      onClick={() => setSelectedEntryId(entry.ledgerId)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedEntryId(entry.ledgerId);
                        }
                      }}
                      style={{
                        padding: '0.65rem 0.85rem',
                        borderRadius: 'var(--radius-sm)',
                        background: isSelected ? 'var(--bg-surface-3)' : 'var(--bg-surface-0)',
                        border: `1px solid ${isSelected ? 'var(--border-cyan)' : 'var(--border-subtle)'}`,
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.25rem',
                        transition: 'all var(--transition-fast)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.84rem', color: 'var(--text-primary)' }}>
                          {entry.name}
                        </span>
                        <StatusBadge
                          status={entry.evidenceType === 'demo_fixture' ? 'FIXTURE' : 'LIVE'}
                          label={entry.evidenceType.replace('_', ' ').toUpperCase()}
                          showIcon={false}
                        />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        <span>{entry.source.endpoint}</span>
                        {entry.rawScore !== undefined && (
                          <span style={{ color: 'var(--cyan-primary)' }}>
                            {entry.scoreMetric || 'score'}: {entry.rawScore.toFixed(3)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )
            ) : (
              findingTraces.map((trace: FindingTrace) => {
                const finding = report.findings.find(f => f.id === trace.findingId);

                return (
                  <div
                    key={trace.findingId}
                    style={{
                      padding: '0.65rem 0.85rem',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-surface-0)',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.3rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.84rem', color: 'var(--text-primary)' }}>
                        {trace.itemTargetName} ({trace.ruleName})
                      </span>
                      <StatusBadge
                        status={trace.status as any}
                        label={trace.status}
                        showIcon={false}
                      />
                    </div>
                    <div style={{ fontSize: '0.73rem', color: 'var(--text-secondary)' }}>
                      {finding?.humanReadableReason}
                    </div>
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.2rem' }}>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Cites Ledger IDs:</span>
                      {trace.referencedLedgerIds.map((refId: string) => (
                        <button
                          key={refId}
                          type="button"
                          onClick={() => {
                            setSelectedEntryId(refId);
                            setActiveLedgerTab('entries');
                          }}
                          style={{
                            background: 'var(--bg-surface-2)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 'var(--radius-xs)',
                            padding: '0.05rem 0.35rem',
                            fontSize: '0.68rem',
                            color: 'var(--cyan-primary)',
                            cursor: 'pointer',
                            fontFamily: 'var(--font-mono)'
                          }}
                        >
                          {refId}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Panel>

        {/* Selected Evidence Detail Inspector */}
        <Panel
          title="Evidence Provenance Inspector"
          subtitle={selectedEntry ? selectedEntry.ledgerId : 'Select an entry'}
        >
          {selectedEntry ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                <div style={{ background: 'var(--bg-surface-0)', padding: '0.65rem', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Target Entity</span>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.15rem' }}>
                    {selectedEntry.name}
                  </div>
                </div>
                <div style={{ background: 'var(--bg-surface-0)', padding: '0.65rem', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Resolved Qloo ID</span>
                  <div style={{ fontSize: '0.82rem', fontFamily: 'var(--font-mono)', color: 'var(--cyan-primary)', marginTop: '0.15rem' }}>
                    {selectedEntry.entityId || 'N/A (Unindexed)'}
                  </div>
                </div>
              </div>

              {/* API Diagnostics */}
              <div
                style={{
                  background: 'var(--bg-surface-0)',
                  padding: '0.65rem 0.75rem',
                  borderRadius: 'var(--radius-xs)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '0.75rem'
                }}
              >
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Endpoint: </span>
                  <code style={{ color: 'var(--text-primary)' }}>{selectedEntry.source.endpoint}</code>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Latency: </span>
                  <span style={{ color: 'var(--cyan-primary)', fontFamily: 'var(--font-mono)' }}>
                    {selectedEntry.source.latencyMs} ms
                  </span>
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Sanitized Request Parameters:</span>
                <div style={{ marginTop: '0.35rem' }}>
                  <CodeViewer
                    code={JSON.stringify(selectedEntry.source.parametersUsed, null, 2)}
                    title="Sanitized Query Parameters"
                  />
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Raw Evidence Record:</span>
                <div style={{ marginTop: '0.35rem' }}>
                  <CodeViewer
                    code={JSON.stringify(selectedEntry, null, 2)}
                    title="Ledger Evidence Record"
                    maxHeight="200px"
                  />
                </div>
              </div>
            </div>
          ) : (
            <StateFeedback type="empty" title="Select a ledger record to view trace details" />
          )}
        </Panel>
      </div>
    </div>
  );
};
