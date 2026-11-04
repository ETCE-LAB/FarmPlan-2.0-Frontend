import { describe, expect, it, vi } from 'vitest';
import L from 'leaflet';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { renderWithRouter } from '@farm/test/utils';
import { ConfirmDialogHost } from '@farm/components/shared/ConfirmDialogHost';
import { Toaster } from '@farm/components/shared/Toaster';
import { partsToMultiPolygon, rectanglePolygon } from '@farm/lib/geo';
import { useFarmStore } from '@farm/store/useFarmStore';
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

  it('saves master data', () => {
    renderFarm();
    fireEvent.change(screen.getByLabelText(/Betriebsname/), { target: { value: 'Gutshof Neu' } });
    fireEvent.click(
      within(screen.getByRole('heading', { name: 'Stammdaten' }).closest('section')!).getByRole('button', {
        name: 'Speichern',
      }),
    );
    expect(useFarmStore.getState().farms.find((f) => f.id === 'farm-1')!.name).toBe('Gutshof Neu');
    expect(screen.getByText('Stammdaten gespeichert.')).toBeInTheDocument();
  });

  it('selects a field via the URL and edits its soil data', () => {
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

  it('deletes a field and undoes it from the toast', () => {
    renderFarm('/farms/farm-1?field=f-103');
    fireEvent.click(screen.getByRole('button', { name: 'Schlag löschen' }));
    expect(useFarmStore.getState().fields.some((f) => f.id === 'f-103')).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Rückgängig' }));
    expect(useFarmStore.getState().fields.some((f) => f.id === 'f-103')).toBe(true);
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

  it('reports invalid GeoJSON', async () => {
    const { container } = renderFarm();
    fireEvent.change(container.querySelector('input[type=file]')!, {
      target: { files: [new File(['nope'], 'f.geojson')] },
    });
    expect(await screen.findByRole('alert')).toHaveTextContent('kein gültiges GeoJSON');
  });
});
