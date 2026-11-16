import { describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithRouter } from '@farm/test/utils';
import { rectanglePolygon } from '@farm/lib/geo';
import { useFarmStore } from '@farm/store/useFarmStore';
import { gateway, TEST_USER } from '@farm/test/fakeGateway';
import FarmCreatePage from './FarmCreatePage';

const geojson = JSON.stringify({
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', properties: { name: 'Acker Ost' }, geometry: rectanglePolygon(52.3, 10.6, 100, 80) },
    { type: 'Feature', properties: {}, geometry: rectanglePolygon(52.301, 10.6, 60, 60) },
  ],
});

const fillMasterData = (name: string) => {
  fireEvent.change(screen.getByLabelText(/Betriebsname/), { target: { value: name } });
  fireEvent.change(screen.getByLabelText(/Standort/), { target: { value: 'Celle' } });
};

describe('FarmCreatePage', () => {
  it('prefills owner and contact email from the account', () => {
    renderWithRouter(<FarmCreatePage />, { route: '/farms/new' });
    expect(screen.getByLabelText(/Inhaber\/in/)).toHaveValue(TEST_USER.displayName);
    expect(screen.getByLabelText(/Kontakt-E-Mail/)).toHaveValue(TEST_USER.email);
  });

  it('requires owner and contact email, but not the location', () => {
    renderWithRouter(<FarmCreatePage />, { route: '/farms/new' });
    expect(screen.getByLabelText(/Standort/)).not.toBeRequired();
    expect(screen.getByLabelText(/Inhaber\/in/)).toBeRequired();
    expect(screen.getByLabelText(/Kontakt-E-Mail/)).toBeRequired();
  });

  it('requires at least one field', () => {
    renderWithRouter(<FarmCreatePage />, { route: '/farms/new' });
    fillMasterData('Hof');
    fireEvent.click(screen.getByRole('button', { name: 'Farm anlegen' }));
    expect(screen.getByRole('alert')).toHaveTextContent('mindestens einen Schlag');
    expect(useFarmStore.getState().farms).toHaveLength(2);
    expect(gateway.writes()).toEqual([]);
  });

  it('creates a farm from imported GeoJSON fields', async () => {
    const { container } = renderWithRouter(<FarmCreatePage />, { route: '/farms/new' });
    fillMasterData('Neuer Hof');
    fireEvent.change(screen.getByLabelText('Winterhärtezone'), { target: { value: '8a' } });
    fireEvent.change(container.querySelector('input[type=file]')!, {
      target: { files: [new File([geojson], 'felder.geojson')] },
    });

    expect(await screen.findByDisplayValue('Acker Ost')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Schlag 2')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '„Schlag 2“ entfernen' }));
    fireEvent.click(screen.getByRole('button', { name: 'Farm anlegen' }));

    await waitFor(() => expect(useFarmStore.getState().farms).toHaveLength(3));
    const farm = useFarmStore.getState().farms[0];
    expect(farm).toMatchObject({
      name: 'Neuer Hof',
      location: 'Celle',
      climateZone: '8a',
      ownerName: TEST_USER.displayName,
    });
    expect(gateway.farms.get(farm.id)).toMatchObject({ name: 'Neuer Hof', contact: { email: TEST_USER.email } });
    expect(gateway.fieldsOf(farm.id).map((f) => f.name)).toEqual(['Acker Ost']);
    const fields = useFarmStore.getState().fields.filter((f) => f.farmId === farm.id);
    expect(fields.map((f) => f.name)).toEqual(['Acker Ost']);
    expect(fields[0].areaM2).toBeGreaterThan(7_000);
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(`/farms/${farm.id}`));
  });

  it('keeps the form when the server rejects the farm', async () => {
    const { container } = renderWithRouter(<FarmCreatePage />, { route: '/farms/new' });
    fillMasterData('Neuer Hof');
    fireEvent.change(container.querySelector('input[type=file]')!, {
      target: { files: [new File([geojson], 'felder.geojson')] },
    });
    await screen.findByDisplayValue('Acker Ost');
    gateway.failNext(503);
    fireEvent.click(screen.getByRole('button', { name: 'Farm anlegen' }));
    await waitFor(() => expect(gateway.writes()).toHaveLength(1));
    expect(screen.getByTestId('location')).toHaveTextContent('/farms/new');
    expect(useFarmStore.getState().farms).toHaveLength(2);
  });
});
