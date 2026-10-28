import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach } from 'vitest';
import { act, cleanup } from '@testing-library/react';

// jsdom has no matchMedia; the theme module needs it.
window.matchMedia ??= ((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addEventListener: () => {},
  removeEventListener: () => {},
  addListener: () => {},
  removeListener: () => {},
  dispatchEvent: () => false,
})) as typeof window.matchMedia;

// jsdom does not implement modal dialogs.
HTMLDialogElement.prototype.showModal ??= function showModal(this: HTMLDialogElement) {
  this.setAttribute('open', '');
};
HTMLDialogElement.prototype.close ??= function close(this: HTMLDialogElement) {
  this.removeAttribute('open');
  this.dispatchEvent(new Event('close'));
};

const { useFarmStore } = await import('@farm/store/useFarmStore');
const { useUiStore } = await import('@farm/store/useUiStore');

beforeEach(() => {
  act(() => {
    useFarmStore.getState().resetData();
    useFarmStore.setState({ language: 'de', theme: 'light', baseLayer: 'osm' });
    useUiStore.setState({ toasts: [], confirmRequest: null, sidebarOpen: false });
  });
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});
