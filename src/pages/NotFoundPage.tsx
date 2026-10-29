import { Link } from 'react-router';
import { MapPinOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@farm/components/shared/PageHeader';
import { Card } from '@farm/components/ui/Card';
import { buttonClass } from '@farm/components/ui/buttonClass';

export default function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <>
      <PageHeader title={t('pages.notFound.title')} />
      <Card className="max-w-xl">
        <div className="flex items-start gap-3">
          <MapPinOff size={24} aria-hidden className="text-ink-muted shrink-0" />
          <div className="space-y-3">
            <p className="text-sm text-ink-soft">{t('pages.notFound.message')}</p>
            <Link to="/" className={buttonClass('primary')}>
              {t('pages.notFound.home')}
            </Link>
          </div>
        </div>
      </Card>
    </>
  );
}
