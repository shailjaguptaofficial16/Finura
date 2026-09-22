import React from 'react';
import { ShieldAlert, RefreshCw, Home } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Platform Unhandled Crash Caught:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  handleHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0b0f17] flex items-center justify-center p-4 font-sans text-white relative overflow-hidden">
          {/* Neon Glow Effects */}
          <div className="absolute -top-40 -left-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-md w-full bg-[#0d121f]/90 border border-cyan-500/30 rounded-2xl p-6 sm:p-8 shadow-[0_0_50px_rgba(6,182,212,0.15)] backdrop-blur-md text-center space-y-6">
            
            <div className="w-16 h-16 rounded-full bg-cyan-950/50 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mx-auto shadow-[0_0_15px_rgba(6,182,212,0.3)] animate-pulse">
              <ShieldAlert size={32} />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
                Platform Interface Error
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                An unexpected runtime exception was caught by the Finura security layer. Your account data remains secure.
              </p>
            </div>

            {/* Error Message Details */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 text-left">
              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 block mb-1">
                Exception Log
              </span>
              <p className="text-xs font-mono text-red-400 break-all leading-normal">
                {this.state.error?.toString() || 'Unknown Javascript Error'}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-semibold py-2.5 px-4 rounded-xl shadow-md transition cursor-pointer text-sm"
              >
                <RefreshCw size={15} />
                <span>Reload Platform</span>
              </button>
              <button
                type="button"
                onClick={this.handleHome}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 font-semibold py-2.5 px-4 rounded-xl transition cursor-pointer text-sm"
              >
                <Home size={15} />
                <span>Return Home</span>
              </button>
            </div>

          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
