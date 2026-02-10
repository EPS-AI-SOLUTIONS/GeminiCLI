/**
 * GeminiGUI - ErrorBoundary Component
 * @module components/ErrorBoundary
 *
 * React 19 Error Boundary with Matrix/Emerald theme styling.
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI instead of crashing.
 */

import { AlertCircle, RotateCcw } from 'lucide-react';
import { Component, type ErrorInfo, type ReactNode } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface ErrorBoundaryProps {
  children: ReactNode;
  /**
   * Optional callback when an error is caught
   */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /**
   * Optional custom fallback UI renderer
   */
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
  /**
   * Component display name for debugging
   */
  static displayName = 'ErrorBoundary';

  /**
   * Initialize state
   */
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  /**
   * Update state so the next render will show the fallback UI
   */
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  /**
   * Log error details to console
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Store error info
    this.setState((prevState) => ({
      ...prevState,
      errorInfo,
    }));

    // Log to console
    console.group('🚨 [ErrorBoundary] Caught an error');
    console.error('Error Message:', error.message);
    console.error('Error Stack:', error.stack);
    console.error('Component Stack:', errorInfo.componentStack);
    console.groupEnd();

    // Call optional callback
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  /**
   * Reset error state
   */
  handleRetry = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  /**
   * Render method
   */
  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleRetry);
      }

      // Default error UI
      return (
        <div className="error-boundary-container">
          {/* Error Panel */}
          <div className="error-boundary-panel">
            {/* Header with Icon */}
            <div className="error-boundary-header">
              <AlertCircle size={32} className="error-boundary-icon" strokeWidth={1.5} />
              <h1 className="error-boundary-title">Something went wrong</h1>
            </div>

            {/* Error Message */}
            <div className="error-boundary-message">
              <p className="error-boundary-label">Error Details:</p>
              <pre className="error-boundary-code">{this.state.error.message}</pre>
            </div>

            {/* Stack Trace (in development) */}
            {this.state.errorInfo?.componentStack && (
              <details className="error-boundary-details">
                <summary className="error-boundary-summary">Component Stack</summary>
                <pre className="error-boundary-stack">{this.state.errorInfo.componentStack}</pre>
              </details>
            )}

            {/* Action Buttons */}
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

            {/* Help Text */}
            <div className="error-boundary-help">
              <p>If the problem persists, please check the browser console for more details.</p>
            </div>
          </div>

          {/* Background Glow Effect */}
          <div className="error-boundary-glow" />
        </div>
      );
    }

    // No error, render children normally
    return this.props.children;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default ErrorBoundary;
