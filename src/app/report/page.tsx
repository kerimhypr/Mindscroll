'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAnalysisStore } from '@/store/analysisStore';
import { getEncryptedReport, saveEncryptedReport } from '@/lib/firebase';
import { importKeyFromBase64, encryptText, decryptText } from '@/lib/crypto/encryption';
import Header from '@/components/landing/Header';
import StoryViewer from '@/components/StoryViewer';
import { generateVibeReport } from '@/lib/roast/roastEngine';
import { useTranslation } from '@/lib/i18n/i18n';
import { 
  Lock, Unlock, Clock, ShieldCheck, Heart, MessageCircle, 
  Search, Repeat, Calendar, Sparkles, 
  User, Flame, Activity, CheckCircle2, AlertCircle, Copy
} from 'lucide-react';

type ReportTab = 'comments' | 'searches' | 'likes' | 'rhythm' | 'reposts';

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown error';
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

function ReportContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, locale } = useTranslation();
  
  const {
    results,
    isPremiumUnlocked,
    isStoryOpen,
    reportId,
    encryptionKey,
    setResults,
    unlockPremium,
    setShareInfo,
    closeStory
  } = useAnalysisStore();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ReportTab>('comments');
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const hasHandledInitialLoad = useRef(false);

  // Check URL parameters for report loading / decryption
  useEffect(() => {
    async function loadReport() {
      try {
        if (hasHandledInitialLoad.current) return;
        hasHandledInitialLoad.current = true;

        const urlSessionId = searchParams.get('session_id');
        const urlReportId = searchParams.get('report_id') || searchParams.get('id');
        
        // Extract key from Hash fragment safely to preserve zero-knowledge (hash is not sent to server)
        let hashKey = '';
        if (typeof window !== 'undefined') {
          const match = window.location.hash.match(/key=([a-zA-Z0-9_\-]+)/);
          if (match) hashKey = match[1];
        }

        // 1. If redirected from Stripe checkout success
        if (urlSessionId) {
          setLoading(true);
          const response = await fetch(`/api/verify?session_id=${urlSessionId}`);
          const data = await response.json();
          
          if (data.success) {
            const verifiedReportId = data.reportId || urlReportId || sessionStorage.getItem('chronosfeed_report_id');

            if (!verifiedReportId) {
              setError("Payment was verified, but the report id was missing. Please reopen the report from the same browser session.");
              setLoading(false);
              return;
            }

            unlockPremium();
            
            // Retrieve key from sessionStorage
            const savedKey = sessionStorage.getItem('chronosfeed_encryption_key') || hashKey;
            if (!savedKey) {
              setError("Payment was verified, but the browser no longer has the decryption key. Please open the original share link or re-upload your TikTok data.");
              setLoading(false);
              return;
            }

            setShareInfo(verifiedReportId, savedKey);

            const report = await getEncryptedReport(verifiedReportId);
            if (!report) {
              setError("Payment was verified, but the encrypted report could not be found.");
              setLoading(false);
              return;
            }

            const importedKey = await importKeyFromBase64(savedKey);
            const decryptedStr = await decryptText(report.ciphertext, report.iv, importedKey);
            setResults(JSON.parse(decryptedStr));

            if (typeof window !== 'undefined') {
              window.history.replaceState(null, '', `/report?id=${verifiedReportId}#key=${savedKey}`);
            }
          } else {
            console.error('Payment verification failed:', data.error);
            setError(data.error || "Payment verification failed.");
          }
          setLoading(false);
          return;
        }

        // 2. If viewing a shared report link (id in params, key in hash)
        if (urlReportId) {
          const savedKey = hashKey || sessionStorage.getItem('chronosfeed_encryption_key');
          if (!savedKey) {
            setError("This report is encrypted. To view it, you need the decryption key parameter in the URL hash (#key=...).");
            setLoading(false);
            return;
          }

          setLoading(true);
          const report = await getEncryptedReport(urlReportId);
          if (!report) {
            setError("Report not found. The link might be expired or incorrect.");
            setLoading(false);
            return;
          }

          try {
            const importedKey = await importKeyFromBase64(savedKey);
            const decryptedStr = await decryptText(report.ciphertext, report.iv, importedKey);
            setResults(JSON.parse(decryptedStr));
            setShareInfo(urlReportId, savedKey);
            
            // We can unlock premium for loaded shared reports (since they're already generated/paid)
            unlockPremium();
          } catch (decryptionError) {
            console.error(decryptionError);
            setError("Decryption failed. The key in the URL hash is incorrect or corrupted.");
          }
          setLoading(false);
          return;
        }

        // 3. Fallback: If we have results in state (just uploaded)
        if (results) {
          setLoading(false);
          return;
        }

        // No results, no params: redirect to home
        router.push('/');
      } catch (e: unknown) {
        console.error(e);
        setError("Failed to load and decrypt report.");
        setLoading(false);
      }
    }

    loadReport();
  }, [searchParams, results, router, setResults, unlockPremium, setShareInfo]);

  // Handle Stripe Checkout Creation
  const handleUnlockPremium = async () => {
    if (!results) return;
    setCheckoutLoading(true);
    
    try {
      let activeReportId = reportId;
      
      // If report is not saved to Firestore yet, save it
      if (!activeReportId) {
        const docId = crypto.randomUUID();
        const cryptoKey = await importKeyFromBase64(encryptionKey || '');
        const encryptedData = await encryptText(JSON.stringify(results), cryptoKey);
        await saveEncryptedReport(docId, encryptedData.ciphertext, encryptedData.iv);
        activeReportId = docId;
        setShareInfo(docId, encryptionKey || '');
      }

      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId: activeReportId }),
      });
      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Failed to create Checkout session');
      }
    } catch (e: unknown) {
      console.error(e);
      alert('Error initiating checkout: ' + getErrorMessage(e));
      setCheckoutLoading(false);
    }
  };

  // Copy shareable link
  const handleCopyLink = () => {
    if (typeof window === 'undefined' || !reportId || !encryptionKey) return;
    const origin = window.location.origin;
    const shareUrl = `${origin}/report?id=${reportId}#key=${encryptionKey}`;
    
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat(locale).format(value);
  };

  const formatDate = (value: string | null | undefined) => {
    if (!value) return t('metric.noDate');
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-50">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center space-y-4">
          <Activity className="h-10 w-10 text-indigo-600 animate-pulse" />
          <p className="text-sm font-semibold text-slate-800">{t('dashboard.loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-50">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto space-y-4">
          <AlertCircle className="h-12 w-12 text-rose-500" />
          <h2 className="text-xl font-bold text-slate-900">{t('dashboard.errorTitle')}</h2>
          <p className="text-sm text-slate-500 leading-normal">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition"
          >
            {t('dashboard.goHome')}
          </button>
        </div>
      </div>
    );
  }

  if (!results) return null;

  const vibes = generateVibeReport(results, t);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50/50 pb-20">
      {isStoryOpen && (
        <StoryViewer
          results={results}
          isPremium={isPremiumUnlocked}
          onUnlockPremium={handleUnlockPremium}
          onClose={closeStory}
          checkoutLoading={checkoutLoading}
        />
      )}

      <Header />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        
        {/* Banner with share option if unlocked */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-950 tracking-tight">{t('dashboard.title')}</h1>
            <p className="text-sm text-slate-500 mt-1">{t('dashboard.subtitle')}</p>
          </div>
          {isPremiumUnlocked && reportId && encryptionKey && (
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-2 rounded-xl bg-indigo-50 hover:bg-indigo-100/80 text-indigo-700 px-4 py-2.5 text-sm font-semibold transition"
            >
              {copiedLink ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              <span>{copiedLink ? t('dashboard.copiedShareLink') : t('dashboard.copyShareLink')}</span>
            </button>
          )}
        </div>

        {/* SECTION 1: FREE METRICS (THE HOOK) - METRICS 1, 2, 3 */}
        <div className="grid gap-6 sm:grid-cols-3">
          {/* Time Cell - Metric 1 */}
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-premium hover:shadow-lg transition">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <Clock className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-700">{t('dashboard.timeExpended')}</h3>
            </div>
            <div className="mt-4 space-y-1">
              <span className="text-4xl font-extrabold text-slate-900 tracking-tight">
                {t('metric.1.value', { hours: results.timeCell.hours })}
              </span>
              <p className="text-xs text-slate-400">
                {t('dashboard.approxLifespan', { days: results.timeCell.days, count: formatNumber(results.timeCell.videoCount) })}
              </p>
            </div>
          </div>

          {/* Algorithm Hypnosis - Metric 2 */}
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-premium hover:shadow-lg transition">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
                <Flame className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-700">{t('dashboard.algorithmicFlow')}</h3>
            </div>
            <div className="mt-4 space-y-1">
              <span className="text-4xl font-extrabold text-slate-900 tracking-tight">
                {t('metric.2.value', { minutes: results.algorithmHypnosis.durationMinutes })}
              </span>
              <p className="text-xs text-slate-400">
                {t('dashboard.longestScroll', { date: formatDate(results.algorithmHypnosis.date) })}
              </p>
            </div>
          </div>

          {/* Social Volume - Metric 3 */}
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-premium hover:shadow-lg transition">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-50 text-pink-600">
                <MessageCircle className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-700">{t('dashboard.socialFootprint')}</h3>
            </div>
            <div className="mt-4 space-y-1">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-slate-900 tracking-tight">
                  {formatNumber(results.socialVolume.likes)}
                </span>
                <span className="text-xs text-slate-400 font-semibold">likes /</span>
                <span className="text-lg font-bold text-slate-700">
                  {formatNumber(results.socialVolume.comments)}
                </span>
                <span className="text-xs text-slate-400 font-semibold">comments</span>
              </div>
              <p className="text-xs text-slate-400">
                {t('dashboard.interactionTally')}
              </p>
            </div>
          </div>
        </div>

        {/* Positive Vibe Spotlight */}
        <div className="rounded-2xl bg-gradient-to-br from-indigo-50 via-slate-50 to-teal-50/50 p-6 border border-indigo-100/50">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-indigo-600 animate-spin" style={{ animationDuration: '6s' }} />
            <h3 className="text-sm font-bold text-slate-800 tracking-tight">{t('dashboard.vibeAccolades')}</h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {vibes.map((v, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-100 p-4 space-y-2">
                <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-600">
                  {v.badge}
                </span>
                <h4 className="text-sm font-bold text-slate-900">{v.title}</h4>
                <p className="text-xs text-slate-500 leading-normal">{v.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 2: 42 PREMIUM METRICS */}
        <div className="relative">
          {/* Tab Navigation */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-200 scrollbar-none">
            {([
              { id: 'comments', label: t('dashboard.tab.comments'), icon: MessageCircle },
              { id: 'searches', label: t('dashboard.tab.searches'), icon: Search },
              { id: 'likes', label: t('dashboard.tab.likes'), icon: Heart },
              { id: 'rhythm', label: t('dashboard.tab.rhythm'), icon: Calendar },
              { id: 'reposts', label: t('dashboard.tab.reposts'), icon: Repeat },
            ] satisfies Array<{ id: ReportTab; label: string; icon: React.ElementType }>).map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    if (!isPremiumUnlocked) return;
                    setActiveTab(tab.id);
                  }}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold whitespace-nowrap transition ${
                    !isPremiumUnlocked 
                      ? 'text-slate-400 cursor-not-allowed'
                      : activeTab === tab.id
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-white text-slate-600 border border-slate-100 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Premium Blur Shield */}
          {!isPremiumUnlocked && (
            <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-slate-50/40 backdrop-blur-md rounded-2xl border border-indigo-100 p-8 text-center shadow-lg min-h-[400px]">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 shadow-md animate-bounce">
                <Lock className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-extrabold text-slate-900 mt-4">{t('dashboard.unlockPremium')}</h3>
              <p className="text-sm text-slate-500 max-w-md mt-2 leading-relaxed">
                {t('dashboard.unlockPremiumDesc')}
              </p>
              <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
                <button
                  onClick={handleUnlockPremium}
                  disabled={checkoutLoading}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 font-semibold text-sm shadow-lg shadow-indigo-600/20 transition disabled:opacity-50"
                >
                  {checkoutLoading ? t('dashboard.preparing') : t('dashboard.unlockPremiumButton')}
                  <Unlock className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-4 flex items-center gap-1.5 text-xs text-slate-400 font-semibold">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                <span>{t('dashboard.zeroKnowledgeBanner')}</span>
              </div>
            </div>
          )}

          {/* Tab Contents (Blurred if locked) */}
          <div className={`mt-6 space-y-6 ${!isPremiumUnlocked ? 'filter blur-[8px] pointer-events-none select-none opacity-40' : ''}`}>
            
            {/* TAB: Comments - Metrics 4-9 */}
            {activeTab === 'comments' && (
              <div className="grid gap-6 md:grid-cols-2">
                {/* Radical Comment - Metric 4 */}
                <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-premium">
                  <span className="text-[10px] font-bold tracking-wider text-indigo-500 uppercase">{t('story.slide2.eyebrow')} • {t('metric.4.label')}</span>
                  <h4 className="text-sm font-bold text-slate-800 mt-1">{t('dashboard.comments.radical')}</h4>
                  {results.radicalComment ? (
                    <div className="mt-4 space-y-2">
                      <blockquote className="border-l-4 border-indigo-500 pl-4 py-1 italic text-slate-700 text-sm">
                        &quot;{results.radicalComment.comment}&quot;
                      </blockquote>
                      <div className="flex items-center justify-between text-xs text-slate-400 pt-2">
                        <span>{formatDate(results.radicalComment.date)}</span>
                        <span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                          Score: {results.radicalComment.score}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 mt-4">{t('metric.4.detail.empty')}</p>
                  )}
                </div>

                {/* Simp Evidence - Metric 5 */}
                <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-premium">
                  <span className="text-[10px] font-bold tracking-wider text-emerald-500 uppercase">{t('story.slide2.eyebrow')} • {t('metric.5.label')}</span>
                  <h4 className="text-sm font-bold text-slate-800 mt-1">{t('dashboard.comments.simp')}</h4>
                  {results.simpEvidence ? (
                    <div className="mt-4 space-y-2">
                      <blockquote className="border-l-4 border-emerald-500 pl-4 py-1 italic text-slate-700 text-sm">
                        &quot;{results.simpEvidence.comment}&quot;
                      </blockquote>
                      <div className="flex items-center justify-between text-xs text-slate-400 pt-2">
                        <span>{formatDate(results.simpEvidence.date)}</span>
                        <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                          Score: {results.simpEvidence.score}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 mt-4">{t('dashboard.comments.simp.empty')}</p>
                  )}
                </div>

                {/* Midnight Commentary - Metric 6 */}
                <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-premium">
                  <span className="text-[10px] font-bold tracking-wider text-pink-500 uppercase">{t('story.slide2.eyebrow')} • {t('metric.6.label')}</span>
                  <h4 className="text-sm font-bold text-slate-800 mt-1">{t('dashboard.comments.midnight')}</h4>
                  {results.midnightLashing ? (
                    <div className="mt-4 space-y-2">
                      <blockquote className="border-l-4 border-pink-500 pl-4 py-1 italic text-slate-700 text-sm">
                        &quot;{results.midnightLashing.comment}&quot;
                      </blockquote>
                      <p className="text-xs text-slate-400 pt-2">
                        {t('dashboard.comments.midnight.desc', { time: results.midnightLashing.time, date: formatDate(results.midnightLashing.date) })}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 mt-4">{t('metric.6.detail.empty')}</p>
                  )}
                </div>

                {/* Genesis Comment - Metric 7 */}
                <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-premium">
                  <span className="text-[10px] font-bold tracking-wider text-teal-500 uppercase">{t('story.slide2.eyebrow')} • {t('metric.7.label')}</span>
                  <h4 className="text-sm font-bold text-slate-800 mt-1">{t('dashboard.comments.genesis')}</h4>
                  {results.genesisComment ? (
                    <div className="mt-4 space-y-2">
                      <blockquote className="border-l-4 border-teal-500 pl-4 py-1 italic text-slate-700 text-sm">
                        &quot;{results.genesisComment.comment}&quot;
                      </blockquote>
                      <p className="text-xs text-slate-400 pt-2">
                        {t('dashboard.comments.genesis.desc', { date: formatDate(results.genesisComment.date) })}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 mt-4">{t('metric.7.detail.empty')}</p>
                  )}
                </div>

                {/* Mentions & Simplicity - Metrics 8 & 9 */}
                <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-premium space-y-4">
                  <div>
                    <span className="text-[10px] font-bold tracking-wider text-amber-500 uppercase">{t('story.slide2.eyebrow')} • {t('metric.8.label')}</span>
                    <h4 className="text-sm font-bold text-slate-800 mt-1">{t('dashboard.comments.target')}</h4>
                    {results.targetProfile ? (
                      <p className="text-xs text-slate-500 mt-2">
                        {t('dashboard.comments.target.desc', { username: results.targetProfile.username, count: results.targetProfile.count })}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-400 mt-2">{t('dashboard.comments.target.empty')}</p>
                    )}
                  </div>
                  
                  <div className="border-t border-slate-100 pt-4">
                    <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">{t('story.slide2.eyebrow')} • {t('metric.9.label')}</span>
                    <h4 className="text-sm font-bold text-slate-800 mt-1">{t('dashboard.comments.snarky')}</h4>
                    <p className="text-xs text-slate-500 mt-2">
                      {t('metric.9.detail', { count: formatNumber(results.snarkyCommentsCount) })}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: Searches - Metrics 10-14 */}
            {activeTab === 'searches' && (
              <div className="grid gap-6 md:grid-cols-2">
                {/* Stalk Target - Metric 10 */}
                <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-premium">
                  <span className="text-[10px] font-bold tracking-wider text-indigo-500 uppercase">{t('story.slide3.eyebrow')} • {t('metric.10.label')}</span>
                  <h4 className="text-sm font-bold text-slate-800 mt-1">{t('dashboard.searches.stalk')}</h4>
                  {results.stalkTarget ? (
                    <div className="mt-4 space-y-2">
                      <span className="inline-flex items-center gap-2 rounded-xl bg-indigo-50 text-indigo-700 px-4 py-2 font-semibold text-sm">
                        {results.stalkTarget.username}
                      </span>
                      <p className="text-xs text-slate-500">
                        {t('dashboard.searches.stalk.desc', { username: results.stalkTarget.username, count: results.stalkTarget.count })}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 mt-4">{t('dashboard.searches.stalk.empty')}</p>
                  )}
                </div>

                {/* Midnight Madness - Metric 11 */}
                <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-premium">
                  <span className="text-[10px] font-bold tracking-wider text-pink-500 uppercase">{t('story.slide3.eyebrow')} • {t('metric.11.label')}</span>
                  <h4 className="text-sm font-bold text-slate-800 mt-1">{t('dashboard.searches.midnight')}</h4>
                  {results.midnightMadnessSearch ? (
                    <div className="mt-4 space-y-2">
                      <span className="inline-block bg-slate-50 rounded-xl border border-slate-100 px-4 py-3 font-mono text-sm font-semibold text-slate-800">
                        {results.midnightMadnessSearch.term}
                      </span>
                      <p className="text-xs text-slate-400 pt-1">
                        {t('dashboard.searches.midnight.desc', { time: new Date(results.midnightMadnessSearch.date).toLocaleTimeString(), date: formatDate(results.midnightMadnessSearch.date) })}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 mt-4">{t('metric.11.detail.empty')}</p>
                  )}
                </div>

                {/* Detective Series - Metric 12 */}
                <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-premium">
                  <span className="text-[10px] font-bold tracking-wider text-teal-500 uppercase">{t('story.slide3.eyebrow')} • {t('metric.12.label')}</span>
                  <h4 className="text-sm font-bold text-slate-800 mt-1">{t('dashboard.searches.detective')}</h4>
                  {results.detectiveSeries ? (
                    <div className="mt-4 space-y-2">
                      <p className="text-xs text-slate-500">
                        {t('dashboard.searches.detective.desc', { topic: results.detectiveSeries.topic })}
                      </p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {results.detectiveSeries.searches.slice(0, 6).map((term, idx) => (
                          <span key={idx} className="bg-indigo-50/50 text-indigo-700 text-xs px-2.5 py-1 rounded-lg border border-indigo-100/50">
                            {term}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 mt-4">{t('metric.12.detail.empty')}</p>
                  )}
                </div>

                {/* Top 3 & Forgotten - Metrics 13 & 14 */}
                <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-premium space-y-4">
                  <div>
                    <span className="text-[10px] font-bold tracking-wider text-amber-500 uppercase">{t('story.slide3.eyebrow')} • {t('metric.13.label')}</span>
                    <h4 className="text-sm font-bold text-slate-800 mt-1">{t('dashboard.searches.top3')}</h4>
                    <div className="mt-3 space-y-2">
                      {results.topSearches.length > 0 ? (
                        results.topSearches.map((s, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs border-b border-slate-50 pb-2">
                            <span className="font-semibold text-slate-700">{idx+1}. {s.term}</span>
                            <span className="text-slate-400 font-bold">{s.count} {t('dashboard.searches.top3.searches')}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-slate-400">{t('metric.noSearch')}</p>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-4">
                    <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">{t('story.slide3.eyebrow')} • {t('metric.14.label')}</span>
                    <h4 className="text-sm font-bold text-slate-800 mt-1">{t('dashboard.searches.forgotten')}</h4>
                    {results.forgottenCuriosity ? (
                      <p className="text-xs text-slate-500 mt-2">
                        {t('dashboard.searches.forgotten.desc', { topic: results.forgottenCuriosity })}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-400 mt-2">{t('metric.fallback')}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: Likes - Metrics 15-21 */}
            {activeTab === 'likes' && (
              <div className="grid gap-6 md:grid-cols-2">
                {/* Secret Favorite Creator - Metric 15 */}
                <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-premium">
                  <span className="text-[10px] font-bold tracking-wider text-indigo-500 uppercase">{t('story.slide4.eyebrow')} • {t('metric.15.label')}</span>
                  <h4 className="text-sm font-bold text-slate-800 mt-1">{t('dashboard.likes.favoriteCreator')}</h4>
                  {results.secretFavCreator ? (
                    <div className="mt-4 space-y-2">
                      <span className="inline-flex items-center gap-2 rounded-xl bg-indigo-50 text-indigo-700 px-4 py-2 font-semibold">
                        <User className="h-4 w-4" />
                        {results.secretFavCreator}
                      </span>
                      <p className="text-xs text-slate-500">
                        {t('dashboard.likes.favoriteCreator.desc')}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 mt-4">{t('metric.fallback')}</p>
                  )}
                </div>

                {/* Why I Liked Evidence - Metric 16 */}
                <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-premium">
                  <span className="text-[10px] font-bold tracking-wider text-emerald-500 uppercase">{t('story.slide4.eyebrow')} • {t('metric.16.label')}</span>
                  <h4 className="text-sm font-bold text-slate-800 mt-1">{t('dashboard.likes.whyLiked')}</h4>
                  {results.whyILikedEvidence.length > 0 ? (
                    <div className="mt-4 space-y-2">
                      <p className="text-xs text-slate-500">{t('dashboard.likes.whyLiked.desc', { count: results.whyILikedEvidence.length })}</p>
                      <div className="mt-2 space-y-1.5 max-h-32 overflow-y-auto scrollbar-none">
                        {results.whyILikedEvidence.slice(0, 3).map((link, idx) => (
                          <a 
                            key={idx}
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block text-xs text-indigo-600 break-all hover:underline"
                          >
                            {link}
                          </a>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 mt-4">{t('dashboard.likes.whyLiked.empty')}</p>
                  )}
                </div>

                {/* Ghost Library & Antiques - Metrics 17 & 18 */}
                <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-premium space-y-4">
                  <div>
                    <span className="text-[10px] font-bold tracking-wider text-pink-500 uppercase">{t('story.slide4.eyebrow')} • {t('metric.17.label')}</span>
                    <h4 className="text-sm font-bold text-slate-800 mt-1">{t('dashboard.likes.ghost')}</h4>
                    {results.ghostLibraryVideo ? (
                      <div className="mt-2 space-y-2">
                        <a 
                          href={results.ghostLibraryVideo}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-indigo-600 break-all font-semibold hover:underline"
                        >
                          {results.ghostLibraryVideo}
                        </a>
                        <p className="text-xs text-slate-500">
                          {t('dashboard.likes.ghost.desc')}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 mt-2">{t('metric.17.detail')}</p>
                    )}
                  </div>

                  <div className="border-t border-slate-100 pt-4">
                    <span className="text-[10px] font-bold tracking-wider text-teal-500 uppercase">{t('story.slide4.eyebrow')} • {t('metric.18.label')}</span>
                    <h4 className="text-sm font-bold text-slate-800 mt-1">{t('dashboard.likes.firstAntique')}</h4>
                    {results.firstAntiqueFav ? (
                      <div className="mt-2 space-y-2">
                        <a 
                          href={results.firstAntiqueFav.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-indigo-600 break-all font-semibold hover:underline"
                        >
                          {results.firstAntiqueFav.link}
                        </a>
                        <p className="text-xs text-slate-400">
                          {t('dashboard.likes.firstAntique.desc', { date: formatDate(results.firstAntiqueFav.date) })}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 mt-2">{t('metric.18.detail.empty')}</p>
                    )}
                  </div>
                </div>

                {/* Last Obsessions - Metric 19 */}
                <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-premium">
                  <span className="text-[10px] font-bold tracking-wider text-amber-500 uppercase">{t('story.slide4.eyebrow')} • {t('metric.19.label')}</span>
                  <h4 className="text-sm font-bold text-slate-800 mt-1">{t('dashboard.likes.lastObsession')}</h4>
                  {results.lastObsessionFavs.length > 0 ? (
                    <div className="mt-4 space-y-2">
                      <p className="text-xs text-slate-500">{t('dashboard.likes.lastObsession.desc')}</p>
                      <div className="space-y-1.5 mt-2">
                        {results.lastObsessionFavs.slice(0, 3).map((link, idx) => (
                          <a 
                            key={idx}
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block text-xs text-indigo-600 break-all hover:underline"
                          >
                            {link}
                          </a>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 mt-4">{t('metric.fallback')}</p>
                  )}
                </div>

                {/* Like Generosity & Loneliness Ratio - Metrics 20 & 21 */}
                <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-premium space-y-4">
                  <div>
                    <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">{t('story.slide4.eyebrow')} • {t('metric.20.label')}</span>
                    <h4 className="text-sm font-bold text-slate-800 mt-1">{t('dashboard.likes.generosity')}</h4>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-slate-500">{t('dashboard.likes.generosity.desc')}</span>
                      <span className="text-sm font-bold text-indigo-600">{results.likeGenerosity.percentage}%</span>
                    </div>
                    <span className="inline-block mt-2 text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full uppercase">
                      {t('dashboard.likes.generosity.profile', { label: results.likeGenerosity.label })}
                    </span>
                  </div>

                  <div className="border-t border-slate-100 pt-4">
                    <span className="text-[10px] font-bold tracking-wider text-indigo-500 uppercase">{t('story.slide4.eyebrow')} • {t('metric.21.label')}</span>
                    <h4 className="text-sm font-bold text-slate-800 mt-1">{t('dashboard.likes.loneliness')}</h4>
                    <p className="text-xs text-slate-500 mt-1">
                      {t('dashboard.likes.loneliness.desc', { ratio: results.lonelinessRatio })}
                      {results.lonelinessRatio > 1.5 ? t('dashboard.likes.loneliness.high') : t('dashboard.likes.loneliness.low')}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: Rhythm - Metrics 22-40 */}
            {activeTab === 'rhythm' && (
              <div className="grid gap-6 md:grid-cols-2">
                {/* Weekly Peak & Calmest Day - Metrics 22 & 25 */}
                <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-premium space-y-4">
                  <div>
                    <span className="text-[10px] font-bold tracking-wider text-indigo-500 uppercase">{t('story.slide5.eyebrow')} • {t('metric.22.label')}</span>
                    <h4 className="text-sm font-bold text-slate-800 mt-1">{t('dashboard.rhythm.weeklyPeak')}</h4>
                    <p className="text-xs text-slate-500 mt-2">
                      {t('dashboard.rhythm.weeklyPeak.desc', { day: getLocalizedDay(results.weeklyPeakDay.day, locale), percentage: results.weeklyPeakDay.percentage })}
                    </p>
                  </div>
                  
                  <div className="border-t border-slate-100 pt-4">
                    <span className="text-[10px] font-bold tracking-wider text-emerald-500 uppercase">{t('story.slide5.eyebrow')} • {t('metric.25.label')}</span>
                    <h4 className="text-sm font-bold text-slate-800 mt-1">{t('dashboard.rhythm.calmestDay')}</h4>
                    <p className="text-xs text-slate-500 mt-2">
                      {t('dashboard.rhythm.calmestDay.desc', { day: getLocalizedDay(results.calmestDay, locale) })}
                    </p>
                  </div>
                </div>

                {/* Insomnia & Black Saturday - Metrics 31 & 23 */}
                <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-premium space-y-4">
                  <div>
                    <span className="text-[10px] font-bold tracking-wider text-pink-500 uppercase">{t('story.slide5.eyebrow')} • {t('metric.31.label')}</span>
                    <h4 className="text-sm font-bold text-slate-800 mt-1">{t('dashboard.rhythm.insomnia')}</h4>
                    <p className="text-xs text-slate-500 mt-2">
                      {t('dashboard.rhythm.insomnia.desc', { hours: results.insomniaHours })}
                    </p>
                  </div>

                  <div className="border-t border-slate-100 pt-4">
                    <span className="text-[10px] font-bold tracking-wider text-teal-500 uppercase">{t('story.slide5.eyebrow')} • {t('metric.23.label')}</span>
                    <h4 className="text-sm font-bold text-slate-800 mt-1">{t('dashboard.rhythm.saturday')}</h4>
                    <p className="text-xs text-slate-500 mt-2">
                      {t('dashboard.rhythm.saturday.desc', { hours: results.blackSaturdayHours })}
                    </p>
                  </div>
                </div>

                {/* Monday Buffer & Weekend Overtime - Metrics 24 & 26 */}
                <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-premium space-y-4">
                  <div>
                    <span className="text-[10px] font-bold tracking-wider text-amber-500 uppercase">{t('story.slide5.eyebrow')} • {t('metric.24.label')}</span>
                    <h4 className="text-sm font-bold text-slate-800 mt-1">{t('dashboard.rhythm.mondayBuffer')}</h4>
                    <p className="text-xs text-slate-500 mt-2">
                      {t('dashboard.rhythm.mondayBuffer.desc', { count: formatNumber(results.mondayBufferCount) })}
                    </p>
                  </div>

                  <div className="border-t border-slate-100 pt-4">
                    <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">{t('story.slide5.eyebrow')} • {t('metric.26.label')}</span>
                    <h4 className="text-sm font-bold text-slate-800 mt-1">{t('dashboard.rhythm.weekendOvertime')}</h4>
                    <p className="text-xs text-slate-500 mt-2">
                      {t('dashboard.rhythm.weekendOvertime.desc', { ratio: results.weekendOvertimeRatio })}
                    </p>
                  </div>
                </div>

                {/* Holiday Escape & Employment Index - Metrics 27 & 29 */}
                <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-premium space-y-4">
                  <div>
                    <span className="text-[10px] font-bold tracking-wider text-indigo-500 uppercase">{t('story.slide5.eyebrow')} • {t('metric.27.label')}</span>
                    <h4 className="text-sm font-bold text-slate-800 mt-1">{t('dashboard.rhythm.holidayEscape')}</h4>
                    <p className="text-xs text-slate-500 mt-2">
                      {t('dashboard.rhythm.holidayEscape.desc', { percentage: results.holidayEscapePercentage })}
                    </p>
                  </div>

                  <div className="border-t border-slate-100 pt-4">
                    <span className="text-[10px] font-bold tracking-wider text-emerald-500 uppercase">{t('story.slide5.eyebrow')} • {t('metric.29.label')}</span>
                    <h4 className="text-sm font-bold text-slate-800 mt-1">{t('dashboard.rhythm.employment')}</h4>
                    <p className="text-xs text-slate-500 mt-2">
                      {t('dashboard.rhythm.employment.desc', { percentage: results.employmentIndex })}
                    </p>
                  </div>
                </div>

                {/* Longest Day & Goldfish syndrome - Metrics 28 & 30 */}
                <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-premium space-y-4">
                  <div>
                    <span className="text-[10px] font-bold tracking-wider text-pink-500 uppercase">{t('story.slide5.eyebrow')} • {t('metric.28.label')}</span>
                    <h4 className="text-sm font-bold text-slate-800 mt-1">{t('dashboard.rhythm.longestDay')}</h4>
                    <p className="text-xs text-slate-500 mt-2">
                      {t('dashboard.rhythm.longestDay.desc', { date: formatDate(results.longestDayRecord.date), count: formatNumber(results.longestDayRecord.count), hours: results.longestDayRecord.hours })}
                    </p>
                  </div>

                  <div className="border-t border-slate-100 pt-4">
                    <span className="text-[10px] font-bold tracking-wider text-teal-500 uppercase">{t('story.slide5.eyebrow')} • {t('metric.30.label')}</span>
                    <h4 className="text-sm font-bold text-slate-800 mt-1">{t('dashboard.rhythm.goldfish')}</h4>
                    <p className="text-xs text-slate-500 mt-2">
                      {t('dashboard.rhythm.goldfish.desc', { percentage: results.goldfishSyndromePercentage })}
                    </p>
                  </div>
                </div>

                {/* Most Unproductive Hour & First Discovery - Metrics 32 & 33 */}
                <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-premium space-y-4">
                  <div>
                    <span className="text-[10px] font-bold tracking-wider text-amber-500 uppercase">{t('story.slide5.eyebrow')} • {t('metric.32.label')}</span>
                    <h4 className="text-sm font-bold text-slate-800 mt-1">{t('dashboard.rhythm.mostUnproductiveHour')}</h4>
                    <p className="text-xs text-slate-500 mt-2">
                      {t('dashboard.rhythm.mostUnproductiveHour.desc', { hour: results.mostUnproductiveHour })}
                    </p>
                  </div>

                  <div className="border-t border-slate-100 pt-4">
                    <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">{t('story.slide6.eyebrow')} • {t('metric.33.label')}</span>
                    <h4 className="text-sm font-bold text-slate-800 mt-1">{t('dashboard.rhythm.firstDiscovery')}</h4>
                    <p className="text-xs text-slate-500 mt-2">
                      {t('dashboard.rhythm.firstDiscovery.desc', { date: formatDate(results.firstDiscoveryDate) })}
                    </p>
                  </div>
                </div>

                {/* Seasonal Comparison & Payday Greed - Metrics 34 & 35 */}
                <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-premium space-y-4">
                  <div>
                    <span className="text-[10px] font-bold tracking-wider text-indigo-500 uppercase">{t('story.slide6.eyebrow')} • {t('metric.34.label')}</span>
                    <h4 className="text-sm font-bold text-slate-800 mt-1">{t('dashboard.rhythm.seasonalComparison')}</h4>
                    <p className="text-xs text-slate-500 mt-2">
                      {t('dashboard.rhythm.seasonalComparison.desc', { summer: formatNumber(results.seasonalComparison.summerCount), winter: formatNumber(results.seasonalComparison.winterCount) })}
                    </p>
                  </div>

                  <div className="border-t border-slate-100 pt-4">
                    <span className="text-[10px] font-bold tracking-wider text-emerald-500 uppercase">{t('story.slide6.eyebrow')} • {t('metric.35.label')}</span>
                    <h4 className="text-sm font-bold text-slate-800 mt-1">{t('dashboard.rhythm.paydayGreed')}</h4>
                    <p className="text-xs text-slate-500 mt-2">
                      {t('dashboard.rhythm.paydayGreed.desc', { percentage: results.paydayGreedIncrease })}
                    </p>
                  </div>
                </div>

                {/* YoY Trend & Morning Scroll Variance - Metrics 36 & 37 */}
                <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-premium space-y-4">
                  <div>
                    <span className="text-[10px] font-bold tracking-wider text-pink-500 uppercase">{t('story.slide6.eyebrow')} • {t('metric.36.label')}</span>
                    <h4 className="text-sm font-bold text-slate-800 mt-1">{t('dashboard.rhythm.yoyTrend')}</h4>
                    <p className="text-xs text-slate-500 mt-2">
                      {t('dashboard.rhythm.yoyTrend.desc', { percentage: results.yoyTrendIncrease })}
                    </p>
                  </div>

                  <div className="border-t border-slate-100 pt-4">
                    <span className="text-[10px] font-bold tracking-wider text-teal-500 uppercase">{t('story.slide6.eyebrow')} • {t('metric.37.label')}</span>
                    <h4 className="text-sm font-bold text-slate-800 mt-1">{t('dashboard.rhythm.variance')}</h4>
                    <p className="text-xs text-slate-500 mt-2">
                      {t('dashboard.rhythm.variance.desc', { minutes: results.morningPunctualityStdDev })}
                    </p>
                  </div>
                </div>

                {/* Comment Hour & Sleep Gap - Metrics 38 & 39 */}
                <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-premium space-y-4">
                  <div>
                    <span className="text-[10px] font-bold tracking-wider text-amber-500 uppercase">{t('story.slide6.eyebrow')} • {t('metric.38.label')}</span>
                    <h4 className="text-sm font-bold text-slate-800 mt-1">{t('dashboard.rhythm.commentHour')}</h4>
                    {results.commentHourDistribution.length > 0 ? (
                      <p className="text-xs text-slate-500 mt-2">
                        {t('dashboard.rhythm.commentHour.desc', { hour: `${results.commentHourDistribution.sort((a, b) => b.count - a.count)[0].hour}:00`, count: results.commentHourDistribution.sort((a, b) => b.count - a.count)[0].count })}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-400 mt-2">{t('metric.38.detail.empty')}</p>
                    )}
                  </div>

                  <div className="border-t border-slate-100 pt-4">
                    <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">{t('story.slide6.eyebrow')} • {t('metric.39.label')}</span>
                    <h4 className="text-sm font-bold text-slate-800 mt-1">{t('dashboard.rhythm.sleepGap')}</h4>
                    <p className="text-xs text-slate-500 mt-2">
                      {t('dashboard.rhythm.sleepGap.desc', { hours: results.biologicalSleepGapHours })}
                    </p>
                  </div>
                </div>

                {/* Ultimate Loneliness Score - Metric 40 */}
                <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-premium col-span-1 md:col-span-2">
                  <span className="text-[10px] font-bold tracking-wider text-indigo-500 uppercase">{t('story.slide6.eyebrow')} • {t('metric.40.label')}</span>
                  <h4 className="text-sm font-bold text-slate-800 mt-1">{t('dashboard.rhythm.lonelinessScore')}</h4>
                  <div className="mt-4 flex flex-col md:flex-row items-center gap-6">
                    <div className="flex items-center justify-center h-24 w-24 rounded-full border-4 border-indigo-500 bg-indigo-50 text-indigo-700 font-extrabold text-2xl">
                      {results.ultimateLonelinessScore}/100
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed max-w-xl">
                      {t('metric.40.detail')}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: Reposts - Metrics 41-45 */}
            {activeTab === 'reposts' && (
              <div className="grid gap-6 md:grid-cols-2">
                {/* Worshipped Creator - Metric 45 */}
                <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-premium">
                  <span className="text-[10px] font-bold tracking-wider text-indigo-500 uppercase">{t('story.slide7.eyebrow')} • {t('metric.45.label')}</span>
                  <h4 className="text-sm font-bold text-slate-800 mt-1">{t('dashboard.reposts.worshipped')}</h4>
                  {results.worshippedCreator ? (
                    <div className="mt-4 space-y-2">
                      <span className="inline-flex items-center gap-2 rounded-xl bg-indigo-50 text-indigo-700 px-4 py-2 font-semibold">
                        <Sparkles className="h-4 w-4 text-indigo-500" />
                        {results.worshippedCreator}
                      </span>
                      <p className="text-xs text-slate-500">
                        {t('dashboard.reposts.worshipped.desc')}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 mt-4">{t('metric.fallback')}</p>
                  )}
                </div>

                {/* Ultimate Obsession Video - Metric 43 */}
                <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-premium">
                  <span className="text-[10px] font-bold tracking-wider text-pink-500 uppercase">{t('story.slide7.eyebrow')} • {t('metric.43.label')}</span>
                  <h4 className="text-sm font-bold text-slate-800 mt-1">{t('dashboard.reposts.obsession')}</h4>
                  {results.ultimateObsessionVideo ? (
                    <div className="mt-4 space-y-2">
                      <a 
                        href={results.ultimateObsessionVideo.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-indigo-600 break-all font-semibold hover:underline"
                      >
                        {results.ultimateObsessionVideo.link}
                      </a>
                      <p className="text-xs text-slate-500">
                        {t('dashboard.reposts.obsession.desc', { count: results.ultimateObsessionVideo.count })}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 mt-4">{t('metric.43.detail.empty')}</p>
                  )}
                </div>

                {/* Secret Courier Repost - Metric 41 */}
                <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-premium">
                  <span className="text-[10px] font-bold tracking-wider text-teal-500 uppercase">{t('story.slide7.eyebrow')} • {t('metric.41.label')}</span>
                  <h4 className="text-sm font-bold text-slate-800 mt-1">{t('dashboard.reposts.secretCourier')}</h4>
                  {results.secretCourierRepost ? (
                    <div className="mt-4 space-y-2">
                      <a 
                        href={results.secretCourierRepost.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-indigo-600 break-all font-semibold hover:underline"
                      >
                        {results.secretCourierRepost.link}
                      </a>
                      <p className="text-xs text-slate-400">
                        {t('dashboard.reposts.secretCourier.desc', { date: formatDate(results.secretCourierRepost.date) })}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 mt-4">{t('metric.41.detail.empty')}</p>
                  )}
                </div>

                {/* Repost Frequency - Metric 42 */}
                <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-premium">
                  <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">{t('story.slide7.eyebrow')} • {t('metric.42.label')}</span>
                  <h4 className="text-sm font-bold text-slate-800 mt-1">{t('dashboard.reposts.repostFrequency')}</h4>
                  <div className="mt-4">
                    <p className="text-xs text-slate-500">
                      {t('dashboard.reposts.repostFrequency.desc', { ratio: results.repostFrequencyAnomaly })}
                    </p>
                  </div>
                </div>

                {/* First Repost Antique - Metric 44 */}
                <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-premium col-span-1 md:col-span-2">
                  <span className="text-[10px] font-bold tracking-wider text-indigo-500 uppercase">{t('story.slide7.eyebrow')} • {t('metric.44.label')}</span>
                  <h4 className="text-sm font-bold text-slate-800 mt-1">{t('dashboard.reposts.firstRepost')}</h4>
                  {results.firstRepostAntique ? (
                    <div className="mt-4 space-y-2">
                      <a 
                        href={results.firstRepostAntique.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-indigo-600 break-all font-semibold hover:underline"
                      >
                        {results.firstRepostAntique.link}
                      </a>
                      <p className="text-xs text-slate-400">
                        {t('dashboard.reposts.firstRepost.desc', { date: formatDate(results.firstRepostAntique.date) })}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 mt-4">{t('metric.44.detail.empty')}</p>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>

      </main>
    </div>
  );
}

export default function ReportPage() {
  const { t } = useTranslation();
  
  return (
    <React.Suspense fallback={
      <div className="flex flex-col min-h-screen bg-slate-50">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center space-y-4">
          <Activity className="h-10 w-10 text-indigo-600 animate-spin" />
          <p className="text-sm font-semibold text-slate-800">{t('dashboard.preparing')}</p>
        </div>
      </div>
    }>
      <ReportContent />
    </React.Suspense>
  );
}
