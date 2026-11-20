import { describe, expect, it } from 'vitest';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { expectNoAxeViolations, renderWithRouter } from '@farm/test/utils';
import { ConfirmDialogHost } from '@farm/components/shared/ConfirmDialogHost';
import { Toaster } from '@farm/components/shared/Toaster';
import { gateway, TEST_PASSWORD, TEST_USER } from '@farm/test/fakeGateway';
import { useFarmStore } from '@farm/store/useFarmStore';
import { useSessionStore } from '@farm/store/useSessionStore';
import App from '@farm/App';
import AccountPage from './AccountPage';

const NEW_PASSWORD = 'ein ganz neues passwort';

function renderAccount() {
  return renderWithRouter(
    <>
      <AccountPage />
      <ConfirmDialogHost />
      <Toaster />
    </>,
    { route: '/account' },
  );
}

const card = (title: string) => screen.getByRole('heading', { name: title }).closest('section')!;

function fillPassword(current: string, next: string, repeat = next) {
  fireEvent.change(screen.getByLabelText(/Aktuelles Passwort/), { target: { value: current } });
  fireEvent.change(screen.getByLabelText(/^Neues Passwort\s*\*?$/), { target: { value: next } });
  fireEvent.change(screen.getByLabelText(/Neues Passwort wiederholen/), { target: { value: repeat } });
  fireEvent.click(within(card('Passwort ändern')).getByRole('button', { name: 'Passwort ändern' }));
}

describe('AccountPage', () => {
  it('has no accessibility violations', async () => {
    const { container } = renderAccount();
    expect(screen.getByLabelText('E-Mail')).toHaveValue(TEST_USER.email);
    await expectNoAxeViolations(container);
  });

  it('changes the display name', async () => {
    renderAccount();
    fireEvent.change(screen.getByLabelText(/^Name/), { target: { value: 'Anna Neu' } });
    fireEvent.click(within(card('Profil')).getByRole('button', { name: 'Speichern' }));
    expect(await screen.findByText('Profil gespeichert.')).toBeInTheDocument();
    expect(useSessionStore.getState().session?.user.displayName).toBe('Anna Neu');
    expect(gateway.writes()).toEqual([
      { method: 'PATCH', path: '/api/v1/users/me', body: { displayName: 'Anna Neu' } },
    ]);
  });

  it('changes the password and signs in again with it', async () => {
    gateway.refreshCookie = TEST_USER.id;
    renderAccount();
    fillPassword(TEST_PASSWORD, NEW_PASSWORD);
    expect(await screen.findByText(/Passwort geändert. Andere Geräte/)).toBeInTheDocument();
    expect(gateway.writes().map((r) => r.path)).toEqual([
      '/api/v1/auth/refresh',
      '/api/v1/users/me/password',
      '/api/v1/auth/login',
    ]);
    expect(gateway.requests.at(-1)!.body).toEqual({ email: TEST_USER.email, password: NEW_PASSWORD });
    expect(useSessionStore.getState().session).not.toBeNull();
    expect(screen.getByLabelText(/Aktuelles Passwort/)).toHaveValue('');
  });

  it('reports a wrong current password without signing out', async () => {
    gateway.refreshCookie = TEST_USER.id;
    renderAccount();
    fillPassword('falsch falsch falsch', NEW_PASSWORD);
    expect(await screen.findByRole('alert')).toHaveTextContent('Das aktuelle Passwort ist falsch.');
    expect(useSessionStore.getState().session).not.toBeNull();
  });

  it('blocks mismatching new passwords', () => {
    renderAccount();
    fillPassword(TEST_PASSWORD, NEW_PASSWORD, 'etwas anderes hier');
    expect(screen.getByText('Die Passwörter stimmen nicht überein.')).toBeInTheDocument();
    expect(gateway.writes()).toEqual([]);
  });

  it('deletes all farms and then the account after confirmation', async () => {
    gateway.refreshCookie = TEST_USER.id;
    renderAccount();
    fireEvent.click(within(card('Konto löschen')).getByRole('button', { name: 'Konto löschen' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Konto löschen' }));
    await waitFor(() => expect(useSessionStore.getState().session).toBeNull());
    expect(gateway.farms.size).toBe(0);
    expect(gateway.fields.size).toBe(0);
    expect(gateway.accounts.some((a) => a.user.id === TEST_USER.id)).toBe(false);
    expect(gateway.refreshCookie).toBeNull();
    expect(useFarmStore.getState().farms).toEqual([]);
    expect(gateway.writes().at(-2)).toMatchObject({ method: 'DELETE', path: '/api/v1/users/me' });
  });

  it('keeps the account when a farm cannot be deleted', async () => {
    renderAccount();
    gateway.failNext(503, [], '/api/v1/farms/farm-2');
    fireEvent.click(within(card('Konto löschen')).getByRole('button', { name: 'Konto löschen' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Konto löschen' }));
    expect(await screen.findByText(/Dein Konto besteht weiter/)).toBeInTheDocument();
    expect(gateway.accounts.some((a) => a.user.id === TEST_USER.id)).toBe(true);
    expect(useSessionStore.getState().session).not.toBeNull();
  });

  it('does nothing when the deletion is cancelled', async () => {
    renderAccount();
    fireEvent.click(within(card('Konto löschen')).getByRole('button', { name: 'Konto löschen' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Abbrechen' }));
    await act(async () => {});
    expect(gateway.writes()).toEqual([]);
  });

  it('is reachable from the top bar and hidden from guests', async () => {
    renderWithRouter(<App />, { route: '/' });
    fireEvent.click(await screen.findByRole('link', { name: /Anna Test/ }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Mein Konto' })).toBeInTheDocument();

    const guest = { ...TEST_USER, id: 'guest-1', accountType: 'guest' as const };
    gateway.accounts.push({ user: guest, password: '' });
    gateway.tokens.set('guest', guest.id);
    act(() => useSessionStore.getState().setSession({ token: 'guest', user: guest }));
    expect(await screen.findByText(/Gastsitzungen haben kein Konto/)).toBeInTheDocument();
  });
});
