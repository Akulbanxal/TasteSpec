import React, { useState } from 'react';
import { IconCopy, IconCheck } from './Icons.js';

interface CodeViewerProps {
  code: string;
  language?: string;
  maxHeight?: string;
  title?: string;
  showLineNumbers?: boolean;
}

export const CodeViewer: React.FC<CodeViewerProps> = ({
  code,
  language = 'json',
  maxHeight = '280px',
  title,
  showLineNumbers = false
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const lines = code.split('\n');

  return (
    <div
      style={{
        background: 'var(--code-bg)',
        border: '1px solid var(--code-border)',
        borderRadius: 'var(--radius-sm)',
        overflow: 'hidden',
        fontFamily: 'var(--font-mono)',
        fontSize: '0.78rem'
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.4rem 0.75rem',
          background: 'var(--bg-surface-0)',
          borderBottom: '1px solid var(--border-subtle)',
          color: 'var(--text-muted)',
          fontSize: '0.72rem'
        }}
      >
        <span style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {title || language}
        </span>
        <button
          onClick={handleCopy}
          aria-label="Copy code"
          style={{
            background: 'transparent',
            border: 'none',
            color: copied ? 'var(--status-pass)' : 'var(--text-muted)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem',
            padding: '0.15rem 0.35rem',
            borderRadius: 'var(--radius-xs)',
            fontSize: '0.7rem'
          }}
        >
          {copied ? <IconCheck size={12} /> : <IconCopy size={12} />}
          <span>{copied ? 'COPIED' : 'COPY'}</span>
        </button>
      </div>

      <pre
        style={{
          margin: 0,
          padding: '0.75rem',
          maxHeight,
          overflow: 'auto',
          color: 'var(--code-text)',
          lineHeight: 1.5,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word'
        }}
      >
        {showLineNumbers ? (
          lines.map((line, idx) => (
            <div key={idx} style={{ display: 'flex', gap: '0.75rem' }}>
              <span style={{ color: 'var(--text-disabled)', userSelect: 'none', width: '2rem', textAlign: 'right' }}>
                {idx + 1}
              </span>
              <span>{line}</span>
            </div>
          ))
        ) : (
          code
        )}
      </pre>
    </div>
  );
};
