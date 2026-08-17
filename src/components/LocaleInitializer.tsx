'use client';

import { useEffect } from 'react';
import { useLocaleStore, useLocaleInitializer } from '@/lib/i18n/i18n';

export default function LocaleInitializer() {
  useLocaleInitializer();
  const locale = useLocaleStore((state) => state.locale);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  return null;
}
