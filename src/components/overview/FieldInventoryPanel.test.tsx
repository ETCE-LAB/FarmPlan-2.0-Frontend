import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithRouter } from '@farm/test/utils';
import { FieldInventoryPanel } from './FieldInventoryPanel';

describe('FieldInventoryPanel', () => {
  it('lists all fields with their plan status', () => {
    renderWithRouter(<FieldInventoryPanel />);
    expect(screen.getAllByRole('row')).toHaveLength(1 + 5);
    expect(screen.getByText('Aktiv (Rev. 3)')).toBeInTheDocument();
    expect(screen.getByText('Entwurf (Rev. 1)')).toBeInTheDocument();
    expect(screen.getAllByText('Kein Plan')).toHaveLength(2);
  });

  it('filters by the ?q= search parameter', () => {
    renderWithRouter(<FieldInventoryPanel />, { route: '/?q=wendland' });
    expect(screen.getByText('Kiefernkämpe')).toBeInTheDocument();
    expect(screen.queryByText('Schlag 1 (Agroforst Nord)')).not.toBeInTheDocument();
    expect(screen.getByText('2 Schläge')).toBeInTheDocument();
  });

  it('shows an empty state when nothing matches', () => {
    renderWithRouter(<FieldInventoryPanel />, { route: '/?q=gibtsnicht' });
    expect(screen.getByText('Keine Schläge gefunden.')).toBeInTheDocument();
  });

  it('links each field to its farm page with the field preselected', () => {
    renderWithRouter(<FieldInventoryPanel />);
    expect(screen.getByRole('link', { name: 'Kiefernkämpe' })).toHaveAttribute('href', '/farms/farm-2?field=f-201');
  });
});
