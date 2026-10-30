import React from 'react';
import { IconSpinner } from './Icons.js';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'secondary',
  size = 'md',
  loading = false,
  icon,
  disabled,
  style,
  ...props
}) => {
  const sizeStyles: Record<string, React.CSSProperties> = {
    sm: { padding: '0.35rem 0.65rem', fontSize: '0.78rem' },
    md: { padding: '0.55rem 1rem', fontSize: '0.85rem' },
    lg: { padding: '0.75rem 1.4rem', fontSize: '0.95rem' }
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    primary: {
      background: 'linear-gradient(135deg, var(--cyan-primary) 0%, #0284c7 100%)',
      color: '#04111d',
      fontWeight: 600,
      border: '1px solid rgba(255, 255, 255, 0.2)',
      boxShadow: 'var(--shadow-accent)'
    },
    secondary: {
      background: 'var(--bg-surface-2)',
      color: 'var(--text-primary)',
      border: '1px solid var(--border-medium)',
      fontWeight: 500
    },
    outline: {
      background: 'transparent',
      color: 'var(--cyan-primary)',
      border: '1px solid var(--border-cyan)',
      fontWeight: 500
    },
    danger: {
      background: 'var(--status-fail-subtle)',
      color: 'var(--status-fail)',
      border: '1px solid var(--status-fail-border)',
      fontWeight: 500
    },
    ghost: {
      background: 'transparent',
      color: 'var(--text-secondary)',
      border: '1px solid transparent',
      fontWeight: 500
    }
  };

  return (
    <button
      disabled={disabled || loading}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.45rem',
        borderRadius: 'var(--radius-sm)',
        fontFamily: 'var(--font-sans)',
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'all var(--transition-fast)',
        userSelect: 'none',
        ...sizeStyles[size],
        ...variantStyles[variant],
        ...style
      }}
      {...props}
    >
      {loading ? <IconSpinner size={14} /> : icon}
      <span>{children}</span>
    </button>
  );
};
