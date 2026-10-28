import { describe, expect, it } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { confirmAction } from '@farm/store/useUiStore';
import { ConfirmDialogHost } from './ConfirmDialogHost';

const options = {
  title: 'Wirklich?',
  message: 'Das kann weh tun.',
  confirmLabel: 'Ja',
  cancelLabel: 'Nein',
  tone: 'danger' as const,
};

describe('ConfirmDialogHost', () => {
  it('renders the request and resolves true on confirm', async () => {
    render(<ConfirmDialogHost />);
    let pending!: Promise<boolean>;
    act(() => {
      pending = confirmAction(options);
    });

    const dialog = screen.getByRole('dialog', { name: 'Wirklich?' });
    expect(dialog).toHaveAccessibleDescription('Das kann weh tun.');
    expect(screen.getByRole('button', { name: 'Nein' })).toHaveFocus();

    fireEvent.click(screen.getByRole('button', { name: 'Ja' }));
    await expect(pending).resolves.toBe(true);
    expect(dialog).not.toHaveAttribute('open');
  });

  it('resolves false when closed with Escape', async () => {
    render(<ConfirmDialogHost />);
    let pending!: Promise<boolean>;
    act(() => {
      pending = confirmAction(options);
    });
    act(() => {
      screen.getByRole('dialog').dispatchEvent(new Event('close'));
    });
    await expect(pending).resolves.toBe(false);
  });
});
