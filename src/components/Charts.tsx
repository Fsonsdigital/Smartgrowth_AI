import React from 'react';
import type { FormulaExplanation } from '../shared/types';
import { BandIndicator } from './BrandMark';

export function RatioRingGauge({
  label,
  valuePct,
  formattedValue,
  band,
}: {
  label: string;
  valuePct: number | null;
  formattedValue: string;
  band: FormulaExplanation['band'];
}) {
  const clamped = valuePct === null ? 0 : Math.max(0, Math.min(100, valuePct));
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (clamped / 100) * circumference;

  const strokeColor =
    band === 'Strong'
      ? '#059669'
      : band === 'Stable'
        ? '#0D9488'
        : band === 'Watch'
          ? '#D97706'
          : band === 'Critical'
            ? '#DC2626'
            : '#94A3B8';

  return (
    <div className="flex items-center gap-4">
      <div className="relative flex h-24 w-24 shrink-0 items-center justify-center">
        <svg viewBox="0 0 108 108" className="h-full w-full -rotate-90" aria-hidden="true">
          <circle
            cx="54"
            cy="54"
            r={radius}
            fill="none"
            stroke="#E2E8F0"
            strokeWidth="10"
          />
          <circle
            cx="54"
            cy="54"
            r={radius}
            fill="none"
            stroke={strokeColor}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
          />
        </svg>
        <span className="font-mono text-sm font-semibold tabular-nums text-slate-900">
          {valuePct !== null ? `${valuePct.toFixed(0)}%` : 'N/A'}
        </span>
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="mt-0.5 font-mono text-lg font-semibold tabular-nums text-slate-900">
          {formattedValue}
        </p>
        <div className="mt-1">
          <BandIndicator band={band} />
        </div>
      </div>
    </div>
  );
}

export function FormulaFactorBars({ formulas }: { formulas: FormulaExplanation[] }) {
  return (
    <div className="space-y-4">
      {formulas.map((f) => {
        const barWidth =
          f.unit === '%' && f.value !== null
            ? Math.max(4, Math.min(100, f.value))
            : f.band === 'Strong'
              ? 88
              : f.band === 'Stable'
                ? 68
                : f.band === 'Watch'
                  ? 44
                  : f.band === 'Critical'
                    ? 24
                    : 8;

        const barColor =
          f.band === 'Strong'
            ? 'bg-emerald-600'
            : f.band === 'Stable'
              ? 'bg-teal-600'
              : f.band === 'Watch'
                ? 'bg-amber-500'
                : f.band === 'Critical'
                  ? 'bg-red-600'
                  : 'bg-slate-300';

        return (
          <div key={f.key} className="space-y-1.5 border-b border-slate-100 pb-3 last:border-b-0 last:pb-0">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-sm font-medium text-slate-900">{f.label}</span>
              <div className="flex items-center gap-3">
                <BandIndicator band={f.band} />
                <span className="font-mono text-sm font-semibold tabular-nums text-slate-900">
                  {f.formattedValue}
                </span>
              </div>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                style={{ width: `${barWidth}%` }}
              />
            </div>
            <p className="text-xs text-slate-500">
              <span className="font-mono text-slate-700">{f.formula}</span>
              <span aria-hidden="true"> · </span>
              <span>{f.explanation}</span>
            </p>
          </div>
        );
      })}
    </div>
  );
}

export function SmeCashflowComparisonChart({
  revenue,
  opex,
  debtService,
  cashOnHand,
  currency,
}: {
  revenue: number;
  opex: number;
  debtService: number;
  cashOnHand: number;
  currency: string;
}) {
  const maxVal = Math.max(revenue, opex + debtService, cashOnHand, 1);
  const bars = [
    { label: 'Monthly Revenue', amount: revenue, color: 'bg-emerald-600' },
    { label: 'Operating Expenses', amount: opex, color: 'bg-slate-700' },
    { label: 'Debt Service', amount: debtService, color: 'bg-amber-500' },
    { label: 'Cash on Hand', amount: cashOnHand, color: 'bg-teal-600' },
  ];

  return (
    <div className="space-y-3">
      {bars.map((bar) => {
        const pct = Math.max(2, Math.round((bar.amount / maxVal) * 100));
        return (
          <div key={bar.label} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-700">{bar.label}</span>
              <span className="font-mono font-semibold tabular-nums text-slate-900">
                {currency} {bar.amount.toLocaleString('en-US')}
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div className={`h-full rounded-full ${bar.color}`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
