import { useEffect, type ReactNode } from 'react';
import { Link } from 'react-router';
import { ArrowLeft } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  subtitle?: ReactNode;

  actions?: ReactNode;
  back?: { to: string; label: string };
}

export function PageHeader({ title, subtitle, actions, back }: PageHeaderProps) {
  useEffect(() => {
    document.title = `${title} · FarmPlan`;
  }, [title]);

  return (
    <div className="mb-6">
      {back && (
        <Link
          to={back.to}
          className="mb-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-fg hover:underline"
        >
          <ArrowLeft size={14} aria-hidden />
          {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-ink tracking-tight break-words">{title}</h1>
          {subtitle && <p className="text-xs text-ink-muted mt-1">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
