import { useRef } from 'react';
import { CircleCheck, DatabaseBackup, Download, Monitor, Moon, Server, Settings, Sun, Upload } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { PageHeader } from '@farm/components/shared/PageHeader';
import { Card } from '@farm/components/ui/Card';
import { Button } from '@farm/components/ui/Button';
import { SelectField, TextField } from '@farm/components/ui/FormField';
import { backupFileName, createBackup, parseBackup } from '@farm/lib/backup';
import { API_BASE_URL } from '@farm/lib/api/client';
import { downloadJson } from '@farm/lib/download';
import { cn } from '@farm/lib/utils';
import { importBackup } from '@farm/store/farmSync';
import { useFarmStore } from '@farm/store/useFarmStore';
import { useSessionUser } from '@farm/store/useSessionStore';
import { confirmAction, showToast } from '@farm/store/useUiStore';
import type { Language, ThemePreference } from '@farm/types';

const THEME_OPTIONS = [
  { value: 'system', icon: Monitor },
  { value: 'light', icon: Sun },
  { value: 'dark', icon: Moon },
] as const satisfies { value: ThemePreference; icon: unknown }[];

function BackupCard() {
  const { t, i18n } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const farms = useFarmStore((s) => s.farms);
  const fields = useFarmStore((s) => s.fields);
  const user = useSessionUser();

  const handleDownload = () => {
    downloadJson(backupFileName(), createBackup(useFarmStore.getState().snapshot()));
    showToast({ message: t('backup.downloaded') });
  };

  const handleUpload = async (file: File) => {
    const result = parseBackup(await file.text());
    if (!result.ok) {
      showToast({ tone: 'error', message: t(`backup.errors.${result.error}`) });
      return;
    }
    const confirmed = await confirmAction({
      title: t('backup.confirmTitle'),
      message: t('backup.confirmMessage', {
        farms: result.data.farms.length,
        fields: result.data.fields.length,
        date: new Date(result.exportedAt).toLocaleString(i18n.language),
      }),
      confirmLabel: t('backup.restore'),
      cancelLabel: t('common.cancel'),
      tone: 'danger',
    });
    if (!confirmed) return;
    if (!user) {
      showToast({ tone: 'error', message: t('backup.loginRequired') });
      return;
    }
    const { created, failed } = await importBackup(result.data);
    if (created > 0) showToast({ message: t('backup.restored', { count: created }) });
    if (failed > 0) showToast({ tone: 'error', message: t('backup.restoreFailed', { count: failed }) });
  };

  return (
    <Card title={t('backup.title')} icon={DatabaseBackup}>
      <p className="text-xs text-ink-soft">{t('backup.description')}</p>
      <p className="mt-2 text-xs text-ink-muted">
        {t('backup.current', { farms: farms.length, fields: fields.length })}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button icon={Download} onClick={handleDownload}>
          {t('backup.download')}
        </Button>
        <Button variant="secondary" icon={Upload} onClick={() => inputRef.current?.click()}>
          {t('backup.upload')}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          aria-hidden
          tabIndex={-1}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) void handleUpload(file);
          }}
        />
      </div>
    </Card>
  );
}

export default function SettingsPage() {
  const { t } = useTranslation();
  const language = useFarmStore((s) => s.language);
  const setLanguage = useFarmStore((s) => s.setLanguage);
  const theme = useFarmStore((s) => s.theme);
  const setTheme = useFarmStore((s) => s.setTheme);
  const user = useSessionUser();

  return (
    <>
      <PageHeader title={t('nav.settings.title')} subtitle={t('nav.settings.subtitle')} />
      <div className="max-w-4xl space-y-6">
        <Card title={t('settings.preferencesTitle')} icon={Settings}>
          <SelectField
            label={t('common.language')}
            hint={t('settings.languageHint')}
            value={language}
            onChange={(e) => setLanguage(e.target.value as Language)}
            className="max-w-xs"
          >
            <option value="de">Deutsch</option>
            <option value="en">English</option>
          </SelectField>

          <fieldset className="mt-5">
            <legend className="block text-xs text-ink-soft font-semibold mb-1">{t('settings.theme')}</legend>
            <div className="inline-flex gap-1 bg-surface-muted border border-line p-1 rounded text-xs">
              {THEME_OPTIONS.map(({ value, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={theme === value}
                  onClick={() => setTheme(value)}
                  className={cn(
                    'px-3 py-1.5 rounded font-semibold flex items-center gap-1.5 transition cursor-pointer',
                    theme === value ? 'bg-surface shadow-xs text-brand-fg' : 'text-ink-muted hover:text-ink',
                  )}
                >
                  <Icon size={14} aria-hidden />
                  {t(`settings.themes.${value}`)}
                </button>
              ))}
            </div>
            <p className="mt-1 text-[11px] text-ink-muted">{t('settings.themeHint')}</p>
          </fieldset>
        </Card>

        <BackupCard />

        <Card title={t('settings.backendTitle')} icon={Server}>
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-surface-muted border border-line rounded flex items-start gap-3">
              <CircleCheck size={20} aria-hidden className="text-brand-fg shrink-0" />
              <div>
                <div className="font-semibold text-ink">{t('settings.backendStatus')}</div>
                <div className="text-ink-soft">{t('settings.backendStatusHint')}</div>
              </div>
            </div>
            <p className="text-ink-soft">
              {user
                ? t('settings.signedInAs', { name: user.displayName, email: user.email })
                : t('settings.notSignedIn')}
              {user?.accountType === 'user' && (
                <>
                  {' '}
                  <Link to="/account" className="font-semibold text-brand-fg hover:underline">
                    {t('account.link')}
                  </Link>
                </>
              )}
            </p>
            <TextField label={t('settings.apiBaseUrl')} readOnly value={API_BASE_URL} className="max-w-md font-mono" />
          </div>
        </Card>
      </div>
    </>
  );
}
