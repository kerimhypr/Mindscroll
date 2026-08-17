'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Crown,
  Heart,
  Lock,
  MessageCircle,
  Moon,
  Search,
  ShieldCheck,
  Sparkles,
  User,
  X,
  Zap,
} from 'lucide-react';
import { AnalysisResult } from '@/lib/parser/dataTypes';
import { useAnalysisStore } from '@/store/analysisStore';
import { useTranslation } from '@/lib/i18n/i18n';

const STORY_DURATION_MS = 7000;

type StoryMetric = {
  label: string;
  value: string;
  detail: string;
};

type StorySlide = {
  id: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  accent: string;
  icon: React.ElementType;
  metrics: StoryMetric[];
};

interface StoryViewerProps {
  results: AnalysisResult;
  isPremium: boolean;
  onUnlockPremium: () => void;
  onClose: () => void;
  checkoutLoading?: boolean;
}

function formatNumber(value: number, locale: string) {
  return new Intl.NumberFormat(locale).format(value);
}

function formatDate(value: string | null | undefined, locale: string, t: (key: string, variables?: Record<string, string | number>) => string) {
  if (!value) return t('metric.noDate');
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function getLocalizedDay(dayName: string, locale: string) {
  const days: Record<string, Record<string, string>> = {
    en: { Monday: 'Monday', Tuesday: 'Tuesday', Wednesday: 'Wednesday', Thursday: 'Thursday', Friday: 'Friday', Saturday: 'Saturday', Sunday: 'Sunday' },
    tr: { Monday: 'Pazartesi', Tuesday: 'Salı', Wednesday: 'Çarşamba', Thursday: 'Perşembe', Friday: 'Cuma', Saturday: 'Cumartesi', Sunday: 'Pazar' },
    de: { Monday: 'Montag', Tuesday: 'Dienstag', Wednesday: 'Mittwoch', Thursday: 'Donnerstag', Friday: 'Freitag', Saturday: 'Samstag', Sunday: 'Sonntag' },
    fr: { Monday: 'Lundi', Tuesday: 'Mardi', Wednesday: 'Mercredi', Thursday: 'Jeudi', Friday: 'Vendredi', Saturday: 'Samedi', Sunday: 'Dimanche' },
    es: { Monday: 'Lunes', Tuesday: 'Martes', Wednesday: 'Miércoles', Thursday: 'Jueves', Friday: 'Viernes', Saturday: 'Sábado', Sunday: 'Domingo' },
    pt: { Monday: 'Segunda-feira', Tuesday: 'Terça-feira', Wednesday: 'Quarta-feira', Thursday: 'Quinta-feira', Friday: 'Sexta-feira', Saturday: 'Sábado', Sunday: 'Domingo' },
    ru: { Monday: 'Понедельник', Tuesday: 'Вторник', Wednesday: 'Среда', Thursday: 'Четверг', Friday: 'Пятница', Saturday: 'Суббота', Sunday: 'Воскресенье' },
    ja: { Monday: '月曜日', Tuesday: '火曜日', Wednesday: '水曜日', Thursday: '木曜日', Friday: '金曜日', Saturday: '土曜日', Sunday: '日曜日' }
  };
  const cleanDay = dayName.trim();
  const dict = days[locale] || days['en'];
  return dict[cleanDay] || cleanDay;
}

function emptyValue(value: string | null | undefined, fallback = 'Not found') {
  return value && value.trim() ? value : fallback;
}

function topSearchesText(results: AnalysisResult, t: (key: string, variables?: Record<string, string | number>) => string) {
  if (results.topSearches.length === 0) return t('metric.noSearch');
  return results.topSearches
    .slice(0, 3)
    .map((item, index) => `${index + 1}. ${item.term} (${item.count})`)
    .join(' / ');
}

function buildSlides(results: AnalysisResult, t: (key: string, variables?: Record<string, string | number>) => string, locale: string): StorySlide[] {
  return [
    {
      id: 'opening',
      eyebrow: t('story.slide1.eyebrow'),
      title: t('story.slide1.title', { count: formatNumber(results.timeCell.videoCount, locale) }),
      subtitle: t('story.slide1.subtitle'),
      accent: 'from-slate-100 via-white to-indigo-100',
      icon: Sparkles,
      metrics: [
        {
          label: t('metric.1.label'),
          value: t('metric.1.value', { hours: results.timeCell.hours }),
          detail: t('metric.1.detail', { days: results.timeCell.days, count: formatNumber(results.timeCell.videoCount, locale) }),
        },
        {
          label: t('metric.2.label'),
          value: t('metric.2.value', { minutes: results.algorithmHypnosis.durationMinutes }),
          detail: t('metric.2.detail', { sessionLength: results.algorithmHypnosis.sessionLength, date: formatDate(results.algorithmHypnosis.date, locale, t) }),
        },
        {
          label: t('metric.3.label'),
          value: t('metric.3.value', { likes: formatNumber(results.socialVolume.likes, locale) }),
          detail: t('metric.3.detail', { comments: formatNumber(results.socialVolume.comments, locale) }),
        },
      ],
    },
    {
      id: 'comments',
      eyebrow: t('story.slide2.eyebrow'),
      title: t('story.slide2.title'),
      subtitle: t('story.slide2.subtitle'),
      accent: 'from-slate-100 via-white to-emerald-100',
      icon: MessageCircle,
      metrics: [
        {
          label: t('metric.4.label'),
          value: emptyValue(results.radicalComment?.comment, t('metric.fallback')),
          detail: results.radicalComment
            ? t('metric.4.detail', { score: results.radicalComment.score, date: formatDate(results.radicalComment.date, locale, t) })
            : t('metric.4.detail.empty'),
        },
        {
          label: t('metric.5.label'),
          value: emptyValue(results.simpEvidence?.comment, t('metric.fallback')),
          detail: results.simpEvidence
            ? t('metric.5.detail', { score: results.simpEvidence.score, date: formatDate(results.simpEvidence.date, locale, t) })
            : t('metric.5.detail.empty'),
        },
        {
          label: t('metric.6.label'),
          value: emptyValue(results.midnightLashing?.comment, t('metric.fallback')),
          detail: results.midnightLashing
            ? t('metric.6.detail', { time: results.midnightLashing.time, date: formatDate(results.midnightLashing.date, locale, t) })
            : t('metric.6.detail.empty'),
        },
        {
          label: t('metric.7.label'),
          value: emptyValue(results.genesisComment?.comment, t('metric.fallback')),
          detail: results.genesisComment
            ? t('metric.7.detail', { date: formatDate(results.genesisComment.date, locale, t) })
            : t('metric.7.detail.empty'),
        },
        {
          label: t('metric.8.label'),
          value: emptyValue(results.targetProfile?.username, t('metric.fallback')),
          detail: results.targetProfile
            ? t('metric.8.detail', { count: results.targetProfile.count })
            : t('metric.8.detail.empty'),
        },
        {
          label: t('metric.9.label'),
          value: t('metric.9.value', { count: formatNumber(results.snarkyCommentsCount, locale) }),
          detail: t('metric.9.detail', { count: formatNumber(results.snarkyCommentsCount, locale) }),
        },
      ],
    },
    {
      id: 'search-history',
      eyebrow: t('story.slide3.eyebrow'),
      title: t('story.slide3.title'),
      subtitle: t('story.slide3.subtitle'),
      accent: 'from-slate-100 via-white to-amber-100',
      icon: Search,
      metrics: [
        {
          label: t('metric.10.label'),
          value: emptyValue(results.stalkTarget?.username, t('metric.fallback')),
          detail: results.stalkTarget ? t('metric.10.detail', { count: results.stalkTarget.count }) : t('metric.10.detail.empty'),
        },
        {
          label: t('metric.11.label'),
          value: emptyValue(results.midnightMadnessSearch?.term, t('metric.fallback')),
          detail: results.midnightMadnessSearch
            ? t('metric.11.detail', { date: formatDate(results.midnightMadnessSearch.date, locale, t) })
            : t('metric.11.detail.empty'),
        },
        {
          label: t('metric.12.label'),
          value: emptyValue(results.detectiveSeries?.topic, t('metric.fallback')),
          detail: results.detectiveSeries
            ? t('metric.12.detail', { searches: results.detectiveSeries.searches.slice(0, 5).join(' -> ') })
            : t('metric.12.detail.empty'),
        },
        {
          label: t('metric.13.label'),
          value: topSearchesText(results, t),
          detail: t('metric.13.detail'),
        },
        {
          label: t('metric.14.label'),
          value: emptyValue(results.forgottenCuriosity, t('metric.fallback')),
          detail: t('metric.14.detail'),
        },
      ],
    },
    {
      id: 'likes-favorites',
      eyebrow: t('story.slide4.eyebrow'),
      title: t('story.slide4.title'),
      subtitle: t('story.slide4.subtitle'),
      accent: 'from-slate-100 via-white to-rose-100',
      icon: Heart,
      metrics: [
        {
          label: t('metric.15.label'),
          value: emptyValue(results.secretFavCreator, t('metric.fallback')),
          detail: t('metric.15.detail'),
        },
        {
          label: t('metric.16.label'),
          value: emptyValue(results.whyILikedEvidence[0], t('metric.fallback')),
          detail: results.whyILikedEvidence.length
            ? t('metric.16.detail', { count: results.whyILikedEvidence.length })
            : t('metric.16.detail.empty'),
        },
        {
          label: t('metric.17.label'),
          value: emptyValue(results.ghostLibraryVideo, t('metric.fallback')),
          detail: t('metric.17.detail'),
        },
        {
          label: t('metric.18.label'),
          value: emptyValue(results.firstAntiqueFav?.link, t('metric.fallback')),
          detail: results.firstAntiqueFav ? t('metric.18.detail', { date: formatDate(results.firstAntiqueFav.date, locale, t) }) : t('metric.18.detail.empty'),
        },
        {
          label: t('metric.19.label'),
          value: results.lastObsessionFavs.length ? results.lastObsessionFavs.slice(0, 3).join(' / ') : t('metric.fallback'),
          detail: t('metric.19.detail'),
        },
        {
          label: t('metric.20.label'),
          value: t('metric.20.value', { percentage: results.likeGenerosity.percentage }),
          detail: t('metric.20.detail', { label: results.likeGenerosity.label }),
        },
        {
          label: t('metric.21.label'),
          value: String(results.lonelinessRatio),
          detail: t('metric.21.detail'),
        },
      ],
    },
    {
      id: 'time-rhythm-core',
      eyebrow: t('story.slide5.eyebrow'),
      title: t('story.slide5.title'),
      subtitle: t('story.slide5.subtitle'),
      accent: 'from-slate-100 via-white to-violet-100',
      icon: Calendar,
      metrics: [
        {
          label: t('metric.22.label'),
          value: `${getLocalizedDay(results.weeklyPeakDay.day, locale)} ${results.weeklyPeakDay.percentage}%`,
          detail: t('metric.22.detail'),
        },
        {
          label: t('metric.23.label'),
          value: t('metric.23.value', { hours: results.blackSaturdayHours }),
          detail: t('metric.23.detail'),
        },
        {
          label: t('metric.24.label'),
          value: t('metric.24.value', { count: formatNumber(results.mondayBufferCount, locale) }),
          detail: t('metric.24.detail'),
        },
        {
          label: t('metric.25.label'),
          value: getLocalizedDay(results.calmestDay, locale),
          detail: t('metric.25.detail'),
        },
        {
          label: t('metric.26.label'),
          value: t('metric.26.value', { ratio: results.weekendOvertimeRatio }),
          detail: t('metric.26.detail'),
        },
        {
          label: t('metric.27.label'),
          value: t('metric.27.value', { percentage: results.holidayEscapePercentage }),
          detail: t('metric.27.detail'),
        },
        {
          label: t('metric.28.label'),
          value: t('metric.28.value', { count: formatNumber(results.longestDayRecord.count, locale) }),
          detail: t('metric.28.detail', { hours: results.longestDayRecord.hours, date: formatDate(results.longestDayRecord.date, locale, t) }),
        },
        {
          label: t('metric.29.label'),
          value: t('metric.29.value', { percentage: results.employmentIndex }),
          detail: t('metric.29.detail'),
        },
        {
          label: t('metric.30.label'),
          value: t('metric.30.value', { percentage: results.goldfishSyndromePercentage }),
          detail: t('metric.30.detail'),
        },
        {
          label: t('metric.31.label'),
          value: t('metric.31.value', { hours: results.insomniaHours }),
          detail: t('metric.31.detail'),
        },
        {
          label: t('metric.32.label'),
          value: results.mostUnproductiveHour,
          detail: t('metric.32.detail'),
        },
      ],
    },
    {
      id: 'time-rhythm-advanced',
      eyebrow: t('story.slide6.eyebrow'),
      title: t('story.slide6.title'),
      subtitle: t('story.slide6.subtitle'),
      accent: 'from-slate-100 via-white to-sky-100',
      icon: Moon,
      metrics: [
        {
          label: t('metric.33.label'),
          value: formatDate(results.firstDiscoveryDate, locale, t),
          detail: t('metric.33.detail'),
        },
        {
          label: t('metric.34.label'),
          value: t('metric.34.value', { summer: formatNumber(results.seasonalComparison.summerCount, locale) }),
          detail: t('metric.34.detail', { winter: formatNumber(results.seasonalComparison.winterCount, locale) }),
        },
        {
          label: t('metric.35.label'),
          value: t('metric.35.value', { percentage: results.paydayGreedIncrease }),
          detail: t('metric.35.detail'),
        },
        {
          label: t('metric.36.label'),
          value: t('metric.36.value', { percentage: results.yoyTrendIncrease }),
          detail: t('metric.36.detail'),
        },
        {
          label: t('metric.37.label'),
          value: t('metric.37.value', { minutes: results.morningPunctualityStdDev }),
          detail: t('metric.37.detail'),
        },
        {
          label: t('metric.38.label'),
          value: results.commentHourDistribution.length
            ? `${results.commentHourDistribution.sort((a, b) => b.count - a.count)[0].hour}:00`
            : t('metric.fallback'),
          detail: results.commentHourDistribution.length
            ? t('metric.38.detail', { count: results.commentHourDistribution.sort((a, b) => b.count - a.count)[0].count })
            : t('metric.38.detail.empty'),
        },
        {
          label: t('metric.39.label'),
          value: t('metric.39.value', { hours: results.biologicalSleepGapHours }),
          detail: t('metric.39.detail'),
        },
        {
          label: t('metric.40.label'),
          value: t('metric.40.value', { score: results.ultimateLonelinessScore }),
          detail: t('metric.40.detail'),
        },
      ],
    },
    {
      id: 'reposts-obsession',
      eyebrow: t('story.slide7.eyebrow'),
      title: t('story.slide7.title'),
      subtitle: t('story.slide7.subtitle'),
      accent: 'from-slate-100 via-white to-indigo-100',
      icon: User,
      metrics: [
        {
          label: t('metric.41.label'),
          value: emptyValue(results.secretCourierRepost?.link, t('metric.fallback')),
          detail: results.secretCourierRepost ? t('metric.41.detail', { date: formatDate(results.secretCourierRepost.date, locale, t) }) : t('metric.41.detail.empty'),
        },
        {
          label: t('metric.42.label'),
          value: String(results.repostFrequencyAnomaly),
          detail: t('metric.42.detail'),
        },
        {
          label: t('metric.43.label'),
          value: emptyValue(results.ultimateObsessionVideo?.link, t('metric.fallback')),
          detail: results.ultimateObsessionVideo
            ? t('metric.43.detail', { count: results.ultimateObsessionVideo.count })
            : t('metric.43.detail.empty'),
        },
        {
          label: t('metric.44.label'),
          value: emptyValue(results.firstRepostAntique?.link, t('metric.fallback')),
          detail: results.firstRepostAntique ? t('metric.44.detail', { date: formatDate(results.firstRepostAntique.date, locale, t) }) : t('metric.44.detail.empty'),
        },
        {
          label: t('metric.45.label'),
          value: emptyValue(results.worshippedCreator, t('metric.fallback')),
          detail: t('metric.45.detail'),
        },
      ],
    },
  ];
}

export default function StoryViewer({
  results,
  isPremium,
  onUnlockPremium,
  onClose,
  checkoutLoading = false,
}: StoryViewerProps) {
  const { t, locale } = useTranslation();
  const { currentStoryIndex, setCurrentStoryIndex } = useAnalysisStore();
  const [progress, setProgress] = useState(0);
  const slides = useMemo(() => buildSlides(results, t, locale), [results, t, locale]);
  const visibleSlides = isPremium ? slides : slides.slice(0, 2);
  const totalStories = isPremium ? slides.length : 3;
  const isUpsell = !isPremium && currentStoryIndex >= 2;
  const clampedIndex = Math.min(currentStoryIndex, totalStories - 1);
  const activeSlide = visibleSlides[Math.min(clampedIndex, visibleSlides.length - 1)];
  const Icon = activeSlide.icon;

  useEffect(() => {
    if (currentStoryIndex !== clampedIndex) {
      setCurrentStoryIndex(clampedIndex);
    }
  }, [clampedIndex, currentStoryIndex, setCurrentStoryIndex]);

  useEffect(() => {
    if (isUpsell) return;

    const startedAt = Date.now();
    const interval = window.setInterval(() => {
      const nextProgress = Math.min(((Date.now() - startedAt) / STORY_DURATION_MS) * 100, 100);
      setProgress(nextProgress);

      if (nextProgress >= 100) {
        window.clearInterval(interval);
        goNext();
      }
    }, 80);

    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clampedIndex, isUpsell, isPremium, totalStories]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') goNext();
      if (event.key === 'ArrowLeft') goPrevious();
      if (event.key === 'Escape' && isUpsell) onClose();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clampedIndex, isUpsell, isPremium]);

  function goNext() {
    if (isUpsell) return;

    if (clampedIndex >= totalStories - 1) {
      onClose();
      return;
    }

    setProgress(0);
    setCurrentStoryIndex(clampedIndex + 1);
  }

  function goPrevious() {
    if (clampedIndex <= 0) return;
    setProgress(0);
    setCurrentStoryIndex(clampedIndex - 1);
  }

  const progressValue = (index: number) => {
    if (index < clampedIndex) return 100;
    if (index === clampedIndex) return isUpsell ? 100 : progress;
    return 0;
  };

  const navButtonClass = isUpsell
    ? 'bg-white/12 text-white backdrop-blur transition hover:bg-white/20'
    : 'bg-slate-950/12 text-slate-950 backdrop-blur transition hover:bg-slate-950/20';
  const counterClass = isUpsell
    ? 'bg-white/12 text-white/82 backdrop-blur'
    : 'bg-slate-950/12 text-slate-950/75 backdrop-blur';

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950 text-white">
      <div className={`absolute inset-0 bg-gradient-to-br ${isUpsell ? 'from-slate-950 via-slate-900 to-indigo-950' : activeSlide.accent}`} />
      <div className="absolute inset-x-0 top-0 h-px bg-white/50" />

      <div className="relative z-10 flex min-h-dvh flex-col">
        <div className="px-4 pt-4 sm:px-6">
          <div className="flex gap-1.5">
            {Array.from({ length: totalStories }).map((_, index) => (
              <div key={index} className="h-1 flex-1 overflow-hidden rounded-full bg-white/25">
                <div
                  className="h-full rounded-full bg-white transition-[width] duration-100 ease-linear"
                  style={{ width: `${progressValue(index)}%` }}
                />
              </div>
            ))}
          </div>
        </div>

        {isUpsell ? (
          <UpsellStory
            checkoutLoading={checkoutLoading}
            onClose={onClose}
            onUnlockPremium={onUnlockPremium}
            t={t}
          />
        ) : (
          <article
            key={activeSlide.id}
            className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-6 py-8 sm:px-10"
          >
            <div className="max-w-3xl animate-[story-card-in_520ms_cubic-bezier(0.16,1,0.3,1)_both]">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm">
                <Icon className="h-4 w-4" />
                <span>{activeSlide.eyebrow}</span>
              </div>
              <h2 className="text-4xl font-black leading-[0.95] tracking-normal text-slate-950 sm:text-6xl lg:text-7xl">
                {activeSlide.title}
              </h2>
              <p className="mt-5 max-w-2xl text-base font-medium leading-7 text-slate-800 sm:text-lg">
                {activeSlide.subtitle}
              </p>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {activeSlide.metrics.map((metric, index) => (
                <div
                  key={`${activeSlide.id}-${metric.label}`}
                  className="min-h-36 rounded-xl border border-slate-200 bg-white/82 p-5 text-slate-950 shadow-[0_20px_60px_rgba(15,23,42,0.10)] backdrop-blur animate-[story-item-in_520ms_cubic-bezier(0.16,1,0.3,1)_both]"
                  style={{ animationDelay: `${160 + index * 120}ms` }}
                >
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{metric.label}</p>
                  <p className="mt-3 break-words text-3xl font-black tracking-normal text-slate-950">{metric.value}</p>
                  <p className="mt-3 text-sm font-medium leading-5 text-slate-600">{metric.detail}</p>
                </div>
              ))}
            </div>
          </article>
        )}

        <button
          type="button"
          onClick={goPrevious}
          aria-label={t('story.previous')}
          className="absolute inset-y-16 left-0 z-20 w-1/3 cursor-pointer"
        />
        <button
          type="button"
          onClick={goNext}
          aria-label={t('story.next')}
          className="absolute inset-y-16 right-0 z-20 w-1/3 cursor-pointer"
        />

        <div className="pointer-events-none absolute inset-x-4 bottom-5 z-30 flex items-center justify-between sm:inset-x-6">
          <button
            type="button"
            onClick={goPrevious}
            aria-label={t('story.previous')}
            className={`pointer-events-auto inline-flex h-11 w-11 items-center justify-center rounded-full ${navButtonClass}`}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className={`rounded-full px-3 py-1 text-xs font-bold ${counterClass}`}>
            {clampedIndex + 1} / {totalStories}
          </div>
          <button
            type="button"
            onClick={goNext}
            aria-label={t('story.next')}
            className={`pointer-events-auto inline-flex h-11 w-11 items-center justify-center rounded-full ${navButtonClass}`}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function UpsellStory({
  checkoutLoading,
  onClose,
  onUnlockPremium,
  t,
}: {
  checkoutLoading: boolean;
  onClose: () => void;
  onUnlockPremium: () => void;
  t: (key: string, variables?: Record<string, string | number>) => string;
}) {
  return (
    <section className="relative z-30 mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center px-6 py-10 text-center">
      <button
        type="button"
        onClick={onClose}
        aria-label={t('story.close')}
        className="absolute right-5 top-9 z-40 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white shadow-lg backdrop-blur transition hover:bg-white/18 sm:right-7"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="animate-[story-card-in_560ms_cubic-bezier(0.16,1,0.3,1)_both]">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-xl bg-white text-indigo-700 shadow-[0_24px_80px_rgba(15,23,42,0.28)]">
          <Lock className="h-9 w-9" />
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold text-white/85 backdrop-blur">
          <Zap className="h-4 w-4 text-amber-200" />
          <span>{t('story.upsell.badge')}</span>
        </div>
        <h2 className="mx-auto mt-6 max-w-3xl text-4xl font-black leading-[1.02] tracking-normal text-white sm:text-6xl">
          {t('story.upsell.headline')}
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-base font-semibold leading-7 text-white/78 sm:text-xl">
          {t('story.upsell.description')}
        </p>
      </div>

      <div className="mt-8 grid w-full max-w-3xl gap-3 sm:grid-cols-3">
        {[
          { icon: Moon, label: t('story.upsell.feature1.label'), detail: t('story.upsell.feature1.detail') },
          { icon: MessageCircle, label: t('story.upsell.feature2.label'), detail: t('story.upsell.feature2.detail') },
          { icon: Crown, label: t('story.upsell.feature3.label'), detail: t('story.upsell.feature3.detail') },
        ].map((item, index) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="rounded-xl border border-white/16 bg-white/10 p-4 text-left shadow-2xl backdrop-blur animate-[story-item-in_520ms_cubic-bezier(0.16,1,0.3,1)_both]"
              style={{ animationDelay: `${180 + index * 120}ms` }}
            >
              <Icon className="h-5 w-5 text-white" />
              <p className="mt-3 text-sm font-black text-white">{item.label}</p>
              <p className="mt-1 text-xs font-medium leading-5 text-white/62">{item.detail}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-8 flex w-full max-w-xl flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <button
          type="button"
          onClick={onUnlockPremium}
          disabled={checkoutLoading}
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-black text-indigo-700 shadow-[0_22px_70px_rgba(255,255,255,0.18)] transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          <Crown className="h-5 w-5" />
          {checkoutLoading ? t('story.preparingCheckout') : t('story.unlock')}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-6 py-3 text-sm font-bold text-white backdrop-blur transition hover:bg-white/15 sm:w-auto"
        >
          <X className="h-5 w-5" />
          {t('story.openBasicReport')}
        </button>
      </div>

      <div className="mt-5 flex items-center justify-center gap-2 text-xs font-semibold text-white/60">
        <ShieldCheck className="h-4 w-4 text-emerald-200" />
        <span>{t('story.securityNote')}</span>
      </div>
    </section>
  );
}
