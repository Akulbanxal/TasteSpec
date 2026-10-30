import React from 'react';
import { IconClose } from './Icons.js';

interface DialogProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  actions?: React.ReactNode;
  maxWidth?: string;
}

export const Dialog: React.FC<DialogProps> = ({
  isOpen,
  title,
  onClose,
  children,
  actions,
  maxWidth = '550px'
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        backgroundColor: 'rgba(4, 6, 12, 0.8)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: 'var(--bg-surface-1)',
          border: '1px solid var(--border-medium)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          width: '100%',
          maxWidth,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.85rem 1.25rem',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'var(--bg-surface-0)'
          }}
        >
          <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            {title}
          </h3>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              padding: '0.2rem',
              borderRadius: 'var(--radius-xs)'
            }}
          >
            <IconClose size={16} />
          </button>
        </header>

        <div style={{ padding: '1.25rem', overflowY: 'auto', maxHeight: '75vh' }}>
          {children}
        </div>

        {actions && (
          <footer
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.5rem',
              padding: '0.75rem 1.25rem',
              borderTop: '1px solid var(--border-subtle)',
              background: 'var(--bg-surface-0)'
            }}
          >
            {actions}
          </footer>
        )}
      </div>
    </div>
  );
};
