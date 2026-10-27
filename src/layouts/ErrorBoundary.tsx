import { Component, type ErrorInfo, type ReactNode } from 'react'

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('CompPilot crashed', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-50 px-6">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold text-ink-900">Something went wrong</h1>
          <p className="mt-2 text-sm text-ink-500">An unexpected error occurred. Your inputs are saved in this browser, so reloading should get you back on track.</p>
          <div className="mt-6 flex justify-center gap-2">
            <button onClick={() => window.location.reload()} className="h-10 rounded-lg bg-ink-900 px-4 text-sm font-medium text-white">Reload</button>
            <button
              onClick={() => {
                try { localStorage.removeItem('comppilot:inputs:v1') } catch { /* ignore */ }
                window.location.href = '/'
              }}
              className="h-10 rounded-lg border border-ink-200 bg-white px-4 text-sm font-medium text-ink-800"
            >
              Reset data
            </button>
          </div>
        </div>
      </div>
    )
  }
}
