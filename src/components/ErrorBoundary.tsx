import { AlertTriangle, RefreshCw, RotateCcw } from 'lucide-react'
import { Component, type ErrorInfo, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from './ui/button'

export interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

function ErrorFallback({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation()

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-6 text-foreground">
      <div
        role="alert"
        className="w-full max-w-md space-y-4 rounded-lg border bg-card p-6 shadow-sm"
      >
        <AlertTriangle aria-hidden="true" className="size-8 text-destructive" />
        <div className="space-y-1.5">
          <h1 className="text-lg font-semibold">{t('errorBoundaryTitle')}</h1>
          <p className="text-sm text-muted-foreground">
            {t('errorBoundaryDescription')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => window.location.reload()}>
            <RefreshCw aria-hidden="true" />
            {t('errorBoundaryReload')}
          </Button>
          <Button type="button" variant="outline" onClick={onRetry}>
            <RotateCcw aria-hidden="true" />
            {t('errorBoundaryTryAgain')}
          </Button>
        </div>
      </div>
    </div>
  )
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Unhandled application error', error, errorInfo)
  }

  handleRetry = (): void => {
    this.setState({ hasError: false })
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return <ErrorFallback onRetry={this.handleRetry} />
    }

    return this.props.children
  }
}
