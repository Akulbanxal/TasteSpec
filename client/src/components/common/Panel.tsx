import React from 'react';

interface PanelProps {
  title?: React.ReactNode;
  subtitle?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  footer?: React.ReactNode;
  compact?: boolean;
}

export const Panel: React.FC<PanelProps> = ({
  title,
  subtitle,
  badge,
  actions,
  children,
  className = '',
  style,
  footer,
  compact = false
}) => {
  return (
    <section
      className={`cyber-glass-panel rounded-2xl overflow-hidden ${className}`.trim()}
      style={{
        display: 'flex',
        flexDirection: 'column',
        ...style
      }}
    >
      {(title || actions || badge) && (
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: compact ? '0.6rem 0.85rem' : '0.85rem 1.15rem',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'var(--bg-surface-0)',
            gap: '0.75rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
            {title && (
              <h2
                style={{
                  margin: 0,
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  letterSpacing: '0.01em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem'
                }}
              >
                {title}
              </h2>
            )}
            {badge}
            {subtitle && (
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {subtitle}
              </span>
            )}
          </div>
          {actions && <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>{actions}</div>}
        </header>
      )}

      <div
        style={{
          padding: compact ? '0.75rem' : '1.15rem',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'auto'
        }}
      >
        {children}
      </div>

      {footer && (
        <footer
          style={{
            padding: '0.6rem 1rem',
            borderTop: '1px solid var(--border-subtle)',
            background: 'var(--bg-surface-0)',
            fontSize: '0.75rem',
            color: 'var(--text-muted)'
          }}
        >
          {footer}
        </footer>
      )}
    </section>
  );
};
