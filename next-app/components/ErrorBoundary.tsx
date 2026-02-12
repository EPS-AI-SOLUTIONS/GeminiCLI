/**
 * ClaudeHydra - ErrorBoundary Component
 * @module components/ErrorBoundary
 *
 * React 19 Error Boundary with Matrix/Emerald theme styling.
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI instead of crashing.
 */

import './ErrorBoundary.css';

import { AlertCircle, RotateCcw } from 'lucide-react';
import { Component, type ErrorInfo, type ReactNode } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface ErrorBoundaryProps {
  children: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  fallback?: (error: Error, retry: () => void) => ReactNode;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

// ============================================================================
// COMPONENT
// ============================================================================

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  static displayName = 'ErrorBoundary';

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState((prevState) => ({ ...prevState, errorInfo }));

    console.group('🚨 [ErrorBoundary] Caught an error');
    console.error('Error Message:', error.message);
    console.error('Error Stack:', error.stack);
    console.error('Component Stack:', errorInfo.componentStack);
    console.groupEnd();

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleRetry);
      }

      return (
        <div className="error-boundary-container">
          <div className="error-boundary-panel">
            <div className="error-boundary-header">
              <AlertCircle size={32} className="error-boundary-icon" strokeWidth={1.5} />
              <h1 className="error-boundary-title">Something went wrong</h1>
            </div>

            <div className="error-boundary-message">
              <p className="error-boundary-label">Error Details:</p>
              <pre className="error-boundary-code">{this.state.error.message}</pre>
            </div>

            {this.state.errorInfo?.componentStack && (
              <details className="error-boundary-details">
                <summary className="error-boundary-summary">Component Stack</summary>
                <pre className="error-boundary-stack">{this.state.errorInfo.componentStack}</pre>
              </details>
            )}

            <div className="error-boundary-actions">
              <button
                onClick={this.handleRetry}
                className="error-boundary-button retry-button"
                type="button"
                title="Retry loading the component"
              >
                <RotateCcw size={18} />
                <span>Retry</span>
              </button>
              <button
                onClick={() => window.location.reload()}
                className="error-boundary-button reload-button"
                type="button"
                title="Reload the entire application"
              >
                <span>Reload Page</span>
              </button>
            </div>

            <div className="error-boundary-help">
              <p>If the problem persists, please check the browser console for more details.</p>
            </div>
          </div>
          <div className="error-boundary-glow" />
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
