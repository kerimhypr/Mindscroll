'use client';

import React, { useState, useRef, useEffect } from 'react';
import { DatabaseZap, ShieldCheck, Globe, ChevronDown } from 'lucide-react';
import { useTranslation, Locale } from '@/lib/i18n/i18n';

const LANGUAGES: { code: Locale; name: string; flag: string }[] = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'pt', name: 'Português', flag: '🇵🇹' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
];

export default function Header() {
  const { t, locale, setLocale } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentLang = LANGUAGES.find((l) => l.code === locale) || LANGUAGES[0];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/92 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-950 text-white shadow-sm">
            <DatabaseZap className="h-4.5 w-4.5" />
          </div>
          <div>
            <span className="block text-base font-extrabold tracking-normal text-slate-950">{t('header.title')}</span>
            <span className="hidden text-[11px] font-medium text-slate-500 sm:block">{t('header.subtitle')}</span>
          </div>
        </div>
        
        <nav className="flex items-center gap-3">
          <div className="hidden items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 sm:flex">
            <ShieldCheck className="h-4 w-4" />
            <span>{t('header.zeroKnowledge')}</span>
          </div>

          {/* Language Selector Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950 shadow-sm"
            >
              <Globe className="h-3.5 w-3.5" />
              <span>{currentLang.flag} {currentLang.name}</span>
              <ChevronDown className="h-3 w-3 opacity-60" />
            </button>

            {isOpen && (
              <div className="absolute right-0 mt-1 w-44 rounded-xl border border-slate-200 bg-white p-1.5 shadow-[0_10px_30px_rgba(15,23,42,0.08)] animate-in fade-in slide-in-from-top-1 duration-150">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => {
                      setLocale(lang.code);
                      setIsOpen(false);
                    }}
                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold transition ${
                      locale === lang.code
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <span>{lang.flag}</span>
                    <span className="flex-1">{lang.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <a
            href="https://support.tiktok.com/en/account-and-privacy/account-information-and-settings/download-your-tiktok-data"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950 shadow-sm"
          >
            {t('header.exportGuide')}
          </a>
        </nav>
      </div>
    </header>
  );
}

