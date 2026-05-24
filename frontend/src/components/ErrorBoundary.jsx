import React from 'react';
import { AlertCircle, Home } from 'lucide-react';
import { Button } from './ui/button';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    this.setState((prevState) => ({
      error,
      errorInfo,
      errorCount: prevState.errorCount + 1
    }));

    // TODO: Send error to Sentry or analytics in production
    // if (process.env.NODE_ENV === 'production') {
    //   Sentry.captureException(error, { contexts: { react: errorInfo } });
    // }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  handleNavigateHome = () => {
    this.handleReset();
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-background p-4">
          <div className="w-full max-w-md bg-card border border-destructive/20 rounded-lg shadow-lg p-8 space-y-6">
            {/* Error Icon */}
            <div className="flex justify-center">
              <div className="bg-destructive/10 p-3 rounded-full">
                <AlertCircle className="w-8 h-8 text-destructive" />
              </div>
            </div>

            {/* Error Title */}
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold">Something went wrong</h1>
              <p className="text-sm text-muted-foreground">
                We encountered an unexpected error. Please try again or return to the home page.
              </p>
            </div>

            {/* Error Details (Development Only) */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4 space-y-2 max-h-48 overflow-auto">
                <p className="text-xs font-mono text-destructive font-semibold">Error Details:</p>
                <p className="text-xs font-mono text-muted-foreground break-all">
                  {this.state.error.toString()}
                </p>
                {this.state.errorInfo?.componentStack && (
                  <>
                    <p className="text-xs font-mono text-destructive font-semibold mt-2">Component Stack:</p>
                    <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap break-all">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </>
                )}
              </div>
            )}

            {/* Error Count Warning */}
            {this.state.errorCount > 3 && (
              <div className="bg-warning/10 border border-warning/20 rounded-lg p-3">
                <p className="text-xs text-warning font-semibold">
                  ⚠️ Multiple errors detected ({this.state.errorCount}). Consider refreshing the page.
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col gap-3">
              <Button
                onClick={this.handleReset}
                variant="default"
                className="w-full"
              >
                Try Again
              </Button>
              <Button
                onClick={this.handleNavigateHome}
                variant="outline"
                className="w-full"
              >
                <Home className="w-4 h-4 mr-2" />
                Go to Home
              </Button>
            </div>

            {/* Help Text */}
            <p className="text-xs text-muted-foreground text-center">
              If the problem persists, please clear your browser cache or contact support.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
