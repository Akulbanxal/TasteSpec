import React from 'react';
import { type NodeShape } from './evidenceGraphModel.js';

interface ShapeIconProps {
  shape: NodeShape;
  size?: number;
  color?: string;
  className?: string;
}

export const ShapeIcon: React.FC<ShapeIconProps> = ({
  shape,
  size = 14,
  color = 'currentColor',
  className = ''
}) => {
  const half = size / 2;

  switch (shape) {
    case 'diamond': // Seed
      return (
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className={className}
          aria-hidden="true"
          style={{ filter: 'drop-shadow(0 0 4px rgba(6, 182, 212, 0.4))' }}
        >
          <polygon
            points={`${half},1.5 ${size - 1.5},${half} ${half},${size - 1.5} 1.5,${half}`}
            fill={color}
            stroke="rgba(255, 255, 255, 0.25)"
            strokeWidth="1"
          />
        </svg>
      );
    case 'circle': // Resolved Entity
      return (
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className={className}
          aria-hidden="true"
          style={{ filter: 'drop-shadow(0 0 4px rgba(16, 185, 129, 0.4))' }}
        >
          <circle
            cx={half}
            cy={half}
            r={half - 1.5}
            fill={color}
            stroke="rgba(255, 255, 255, 0.25)"
            strokeWidth="1"
          />
        </svg>
      );
    case 'round-rect': // Candidate Insight
      return (
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className={className}
          aria-hidden="true"
          style={{ filter: 'drop-shadow(0 0 4px rgba(139, 92, 246, 0.4))' }}
        >
          <rect
            x="1.5"
            y="1.5"
            width={size - 3}
            height={size - 3}
            rx="3"
            fill={color}
            stroke="rgba(255, 255, 255, 0.25)"
            strokeWidth="1"
          />
        </svg>
      );
    case 'square': // Agent Recommendation
      return (
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className={className}
          aria-hidden="true"
          style={{ filter: 'drop-shadow(0 0 4px rgba(56, 189, 248, 0.4))' }}
        >
          <rect
            x="1.5"
            y="1.5"
            width={size - 3}
            height={size - 3}
            rx="2"
            fill={color}
            stroke="rgba(255, 255, 255, 0.25)"
            strokeWidth="1"
          />
        </svg>
      );
    case 'hexagon': // Finding
    default:
      return (
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className={className}
          aria-hidden="true"
          style={{ filter: 'drop-shadow(0 0 4px rgba(245, 158, 11, 0.4))' }}
        >
          <polygon
            points={`${half * 0.5},1 ${half * 1.5},1 ${size - 1},${half} ${half * 1.5},${size - 1} ${half * 0.5},${size - 1} 1,${half}`}
            fill={color}
            stroke="rgba(255, 255, 255, 0.25)"
            strokeWidth="1"
          />
        </svg>
      );
  }
};
