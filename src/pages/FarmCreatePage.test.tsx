import { describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithRouter } from '@farm/test/utils';
import { rectanglePolygon } from '@farm/lib/geo';
import { useFarmStore } from '@farm/store/useFarmStore';
import FarmCreatePage from './FarmCreatePage';

const geojson = JSON.stringify({
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', properties: { name: 'Acker Ost' }, geometry: rectanglePolygon(52.3, 10.6, 100, 80) },
    { type: 'Feature', properties: {}, geometry: rectanglePolygon(52.301, 10.6, 60, 60) },
  ],
});

describe('FarmCreatePage', () => {
  it('requires at least one field', () => {
    renderWithRouter(<FarmCreatePage />, { route: '/farms/new' });
    fireEvent.change(screen.getByLabelText(/Betriebsname/), { target: { value: 'Hof' } });
    fireEvent.click(screen.getByRole('button', { name: 'Farm anlegen' }));
    expect(screen.getByRole('alert')).toHaveTextContent('mindestens einen Schlag');
    expect(useFarmStore.getState().farms).toHaveLength(2);
  });

  it('creates a farm from imported GeoJSON fields', async () => {
    const { container } = renderWithRouter(<FarmCreatePage />, { route: '/farms/new' });
    fireEvent.change(screen.getByLabelText(/Betriebsname/), { target: { value: 'Neuer Hof' } });
    fireEvent.change(screen.getByLabelText('Winterhärtezone'), { target: { value: '8a' } });
    fireEvent.change(container.querySelector('input[type=file]')!, {
      target: { files: [new File([geojson], 'felder.geojson')] },
    });

    expect(await screen.findByDisplayValue('Acker Ost')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Schlag 2')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '„Schlag 2“ entfernen' }));
    fireEvent.click(screen.getByRole('button', { name: 'Farm anlegen' }));

    const farm = useFarmStore.getState().farms[0];
    expect(farm).toMatchObject({ name: 'Neuer Hof', climateZone: '8a' });
    const fields = useFarmStore.getState().fields.filter((f) => f.farmId === farm.id);
    expect(fields.map((f) => f.name)).toEqual(['Acker Ost']);
    expect(fields[0].areaM2).toBeGreaterThan(7_000);
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(`/farms/${farm.id}`));
  });
});
