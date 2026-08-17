'use client';

import React from 'react';
import Header from '@/components/landing/Header';
import FileChecklist from '@/components/landing/FileChecklist';
import DropZone from '@/components/landing/DropZone';
import { ArrowRight, ChartNoAxesCombined, CheckCircle2, ExternalLink, FileArchive, Lock, ShieldCheck, Sparkles } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/i18n';

export default function Home() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen flex-col bg-[#f7f8fa]">
      <Header />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <section className="grid gap-8 border-b border-slate-200 pb-10 lg:grid-cols-[1fr_420px] lg:items-end">
          <div className="max-w-3xl animate-fade-in">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
              <span>{t('landing.badge')}</span>
            </div>
            <h1 className="mt-5 text-4xl font-black leading-[1.02] tracking-normal text-slate-950 sm:text-6xl">
              {t('landing.headline')}
            </h1>
            <p className="mt-5 max-w-2xl text-base font-medium leading-7 text-slate-600 sm:text-lg">
              {t('landing.description')}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {[
                t('landing.feature.clientSide'),
                t('landing.feature.encrypted'),
                t('landing.feature.stripe'),
              ].map((item) => (
                <span key={item} className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm ring-1 ring-slate-200">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_18px_55px_rgba(15,23,42,0.07)]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{t('landing.preview.badge')}</p>
                <h2 className="mt-1 text-lg font-black text-slate-950">{t('landing.preview.title')}</h2>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-950 text-white">
                <ChartNoAxesCombined className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-5 space-y-3">
              {[
                { label: t('landing.preview.row.1'), value: t('landing.preview.row.1.value') },
                { label: t('landing.preview.row.2'), value: t('landing.preview.row.2.value') },
                { label: t('landing.preview.row.3'), value: t('landing.preview.row.3.value') },
                { label: t('landing.preview.row.4'), value: t('landing.preview.row.4.value') },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5">
                  <span className="text-sm font-semibold text-slate-700">{row.label}</span>
                  <span className="text-xs font-bold text-slate-500">{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-8 py-10 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{t('landing.step1.badge')}</p>
              <h2 className="mt-2 text-2xl font-black tracking-normal text-slate-950">{t('landing.step1.title')}</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                {t('landing.step1.description')}
              </p>
            </div>
            <FileChecklist />
          </div>

          <aside className="space-y-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{t('landing.step2.badge')}</p>
              <h2 className="mt-2 text-2xl font-black tracking-normal text-slate-950">{t('landing.step2.title')}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {t('landing.step2.description')}
              </p>
            </div>
            <DropZone />

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-start gap-3">
                <FileArchive className="mt-0.5 h-5 w-5 text-slate-700" />
                <div>
                  <h3 className="text-sm font-black text-slate-950">{t('landing.guide.title')}</h3>
                  <p className="mt-1 text-xs leading-5 text-slate-600">
                    {t('landing.guide.description')}
                  </p>
                  <a
                    href="https://support.tiktok.com/en/account-and-privacy/account-information-and-settings/download-your-tiktok-data"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-slate-950 hover:text-indigo-700"
                  >
                    {t('landing.guide.link')}
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            </div>
          </aside>
        </section>

        <section className="border-t border-slate-200 py-10">
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              {
                icon: Lock,
                title: t('landing.info.1.title'),
                body: t('landing.info.1.body'),
              },
              {
                icon: ShieldCheck,
                title: t('landing.info.2.title'),
                body: t('landing.info.2.body'),
              },
              {
                icon: ArrowRight,
                title: t('landing.info.3.title'),
                body: t('landing.info.3.body'),
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <Icon className="h-5 w-5 text-slate-800" />
                  <h3 className="mt-4 text-sm font-black text-slate-950">{item.title}</h3>
                  <p className="mt-2 text-xs leading-5 text-slate-600">{item.body}</p>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white py-7 text-center text-xs font-medium text-slate-500">
        <p>{t('landing.footer', { year: new Date().getFullYear() })}</p>
      </footer>
    </div>
  );
}

