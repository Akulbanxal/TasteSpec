import React from 'react';
import { Panel } from '../common/Panel.js';
import { StatusBadge } from '../common/StatusBadge.js';
import { ShapeIcon } from './ShapeIcon.js';
import type { EvidenceGraphNode } from './evidenceGraphModel.js';

interface AccessibleNodeTableProps {
  nodes: EvidenceGraphNode[];
  selectedNode: EvidenceGraphNode | null;
  onSelectNode: (node: EvidenceGraphNode) => void;
}

export const AccessibleNodeTable: React.FC<AccessibleNodeTableProps> = ({
  nodes,
  selectedNode,
  onSelectNode
}) => {
  return (
    <Panel
      title="Graph Node Registry (Accessible Table)"
      subtitle={`${nodes.length} nodes registered in active evidence graph. Keyboard navigable with Tab and Enter.`}
    >
      <div
        tabIndex={0}
        aria-label="Evidence nodes table scrollable area"
        style={{
          maxHeight: '260px',
          overflowY: 'auto',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-xs)'
        }}
      >
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '0.8rem',
            textAlign: 'left'
          }}
        >
          <thead>
            <tr style={{ background: 'var(--bg-surface-0)', borderBottom: '1px solid var(--border-subtle)', position: 'sticky', top: 0, zIndex: 1 }}>
              <th style={{ padding: '0.5rem 0.75rem', fontWeight: 600, color: 'var(--text-muted)', width: '32px' }}>Shape</th>
              <th style={{ padding: '0.5rem 0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Node Label</th>
              <th style={{ padding: '0.5rem 0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Type</th>
              <th style={{ padding: '0.5rem 0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Status</th>
              <th style={{ padding: '0.5rem 0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Substantiated</th>
              <th style={{ padding: '0.5rem 0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Score / ID</th>
            </tr>
          </thead>
          <tbody>
            {nodes.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No nodes match the active filter criteria.
                </td>
              </tr>
            ) : (
              nodes.map(node => {
                const isSelected = selectedNode?.id === node.id;

                return (
                  <tr
                    key={node.id}
                    tabIndex={0}
                    role="button"
                    aria-pressed={isSelected}
                    onClick={() => onSelectNode(node)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelectNode(node);
                      }
                    }}
                    style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      background: isSelected ? 'var(--bg-surface-3)' : 'transparent',
                      cursor: 'pointer',
                      outline: isSelected ? '1px solid var(--cyan-primary)' : 'none'
                    }}
                  >
                    <td style={{ padding: '0.5rem 0.75rem', verticalAlign: 'middle' }}>
                      <ShapeIcon shape={node.shape} size={14} color="var(--cyan-primary)" />
                    </td>
                    <td style={{ padding: '0.5rem 0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {node.label}
                    </td>
                    <td style={{ padding: '0.5rem 0.75rem', color: 'var(--text-secondary)' }}>
                      {node.type.replace(/_/g, ' ')}
                    </td>
                    <td style={{ padding: '0.5rem 0.75rem' }}>
                      <StatusBadge status={node.status} label={node.status} showIcon={false} />
                    </td>
                    <td style={{ padding: '0.5rem 0.75rem' }}>
                      {node.substantiated ? (
                        <span style={{ color: 'var(--status-pass)', fontSize: '0.75rem' }}>&check; Substantiated</span>
                      ) : (
                        <span style={{ color: 'var(--status-fail)', fontSize: '0.75rem' }}>&times; Unverified</span>
                      )}
                    </td>
                    <td style={{ padding: '0.5rem 0.75rem', fontFamily: 'var(--font-mono)', fontSize: '0.74rem', color: 'var(--cyan-primary)' }}>
                      {node.provenance.rawScore !== undefined
                        ? node.provenance.rawScore.toFixed(3)
                        : node.provenance.qlooId || '—'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
};
