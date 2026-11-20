import { describe, expect, it } from 'vitest';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { expectNoAxeViolations, renderWithRouter } from '@farm/test/utils';
import { gateway, TEST_PASSWORD, TEST_USER } from '@farm/test/fakeGateway';
import { restoreSession, useSessionStore } from '@farm/store/useSessionStore';
import { useFarmStore } from '@farm/store/useFarmStore';
import App from '@farm/App';
import LoginPage from './LoginPage';

const signOut = () => act(() => useSessionStore.getState().logout());

function fillLogin(email: string, password: string) {
  fireEvent.change(screen.getByLabelText(/E-Mail/), { target: { value: email } });
  fireEvent.change(screen.getByLabelText(/Passwort/), { target: { value: password } });
  fireEvent.click(screen.getByRole('button', { name: 'Anmelden' }));
}

describe('LoginPage', () => {
  it('signs in and returns to the requested page', async () => {
    signOut();
    renderWithRouter(<LoginPage />, { route: '/login?from=%2Ffarms%2Ffarm-2' });
    fillLogin(TEST_USER.email, TEST_PASSWORD);
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/farms/farm-2'));
    expect(useSessionStore.getState().session).toMatchObject({ user: TEST_USER });
  });

  it('ignores external redirect targets', async () => {
    signOut();
    renderWithRouter(<LoginPage />, { route: '/login?from=%2F%2Fevil.example' });
    fillLogin(TEST_USER.email, TEST_PASSWORD);
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(/^\/farms$/));
  });

  it('shows wrong credentials', async () => {
    signOut();
    renderWithRouter(<LoginPage />, { route: '/login' });
    fillLogin(TEST_USER.email, 'falsch falsch falsch');
    expect(await screen.findByRole('alert')).toHaveTextContent('E-Mail oder Passwort ist falsch.');
    expect(useSessionStore.getState().session).toBeNull();
  });

  it('registers a new account', async () => {
    signOut();
    renderWithRouter(<LoginPage />, { route: '/login' });
    fireEvent.click(screen.getByRole('button', { name: /Jetzt registrieren/ }));
    fireEvent.change(screen.getByLabelText(/^Name/), { target: { value: 'Bea' } });
    fireEvent.change(screen.getByLabelText(/E-Mail/), { target: { value: 'bea@example.org' } });
    fireEvent.change(screen.getByLabelText(/Passwort/), { target: { value: 'ein langes passwort' } });
    fireEvent.click(screen.getByRole('button', { name: 'Konto anlegen' }));
    await waitFor(() => expect(useSessionStore.getState().session?.user.displayName).toBe('Bea'));
  });

  it('reports an email that is already registered', async () => {
    signOut();
    renderWithRouter(<LoginPage />, { route: '/login' });
    fireEvent.click(screen.getByRole('button', { name: /Jetzt registrieren/ }));
    fireEvent.change(screen.getByLabelText(/^Name/), { target: { value: 'Anna' } });
    fireEvent.change(screen.getByLabelText(/E-Mail/), { target: { value: TEST_USER.email } });
    fireEvent.change(screen.getByLabelText(/Passwort/), { target: { value: 'ein langes passwort' } });
    fireEvent.click(screen.getByRole('button', { name: 'Konto anlegen' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('bereits ein Konto');
  });

  it('explains an expired session', async () => {
    act(() => useSessionStore.getState().logout('expired'));
    const { container } = renderWithRouter(<LoginPage />, { route: '/login' });
    expect(screen.getByText(/Sitzung ist abgelaufen/)).toBeInTheDocument();
    await expectNoAxeViolations(container);
  });
});

describe('guest sessions', () => {
  it('continues as guest without account and hides the farm pages', async () => {
    signOut();
    renderWithRouter(<App />, { route: '/login' });
    fireEvent.click(await screen.findByRole('button', { name: 'Als Gast fortfahren' }));
    await waitFor(() => expect(useSessionStore.getState().session?.user.accountType).toBe('guest'));
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(/^\/$/));
    const nav = screen.getByRole('navigation', { name: 'Hauptnavigation' });
    await waitFor(() => expect(within(nav).queryByRole('link', { name: /Farmen/ })).not.toBeInTheDocument());
    expect(within(nav).getByRole('link', { name: /Pflanzen/ })).toBeInTheDocument();
    expect(gateway.requests.some((r) => r.path === '/api/v1/farms')).toBe(false);
    expect(gateway.refreshCookie).toBeNull();
  });

  it('keeps all navigation for accounts once modules are loaded', async () => {
    renderWithRouter(<App />, { route: '/' });
    await waitFor(() => expect(useSessionStore.getState().modules).not.toBeNull());
    const nav = screen.getByRole('navigation', { name: 'Hauptnavigation' });
    expect(within(nav).getByRole('link', { name: /Farmen/ })).toBeInTheDocument();
  });
});

describe('protected routes', () => {
  it.each(['/farms', '/farms/new', '/farms/farm-1'])(
    'redirects %s to the login page when signed out',
    async (route) => {
      signOut();
      renderWithRouter(<App />, { route });
      expect(await screen.findByRole('heading', { level: 1, name: 'Anmelden' })).toBeInTheDocument();
      expect(screen.getByTestId('location')).toHaveTextContent(`/login?from=${encodeURIComponent(route)}`);
    },
  );

  it('keeps public pages available when signed out', async () => {
    signOut();
    renderWithRouter(<App />, { route: '/plants' });
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Pflanzen-Datenbank (Syntropie)' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Anmelden' })).toBeInTheDocument();
  });

  it('tells guests that farms need an account', async () => {
    const guest = { ...TEST_USER, id: 'guest-1', accountType: 'guest' as const };
    gateway.accounts.push({ user: guest, password: '' });
    gateway.tokens.set('guest', guest.id);
    act(() => useSessionStore.getState().setSession({ token: 'guest', user: guest }));
    renderWithRouter(<App />, { route: '/farms' });
    expect(await screen.findByText('Farmen sind nur mit einem Konto verfügbar.')).toBeInTheDocument();
  });

  it('signs out from the top bar, revokes the refresh session and clears the farms', async () => {
    gateway.refreshCookie = TEST_USER.id;
    renderWithRouter(<App />, { route: '/' });
    fireEvent.click(await screen.findByRole('button', { name: 'Abmelden' }));
    await waitFor(() => expect(screen.getByRole('link', { name: 'Anmelden' })).toBeInTheDocument());
    expect(useSessionStore.getState().session).toBeNull();
    expect(useFarmStore.getState().farms).toEqual([]);
    expect(gateway.refreshCookie).toBeNull();
  });

  it('waits for the session to be restored before redirecting', async () => {
    act(() => useSessionStore.setState({ session: null, status: 'restoring' }));
    renderWithRouter(<App />, { route: '/farms' });
    expect(screen.getByText('Anmeldung wird geprüft …')).toBeInTheDocument();
    gateway.refreshCookie = TEST_USER.id;
    await act(restoreSession);
    expect(await screen.findByRole('heading', { level: 1, name: 'Farmen & Schläge' })).toBeInTheDocument();
    expect(useSessionStore.getState().session?.user).toMatchObject({ id: TEST_USER.id });
  });

  it('shows the login page after a reload without refresh cookie', async () => {
    act(() => useSessionStore.setState({ session: null, status: 'restoring' }));
    renderWithRouter(<App />, { route: '/farms' });
    await act(restoreSession);
    expect(await screen.findByRole('heading', { level: 1, name: 'Anmelden' })).toBeInTheDocument();
  });
});
