import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { LogIn, UserPlus, UserRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@farm/components/shared/PageHeader';
import { Card } from '@farm/components/ui/Card';
import { Button } from '@farm/components/ui/Button';
import { TextField } from '@farm/components/ui/FormField';
import { guestSession, login, register } from '@farm/lib/api/auth';
import type { ApiErrorCode } from '@farm/lib/api/client';
import { safeRedirectPath } from '@farm/lib/redirect';
import { apiErrorMessage } from '@farm/store/farmSync';
import { useSessionStore } from '@farm/store/useSessionStore';

type Mode = 'login' | 'register';

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setSession = useSessionStore((s) => s.setSession);
  const expired = useSessionStore((s) => s.expired);

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const errorMessage = (code: ApiErrorCode) => {
    if (mode === 'login' && code === 'unauthenticated') return t('auth.invalidCredentials');
    if (mode === 'register' && code === 'conflict') return t('auth.emailTaken');
    if (code === 'validation') return t('auth.invalidInput');
    return apiErrorMessage(code);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    const result =
      mode === 'login'
        ? await login(email.trim(), password)
        : await register(email.trim(), password, displayName.trim());
    setSubmitting(false);
    if (!result.ok) {
      setError(errorMessage(result.error));
      return;
    }
    setPassword('');
    setSession(result.data);
    navigate(safeRedirectPath(searchParams.get('from')), { replace: true });
  };

  const continueAsGuest = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    const result = await guestSession();
    setSubmitting(false);
    if (!result.ok) {
      setError(apiErrorMessage(result));
      return;
    }
    setSession(result.data);
    // Farm pages need an account, so a guest starts on the overview instead of the requested page.
    navigate('/', { replace: true });
  };

  const switchMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setError(null);
  };

  const title = mode === 'login' ? t('auth.title') : t('auth.registerTitle');

  return (
    <>
      <PageHeader title={title} subtitle={t('auth.subtitle')} />
      <Card className="max-w-md">
        {expired && mode === 'login' && (
          <output className="block mb-4 rounded border border-warning-line bg-warning-bg p-3 text-xs text-warning-fg">
            {t('auth.expired')}
          </output>
        )}
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          {mode === 'register' && (
            <TextField
              label={t('auth.displayName')}
              required
              maxLength={120}
              autoComplete="name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          )}
          <TextField
            label={t('auth.email')}
            type="email"
            required
            maxLength={320}
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <TextField
            label={t('auth.password')}
            type="password"
            required
            minLength={mode === 'register' ? 12 : undefined}
            maxLength={256}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            hint={mode === 'register' ? t('auth.passwordHint') : undefined}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && (
            <p role="alert" className="text-xs text-danger-fg">
              {error}
            </p>
          )}
          <Button
            type="submit"
            size="md"
            icon={mode === 'login' ? LogIn : UserPlus}
            className="w-full"
            disabled={submitting}
          >
            {submitting ? t('auth.submitting') : mode === 'login' ? t('auth.login') : t('auth.register')}
          </Button>
        </form>
        <button
          type="button"
          onClick={switchMode}
          className="mt-4 text-xs font-semibold text-brand-fg hover:underline cursor-pointer"
        >
          {mode === 'login' ? t('auth.toRegister') : t('auth.toLogin')}
        </button>
        <div className="mt-6 pt-4 border-t border-line-subtle">
          <Button
            variant="secondary"
            icon={UserRound}
            className="w-full"
            disabled={submitting}
            onClick={() => void continueAsGuest()}
          >
            {t('auth.continueAsGuest')}
          </Button>
          <p className="mt-2 text-[11px] text-ink-muted">{t('auth.guestHint')}</p>
        </div>
      </Card>
    </>
  );
}
