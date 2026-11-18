import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, vi } from 'vitest';
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

const { default: i18n } = await import('@farm/i18n');
const { INITIAL_FARMS, INITIAL_FIELDS } = await import('@farm/data/mockData');
const { useFarmStore } = await import('@farm/store/useFarmStore');
const { useSessionStore } = await import('@farm/store/useSessionStore');
const { useUiStore } = await import('@farm/store/useUiStore');
const { flushFarmSync, resetFarmSync } = await import('@farm/store/farmSync');
const { installFakeGateway, TEST_TOKEN, TEST_USER } = await import('@farm/test/fakeGateway');

// Every test starts signed in, with the demo farms both on the fake gateway and in the store.
beforeEach(async () => {
  installFakeGateway();
  resetFarmSync();
  act(() => {
    useSessionStore.setState({ session: { token: TEST_TOKEN, user: TEST_USER }, status: 'ready', expired: false });
    useFarmStore.getState().resetData();
    useFarmStore.getState().setServerData(INITIAL_FARMS, INITIAL_FIELDS);
    useFarmStore.setState({ activeFarmId: INITIAL_FARMS[0].id, language: 'de', theme: 'light', baseLayer: 'osm' });
    useUiStore.setState({ toasts: [], confirmRequest: null, sidebarOpen: false });
  });
  await i18n.changeLanguage('de');
});

afterEach(async () => {
  await act(flushFarmSync);
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
  sessionStorage.clear();
});
