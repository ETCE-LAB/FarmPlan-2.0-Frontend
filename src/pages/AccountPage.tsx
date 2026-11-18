import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { KeyRound, Save, Trash2, UserRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@farm/components/shared/PageHeader';
import { Card } from '@farm/components/ui/Card';
import { Button } from '@farm/components/ui/Button';
import { TextField } from '@farm/components/ui/FormField';
import type { ApiFailure } from '@farm/lib/api/client';
import { changePassword, deleteAccountAndData, saveDisplayName } from '@farm/store/account';
import { apiErrorMessage } from '@farm/store/farmSync';
import { useSessionUser } from '@farm/store/useSessionStore';
import { confirmAction, showToast } from '@farm/store/useUiStore';
import type { SessionUser } from '@farm/lib/api/auth';

function ProfileCard({ user }: { user: SessionUser }) {
  const { t } = useTranslation();
  const [displayName, setDisplayName] = useState(user.displayName);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const name = displayName.trim();
    if (saving || !name) return;
    setSaving(true);
    const result = await saveDisplayName(name);
    setSaving(false);
    if (result.ok) showToast({ message: t('account.profileSaved') });
    else showToast({ tone: 'error', message: t('account.saveFailed', { reason: apiErrorMessage(result) }) });
  };

  return (
    <Card title={t('account.profileTitle')} icon={UserRound}>
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4 max-w-md">
        <TextField label={t('auth.email')} type="email" value={user.email} readOnly />
        <TextField
          label={t('auth.displayName')}
          required
          maxLength={120}
          autoComplete="name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
        <div className="flex justify-end">
          <Button type="submit" icon={Save} disabled={saving || !displayName.trim()}>
            {t('common.save')}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function PasswordCard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [repeat, setRepeat] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mismatch = repeat !== '' && next !== repeat;

  const errorMessage = (failure: ApiFailure) => {
    if (failure.error === 'unauthenticated') return t('account.wrongPassword');
    if (failure.error === 'validation') return t('account.passwordInvalid');
    return apiErrorMessage(failure);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (saving || mismatch) return;
    setSaving(true);
    setError(null);
    const result = await changePassword(current, next);
    setSaving(false);
    if (!result.ok) {
      setError(errorMessage(result));
      return;
    }
    setCurrent('');
    setNext('');
    setRepeat('');
    if (result.data.reauthenticated) {
      showToast({ message: t('account.passwordChanged') });
    } else {
      showToast({ tone: 'info', message: t('account.passwordChangedSignIn') });
      navigate('/login?from=%2Faccount');
    }
  };

  return (
    <Card title={t('account.passwordTitle')} icon={KeyRound}>
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4 max-w-md">
        <p className="text-xs text-ink-muted">{t('account.passwordInfo')}</p>
        <TextField
          label={t('account.currentPassword')}
          type="password"
          required
          maxLength={256}
          autoComplete="current-password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
        />
        <TextField
          label={t('account.newPassword')}
          type="password"
          required
          minLength={12}
          maxLength={256}
          autoComplete="new-password"
          hint={t('auth.passwordHint')}
          value={next}
          onChange={(e) => setNext(e.target.value)}
        />
        <TextField
          label={t('account.repeatPassword')}
          type="password"
          required
          minLength={12}
          maxLength={256}
          autoComplete="new-password"
          aria-invalid={mismatch}
          hint={mismatch ? t('account.passwordMismatch') : undefined}
          value={repeat}
          onChange={(e) => setRepeat(e.target.value)}
        />
        {error && (
          <p role="alert" className="text-xs text-danger-fg">
            {error}
          </p>
        )}
        <div className="flex justify-end">
          <Button type="submit" icon={KeyRound} disabled={saving || mismatch}>
            {t('account.changePassword')}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function DeleteAccountCard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    const confirmed = await confirmAction({
      title: t('account.deleteTitle'),
      message: t('account.deleteConfirm'),
      confirmLabel: t('account.deleteAccount'),
      cancelLabel: t('common.cancel'),
      tone: 'danger',
    });
    if (!confirmed) return;
    setDeleting(true);
    const result = await deleteAccountAndData();
    setDeleting(false);
    if (!result.ok) {
      showToast({ tone: 'error', message: t('account.deleteFailed', { reason: apiErrorMessage(result) }) });
      return;
    }
    showToast({ message: t('account.deleted') });
    navigate('/', { replace: true });
  };

  return (
    <Card title={t('account.deleteTitle')} icon={Trash2}>
      <p className="text-xs text-ink-soft mb-4 max-w-xl">{t('account.deleteInfo')}</p>
      <Button variant="danger" icon={Trash2} disabled={deleting} onClick={() => void handleDelete()}>
        {deleting ? t('account.deleting') : t('account.deleteAccount')}
      </Button>
    </Card>
  );
}

export default function AccountPage() {
  const { t } = useTranslation();
  const user = useSessionUser();
  if (!user) return null;

  return (
    <>
      <PageHeader title={t('account.title')} subtitle={t('account.subtitle')} />
      <div className="max-w-4xl space-y-6">
        <ProfileCard key={user.id} user={user} />
        <PasswordCard />
        <DeleteAccountCard />
      </div>
    </>
  );
}
