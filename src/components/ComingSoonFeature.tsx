import React from 'react';
import { ArrowLeft, ClipboardCheck, Clock, Sparkles } from 'lucide-react';
import type { PublicUser, ScreenId } from '../shared/types';
import { useLanguage } from '../lib/i18n';
import { SyntheticBanner } from './BrandMark';

interface ComingSoonFeatureProps {
  user: PublicUser;
  categoryLabel: string;
  title: string;
  description: string;
  plannedCapabilities: string[];
  icon: React.ComponentType<{ className?: string }>;
  onNavigate: (screen: ScreenId) => void;
}

export function ComingSoonFeature({
  user,
  categoryLabel,
  title,
  description,
  plannedCapabilities,
  icon: Icon,
  onNavigate,
}: ComingSoonFeatureProps) {
  const { isHausa } = useLanguage();

  return (
    <div className="space-y-6">
      <SyntheticBanner visible={user.isSyntheticDemo} />

      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-10">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800">
              <Icon className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-slate-500">{categoryLabel}</span>
                <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-800">
                  <Clock className="h-3 w-3" aria-hidden="true" />
                  <span>{isHausa ? 'Nan Ba Da Jimawa Ba' : 'Coming Soon'}</span>
                </span>
              </div>
              <h1 className="mt-1 font-display text-2xl font-bold text-slate-900">{title}</h1>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{isHausa ? 'Koma Taƙaitaccen Bayani' : 'Back to Overview'}</span>
          </button>
        </div>

        <p className="mt-5 max-w-2xl text-sm leading-relaxed text-slate-600">{description}</p>

        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50/80 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {isHausa ? 'Abin da Za a Kawo a Fitowa ta Gaba' : 'Included in Upcoming Release'}
          </p>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            {plannedCapabilities.map((item) => (
              <li key={item} className="flex items-start gap-2.5">
                <span
                  className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600"
                  aria-hidden="true"
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-6">
          <button
            type="button"
            onClick={() => onNavigate('assessment')}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#043927] px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900"
          >
            <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
            <span>
              {isHausa
                ? 'Buɗe Gwajin Lafiyar Kuɗi na AI'
                : 'Open AI Financial Health Assessment'}
            </span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('recommendations')}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-emerald-700 bg-emerald-50 px-5 py-2.5 text-sm font-semibold text-emerald-900 hover:bg-emerald-100"
          >
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            <span>
              {isHausa ? 'Buɗe Mai Ba da Shawara na AI' : 'Open AI Business Growth Coach'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
