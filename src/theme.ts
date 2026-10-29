import { useSyncExternalStore } from 'react';
import { useFarmStore } from '@farm/store/useFarmStore';
import type { ThemePreference } from '@farm/types';

const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');

function resolveDark(preference: ThemePreference) {
  return preference === 'dark' || (preference === 'system' && darkQuery.matches);
}

function applyTheme() {
  document.documentElement.classList.toggle('dark', resolveDark(useFarmStore.getState().theme));
}

applyTheme();
useFarmStore.subscribe((state, prev) => {
  if (state.theme !== prev.theme) applyTheme();
});
darkQuery.addEventListener('change', applyTheme);

const subscribeToSystemTheme = (onChange: () => void) => {
  darkQuery.addEventListener('change', onChange);
  return () => darkQuery.removeEventListener('change', onChange);
};

export function useIsDark() {
  const theme = useFarmStore((s) => s.theme);
  const systemDark = useSyncExternalStore(subscribeToSystemTheme, () => darkQuery.matches);
  return theme === 'dark' || (theme === 'system' && systemDark);
}
