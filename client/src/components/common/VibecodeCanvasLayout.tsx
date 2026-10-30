import React from 'react';

export interface VibecodeCanvasLayoutProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * VibecodeCanvasLayout
 * Unified developer canvas layout wrapper with fixed-position background layer,
 * multi-color radial mesh light pools (Cyan, Violet, Emerald),
 * and 36px x 36px perspective grid with subtle radial fade mask.
 */
export const VibecodeCanvasLayout: React.FC<VibecodeCanvasLayoutProps> = ({
  children,
  className = ''
}) => {
  return (
    <div className={`relative min-h-[calc(100vh-6rem)] w-full bg-transparent text-[var(--text-primary)] ${className}`}>
      {/* 1. Fixed-Position Background Canvas Layer */}
      <div className="fixed inset-0 pointer-events-none z-0" aria-hidden="true">
        {/* 2. Multi-color Radial Mesh Light Pools */}
        <div className="absolute inset-0 ambient-mesh-overlay" />

        {/* 3. Perspective Grid Pattern (36px x 36px) with Subtle Radial Fade Mask */}
        <div className="absolute inset-0 perspective-grid-overlay opacity-60 dark:opacity-60" />

        {/* Scanline Screen Effect Layer */}
        <div className="absolute inset-0 scanline-layer opacity-10 dark:opacity-20" />
      </div>

      {/* 4. Interactive Content Canvas (Transparent Container) */}
      <div className="relative z-10 w-full space-y-6 bg-transparent">
        {children}
      </div>
    </div>
  );
};

export default VibecodeCanvasLayout;

