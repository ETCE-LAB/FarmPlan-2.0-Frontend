import { describe, expect, it, vi } from 'vitest';
import L from 'leaflet';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { renderWithRouter } from '@farm/test/utils';
import { ConfirmDialogHost } from '@farm/components/shared/ConfirmDialogHost';
import { Toaster } from '@farm/components/shared/Toaster';
import { partsToMultiPolygon, rectanglePolygon } from '@farm/lib/geo';
import { useFarmStore } from '@farm/store/useFarmStore';
import { flushFarmSync } from '@farm/store/farmSync';
import { gateway } from '@farm/test/fakeGateway';
import FarmDetailPage from './FarmDetailPage';

function renderFarm(route = '/farms/farm-1') {
  return renderWithRouter(
    <>
      <FarmDetailPage />
      <ConfirmDialogHost />
      <Toaster />
    </>,
    { route, path: '/farms/:farmId' },
  );
}

const fieldsCard = () => screen.getByRole('heading', { name: 'Schläge' }).closest('section')!;

describe('FarmDetailPage', () => {
  it('shows the farm with its fields', () => {
    renderFarm();
    expect(screen.getByRole('heading', { level: 1, name: 'Gutshof Neorx' })).toBeInTheDocument();
    expect(within(fieldsCard()).getAllByRole('button', { expanded: false })).toHaveLength(3);
  });

  const saveMasterData = () =>
    fireEvent.click(
      within(screen.getByRole('heading', { name: 'Stammdaten' }).closest('section')!).getByRole('button', {
        name: 'Speichern',
      }),
    );

  it('saves master data on the server', async () => {
    renderFarm();
    fireEvent.change(screen.getByLabelText(/Betriebsname/), { target: { value: 'Gutshof Neu' } });
    saveMasterData();
    expect(await screen.findByText('Stammdaten gespeichert.')).toBeInTheDocument();
    expect(useFarmStore.getState().farms.find((f) => f.id === 'farm-1')!.name).toBe('Gutshof Neu');
    expect(gateway.farms.get('farm-1')).toMatchObject({ name: 'Gutshof Neu' });
  });

  it('keeps the old master data when saving fails', async () => {
    renderFarm();
    fireEvent.change(screen.getByLabelText(/Betriebsname/), { target: { value: 'Gutshof Neu' } });
    gateway.failNext(503);
    saveMasterData();
    expect(await screen.findByText(/konnten nicht gespeichert werden/)).toBeInTheDocument();
    expect(useFarmStore.getState().farms.find((f) => f.id === 'farm-1')!.name).toBe('Gutshof Neorx');
  });

  it('shows a loading state until the farms have arrived', () => {
    useFarmStore.setState({ farms: [], fields: [], farmsStatus: 'loading' });
    renderFarm();
    expect(screen.getByText('Daten werden geladen …')).toBeInTheDocument();
  });

  it('selects a field via the URL and edits its soil data', async () => {
    renderFarm('/farms/farm-1?field=f-101');
    expect(screen.getByRole('button', { name: /Schlag 1/, expanded: true })).toBeInTheDocument();
    expect(screen.getByLabelText('pH-Wert')).toHaveValue('6,8'); // German decimal comma

    fireEvent.change(screen.getByLabelText('pH-Wert'), { target: { value: '6,2' } });
    fireEvent.change(screen.getByLabelText('Bodenart'), { target: { value: 'Lehm' } });
    fireEvent.click(within(fieldsCard()).getByRole('button', { name: 'Speichern' }));

    expect(useFarmStore.getState().fields.find((f) => f.id === 'f-101')).toMatchObject({
      soilPh: 6.2,
      soilType: 'Lehm',
    });
    expect(await screen.findByText('Schlag „Schlag 1 (Agroforst Nord)“ gespeichert.')).toBeInTheDocument();
    expect(gateway.fields.get('f-101')).toMatchObject({ soilPh: 6.2, soilType: 'Lehm' });
  });

  it('centers the map on a field when it is selected', () => {
    const fitBounds = vi.spyOn(L.Map.prototype, 'fitBounds');
    renderFarm('/farms/farm-2');
    fitBounds.mockClear();

    fireEvent.click(screen.getByRole('button', { name: /Wiesenschlag Elbe/ }));

    expect(fitBounds).toHaveBeenCalledOnce();
    const field = useFarmStore.getState().fields.find((f) => f.id === 'f-202')!;
    const [lng, lat] = field.geometry!.coordinates[0][2];
    expect((fitBounds.mock.calls[0][0] as L.LatLngBounds).contains([lat, lng])).toBe(true);
    fitBounds.mockRestore();
  });

  it('does not re-center when the selection is cleared', () => {
    const fitBounds = vi.spyOn(L.Map.prototype, 'fitBounds');
    renderFarm('/farms/farm-2?field=f-202');
    fitBounds.mockClear();
    fireEvent.click(screen.getByRole('button', { name: /Wiesenschlag Elbe/ }));
    expect(fitBounds).not.toHaveBeenCalled();
    fitBounds.mockRestore();
  });

  it('rejects an invalid pH value', () => {
    renderFarm('/farms/farm-1?field=f-101');
    fireEvent.change(screen.getByLabelText('pH-Wert'), { target: { value: '19' } });
    expect(screen.getByText('Bitte einen Wert zwischen 0 und 14 eingeben.')).toBeInTheDocument();
    expect(within(fieldsCard()).getByRole('button', { name: 'Speichern' })).toBeDisabled();
  });

  it('toggles the selection in the URL', () => {
    renderFarm();
    fireEvent.click(screen.getByRole('button', { name: /Schlag 2/ }));
    expect(screen.getByTestId('location')).toHaveTextContent('/farms/farm-1?field=f-102');
    fireEvent.click(screen.getByRole('button', { name: /Schlag 2/ }));
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/farms\/farm-1$/);
  });

  it('deletes a field and undoes it from the toast', async () => {
    const serverNames = () => gateway.fieldsOf('farm-1').map((f) => f.name);
    renderFarm('/farms/farm-1?field=f-103');
    fireEvent.click(screen.getByRole('button', { name: 'Schlag löschen' }));
    expect(useFarmStore.getState().fields.some((f) => f.id === 'f-103')).toBe(false);
    await act(flushFarmSync);
    expect(gateway.fields.has('f-103')).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: 'Rückgängig' }));
    expect(useFarmStore.getState().fields.some((f) => f.id === 'f-103')).toBe(true);
    await act(flushFarmSync);
    // Recreated on the server under a new ID.
    expect(serverNames()).toContain('Schlag 3 (Obst- & Beerenstreifen)');
  });

  it('lists and removes exclusion zones and shows the net area', () => {
    useFarmStore
      .getState()
      .updateField('f-101', { excludedZones: partsToMultiPolygon([rectanglePolygon(52.2685, 10.521, 20, 20)]) });
    renderFarm('/farms/farm-1?field=f-101');
    expect(screen.getByText('Nettofläche')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ausschlussfläche 1 löschen' }));
    expect(useFarmStore.getState().fields.find((f) => f.id === 'f-101')!.excludedZones).toBeNull();
  });

  it('computes a treeline preview for the selected field', () => {
    renderFarm('/farms/farm-1?field=f-101');
    const panel = screen.getByRole('heading', { name: 'Treeline-Vorschau' }).closest('section')!;
    const rowsValue = () => within(panel).getByText('Reihen').nextElementSibling!.textContent;
    expect(Number(rowsValue())).toBeGreaterThan(0);

    fireEvent.change(within(panel).getByLabelText('Reihenabstand (m)'), { target: { value: '50' } });
    expect(Number(rowsValue())).toBe(4); // 200 m wide field, rows every 50 m
  });

  it('deletes the farm after confirmation and navigates to the list', async () => {
    renderFarm();
    fireEvent.click(screen.getByRole('button', { name: 'Farm löschen' }));
    const dialog = await screen.findByRole('dialog', { name: 'Farm löschen?' });
    expect(dialog).toHaveTextContent('3 Schlägen');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Löschen' }));

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(/^\/farms$/));
    expect(useFarmStore.getState().farms.some((f) => f.id === 'farm-1')).toBe(false);
    expect(gateway.farms.has('farm-1')).toBe(false);
  });

  it('keeps the farm when the server delete fails', async () => {
    renderFarm();
    fireEvent.click(screen.getByRole('button', { name: 'Farm löschen' }));
    const dialog = await screen.findByRole('dialog', { name: 'Farm löschen?' });
    gateway.failNext(503);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Löschen' }));
    expect(await screen.findByText(/konnte nicht gelöscht werden/)).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/farms/farm-1');
    expect(useFarmStore.getState().farms.some((f) => f.id === 'farm-1')).toBe(true);
  });

  it('exports the farm as GeoJSON', () => {
    Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:x'), revokeObjectURL: vi.fn() });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    renderFarm();
    fireEvent.click(screen.getByRole('button', { name: 'GeoJSON exportieren' }));
    expect((click.mock.contexts[0] as HTMLAnchorElement).download).toBe('gutshof-neorx.geojson');
    click.mockRestore();
  });

  it('imports GeoJSON fields into the farm', async () => {
    const { container } = renderFarm();
    const geojson = JSON.stringify({
      type: 'FeatureCollection',
      features: [
        { type: 'Feature', properties: { name: 'Importiert' }, geometry: rectanglePolygon(52.28, 10.53, 50, 50) },
      ],
    });
    fireEvent.change(container.querySelector('input[type=file]')!, {
      target: { files: [new File([geojson], 'f.geojson')] },
    });
    await waitFor(() =>
      expect(useFarmStore.getState().fields.some((f) => f.name === 'Importiert' && f.farmId === 'farm-1')).toBe(true),
    );
    expect(screen.getByText('1 Schlag importiert.')).toBeInTheDocument();
  });

  it('imports several GeoJSON fields in one atomic request', async () => {
    const { container } = renderFarm();
    const feature = (name: string, lng: number) => ({
      type: 'Feature',
      properties: { name },
      geometry: rectanglePolygon(52.28, lng, 50, 50),
    });
    const geojson = JSON.stringify({
      type: 'FeatureCollection',
      features: [feature('Nord', 10.53), feature('Süd', 10.54), feature('West', 10.55)],
    });
    fireEvent.change(container.querySelector('input[type=file]')!, {
      target: { files: [new File([geojson], 'f.geojson')] },
    });
    await waitFor(() => expect(screen.getByText('3 Schläge importiert.')).toBeInTheDocument());
    await act(flushFarmSync);
    expect(gateway.writes().map((r) => r.path)).toEqual(['/api/v1/farms/farm-1/fields:bulk']);
    expect(gateway.fieldsOf('farm-1').map((f) => f.name)).toEqual(expect.arrayContaining(['Nord', 'Süd', 'West']));
  });

  it('rolls back a GeoJSON import the server rejects as a whole', async () => {
    const { container } = renderFarm();
    gateway.failNext(422, ['outside_farm_boundary'], 'fields:bulk');
    const geojson = JSON.stringify({
      type: 'FeatureCollection',
      features: ['A', 'B'].map((name, i) => ({
        type: 'Feature',
        properties: { name },
        geometry: rectanglePolygon(52.28, 10.53 + i / 100, 50, 50),
      })),
    });
    fireEvent.change(container.querySelector('input[type=file]')!, {
      target: { files: [new File([geojson], 'f.geojson')] },
    });
    await waitFor(() => expect(screen.getByText(/außerhalb der Hofgrenze/)).toBeInTheDocument());
    await waitFor(() => expect(useFarmStore.getState().fields.filter((f) => f.farmId === 'farm-1')).toHaveLength(3));
    expect(gateway.fieldsOf('farm-1')).toHaveLength(3);
  });

  it('edits crop, irrigation, and automatic spacing of a field', async () => {
    renderFarm('/farms/farm-1?field=f-101');
    fireEvent.change(screen.getByLabelText('Kultur'), { target: { value: 'Walnuss' } });
    fireEvent.change(screen.getByLabelText('Bewässerung'), { target: { value: 'drip' } });
    fireEvent.click(screen.getByLabelText('Pflanzabstände automatisch'));
    fireEvent.click(within(fieldsCard()).getByRole('button', { name: 'Speichern' }));
    expect(await screen.findByText('Schlag „Schlag 1 (Agroforst Nord)“ gespeichert.')).toBeInTheDocument();
    expect(gateway.fields.get('f-101')).toMatchObject({ cropType: 'Walnuss', irrigation: 'drip', autoSpacing: true });
  });

  it('shows the server-computed boundary area and perimeter', async () => {
    useFarmStore.getState().updateFarm('farm-1', {
      boundary: rectanglePolygon(52.265, 10.519, 800, 600),
      boundaryAreaM2: 480_000,
      boundaryPerimeterM: 2_800,
    });
    renderFarm();
    expect(screen.getByText('48 ha')).toBeInTheDocument();
    expect(screen.getByText('2,8 km')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hofgrenze entfernen' })).toBeInTheDocument();
  });

  it('offers to draw a boundary when there is none', () => {
    renderFarm();
    expect(screen.getByText(/Keine Hofgrenze gezeichnet/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Hofgrenze zeichnen' }));
    expect(screen.getByText(/Klicke auf die Karte/)).toBeInTheDocument();
  });

  it('removes the boundary after confirmation', async () => {
    const boundary = rectanglePolygon(52.265, 10.519, 800, 600);
    gateway.farms.set('farm-1', { ...gateway.farms.get('farm-1')!, boundary });
    useFarmStore.getState().updateFarm('farm-1', { boundary, boundaryAreaM2: 480_000, boundaryPerimeterM: 2_800 });
    renderFarm();
    fireEvent.click(screen.getByRole('button', { name: 'Hofgrenze entfernen' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Hofgrenze entfernen' }));
    expect(await screen.findByText('Hofgrenze entfernt.')).toBeInTheDocument();
    expect(gateway.farms.get('farm-1')!.boundary).toBeNull();
    expect(screen.getByRole('button', { name: 'Hofgrenze zeichnen' })).toBeInTheDocument();
  });

  it('reports invalid GeoJSON', async () => {
    const { container } = renderFarm();
    fireEvent.change(container.querySelector('input[type=file]')!, {
      target: { files: [new File(['nope'], 'f.geojson')] },
    });
    expect(await screen.findByRole('alert')).toHaveTextContent('kein gültiges GeoJSON');
  });
});
