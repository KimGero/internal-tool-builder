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
    console.error('🚨 CRITICAL APP ERROR:', error, errorInfo)
  }

  handleReset = () => {
    console.log("🔄 Performing full dashboard reset...")

    // Clear ALL possible stored data
    try {
      Object.keys(localStorage).forEach(key => {
        if (key.includes('internal-tool-builder') || key.includes('zustand')) {
          localStorage.removeItem(key)
        }
      })
      localStorage.clear() // Nuclear option
    } catch (e) {
      console.error("Failed to clear localStorage", e)
    }

    // Force hard reload with cache bypass
    window.location.href = window.location.href.split('?')[0] + '?reset=' + Date.now()
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen flex-col items-center justify-center bg-[var(--sh)] p-8 text-center">
          <div className="mb-6 text-8xl">😵</div>
          
          <h2 className="mb-4 text-3xl font-semibold text-red-600">App Crashed</h2>
          <p className="mb-10 max-w-md text-[var(--sh-t)]">
            A critical error occurred.<br />
            Use the button below to reset everything.
          </p>

          <div className="flex gap-4">
            <button
              onClick={this.handleReset}
              className="rounded-lg bg-red-600 px-8 py-3.5 text-white font-medium hover:bg-red-700 active:scale-95 transition-all shadow-lg"
            >
              Reset Dashboard (Clear Everything)
            </button>
            
            <button
              onClick={this.handleReload}
              className="rounded-lg border border-[var(--sh-b)] px-8 py-3.5 font-medium hover:bg-[var(--sh-s)] active:scale-95 transition-all"
            >
              Just Reload
            </button>
          </div>

          {this.state.error && (
            <pre className="mt-12 max-w-2xl rounded border border-red-300 bg-red-50 p-4 text-left text-xs text-red-700 overflow-auto">
              {this.state.error.message}
            </pre>
          )}
        </div>
      )
    }

    return this.props.children
  }
}