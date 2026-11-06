import { describe, expect, it } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { act } from 'react';
import App from './App';
import '@farm/theme';
import { useFarmStore } from '@farm/store/useFarmStore';
import { expectNoAxeViolations, renderWithRouter } from '@farm/test/utils';

const ROUTES = [
  ['/', 'Projekt-Übersicht'],
  ['/farms', 'Farmen & Schläge'],
  ['/farms/new', 'Neue Farm'],
  ['/farms/farm-1', 'Gutshof Neorx'],
  ['/plants', 'Pflanzen-Datenbank (Syntropie)'],
  ['/plants/p-1', 'Echte Walnuss'],
  ['/settings', 'System & Einstellungen'],
  ['/gibt-es-nicht', 'Seite nicht gefunden'],
  ['/farms/unbekannt', 'Seite nicht gefunden'],
  ['/plants/unbekannt', 'Seite nicht gefunden'],
] as const;

describe('App routes', () => {
  it.each(ROUTES)('renders %s', async (route, heading) => {
    renderWithRouter(<App />, { route });
    expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeInTheDocument();
  });

  it.each(ROUTES)('has no structural accessibility violations on %s', async (route, heading) => {
    const { container } = renderWithRouter(<App />, { route });
    await screen.findByRole('heading', { level: 1, name: heading });
    await expectNoAxeViolations(container);
  });

  it('sets the document title from the page heading', async () => {
    renderWithRouter(<App />, { route: '/plants' });
    await screen.findByRole('heading', { level: 1 });
    expect(document.title).toBe('Pflanzen-Datenbank (Syntropie) · FarmPlan');
  });

  it('shows the search only on list pages and writes it into the URL', async () => {
    renderWithRouter(<App />, { route: '/farms' });
    fireEvent.change(await screen.findByRole('searchbox', { name: 'Suche' }), { target: { value: 'wend' } });
    expect(screen.getByTestId('location')).toHaveTextContent('/farms?q=wend');
    expect(screen.getByRole('link', { name: /Biohof Wendland/ })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Gutshof Neorx/ })).not.toBeInTheDocument();
  });

  it('hides the search on detail pages', async () => {
    renderWithRouter(<App />, { route: '/plants/p-1' });
    await screen.findByRole('heading', { level: 1 });
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
  });

  it('switches the UI language from the top bar', async () => {
    renderWithRouter(<App />, { route: '/' });
    fireEvent.click(await screen.findByRole('button', { name: 'en' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Project Overview' })).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('en');
  });
});

describe('mobile navigation', () => {
  it('opens the sidebar from the menu button and closes it on navigation', async () => {
    renderWithRouter(<App />, { route: '/' });
    const menuButton = await screen.findByRole('button', { name: 'Menü öffnen' });
    expect(menuButton).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(menuButton);
    expect(menuButton).toHaveAttribute('aria-expanded', 'true');
    expect(document.getElementById('app-sidebar')).toHaveClass('translate-x-0');

    fireEvent.click(screen.getByRole('link', { name: 'Pflanzen-Inventar' }));
    expect(menuButton).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByTestId('location')).toHaveTextContent('/plants');
  });

  it('closes the sidebar with Escape', async () => {
    renderWithRouter(<App />, { route: '/' });
    const menuButton = await screen.findByRole('button', { name: 'Menü öffnen' });
    fireEvent.click(menuButton);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(menuButton).toHaveAttribute('aria-expanded', 'false');
  });
});

describe('theme toggle', () => {
  it('switches the <html> dark class from the top bar', async () => {
    renderWithRouter(<App />, { route: '/' });
    fireEvent.click(await screen.findByRole('button', { name: 'Zum dunklen Modus wechseln' }));
    expect(document.documentElement).toHaveClass('dark');
    expect(useFarmStore.getState().theme).toBe('dark');
    fireEvent.click(screen.getByRole('button', { name: 'Zum hellen Modus wechseln' }));
    expect(document.documentElement).not.toHaveClass('dark');
  });
});

describe('error boundary', () => {
  it('keeps the shell usable when a page crashes', async () => {
    // Corrupt data that makes the overview throw while rendering.
    act(() => useFarmStore.setState({ fields: [null as never] }));
    const consoleError = console.error;
    console.error = () => {};
    try {
      renderWithRouter(<App />, { route: '/' });
      expect(await screen.findByRole('heading', { name: 'Hier ist etwas schiefgelaufen' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Pflanzen-Inventar' })).toBeInTheDocument();
    } finally {
      console.error = consoleError;
    }
  });
});
