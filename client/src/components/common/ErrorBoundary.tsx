import React, { Component, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-xl mx-auto my-12 p-6 rounded-2xl bg-slate-900/90 border border-rose-500/40 shadow-2xl backdrop-blur-xl text-slate-100 flex flex-col items-center text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold font-mono text-white">
              {this.props.fallbackTitle || 'View Recovery Shield'}
            </h2>
            <p className="text-xs text-slate-300 font-sans max-w-md">
              An unexpected rendering exception was caught. TasteSpec recovered the canvas state.
            </p>
          </div>
          {this.state.error && (
            <div className="w-full text-left p-3 rounded-lg bg-black/60 border border-white/10 font-mono text-[11px] text-rose-300 overflow-x-auto max-h-32">
              {this.state.error.message}
            </div>
          )}
          <button
            type="button"
            onClick={this.handleReset}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 font-mono text-xs font-bold text-white shadow-lg hover:shadow-cyan-500/30 transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reload Testbench</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
