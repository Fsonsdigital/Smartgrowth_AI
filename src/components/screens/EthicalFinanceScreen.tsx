import React, { useEffect, useState } from 'react';
import { BookOpen, Handshake, ShieldCheck } from 'lucide-react';
import type { DatasetRecordItem, PublicUser, ScreenId, WorkspaceMode } from '../../shared/types';
import { api } from '../../lib/api';
import { SyntheticBanner } from '../BrandMark';

interface EthicalFinanceScreenProps {
  user: PublicUser;
  mode: WorkspaceMode;
  onNavigate: (screen: ScreenId) => void;
}

const ETHICAL_PRINCIPLES = [
  {
    title: 'Asset-Backed Trade & Cost Transparency',
    summary:
      'Ethical and non-interest trade models tie financing to identifiable physical goods or services with upfront price disclosure rather than compounding interest.',
  },
  {
    title: 'Risk & Profit Sharing Literacy',
    summary:
      'Partnership frameworks distribute returns and losses transparently according to agreed capital and operational contributions.',
  },
  {
    title: 'Cooperative & Community Savings Pools',
    summary:
      'Structured group savings and revolving mutual-support pools help households and micro-enterprises build reserves without predatory short-term debt.',
  },
];

export function EthicalFinanceScreen({
  user,
  mode,
  onNavigate,
}: EthicalFinanceScreenProps) {
  const [kbRecords, setKbRecords] = useState<DatasetRecordItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api
      .listKnowledge(mode)
      .then((res) => {
        if (active) setKbRecords(res.records);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [mode]);

  return (
    <div className="space-y-6">
      <SyntheticBanner visible={user.isSyntheticDemo} />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-slate-500">
            Financial Inclusion &amp; Ethical Literacy
          </p>
          <h1 className="mt-0.5 font-display text-2xl font-bold text-slate-900">
            Ethical Finance &amp; Inclusion
          </h1>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('learning')}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#043927] px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-900"
        >
          <BookOpen className="h-4 w-4" aria-hidden="true" />
          <span>Explore Ethical Finance Lessons</span>
        </button>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5 text-sm text-amber-950">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-800" aria-hidden="true" />
          <div>
            <p className="font-semibold">Educational Boundary &amp; Non-Certification Notice</p>
            <p className="mt-1 text-xs leading-relaxed text-amber-900">
              SmartGrowth AI provides neutral financial education on ethical and non-interest
              structures. It does not endorse specific financial providers, quote product terms,
              approve financing, or issue Shariah compliance certifications or fatwas.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {ETHICAL_PRINCIPLES.map((item) => (
          <div key={item.title} className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <Handshake className="h-5 w-5" aria-hidden="true" />
            </div>
            <h2 className="mt-4 font-display text-base font-bold text-slate-900">{item.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.summary}</p>
          </div>
        ))}
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="font-display text-lg font-bold text-slate-900">
          Approved Knowledge-Base References ({mode.toUpperCase()} &amp; Shared)
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Only administrator-approved knowledge records appear here.
        </p>

        {loading ? (
          <div className="mt-4 h-32 animate-pulse rounded-xl bg-slate-100" />
        ) : kbRecords.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No approved knowledge records available yet.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {kbRecords.map((rec) => (
              <div key={rec.id} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                  <span className="font-mono font-medium text-emerald-800">{rec.externalId}</span>
                  <span>
                    Audience: {rec.audience} · {String(rec.metadata.source ?? 'Approved KB')}
                  </span>
                </div>
                <h3 className="mt-1 font-display text-sm font-bold text-slate-900">{rec.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-700">{rec.content}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
