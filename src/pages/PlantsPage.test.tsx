import { describe, expect, it, vi } from 'vitest';
import L from 'leaflet';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { expectNoAxeViolations, renderWithRouter } from '@farm/test/utils';
import { polygonsCenterLatLng } from '@farm/lib/geo';
import { useFarmStore } from '@farm/store/useFarmStore';
import PlantsPage from './PlantsPage';
import PlantDetailPage from './PlantDetailPage';

const speciesNames = () =>
  screen
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).queryByRole('link')?.textContent)
    .filter(Boolean);

describe('PlantsPage', () => {
  it('lists all species sorted by name', () => {
    renderWithRouter(<PlantsPage />, { route: '/plants' });
    expect(speciesNames()[0]).toBe('Echte Walnuss');
    expect(screen.getByText('8 Arten gefunden')).toBeInTheDocument();
  });

  it('reads filters from the URL', () => {
    renderWithRouter(<PlantsPage />, { route: '/plants?stratum=LOW' });
    expect(speciesNames().sort()).toEqual(['Sanddorn', 'Schwarze Johannisbeere']);
    expect(screen.getByLabelText('Schicht')).toHaveValue('LOW');
  });

  it('writes filter changes into the URL', () => {
    renderWithRouter(<PlantsPage />, { route: '/plants' });
    fireEvent.change(screen.getByLabelText('Nutzung'), { target: { value: 'nut' } });
    expect(screen.getByTestId('location')).toHaveTextContent('/plants?use=nut');
    expect(speciesNames().sort()).toEqual(['Echte Walnuss', 'Gemeine Hasel']);
  });

  it('filters by the global ?q= search', () => {
    renderWithRouter(<PlantsPage />, { route: '/plants?q=glutinosa' });
    expect(speciesNames()).toEqual(['Schwarzerle']);
  });

  it('toggles sorting and exposes it via aria-sort', () => {
    renderWithRouter(<PlantsPage />, { route: '/plants' });
    const caloriesButton = screen.getByRole('button', { name: /Kalorien/ });

    fireEvent.click(caloriesButton);
    expect(screen.getByTestId('location')).toHaveTextContent('sort=calories');
    expect(caloriesButton.closest('th')).toHaveAttribute('aria-sort', 'ascending');
    expect(speciesNames()[speciesNames().length - 1]).toBe('Echte Walnuss');

    fireEvent.click(caloriesButton);
    expect(caloriesButton.closest('th')).toHaveAttribute('aria-sort', 'descending');
    expect(speciesNames()[0]).toBe('Echte Walnuss');
  });

  it('resets all filters', () => {
    renderWithRouter(<PlantsPage />, { route: '/plants?stratum=LOW&q=sand' });
    fireEvent.click(screen.getByRole('button', { name: 'Filter zurücksetzen' }));
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/plants$/);
    expect(speciesNames()).toHaveLength(8);
  });

  it('shows the hardiness zones and filters from a zone upwards', () => {
    renderWithRouter(<PlantsPage />, { route: '/plants' });
    expect(screen.getByRole('columnheader', { name: /Winterhärte/ })).toBeInTheDocument();
    const alder = screen.getByRole('link', { name: 'Schwarzerle' }).closest('tr')!;
    expect(within(alder).getByText('3a–8b')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Zone'), { target: { value: '8b' } });
    expect(screen.getByTestId('location')).toHaveTextContent('/plants?zone=8b');
    expect(screen.getByRole('option', { name: 'ab Zone 8b' })).toBeInTheDocument();
    // Kulturbirne is listed up to 8a only; every other demo species reaches 8b.
    expect(speciesNames()).not.toContain('Kulturbirne');
    expect(screen.getByText('7 Arten gefunden')).toBeInTheDocument();
  });

  it('explains the hardiness zones in a legend dialog', async () => {
    const { container } = renderWithRouter(<PlantsPage />, { route: '/plants?zone=7a' });
    fireEvent.click(screen.getByRole('button', { name: 'Legende der Winterhärtezonen anzeigen' }));
    const dialog = screen.getByRole('dialog', { name: 'Winterhärtezonen (USDA)' });
    expect(within(dialog).getAllByRole('row')).toHaveLength(27); // header + 1a…13b
    const selected = within(dialog).getByRole('rowheader', { name: /7a/ }).closest('tr')!;
    expect(selected).toHaveAttribute('aria-current', 'true');
    expect(within(selected).getByText('-17,8 °C … -15 °C')).toBeInTheDocument();
    await expectNoAxeViolations(container);

    fireEvent.click(within(dialog).getByRole('button', { name: 'Schließen' }));
    expect(dialog).not.toHaveAttribute('open');
  });

  it('shows the signed-in farms on a map coloured by their zone', async () => {
    const fitBounds = vi.spyOn(L.Map.prototype, 'fitBounds');
    renderWithRouter(<PlantsPage />, { route: '/plants' });
    fireEvent.click(screen.getByRole('button', { name: 'Legende der Winterhärtezonen anzeigen' }));
    expect(
      await screen.findByRole('region', { name: 'Karte der eigenen Farmen nach Winterhärtezone' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Deine Farmen')).toBeInTheDocument();
    // jsdom renders no SVG markers; the map fits its view to both demo farms instead.
    await waitFor(() => expect(fitBounds).toHaveBeenCalled());
    const bounds = fitBounds.mock.calls.at(-1)![0] as L.LatLngBounds;
    for (const farmId of ['farm-1', 'farm-2']) {
      const shapes = useFarmStore
        .getState()
        .fields.filter((f) => f.farmId === farmId)
        .map((f) => f.geometry!);
      expect(bounds.contains(polygonsCenterLatLng(shapes)!)).toBe(true);
    }
    fitBounds.mockRestore();
  });

  it('leaves the map out without farms', () => {
    useFarmStore.getState().clearServerData();
    renderWithRouter(<PlantsPage />, { route: '/plants' });
    fireEvent.click(screen.getByRole('button', { name: 'Legende der Winterhärtezonen anzeigen' }));
    expect(screen.queryByText('Deine Farmen')).not.toBeInTheDocument();
  });

  it('shows an empty state', () => {
    renderWithRouter(<PlantsPage />, { route: '/plants?q=banane' });
    expect(screen.getByText('Keine Art passt zu den Filtern.')).toBeInTheDocument();
  });
});

describe('PlantDetailPage', () => {
  it('shows the profile of a species', () => {
    renderWithRouter(<PlantDetailPage />, { route: '/plants/p-5', path: '/plants/:plantId' });
    expect(screen.getByRole('heading', { level: 1, name: 'Schwarzerle' })).toBeInTheDocument();
    expect(screen.getByText('Stickstofffixierer')).toBeInTheDocument();
    expect(screen.getByText('Zonen 3a–8b')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Pflanzen-Inventar' })).toHaveAttribute('href', '/plants');
  });
});
