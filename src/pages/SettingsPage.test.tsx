import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';
import { renderWithRouter } from '@farm/test/utils';
import { ConfirmDialogHost } from '@farm/components/shared/ConfirmDialogHost';
import { Toaster } from '@farm/components/shared/Toaster';
import { createBackup } from '@farm/lib/backup';
import { useFarmStore } from '@farm/store/useFarmStore';
import { useSessionStore } from '@farm/store/useSessionStore';
import { gateway } from '@farm/test/fakeGateway';
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

  it('imports an uploaded backup into the account as new farms', async () => {
    const snapshot = useFarmStore.getState().snapshot();
    const backup = createBackup({
      ...snapshot,
      farms: [snapshot.farms[1]],
      fields: snapshot.fields.filter((f) => f.farmId === 'farm-2'),
      plans: [],
    });
    const { container } = renderSettings();

    upload(container, JSON.stringify(backup));
    const dialog = await screen.findByRole('dialog', { name: 'Sicherung importieren?' });
    expect(dialog).toHaveTextContent('1 Farmen und 2 Schläge');
    fireEvent.click(screen.getByRole('button', { name: 'Importieren' }));

    expect(await screen.findByText('1 Farm importiert.')).toBeInTheDocument();
    expect(useFarmStore.getState().farms).toHaveLength(3);
    expect(gateway.farms.size).toBe(3);
  });

  it('requires a login to import a backup', async () => {
    act(() => useSessionStore.getState().logout());
    const { container } = renderSettings();
    upload(container, JSON.stringify(createBackup(useFarmStore.getState().snapshot())));
    fireEvent.click(await screen.findByRole('button', { name: 'Importieren' }));
    expect(await screen.findByText('Zum Importieren bitte anmelden.')).toBeInTheDocument();
    expect(gateway.writes()).toEqual([]);
  });

  it('shows the signed-in account', () => {
    renderSettings();
    expect(screen.getByText('Angemeldet als Anna Test (anna@example.org)')).toBeInTheDocument();
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
});
