import React from 'react';
import { useAnalysisStore } from '@/store/analysisStore';
import { Check, FileText } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/i18n';

interface ChecklistItem {
  id: 'videos' | 'searches' | 'comments' | 'likes' | 'favorites' | 'shares' | 'reposts';
  name: string;
  filename: string;
  description: string;
}

export default function FileChecklist() {
  const { t } = useTranslation();
  const { checklist, toggleCheckItem, setChecklistAll } = useAnalysisStore();

  const allChecked = Object.values(checklist).every(Boolean);

  const items: ChecklistItem[] = [
    { id: 'videos', name: t('checklist.videos.name'), filename: 'VideoBrowsingHistory.json', description: t('checklist.videos.description') },
    { id: 'searches', name: t('checklist.searches.name'), filename: 'SearchHistory.json', description: t('checklist.searches.description') },
    { id: 'comments', name: t('checklist.comments.name'), filename: 'Comments.json', description: t('checklist.comments.description') },
    { id: 'likes', name: t('checklist.likes.name'), filename: 'Likes.json', description: t('checklist.likes.description') },
    { id: 'favorites', name: t('checklist.favorites.name'), filename: 'Favorites.json', description: t('checklist.favorites.description') },
    { id: 'shares', name: t('checklist.shares.name'), filename: 'ShareHistory.json', description: t('checklist.shares.description') },
    { id: 'reposts', name: t('checklist.reposts.name'), filename: 'Reposts.json', description: t('checklist.reposts.description') },
  ];

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div>
          <h3 className="text-base font-black text-slate-950">{t('checklist.title')}</h3>
          <p className="mt-1 text-xs font-medium text-slate-500">{t('checklist.subtitle')}</p>
        </div>
        <button
          onClick={() => setChecklistAll(!allChecked)}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
        >
          {allChecked ? t('checklist.deselectAll') : t('checklist.selectAll')}
        </button>
      </div>

      <div className="grid gap-px overflow-hidden rounded-b-xl bg-slate-100 md:grid-cols-2">
        {items.map((item) => {
          const isChecked = checklist[item.id];
          return (
            <button
              type="button"
              key={item.id}
              onClick={() => toggleCheckItem(item.id)}
              className={`flex min-h-28 items-start gap-3 bg-white p-4 text-left transition ${
                isChecked
                  ? 'shadow-[inset_3px_0_0_#0f172a]'
                  : 'hover:bg-slate-50'
              }`}
            >
              <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                isChecked ? 'border-slate-950 bg-slate-950 text-white' : 'border-slate-300 bg-white text-transparent'
              }`}>
                <Check className="h-3.5 w-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <span className="text-sm font-black text-slate-950">
                    {item.name}
                  </span>
                  <span className="inline-flex w-fit items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500">
                    <FileText className="h-2.5 w-2.5" />
                    {item.filename}
                  </span>
                </div>
                <p className="mt-2 text-xs font-medium leading-5 text-slate-500">
                  {item.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

