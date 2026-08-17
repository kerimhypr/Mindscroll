import { create } from 'zustand';
import { useEffect } from 'react';
import { en } from './locales/en';
import { tr } from './locales/tr';
import { de } from './locales/de';
import { fr } from './locales/fr';
import { es } from './locales/es';
import { pt } from './locales/pt';
import { ru } from './locales/ru';
import { ja } from './locales/ja';

export type Locale = 'en' | 'tr' | 'de' | 'fr' | 'es' | 'pt' | 'ru' | 'ja';

const dictionaries: Record<Locale, Record<string, string>> = {
  en,
  tr,
  de,
  fr,
  es,
  pt,
  ru,
  ja
};

interface LocaleState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  initializeLocale: () => void;
}

export const useLocaleStore = create<LocaleState>((set) => ({
  locale: 'en',
  setLocale: (locale) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('mindscroll_locale', locale);
    }
    set({ locale });
  },
  initializeLocale: () => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem('mindscroll_locale') as Locale;
    if (saved && Object.keys(dictionaries).includes(saved)) {
      set({ locale: saved as Locale });
      return;
    }
    const browserLang = navigator.language.split('-')[0] as Locale;
    if (Object.keys(dictionaries).includes(browserLang)) {
      set({ locale: browserLang });
    }
  }
}));

export function useTranslation() {
  const locale = useLocaleStore((state) => state.locale);
  const setLocale = useLocaleStore((state) => state.setLocale);

  const t = (key: string, variables?: Record<string, string | number>): string => {
    const dict = dictionaries[locale] || dictionaries['en'];
    let text = dict[key] || dictionaries['en'][key] || key;

    if (variables) {
      Object.entries(variables).forEach(([k, v]) => {
        text = text.replace(new RegExp(`{${k}}`, 'g'), String(v));
      });
    }

    return text;
  };

  return { t, locale, setLocale };
}

export function useLocaleInitializer() {
  const initializeLocale = useLocaleStore((state) => state.initializeLocale);
  useEffect(() => {
    initializeLocale();
  }, [initializeLocale]);
}
