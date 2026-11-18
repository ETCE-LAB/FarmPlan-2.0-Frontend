import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@farm/components/shared/PageHeader';
import { Card } from '@farm/components/ui/Card';
import { useSessionStore } from '@farm/store/useSessionStore';

/** Hides routes that need an account. Authorization itself is enforced by the backend. */
export function RequireAuth({
  children,
  guestTitle,
  guestMessage,
}: {
  children: ReactNode;
  /** Shown to guest sessions instead of the page; defaults to the farm wording. */
  guestTitle?: string;
  guestMessage?: string;
}) {
  const { t } = useTranslation();
  const location = useLocation();
  const session = useSessionStore((s) => s.session);
  const status = useSessionStore((s) => s.status);

  if (status === 'restoring') {
    return <output className="block py-10 text-center text-sm text-ink-muted">{t('auth.restoring')}</output>;
  }
  if (!session) {
    const from = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?from=${encodeURIComponent(from)}`} replace />;
  }
  if (session.user.accountType === 'guest') {
    return (
      <>
        <PageHeader title={guestTitle ?? t('nav.farms.title')} />
        <Card className="max-w-xl">
          <p className="text-sm text-ink-soft">{guestMessage ?? t('auth.guestNotAllowed')}</p>
        </Card>
      </>
    );
  }
  return children;
}
