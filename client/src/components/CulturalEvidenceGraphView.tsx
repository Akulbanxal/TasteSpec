import React, { useState, useMemo, lazy, Suspense } from 'react';
import { Panel } from './common/Panel.js';
import { Button } from './common/Button.js';
import { StateFeedback } from './common/StateFeedback.js';
import { ShapeIcon } from './evidenceGraph/ShapeIcon.js';
import { Interactive2DCanvas } from './evidenceGraph/Interactive2DCanvas.js';
import { AccessibleNodeTable } from './evidenceGraph/AccessibleNodeTable.js';
import { ProvenanceInspectorPanel } from './evidenceGraph/ProvenanceInspectorPanel.js';
import {
  buildEvidenceGraph,
  type EvidenceGraphNode,
  type EvidenceNodeType
} from './evidenceGraph/evidenceGraphModel.js';
import type { EvaluationReport, EvaluationScenario } from '@shared/index';

// Optional 3D View: Lazy loaded on explicit user action only
const Lazy3DCanvas = lazy(() => import('./evidenceGraph/Lazy3DCanvas.js'));

interface CulturalEvidenceGraphViewProps {
  report: EvaluationReport | null;
  selectedScenario: EvaluationScenario | null;
  onNavigateToTestbench: () => void;
}

export const CulturalEvidenceGraphView: React.FC<CulturalEvidenceGraphViewProps> = ({
  report,
  selectedScenario,
  onNavigateToTestbench
}) => {
  // Graph construction from real report data
  const graphModel = useMemo(() => {
    return buildEvidenceGraph(report, selectedScenario);
  }, [report, selectedScenario]);

  // View state
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | EvidenceNodeType>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PASS' | 'WARNING' | 'FAIL' | 'UNVERIFIABLE'>('ALL');
  const [is3DMode, setIs3DMode] = useState(false);
  const [fitViewCount, setFitViewCount] = useState(0);

  // Active node selection
  const selectedNode: EvidenceGraphNode | null = useMemo(() => {
    if (selectedNodeId) {
      const match = graphModel.nodes.find(n => n.id === selectedNodeId);
      if (match) return match;
    }
    return graphModel.nodes[0] || null;
  }, [graphModel.nodes, selectedNodeId]);

  // Filtered nodes
  const filteredNodes = useMemo(() => {
    return graphModel.nodes.filter(node => {
      const matchesSearch = searchQuery.trim() === '' ||
        node.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (node.provenance.qlooId && node.provenance.qlooId.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesType = typeFilter === 'ALL' || node.type === typeFilter;
      const matchesStatus = statusFilter === 'ALL' || node.status === statusFilter;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [graphModel.nodes, searchQuery, typeFilter, statusFilter]);

  // Edges connected to selected node
  const connectedEdges = useMemo(() => {
    if (!selectedNode) return [];
    return graphModel.edges.filter(
      e => e.sourceId === selectedNode.id || e.targetId === selectedNode.id
    );
  }, [graphModel.edges, selectedNode]);

  // Empty Data Guard
  if (!report && !selectedScenario) {
    return (
      <StateFeedback
        type="empty"
        title="No Evidence Available"
        description="Select a scenario and execute an evaluation pass in the Testbench to project how recommendations connect to empirical Qloo API evidence."
        actionText="Go to Testbench"
        onAction={onNavigateToTestbench}
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header and Disclaimer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              TASTESPEC Evidence Explorer
            </h1>
            <span
              style={{
                fontSize: '0.68rem',
                padding: '0.15rem 0.5rem',
                borderRadius: 'var(--radius-xs)',
                background: 'var(--bg-surface-2)',
                border: '1px solid var(--border-medium)',
                color: 'var(--text-muted)'
              }}
            >
              {is3DMode ? '3D WebGL Projection' : '2D SVG Fast Canvas'}
            </span>
          </div>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            Application visualization of evidence collected through Qloo API results. Visualizes substantiated relationships only.
          </p>
        </div>

        {/* Essential Legal / Architecture Disclaimer */}
        <div
          style={{
            background: 'var(--bg-surface-1)',
            padding: '0.45rem 0.85rem',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
            fontSize: '0.72rem',
            color: 'var(--text-muted)',
            maxWidth: '440px'
          }}
        >
          <strong style={{ color: 'var(--text-secondary)' }}>Note:</strong> This is TASTESPEC's visualization of evidence collected through Qloo API responses, not Qloo's native internal graph.
        </div>
      </div>

      {/* Shapes and Status Legend (Color is not the only indicator) */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--bg-surface-1)',
          padding: '0.6rem 0.85rem',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-subtle)',
          fontSize: '0.75rem',
          gap: '0.75rem'
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Node Shapes:</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)' }}>
            <ShapeIcon shape="diamond" size={14} color="var(--cyan-primary)" />
            Seed Anchor
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)' }}>
            <ShapeIcon shape="round-rect" size={14} color="#8b5cf6" />
            Qloo Candidate Insight
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)' }}>
            <ShapeIcon shape="circle" size={14} color="var(--status-pass)" />
            Resolved Entity
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)' }}>
            <ShapeIcon shape="square" size={14} color="#38bdf8" />
            Agent Recommendation
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)' }}>
            <ShapeIcon shape="hexagon" size={14} color="#f59e0b" />
            Validation Finding
          </span>
        </div>

        {/* 3D / 2D Toggle & Canvas Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {!is3DMode && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFitViewCount(c => c + 1)}
              style={{ fontSize: '0.72rem', padding: '0.25rem 0.6rem' }}
            >
              Fit Graph
            </Button>
          )}
          <Button
            variant={is3DMode ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setIs3DMode(!is3DMode)}
            style={{ fontSize: '0.72rem', padding: '0.25rem 0.6rem' }}
          >
            {is3DMode ? 'Exit 3D (Return to 2D)' : 'Optional 3D View'}
          </Button>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.6rem',
          alignItems: 'center',
          background: 'var(--bg-surface-0)',
          padding: '0.5rem 0.75rem',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-subtle)'
        }}
      >
        <input
          type="text"
          placeholder="Filter nodes by name or Qloo ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            flex: '1 1 200px',
            background: 'var(--bg-surface-1)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-xs)',
            padding: '0.35rem 0.65rem',
            color: 'var(--text-primary)',
            fontSize: '0.8rem',
            outline: 'none'
          }}
        />

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as any)}
          style={{
            background: 'var(--bg-surface-1)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-xs)',
            padding: '0.35rem 0.5rem',
            color: 'var(--text-primary)',
            fontSize: '0.78rem'
          }}
        >
          <option value="ALL">All Types ({graphModel.nodes.length})</option>
          <option value="seed">Seeds ({graphModel.summary.seedCount})</option>
          <option value="candidate_insight">Candidates ({graphModel.summary.candidateCount})</option>
          <option value="resolved_entity">Resolved ({graphModel.summary.resolvedCount})</option>
          <option value="agent_recommendation">Recommendations ({graphModel.summary.recommendationCount})</option>
          <option value="finding">Findings ({graphModel.summary.findingCount})</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          style={{
            background: 'var(--bg-surface-1)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-xs)',
            padding: '0.35rem 0.5rem',
            color: 'var(--text-primary)',
            fontSize: '0.78rem'
          }}
        >
          <option value="ALL">All Statuses</option>
          <option value="PASS">Pass Checks</option>
          <option value="WARNING">Warnings</option>
          <option value="FAIL">Fails</option>
          <option value="UNVERIFIABLE">Unverifiable</option>
        </select>

        {(searchQuery || typeFilter !== 'ALL' || statusFilter !== 'ALL') && (
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setTypeFilter('ALL');
              setStatusFilter('ALL');
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--cyan-primary)',
              fontSize: '0.75rem',
              cursor: 'pointer',
              padding: '0.2rem 0.4rem'
            }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Main Canvas & Provenance Panel Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(450px, 1.8fr) minmax(320px, 1fr)', gap: '1.25rem' }}>
        {/* Graph Canvas */}
        <Panel
          title="Evidence Graph Canvas"
          subtitle={`${filteredNodes.length} nodes shown (${graphModel.summary.substantiatedEdgeCount} substantiated relationships)`}
        >
          {is3DMode ? (
            <Suspense
              fallback={
                <StateFeedback
                  type="loading"
                  title="Initializing 3D View..."
                  description="Loading Three.js WebGL canvas for evidence projection."
                />
              }
            >
              <Lazy3DCanvas
                nodes={filteredNodes}
                edges={graphModel.edges}
                selectedNode={selectedNode}
                onSelectNode={(node) => setSelectedNodeId(node.id)}
                onReturnTo2D={() => setIs3DMode(false)}
              />
            </Suspense>
          ) : (
            <Interactive2DCanvas
              nodes={filteredNodes}
              edges={graphModel.edges}
              selectedNode={selectedNode}
              onSelectNode={(node) => setSelectedNodeId(node.id)}
              onFitViewTrigger={fitViewCount}
            />
          )}
        </Panel>

        {/* Provenance Inspector Panel */}
        <ProvenanceInspectorPanel
          selectedNode={selectedNode}
          connectedEdges={connectedEdges}
          allNodes={graphModel.nodes}
          onSelectNode={(node) => setSelectedNodeId(node.id)}
        />
      </div>

      {/* Keyboard-Accessible Node Table / Registry */}
      <AccessibleNodeTable
        nodes={filteredNodes}
        selectedNode={selectedNode}
        onSelectNode={(node) => setSelectedNodeId(node.id)}
      />
    </div>
  );
};
