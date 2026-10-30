import React from 'react';
import { IconSpinner, IconAlertTriangle } from './Icons.js';
import { Button } from './Button.js';
import { TargetScanner } from './TargetScanner.js';

interface StateFeedbackProps {
  type: 'loading' | 'empty' | 'error';
  title: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
  style?: React.CSSProperties;
}

export const StateFeedback: React.FC<StateFeedbackProps> = ({
  type,
  title,
  description,
  actionText,
  onAction,
  style
}) => {
  if (type === 'empty') {
    return (
      <TargetScanner
        badgeLabel="STANDBY // RADAR SCANNER ACTIVE"
        title={title}
        description={description}
        actionLabel={actionText || 'Re-Run Demo Pass'}
        onAction={onAction}
      />
    );
  }

  const iconMap = {
    loading: <IconSpinner size={28} className="text-cyan" />,
    empty: null,
    error: <IconAlertTriangle size={28} style={{ color: 'var(--status-fail)' }} />
  };

  return (
    <div
      className="cyber-glass-panel rounded-2xl border border-white/10 dark:border-white/10 light:border-black/5"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2.5rem 1.5rem',
        textAlign: 'center',
        gap: '0.75rem',
        color: 'var(--text-secondary)',
        ...style
      }}
    >
      <div style={{ opacity: 0.85 }}>{iconMap[type]}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        <h4 style={{ margin: 0, fontSize: '0.92rem', color: 'var(--text-primary)', fontWeight: 600 }}>
          {title}
        </h4>
        {description && (
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: '420px', lineHeight: 1.4 }}>
            {description}
          </p>
        )}
      </div>
      {actionText && onAction && (
        <Button size="sm" variant="secondary" onClick={onAction} style={{ marginTop: '0.25rem' }}>
          {actionText}
        </Button>
      )}
    </div>
  );
};
