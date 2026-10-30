import React from 'react';
import { IconCheck, IconAlertTriangle, IconXCircle, IconHelpCircle } from './Icons.js';

export type BadgeStatus = 'PASS' | 'WARNING' | 'FAIL' | 'UNVERIFIABLE' | 'LIVE' | 'FIXTURE' | 'NEUTRAL';

interface StatusBadgeProps {
  status: BadgeStatus;
  label?: string;
  count?: number;
  showIcon?: boolean;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  count,
  showIcon = true,
  className
}) => {
  const displayLabel = label || status;

  const styleMap: Record<BadgeStatus, { bg: string; border: string; text: string; icon: React.ReactNode }> = {
    PASS: {
      bg: 'var(--status-pass-subtle)',
      border: 'var(--status-pass-border)',
      text: 'var(--status-pass)',
      icon: <IconCheck size={12} />
    },
    WARNING: {
      bg: 'var(--status-warn-subtle)',
      border: 'var(--status-warn-border)',
      text: 'var(--status-warn)',
      icon: <IconAlertTriangle size={12} />
    },
    FAIL: {
      bg: 'var(--status-fail-subtle)',
      border: 'var(--status-fail-border)',
      text: 'var(--status-fail)',
      icon: <IconXCircle size={12} />
    },
    UNVERIFIABLE: {
      bg: 'var(--status-unverified-subtle)',
      border: 'var(--status-unverified-border)',
      text: 'var(--status-unverified)',
      icon: <IconHelpCircle size={12} />
    },
    LIVE: {
      bg: 'rgba(6, 182, 212, 0.12)',
      border: 'rgba(6, 182, 212, 0.35)',
      text: 'var(--cyan-primary)',
      icon: <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--cyan-primary)', display: 'inline-block' }} />
    },
    FIXTURE: {
      bg: 'rgba(245, 158, 11, 0.12)',
      border: 'rgba(245, 158, 11, 0.35)',
      text: 'var(--status-warn)',
      icon: <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--status-warn)', display: 'inline-block' }} />
    },
    NEUTRAL: {
      bg: 'var(--bg-surface-2)',
      border: 'var(--border-subtle)',
      text: 'var(--text-secondary)',
      icon: null
    }
  };

  const current = styleMap[status] || styleMap.NEUTRAL;

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem',
        padding: '0.2rem 0.55rem',
        borderRadius: 'var(--radius-xs)',
        fontSize: '0.72rem',
        fontWeight: 600,
        letterSpacing: '0.03em',
        fontFamily: 'var(--font-mono)',
        backgroundColor: current.bg,
        border: `1px solid ${current.border}`,
        color: current.text,
        lineHeight: 1
      }}
    >
      {showIcon && current.icon}
      <span>{displayLabel}</span>
      {count !== undefined && (
        <span
          style={{
            marginLeft: '0.2rem',
            padding: '0.05rem 0.3rem',
            borderRadius: 'var(--radius-xs)',
            background: 'var(--badge-bg-neutral)',
            fontSize: '0.7rem'
          }}
        >
          {count}
        </span>
      )}
    </span>
  );
};
