import React, { useMemo, useState } from 'react';
import { BookOpen, CheckCircle2, PlayCircle, Search, X } from 'lucide-react';
import type { LearningContentItem, PublicUser } from '../../shared/types';
import { api } from '../../lib/api';
import { SyntheticBanner } from '../BrandMark';

interface LearningCentreScreenProps {
  user: PublicUser;
  items: LearningContentItem[];
  onUpdated: (item: LearningContentItem) => void;
}

export function LearningCentreScreen({
  user,
  items,
  onUpdated,
}: LearningCentreScreenProps) {
  const [category, setCategory] = useState<'all' | 'courses' | 'articles' | 'videos'>('all');
  const [audienceFilter, setAudienceFilter] = useState<'all' | 'individual' | 'sme'>('all');
  const [query, setQuery] = useState('');
  const [activeLesson, setActiveLesson] = useState<LearningContentItem | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (category !== 'all' && item.category !== category) return false;
      if (audienceFilter !== 'all' && item.audience !== 'all' && item.audience !== audienceFilter)
        return false;
      if (query.trim()) {
        const q = query.toLowerCase();
        return (
          item.title.toLowerCase().includes(q) ||
          item.summary.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [items, category, audienceFilter, query]);

  const completedCount = items.filter((i) => i.completed).length;

  async function toggleCompletion(item: LearningContentItem) {
    setTogglingId(item.id);
    try {
      const res = await api.setLearningProgress(item.id, !item.completed);
      onUpdated(res.item);
      if (activeLesson?.id === item.id) {
        setActiveLesson(res.item);
      }
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <SyntheticBanner visible={user.isSyntheticDemo} />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-slate-500">
            Financial Literacy · {completedCount} of {items.length} Completed
          </p>
          <h1 className="mt-0.5 font-display text-2xl font-bold text-slate-900">Learning Centre</h1>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-1 rounded-xl bg-slate-100 p-1">
          {(['all', 'courses', 'articles', 'videos'] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`min-h-[40px] rounded-lg px-3.5 py-1.5 text-xs font-semibold capitalize transition-colors ${
                category === cat ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            aria-label="Filter by audience"
            value={audienceFilter}
            onChange={(e) => setAudienceFilter(e.target.value as typeof audienceFilter)}
            className="min-h-[40px] rounded-xl border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700"
          >
            <option value="all">All Audiences</option>
            <option value="individual">Individual</option>
            <option value="sme">SME / Business</option>
          </select>

          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="search"
              aria-label="Search lessons"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search lessons..."
              className="min-h-[40px] rounded-xl border border-slate-300 bg-white pl-9 pr-3 text-xs text-slate-900"
            />
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">
          No learning modules match your current filters.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6"
            >
              <div>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="capitalize font-medium text-emerald-700">
                    {item.category} · {item.level}
                  </span>
                  <span className="font-mono tabular-nums">{item.durationMinutes} min</span>
                </div>
                <h2 className="mt-2 font-display text-base font-bold text-slate-900">
                  {item.title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.summary}</p>
              </div>

              <div className="mt-5 flex items-center justify-between gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setActiveLesson(item)}
                  className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-[#043927] px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-900"
                >
                  {item.category === 'videos' ? (
                    <PlayCircle className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <BookOpen className="h-4 w-4" aria-hidden="true" />
                  )}
                  <span>Open Lesson</span>
                </button>

                <button
                  type="button"
                  disabled={togglingId === item.id}
                  onClick={() => toggleCompletion(item)}
                  className={`inline-flex min-h-[40px] items-center gap-1.5 text-xs font-semibold ${
                    item.completed ? 'text-emerald-700' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  <span>{item.completed ? 'Completed' : 'Mark Done'}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeLesson && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="lesson-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <p className="text-xs font-medium text-emerald-700">
                  {activeLesson.sourceRef} · {activeLesson.durationMinutes} min
                </p>
                <h2 id="lesson-dialog-title" className="mt-1 font-display text-xl font-bold text-slate-900">
                  {activeLesson.title}
                </h2>
              </div>
              <button
                type="button"
                aria-label="Close lesson"
                onClick={() => setActiveLesson(null)}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-4 space-y-3 whitespace-pre-line text-sm leading-relaxed text-slate-700">
              {activeLesson.bodyMarkdown}
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
              <button
                type="button"
                disabled={togglingId === activeLesson.id}
                onClick={() => toggleCompletion(activeLesson)}
                className="min-h-[44px] rounded-xl bg-[#043927] px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-900"
              >
                {activeLesson.completed ? 'Mark Incomplete' : 'Complete Lesson'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
