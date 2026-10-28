import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Link } from 'react-router';
import { RotateCcw, TriangleAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@farm/components/ui/Button';
import { Card } from '@farm/components/ui/Card';

function ErrorFallback({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <Card className="max-w-2xl">
      <div role="alert" className="flex items-start gap-3">
        <TriangleAlert size={24} aria-hidden className="text-danger-fg shrink-0" />
        <div className="space-y-2">
          <h1 className="text-lg font-bold text-ink">{t('errors.title')}</h1>
          <p className="text-sm text-ink-soft">{t('errors.message')}</p>
          <pre className="text-[11px] text-ink-muted bg-surface-sunken rounded p-2 whitespace-pre-wrap">
            {error.message}
          </pre>
          <div className="flex gap-2 pt-2">
            <Button icon={RotateCcw} onClick={onRetry}>
              {t('errors.retry')}
            </Button>
            <Link to="/" className="text-xs font-semibold text-brand-fg hover:underline self-center">
              {t('errors.home')}
            </Link>
          </div>
        </div>
      </div>
    </Card>
  );
}

interface ErrorBoundaryProps {
  children: ReactNode;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Page crashed', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return <ErrorFallback error={this.state.error} onRetry={() => this.setState({ error: null })} />;
    }
    return this.props.children;
  }
}
