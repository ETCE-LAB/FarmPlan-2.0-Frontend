import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { showToast, useUiStore } from '@farm/store/useUiStore';
import { Toaster } from './Toaster';

describe('Toaster', () => {
  afterEach(() => vi.useRealTimers());

  it('auto-dismisses toasts', () => {
    vi.useFakeTimers();
    render(<Toaster />);
    act(() => void showToast({ message: 'Gespeichert' }));
    expect(screen.getByText('Gespeichert')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(5_000));
    expect(screen.queryByText('Gespeichert')).not.toBeInTheDocument();
  });

  it('runs the action and closes the toast', () => {
    const onClick = vi.fn();
    render(<Toaster />);
    act(() => void showToast({ message: 'Gelöscht', action: { label: 'Rückgängig', onClick } }));
    fireEvent.click(screen.getByRole('button', { name: 'Rückgängig' }));
    expect(onClick).toHaveBeenCalledOnce();
    expect(useUiStore.getState().toasts).toEqual([]);
  });

  it('announces errors as alerts and can be dismissed manually', () => {
    render(<Toaster />);
    act(() => void showToast({ message: 'Kaputt', tone: 'error' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Kaputt');
    fireEvent.click(screen.getByRole('button', { name: 'Schließen' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
