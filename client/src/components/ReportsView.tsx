import React, { useState } from 'react';
import { Panel } from './common/Panel.js';
import { Button } from './common/Button.js';
import { StatusBadge } from './common/StatusBadge.js';
import { CodeViewer } from './common/CodeViewer.js';
import { VibecodeCanvasLayout } from './common/VibecodeCanvasLayout.js';
import { TargetScanner } from './common/TargetScanner.js';
import type { EvaluationReport } from '@shared/index';

interface ReportsViewProps {
  report: EvaluationReport | null;
  onNavigateToTestbench: () => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  report,
  onNavigateToTestbench
}) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'json' | 'ledger'>('preview');

  if (!report) {
    return (
      <VibecodeCanvasLayout className="flex flex-col gap-6 bg-transparent">
        <TargetScanner
          badgeLabel="REPORT GENERATOR // RADAR STANDBY"
          title="No Compliance Report Generated Yet"
          description="Execute an evaluation pass in the Testbench or trigger Live Run telemetry to generate a reproducible compliance report exportable in JSON or printable as PDF."
          actionLabel="Re-Run Demo Pass"
          onAction={onNavigateToTestbench}
          steps={[
            { step: '01 // EVALUATE', title: 'Audit Pass', desc: 'Execute recommendation check against empirical Qloo vectors.' },
            { step: '02 // PROVENANCE', title: 'Evidence Ledger', desc: 'Seal findings cryptographically with cryptographic hash.' },
            { step: '03 // EXPORT', title: 'Compliance Report', desc: 'Download JSON artifact or printable compliance briefing.' }
          ]}
        />
      </VibecodeCanvasLayout>
    );
  }

  // Determine provenance mode (Live vs Fixture)
  const isFixture = report.evidenceLedger?.evidenceEntries?.some(
    (e: any) => e.evidenceType === 'demo_fixture' || e.source?.provenance === 'fixture'
  ) || false;

  const provenanceLabel = isFixture ? 'OFFLINE DEMO FIXTURE' : 'LIVE QLOO API NETWORK';

  const generateMarkdownReport = (): string => {
    return `# TASTESPEC Compliance & Evaluation Report

**Report ID:** \`${report.id}\`  
**Execution Provenance:** **${provenanceLabel}**  
**Scenario Title:** ${report.scenarioTitle} (\`${report.scenarioId}\`)  
**Generated Timestamp:** ${report.completedAt || report.createdAt}  
**Evaluation Lifecycle State:** ${report.finalState}  

---

## 1. Scenario Inputs & Constraints
- **Agent Input Mode:** \`${report.agentOutputSummary.mode}\` (${report.agentOutputSummary.itemCount} candidate items evaluated)
${report.scenarioSnapshot ? `- **Target Domain:** ${report.scenarioSnapshot.targetDomain}
- **Persona Name:** ${report.scenarioSnapshot.personaName}
- **Seeds Anchor:** ${report.scenarioSnapshot.seeds.map(s => `${s.name} (${s.domain})`).join(', ')}
${report.scenarioSnapshot.location ? `- **Location Constraint:** ${report.scenarioSnapshot.location.city || ''}, ${report.scenarioSnapshot.location.countryCode || ''}` : '- **Location:** Unconstrained'}
- **Category Filter URN:** \`${report.scenarioSnapshot.constraints.targetCategoryUrn}\`
- **Min Affinity Threshold:** ${report.scenarioSnapshot.constraints.minEmpiricalAffinity ?? 'None'}
- **Forbidden Attributes:** ${report.scenarioSnapshot.constraints.forbiddenAttributes?.join(', ') || 'None'}` : '- *Scenario snapshot details not embedded in legacy report.*'}

---

## 2. Compliance Scorecard
- **Total Validations Run:** ${report.summaryCounts.totalChecks}
- **PASS Count:** ${report.summaryCounts.passCount}
- **WARNING Count:** ${report.summaryCounts.warningCount}
- **FAIL Count:** ${report.summaryCounts.failCount}
- **UNVERIFIABLE Count:** ${report.summaryCounts.unverifiableCount}

---

## 3. Itemized Rule Findings & Diagnostic Evidence
${report.findings.map((f, i) => `### ${i + 1}. ${f.itemTargetName} — \`${f.status}\`
- **Classification:** \`${f.classification}\` (Severity: ${f.severity})
- **Reasoning:** ${f.humanReadableReason}
${f.metricObserved ? `- **Observed Metric:** ${f.metricObserved.name} = ${f.metricObserved.value} (Source: \`${f.metricObserved.sourceFormulaOrOrigin}\`)` : ''}
- **Evidence References:** ${f.evidenceReferences.length > 0 ? f.evidenceReferences.join(', ') : 'No direct ledger references'}
`).join('\n')}

---

## 4. Evidence Ledger & Provenance Traces
- **Audited Ledger Entries:** ${report.evidenceLedger?.evidenceEntries.length || 0}
- **Recorded Finding Traces:** ${report.evidenceLedger?.findingTraces.length || 0}
- **Resolved Entities Captured:** ${report.resolvedEntitiesEvidence.length}

---

## 5. Methodological Limitations & Epistemic Boundaries
- Evaluates recommendations against empirical Qloo API results and documented constraints.
- Does not assert that differing inputs must always yield distinct recommendations.
- Unindexed entities or unsupported query combinations are classified as \`UNVERIFIABLE\` rather than definitively false.
- Visualizations represent TASTESPEC evidence collection, not Qloo's native internal graph structure.
`;
  };

  const handleDownloadJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(report, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${report.id}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleDownloadMarkdown = () => {
    const md = generateMarkdownReport();
    const dataStr = 'data:text/markdown;charset=utf-8,' + encodeURIComponent(md);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${report.id}.md`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handlePrintPdf = () => {
    window.print();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header Toolbar (Hidden in Print via CSS) */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Evaluation Report & Export Center
          </h1>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            Export reproducible evaluation reports via JSON download, Markdown summary, or browser PDF print dialog.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Button size="sm" variant="outline" onClick={handleDownloadMarkdown}>
            Download Markdown
          </Button>
          <Button size="sm" variant="secondary" onClick={handleDownloadJson}>
            Download JSON
          </Button>
          <Button size="sm" variant="primary" onClick={handlePrintPdf}>
            Print / Save as PDF
          </Button>
        </div>
      </div>

      {/* Mode View Tabs (Hidden in Print) */}
      <div className="no-print" style={{ display: 'flex', gap: '0.35rem' }}>
        <button
          type="button"
          onClick={() => setActiveTab('preview')}
          style={{
            padding: '0.35rem 0.75rem',
            borderRadius: 'var(--radius-xs)',
            fontSize: '0.78rem',
            fontWeight: 600,
            background: activeTab === 'preview' ? 'var(--cyan-glow)' : 'var(--bg-surface-1)',
            color: activeTab === 'preview' ? 'var(--cyan-primary)' : 'var(--text-secondary)',
            border: `1px solid ${activeTab === 'preview' ? 'var(--border-cyan)' : 'var(--border-subtle)'}`,
            cursor: 'pointer'
          }}
        >
          Print-Ready Report Document
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('json')}
          style={{
            padding: '0.35rem 0.75rem',
            borderRadius: 'var(--radius-xs)',
            fontSize: '0.78rem',
            fontWeight: 600,
            background: activeTab === 'json' ? 'var(--cyan-glow)' : 'var(--bg-surface-1)',
            color: activeTab === 'json' ? 'var(--cyan-primary)' : 'var(--text-secondary)',
            border: `1px solid ${activeTab === 'json' ? 'var(--border-cyan)' : 'var(--border-subtle)'}`,
            cursor: 'pointer'
          }}
        >
          Raw JSON Inspection
        </button>
      </div>

      {/* Printable Report Document */}
      {activeTab === 'preview' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Metadata & Scorecard Banner */}
          <Panel
            title="Evaluation Report Overview"
            badge={
              <StatusBadge
                status={isFixture ? 'FIXTURE' : 'LIVE'}
                label={provenanceLabel}
                showIcon={false}
              />
            }
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', fontSize: '0.82rem' }}>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Report ID</span>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                  {report.id}
                </div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Scenario Title</span>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                  {report.scenarioTitle}
                </div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Run Timestamp</span>
                <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                  {report.completedAt || report.createdAt}
                </div>
              </div>
            </div>

            <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Compliance Scorecard</span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem', marginTop: '0.4rem', textAlign: 'center' }}>
                <div style={{ background: 'var(--bg-surface-0)', padding: '0.5rem', borderRadius: 'var(--radius-xs)' }}>
                  <div style={{ color: 'var(--status-pass)', fontWeight: 700, fontSize: '1.2rem' }}>{report.summaryCounts.passCount}</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>PASS</div>
                </div>
                <div style={{ background: 'var(--bg-surface-0)', padding: '0.5rem', borderRadius: 'var(--radius-xs)' }}>
                  <div style={{ color: 'var(--status-warn)', fontWeight: 700, fontSize: '1.2rem' }}>{report.summaryCounts.warningCount}</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>WARNING</div>
                </div>
                <div style={{ background: 'var(--bg-surface-0)', padding: '0.5rem', borderRadius: 'var(--radius-xs)' }}>
                  <div style={{ color: 'var(--status-fail)', fontWeight: 700, fontSize: '1.2rem' }}>{report.summaryCounts.failCount}</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>FAIL</div>
                </div>
                <div style={{ background: 'var(--bg-surface-0)', padding: '0.5rem', borderRadius: 'var(--radius-xs)' }}>
                  <div style={{ color: 'var(--status-unverified)', fontWeight: 700, fontSize: '1.2rem' }}>{report.summaryCounts.unverifiableCount}</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>UNVERIFIABLE</div>
                </div>
                <div style={{ background: 'var(--bg-surface-0)', padding: '0.5rem', borderRadius: 'var(--radius-xs)' }}>
                  <div style={{ color: 'var(--cyan-primary)', fontWeight: 700, fontSize: '1.2rem' }}>{report.summaryCounts.totalChecks}</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>TOTAL CHECKS</div>
                </div>
              </div>
            </div>
          </Panel>

          {/* Scenario Inputs & Scope */}
          {report.scenarioSnapshot && (
            <Panel title="Scenario Inputs & Documented Constraints">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', fontSize: '0.8rem' }}>
                <div style={{ background: 'var(--bg-surface-0)', padding: '0.6rem', borderRadius: 'var(--radius-xs)' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Target Persona & Domain</span>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.15rem' }}>
                    {report.scenarioSnapshot.personaName} ({report.scenarioSnapshot.targetDomain})
                  </div>
                </div>
                <div style={{ background: 'var(--bg-surface-0)', padding: '0.6rem', borderRadius: 'var(--radius-xs)' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Cultural Seeds Anchor</span>
                  <div style={{ color: 'var(--cyan-primary)', marginTop: '0.15rem' }}>
                    {report.scenarioSnapshot.seeds.map(s => s.name).join(', ')}
                  </div>
                </div>
                <div style={{ background: 'var(--bg-surface-0)', padding: '0.6rem', borderRadius: 'var(--radius-xs)' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Location & Contract URN</span>
                  <div style={{ color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                    {report.scenarioSnapshot.location?.city || 'Unconstrained'} • {report.scenarioSnapshot.constraints.targetCategoryUrn}
                  </div>
                </div>
              </div>
            </Panel>
          )}

          {/* Itemized Findings Table */}
          <Panel
            title="Itemized Findings & Diagnostic Audit"
            subtitle={`${report.findings.length} findings evaluated against empirical evidence`}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {report.findings.map((f, idx) => (
                <div
                  key={idx}
                  style={{
                    background: 'var(--bg-surface-0)',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-xs)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.25rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.84rem' }}>
                      {idx + 1}. {f.itemTargetName}
                    </span>
                    <StatusBadge status={f.status} label={f.status} showIcon={false} />
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                    {f.humanReadableReason}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    <span>Classification: <code>{f.classification}</code></span>
                    {f.metricObserved && (
                      <span style={{ color: 'var(--cyan-primary)', fontFamily: 'var(--font-mono)' }}>
                        {f.metricObserved.name}: {f.metricObserved.value.toFixed(3)} ({f.metricObserved.sourceFormulaOrOrigin})
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          {/* Methodological Limitations & Epistemic Boundaries */}
          <Panel title="Methodological Boundaries & Limitations">
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              <p style={{ margin: '0 0 0.5rem' }}>
                <strong>Empirical Provenance:</strong> This report verifies agent recommendations exclusively against empirical API responses collected during the evaluation run. Unresolved entities or unsupported query combinations are classified as <code>UNVERIFIABLE</code> rather than definitively false.
              </p>
              <p style={{ margin: 0 }}>
                <strong>No Causal Overreach:</strong> Comparisons across differing seeds or locations reflect observed differences in retrieved candidate sets and must not be treated as proof of causal cultural effects.
              </p>
            </div>
          </Panel>
        </div>
      ) : (
        <Panel title="Raw JSON Export Representation">
          <CodeViewer
            code={JSON.stringify(report, null, 2)}
            language="json"
            maxHeight="600px"
            title={`${report.id}.json`}
          />
        </Panel>
      )}
    </div>
  );
};
