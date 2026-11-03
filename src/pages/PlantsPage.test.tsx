import { describe, expect, it } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import { renderWithRouter } from '@farm/test/utils';
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
