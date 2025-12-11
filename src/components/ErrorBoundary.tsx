import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { logger } from '../utils/logger';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  // This static method is called after an error has been thrown by a descendant component.
  // It receives the error that was thrown as a parameter and should return a value to update the state.
  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error: error, errorInfo: null };
  }

  // This method is called after an error has been thrown by a descendant component.
  // It receives two parameters: error (the error that was thrown) and errorInfo (an object with a componentStack property).
  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // You can also log the error to an error reporting service
    logger.error("Uncaught error caught by ErrorBoundary:", error, errorInfo);
    this.setState({ errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div className="min-h-screen flex flex-col items-center justify-center text-center px-4 py-12 bg-red-50 text-red-800 animate-[fadeIn_0.5s]">
          <AlertCircle size={64} className="mb-6 text-red-600" />
          <h1 className="text-3xl font-bold mb-4">Ops! Algo deu errado.</h1>
          <p className="text-lg mb-8 max-w-md">
            Parece que encontramos um erro inesperado. Isso pode ser um problema temporário.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-red-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center gap-2"
          >
            <RefreshCw size={20} /> Tentar recarregar a página
          </button>
          
          {this.state.error && (
            <div className="mt-10 p-6 bg-red-100 border border-red-200 rounded-xl text-left max-w-2xl w-full text-sm">
              <h2 className="font-bold mb-2">Detalhes do Erro:</h2>
              <p className="font-mono text-xs break-all">{this.state.error.toString()}</p>
              {this.state.errorInfo?.componentStack && (
                <div className="mt-4">
                  <h3 className="font-bold mb-2">Component Stack:</h3>
                  <pre className="font-mono text-xs whitespace-pre-wrap bg-red-50 p-3 rounded-lg overflow-auto">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </div>
              )}
              <p className="mt-4 text-xs italic">Por favor, se o problema persistir, envie estas informações para o suporte.</p>
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
