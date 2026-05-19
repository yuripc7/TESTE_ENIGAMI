import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
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

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#0D0E12] text-white p-8">
          <div className="max-w-md text-center space-y-4">
            <span className="material-symbols-outlined text-6xl text-red-500">error</span>
            <h1 className="text-2xl font-bold font-square tracking-widest">ERRO INESPERADO</h1>
            <p className="text-gray-400 text-sm">
              {this.state.error?.message || 'Algo deu errado na aplicação.'}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="px-6 py-2 bg-orange-500 text-white rounded-full font-bold hover:bg-orange-600 transition-colors"
            >
              RECARREGAR
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
