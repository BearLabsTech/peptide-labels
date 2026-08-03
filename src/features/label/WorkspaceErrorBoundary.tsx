import { Component, type ErrorInfo, type ReactNode } from 'react'
import './WorkspaceErrorBoundary.css'

export interface WorkspaceErrorBoundaryProps {
  children: ReactNode
}

interface WorkspaceErrorBoundaryState {
  hasError: boolean
}

/**
 * Recoverable safety net around the workspace root. Catches unexpected throws
 * (present or future) so the user sees a reload action instead of a white screen.
 * Known recoverable failures should still return Result at their source — this
 * boundary is not a substitute for that.
 */
export class WorkspaceErrorBoundary extends Component<
  WorkspaceErrorBoundaryProps,
  WorkspaceErrorBoundaryState
> {
  state: WorkspaceErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): WorkspaceErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Workspace error boundary caught an error', error, info.componentStack)
  }

  private handleReload = (): void => {
    window.location.reload()
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="workspace-error-boundary" role="alert">
          <h1 className="workspace-error-boundary__title">Something went wrong</h1>
          <p className="workspace-error-boundary__body">
            The workspace hit an unexpected error. Reload to continue.
          </p>
          <button
            type="button"
            className="btn-primary workspace-error-boundary__reload"
            onClick={this.handleReload}
          >
            Reload
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
