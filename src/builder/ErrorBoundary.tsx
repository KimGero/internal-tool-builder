import React from 'react'

interface Props {
  children: React.ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🚨 App Error:', error, errorInfo)
  }

  reset = () => {
    window.location.reload() // Full reset (safest for now)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full flex-col items-center justify-center bg-[var(--sh)] p-8 text-center">
          <div className="mb-6 text-6xl">😵</div>
          <h2 className="mb-2 text-2xl font-semibold text-[var(--err)]">Something went wrong</h2>
          <p className="mb-8 max-w-md text-[var(--sh-t)]">
            The app encountered an unexpected error. This usually happens with complex expressions or data issues.
          </p>
          
          <div className="flex gap-4">
            <button
              onClick={this.reset}
              className="rounded-lg bg-[var(--err)] px-6 py-3 text-white font-medium hover:bg-red-700 transition-colors"
            >
              Reset Dashboard
            </button>
            <button
              onClick={() => window.location.reload()}
              className="rounded-lg border border-[var(--sh-b)] px-6 py-3 text-[var(--sh-ts)] hover:bg-[var(--sh-s)]"
            >
              Reload Page
            </button>
          </div>

          {this.state.error && (
            <pre className="mt-8 max-w-2xl overflow-auto rounded border border-[var(--sh-b)] bg-[var(--sh)] p-4 text-left text-xs text-[var(--sh-td)]">
              {this.state.error.message}
            </pre>
          )}
        </div>
      )
    }

    return this.props.children
  }
}