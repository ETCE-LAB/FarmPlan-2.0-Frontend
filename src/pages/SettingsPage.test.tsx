import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithRouter } from '@farm/test/utils';
import { ConfirmDialogHost } from '@farm/components/shared/ConfirmDialogHost';
import { Toaster } from '@farm/components/shared/Toaster';
import { createBackup } from '@farm/lib/backup';
import { useFarmStore } from '@farm/store/useFarmStore';
import SettingsPage from './SettingsPage';

function renderSettings() {
  return renderWithRouter(
    <>
      <SettingsPage />
      <ConfirmDialogHost />
      <Toaster />
    </>,
    { route: '/settings' },
  );
}

const fileInput = (container: HTMLElement) => container.querySelector<HTMLInputElement>('input[type=file]')!;
const upload = (container: HTMLElement, content: string) =>
  fireEvent.change(fileInput(container), {
    target: { files: [new File([content], 'backup.json', { type: 'application/json' })] },
  });

describe('SettingsPage', () => {
  afterEach(() => vi.restoreAllMocks());

  it('changes language and theme', () => {
    renderSettings();
    fireEvent.click(screen.getByRole('button', { name: 'Dunkel' }));
    expect(useFarmStore.getState().theme).toBe('dark');
    fireEvent.change(screen.getByLabelText('Sprache'), { target: { value: 'en' } });
    expect(useFarmStore.getState().language).toBe('en');
  });

  it('downloads a backup', () => {
    Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:x'), revokeObjectURL: vi.fn() });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    renderSettings();
    fireEvent.click(screen.getByRole('button', { name: 'Sicherung herunterladen' }));
    expect((click.mock.contexts[0] as HTMLAnchorElement).download).toMatch(/^farmplan-backup-\d{4}-\d{2}-\d{2}\.json$/);
    expect(screen.getByText('Sicherung heruntergeladen.')).toBeInTheDocument();
  });

  it('restores an uploaded backup after confirmation and can undo it', async () => {
    const snapshot = useFarmStore.getState().snapshot();
    const backup = createBackup({
      ...snapshot,
      farms: [snapshot.farms[1]],
      fields: snapshot.fields.filter((f) => f.farmId === 'farm-2'),
      plans: [],
    });
    const { container } = renderSettings();

    upload(container, JSON.stringify(backup));
    const dialog = await screen.findByRole('dialog', { name: 'Sicherung einspielen?' });
    expect(dialog).toHaveTextContent('1 Farmen und 2 Schläge');
    fireEvent.click(screen.getByRole('button', { name: 'Einspielen' }));

    await waitFor(() => expect(useFarmStore.getState().farms.map((f) => f.id)).toEqual(['farm-2']));
    fireEvent.click(screen.getByRole('button', { name: 'Rückgängig' }));
    expect(useFarmStore.getState().farms).toHaveLength(2);
  });

  it('keeps the data when the restore is cancelled', async () => {
    const { container } = renderSettings();
    upload(
      container,
      JSON.stringify(createBackup({ ...useFarmStore.getState().snapshot(), farms: [], fields: [], plans: [] })),
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Abbrechen' }));
    await act(async () => {});
    expect(useFarmStore.getState().farms).toHaveLength(2);
  });

  it('reports invalid backup files', async () => {
    const { container } = renderSettings();
    upload(container, '{"app":"something-else"}');
    expect(await screen.findByRole('alert')).toHaveTextContent('keine FarmPlan-Sicherung');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('resets to demo data after confirmation', async () => {
    useFarmStore.getState().deleteFarm('farm-1');
    renderSettings();
    fireEvent.click(screen.getByRole('button', { name: 'Lokale Daten auf Demo-Daten zurücksetzen' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Zurücksetzen' }));
    await waitFor(() => expect(useFarmStore.getState().farms).toHaveLength(2));
  });
});
