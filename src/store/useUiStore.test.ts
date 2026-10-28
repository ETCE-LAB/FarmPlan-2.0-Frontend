import { describe, expect, it } from 'vitest';
import { confirmAction, showToast, useUiStore } from './useUiStore';

const options = { title: 'T', message: 'M', confirmLabel: 'OK', cancelLabel: 'Nein' };

describe('useUiStore', () => {
  it('adds toasts with a default tone and dismisses them', () => {
    const id = showToast({ message: 'Hallo' });
    expect(useUiStore.getState().toasts).toEqual([{ id, message: 'Hallo', tone: 'success' }]);
    useUiStore.getState().dismissToast(id);
    expect(useUiStore.getState().toasts).toEqual([]);
  });

  it('resolves a confirmation with the user choice', async () => {
    const pending = confirmAction(options);
    expect(useUiStore.getState().confirmRequest).toMatchObject(options);
    useUiStore.getState().resolveConfirm(true);
    await expect(pending).resolves.toBe(true);
    expect(useUiStore.getState().confirmRequest).toBeNull();
  });

  it('cancels a pending confirmation when a new one is opened', async () => {
    const first = confirmAction(options);
    const second = confirmAction({ ...options, title: 'Zweite' });
    await expect(first).resolves.toBe(false);
    useUiStore.getState().resolveConfirm(true);
    await expect(second).resolves.toBe(true);
  });
});
