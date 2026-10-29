import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { de } from './locales/de';
import { en } from './locales/en';
import { useFarmStore } from '@farm/store/useFarmStore';

export const resources = {
  de: { translation: de },
  en: { translation: en },
} as const;

declare module 'i18next' {
  interface CustomTypeOptions {
    resources: (typeof resources)['de'];
  }
}

const applyLanguage = (language: string) => {
  document.documentElement.lang = language;
  void i18n.changeLanguage(language);
};

void i18n.use(initReactI18next).init({
  resources,
  lng: useFarmStore.getState().language,
  fallbackLng: 'de',
  interpolation: { escapeValue: false },
});
document.documentElement.lang = i18n.language;

// The persisted store is the single source of truth for the UI language.
useFarmStore.subscribe((state, prev) => {
  if (state.language !== prev.language) applyLanguage(state.language);
});

export default i18n;
