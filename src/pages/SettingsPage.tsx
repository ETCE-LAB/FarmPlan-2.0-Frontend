import { useRef } from 'react';
import {
  DatabaseBackup,
  Download,
  Monitor,
  Moon,
  RotateCcw,
  Server,
  Settings,
  Sun,
  TriangleAlert,
  Upload,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@farm/components/shared/PageHeader';
import { Card } from '@farm/components/ui/Card';
import { Button } from '@farm/components/ui/Button';
import { SelectField, TextField } from '@farm/components/ui/FormField';
import { backupFileName, createBackup, parseBackup } from '@farm/lib/backup';
import { downloadJson } from '@farm/lib/download';
import { cn } from '@farm/lib/utils';
import { useFarmStore } from '@farm/store/useFarmStore';
import { confirmAction, showToast } from '@farm/store/useUiStore';
import { mutateWithUndo } from '@farm/store/undo';
import type { Language, ThemePreference } from '@farm/types';

const THEME_OPTIONS = [
  { value: 'system', icon: Monitor },
  { value: 'light', icon: Sun },
  { value: 'dark', icon: Moon },
] as const satisfies { value: ThemePreference; icon: unknown }[];

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

function BackupCard() {
  const { t, i18n } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const farms = useFarmStore((s) => s.farms);
  const fields = useFarmStore((s) => s.fields);

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
    mutateWithUndo(() => useFarmStore.getState().restore(result.data), t('backup.restored'), t('common.undo'));
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
  const resetData = useFarmStore((s) => s.resetData);

  const handleReset = async () => {
    const confirmed = await confirmAction({
      title: t('settings.resetTitle'),
      message: t('settings.confirmReset'),
      confirmLabel: t('settings.resetConfirmLabel'),
      cancelLabel: t('common.cancel'),
      tone: 'danger',
    });
    if (confirmed) mutateWithUndo(resetData, t('settings.resetDone'), t('common.undo'));
  };

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
            <div className="p-4 bg-warning-bg border border-warning-line rounded flex items-start gap-3">
              <TriangleAlert size={20} aria-hidden className="text-warning-fg shrink-0" />
              <div>
                <div className="font-semibold text-warning-fg">{t('settings.backendStatus')}</div>
                <div className="text-warning-fg">{t('settings.backendStatusHint')}</div>
              </div>
            </div>
            <TextField label={t('settings.apiBaseUrl')} readOnly value={API_BASE_URL} className="max-w-md font-mono" />
          </div>

          <div className="mt-6 pt-4 border-t border-line-subtle flex justify-end">
            <Button variant="danger" size="md" icon={RotateCcw} onClick={() => void handleReset()}>
              {t('settings.resetData')}
            </Button>
          </div>
        </Card>
      </div>
    </>
  );
}
