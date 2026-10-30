import React, { useRef, useState, useEffect } from 'react';
import type { EvidenceGraphNode, EvidenceGraphEdge } from './evidenceGraphModel.js';

interface Interactive2DCanvasProps {
  nodes: EvidenceGraphNode[];
  edges: EvidenceGraphEdge[];
  selectedNode: EvidenceGraphNode | null;
  onSelectNode: (node: EvidenceGraphNode) => void;
  onFitViewTrigger?: number;
}

export const Interactive2DCanvas: React.FC<Interactive2DCanvasProps> = ({
  nodes,
  edges,
  selectedNode,
  onSelectNode,
  onFitViewTrigger
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Pan & Zoom Transform State
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });

  // Reset or Fit view whenever onFitViewTrigger changes
  useEffect(() => {
    handleFitToView();
  }, [onFitViewTrigger]);

  const handleFitToView = () => {
    if (!containerRef.current || nodes.length === 0) {
      setTransform({ x: 0, y: 0, scale: 1 });
      return;
    }

    const { clientWidth, clientHeight } = containerRef.current;
    if (clientWidth === 0 || clientHeight === 0) return;

    // Compute bounding box of all nodes
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    nodes.forEach(n => {
      minX = Math.min(minX, n.x);
      maxX = Math.max(maxX, n.x);
      minY = Math.min(minY, n.y);
      maxY = Math.max(maxY, n.y);
    });

    const graphWidth = Math.max(maxX - minX + 180, 240);
    const graphHeight = Math.max(maxY - minY + 180, 240);

    const scaleX = (clientWidth - 60) / graphWidth;
    const scaleY = (clientHeight - 60) / graphHeight;
    const scale = Math.min(Math.max(Math.min(scaleX, scaleY), 0.4), 1.6);

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    const x = clientWidth / 2 - centerX * scale;
    const y = clientHeight / 2 - centerY * scale;

    setTransform({ x, y, scale });
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    setTransform(prev => ({
      ...prev,
      scale: Math.min(Math.max(prev.scale * zoomFactor, 0.3), 3.0)
    }));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).tagName === 'svg' || (e.target as HTMLElement).id === 'graph-bg') {
      setIsPanning(true);
      setStartPan({ x: e.clientX - transform.x, y: e.clientY - transform.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setTransform(prev => ({
        ...prev,
        x: e.clientX - startPan.x,
        y: e.clientY - startPan.y
      }));
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  // Node Map for fast edge coordinate lookup
  const nodesMap = new Map(nodes.map(n => [n.id, n]));

  // Color helper based on node status and selection
  const getNodeBorderColor = (node: EvidenceGraphNode, isSelected: boolean) => {
    if (isSelected) return '#22d3ee'; // vibrant cyan
    if (!node.substantiated) return '#f43f5e'; // rose
    switch (node.status) {
      case 'PASS': return '#10b981'; // emerald
      case 'WARNING': return '#f59e0b'; // amber
      case 'FAIL': return '#f43f5e'; // rose
      case 'UNVERIFIABLE': return '#a855f7'; // violet
      default: return '#06b6d4';
    }
  };

  const getNodeFilterId = (node: EvidenceGraphNode) => {
    if (node.type === 'seed') return 'url(#glow-cyan)';
    if (!node.substantiated) return 'url(#glow-rose)';
    switch (node.status) {
      case 'PASS': return 'url(#glow-emerald)';
      case 'WARNING': return 'url(#glow-amber)';
      case 'FAIL': return 'url(#glow-rose)';
      case 'UNVERIFIABLE': return 'url(#glow-purple)';
      default: return 'url(#glow-cyan)';
    }
  };

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{
        position: 'relative',
        width: '100%',
        height: '520px',
        background: 'radial-gradient(ellipse at center, rgba(10, 18, 36, 0.75) 0%, rgba(3, 5, 9, 0.95) 85%)',
        borderRadius: '1rem',
        overflow: 'hidden',
        border: '1px solid rgba(255, 255, 255, 0.10)',
        cursor: isPanning ? 'grabbing' : 'grab',
        userSelect: 'none'
      }}
    >
      {/* Zoom / Pan Controls Overlay */}
      <div
        style={{
          position: 'absolute',
          bottom: 14,
          right: 14,
          display: 'flex',
          gap: '0.4rem',
          zIndex: 10,
          background: 'rgba(10, 15, 28, 0.85)',
          backdropFilter: 'blur(16px)',
          padding: '0.35rem',
          borderRadius: '0.5rem',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)'
        }}
      >
        <button
          type="button"
          aria-label="Zoom in"
          onClick={() => setTransform(t => ({ ...t, scale: Math.min(t.scale * 1.2, 3) }))}
          style={{
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#f8fafc',
            borderRadius: '0.375rem',
            width: 28,
            height: 28,
            cursor: 'pointer',
            fontSize: '1rem',
            lineHeight: 1
          }}
        >
          +
        </button>
        <button
          type="button"
          aria-label="Zoom out"
          onClick={() => setTransform(t => ({ ...t, scale: Math.max(t.scale * 0.8, 0.3) }))}
          style={{
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#f8fafc',
            borderRadius: '0.375rem',
            width: 28,
            height: 28,
            cursor: 'pointer',
            fontSize: '1rem',
            lineHeight: 1
          }}
        >
          &minus;
        </button>
        <button
          type="button"
          aria-label="Fit to view"
          onClick={handleFitToView}
          style={{
            background: 'rgba(6, 182, 212, 0.15)',
            border: '1px solid rgba(6, 182, 212, 0.4)',
            color: '#22d3ee',
            borderRadius: '0.375rem',
            padding: '0 0.6rem',
            height: 28,
            fontSize: '0.72rem',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Fit View
        </button>
        <button
          type="button"
          aria-label="Reset pan and zoom"
          onClick={() => setTransform({ x: 0, y: 0, scale: 1 })}
          style={{
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#94a3b8',
            borderRadius: '0.375rem',
            padding: '0 0.5rem',
            height: 28,
            fontSize: '0.72rem',
            cursor: 'pointer'
          }}
        >
          Reset
        </button>
      </div>

      {/* SVG Canvas */}
      <svg
        id="graph-bg"
        width="100%"
        height="100%"
        style={{ display: 'block' }}
      >
        <defs>
          {/* Subtle Cyber Grid Pattern */}
          <pattern id="gridPattern" width="36" height="36" patternUnits="userSpaceOnUse">
            <path d="M 36 0 L 0 0 0 36" fill="none" stroke="rgba(255, 255, 255, 0.035)" strokeWidth="1" />
          </pattern>

          {/* Neon Glow Filters */}
          <filter id="glow-cyan" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#06b6d4" floodOpacity="0.8" />
            <feDropShadow dx="0" dy="0" stdDeviation="12" floodColor="#06b6d4" floodOpacity="0.4" />
          </filter>

          <filter id="glow-emerald" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#10b981" floodOpacity="0.8" />
            <feDropShadow dx="0" dy="0" stdDeviation="12" floodColor="#10b981" floodOpacity="0.4" />
          </filter>

          <filter id="glow-amber" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#f59e0b" floodOpacity="0.8" />
            <feDropShadow dx="0" dy="0" stdDeviation="12" floodColor="#f59e0b" floodOpacity="0.4" />
          </filter>

          <filter id="glow-rose" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#ef4444" floodOpacity="0.8" />
            <feDropShadow dx="0" dy="0" stdDeviation="12" floodColor="#ef4444" floodOpacity="0.4" />
          </filter>

          <filter id="glow-purple" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#a855f7" floodOpacity="0.8" />
            <feDropShadow dx="0" dy="0" stdDeviation="12" floodColor="#a855f7" floodOpacity="0.4" />
          </filter>

          <filter id="edge-particle-glow" x="-100%" y="-100%" width="300%" height="300%">
            <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#22d3ee" floodOpacity="0.9" />
          </filter>

          {/* Node Gradient Fills */}
          <radialGradient id="grad-seed" cx="50%" cy="50%" r="55%">
            <stop offset="0%" stopColor="#083344" />
            <stop offset="100%" stopColor="#050811" />
          </radialGradient>

          <radialGradient id="grad-resolved" cx="50%" cy="50%" r="55%">
            <stop offset="0%" stopColor="#064e3b" />
            <stop offset="100%" stopColor="#050811" />
          </radialGradient>

          <radialGradient id="grad-recommendation" cx="50%" cy="50%" r="55%">
            <stop offset="0%" stopColor="#0c4a6e" />
            <stop offset="100%" stopColor="#050811" />
          </radialGradient>

          <radialGradient id="grad-candidate" cx="50%" cy="50%" r="55%">
            <stop offset="0%" stopColor="#3b0764" />
            <stop offset="100%" stopColor="#050811" />
          </radialGradient>

          <radialGradient id="grad-finding" cx="50%" cy="50%" r="55%">
            <stop offset="0%" stopColor="#451a03" />
            <stop offset="100%" stopColor="#050811" />
          </radialGradient>

          {/* Directed Flow Neon Arrowhead */}
          <marker id="arrow" viewBox="0 0 10 10" refX="24" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#06b6d4" />
          </marker>
        </defs>

        <rect id="graph-bg" width="100%" height="100%" fill="url(#gridPattern)" />

        <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}>
          {/* Dynamic Particle Edge Lines Connecting Nodes */}
          {edges.map(edge => {
            const source = nodesMap.get(edge.sourceId);
            const target = nodesMap.get(edge.targetId);
            if (!source || !target) return null;

            const isSelected = selectedNode?.id === source.id || selectedNode?.id === target.id;
            const strokeColor = isSelected
              ? '#22d3ee'
              : edge.substantiated
              ? 'rgba(6, 182, 212, 0.65)'
              : 'rgba(239, 68, 68, 0.45)';

            const midX = (source.x + target.x) / 2;
            const midY = (source.y + target.y) / 2;

            // Directed path string for SVG animated data particles
            const pathD = `M ${source.x} ${source.y} L ${target.x} ${target.y}`;

            return (
              <g key={edge.id}>
                {/* Base Connection Line */}
                <line
                  x1={source.x}
                  y1={source.y}
                  x2={target.x}
                  y2={target.y}
                  stroke={strokeColor}
                  strokeWidth={isSelected ? 2.5 : 1.4}
                  strokeDasharray={edge.substantiated ? undefined : '5,5'}
                  markerEnd="url(#arrow)"
                />

                {/* Dynamic Data Particle Flow for Substantiated Relationships */}
                {edge.substantiated && (
                  <>
                    <circle r="3" fill="#22d3ee" filter="url(#edge-particle-glow)">
                      <animateMotion
                        dur="2.4s"
                        repeatCount="indefinite"
                        path={pathD}
                      />
                    </circle>
                    <circle r="2" fill="#ffffff" opacity="0.9">
                      <animateMotion
                        dur="2.4s"
                        begin="1.2s"
                        repeatCount="indefinite"
                        path={pathD}
                      />
                    </circle>
                  </>
                )}

                {/* Edge Annotation Badge */}
                {edge.label && (
                  <g transform={`translate(${midX}, ${midY})`}>
                    <rect
                      x={-42}
                      y={-10}
                      width={84}
                      height={20}
                      rx={4}
                      fill="rgba(10, 15, 28, 0.90)"
                      stroke="rgba(255, 255, 255, 0.12)"
                      strokeWidth={1}
                    />
                    <text
                      x={0}
                      y={3.5}
                      fill="#94a3b8"
                      fontSize="9"
                      fontFamily="var(--font-mono)"
                      textAnchor="middle"
                    >
                      {edge.label.length > 14 ? edge.label.slice(0, 13) + '…' : edge.label}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Glowing 2D Node Shapes */}
          {nodes.map(node => {
            const isSelected = selectedNode?.id === node.id;
            const borderColor = getNodeBorderColor(node, isSelected);
            const filterId = getNodeFilterId(node);

            return (
              <g
                key={node.id}
                tabIndex={0}
                role="button"
                aria-label={`${node.type} node: ${node.label}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectNode(node);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectNode(node);
                  }
                }}
                style={{ cursor: 'pointer', outline: 'none' }}
                transform={`translate(${node.x}, ${node.y})`}
              >
                {/* 1. DIAMOND: Seed Anchor */}
                {node.shape === 'diamond' && (
                  <g>
                    {isSelected && (
                      <polygon
                        points="0,-32 32,0 0,32 -32,0"
                        fill="none"
                        stroke="#06b6d4"
                        strokeWidth="1.5"
                        strokeDasharray="4 4"
                        opacity="0.75"
                      />
                    )}
                    <polygon
                      points="0,-25 25,0 0,25 -25,0"
                      fill="url(#grad-seed)"
                      stroke={borderColor}
                      strokeWidth={isSelected ? 3 : 2}
                      filter={filterId}
                    />
                  </g>
                )}

                {/* 2. CIRCLE: Resolved Entity */}
                {node.shape === 'circle' && (
                  <g>
                    {isSelected && (
                      <circle
                        cx={0}
                        cy={0}
                        r={30}
                        fill="none"
                        stroke={borderColor}
                        strokeWidth="1.5"
                        strokeDasharray="4 4"
                        opacity="0.75"
                      />
                    )}
                    <circle
                      cx={0}
                      cy={0}
                      r={isSelected ? 24 : 21}
                      fill="url(#grad-resolved)"
                      stroke={borderColor}
                      strokeWidth={isSelected ? 3 : 2}
                      filter={filterId}
                    />
                    <circle
                      cx={0}
                      cy={0}
                      r={14}
                      fill="none"
                      stroke="rgba(255, 255, 255, 0.15)"
                      strokeDasharray="2 3"
                    />
                  </g>
                )}

                {/* 3. SQUARE: Agent Recommendation */}
                {node.shape === 'square' && (
                  <g>
                    {isSelected && (
                      <rect
                        x={-27}
                        y={-27}
                        width={54}
                        height={54}
                        rx={6}
                        fill="none"
                        stroke="#38bdf8"
                        strokeWidth="1.5"
                        strokeDasharray="4 4"
                        opacity="0.75"
                      />
                    )}
                    <rect
                      x={-21}
                      y={-21}
                      width={42}
                      height={42}
                      rx={4}
                      fill="url(#grad-recommendation)"
                      stroke={borderColor}
                      strokeWidth={isSelected ? 3 : 2}
                      filter={filterId}
                    />
                  </g>
                )}

                {/* 4. ROUND-RECT: Candidate Insight */}
                {node.shape === 'round-rect' && (
                  <g>
                    {isSelected && (
                      <rect
                        x={-30}
                        y={-22}
                        width={60}
                        height={44}
                        rx={10}
                        fill="none"
                        stroke="#a855f7"
                        strokeWidth="1.5"
                        strokeDasharray="4 4"
                        opacity="0.75"
                      />
                    )}
                    <rect
                      x={-25}
                      y={-18}
                      width={50}
                      height={36}
                      rx={7}
                      fill="url(#grad-candidate)"
                      stroke={borderColor}
                      strokeWidth={isSelected ? 3 : 2}
                      filter={filterId}
                    />
                  </g>
                )}

                {/* 5. HEXAGON: Validation Finding */}
                {node.shape === 'hexagon' && (
                  <g>
                    <polygon
                      points="-13,-22 13,-22 24,0 13,22 -13,22 -24,0"
                      fill="url(#grad-finding)"
                      stroke={borderColor}
                      strokeWidth={isSelected ? 3 : 2}
                      filter={filterId}
                    />
                  </g>
                )}

                {/* Status Indicator Icon Glyph inside Node */}
                <text
                  x={0}
                  y={4}
                  fill={borderColor}
                  fontSize="12"
                  fontWeight="700"
                  fontFamily="var(--font-mono)"
                  textAnchor="middle"
                >
                  {node.type === 'seed' ? '◈' :
                   node.status === 'PASS' ? '✓' :
                   node.status === 'FAIL' ? '✕' :
                   node.status === 'WARNING' ? '!' :
                   node.status === 'UNVERIFIABLE' ? '?' : '•'}
                </text>

                {/* Node Label Text */}
                <text
                  x={0}
                  y={34}
                  fill={isSelected ? '#22d3ee' : '#f8fafc'}
                  fontSize="10"
                  fontWeight={isSelected ? 700 : 500}
                  textAnchor="middle"
                  style={{
                    filter: isSelected ? 'drop-shadow(0 1px 4px rgba(6, 182, 212, 0.6))' : undefined
                  }}
                >
                  {node.shortLabel}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
};
