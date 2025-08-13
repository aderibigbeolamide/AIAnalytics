import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    // You can also log the error to an error reporting service here
    // logErrorToService(error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="max-w-md w-full space-y-4">
            <Alert variant="destructive" data-testid="error-boundary">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Something went wrong!</AlertTitle>
              <AlertDescription>
                An unexpected error occurred. Please try reloading the page or contact support if the problem persists.
              </AlertDescription>
            </Alert>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg text-sm">
                <h4 className="font-semibold mb-2">Error Details:</h4>
                <pre className="whitespace-pre-wrap text-red-600 dark:text-red-400">
                  {this.state.error.toString()}
                </pre>
                {this.state.errorInfo && (
                  <details className="mt-2">
                    <summary className="cursor-pointer font-medium">Stack Trace</summary>
                    <pre className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={this.handleReload}
                variant="default"
                className="flex-1"
                data-testid="button-reload"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reload Page
              </Button>
              
              <Button
                onClick={this.handleGoHome}
                variant="outline"
                className="flex-1"
                data-testid="button-home"
              >
                <Home className="h-4 w-4 mr-2" />
                Go Home
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}