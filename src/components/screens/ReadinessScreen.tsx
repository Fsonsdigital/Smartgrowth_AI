import React from 'react';
import { ArrowRight, Calculator, ShieldAlert } from 'lucide-react';
import type { AssessmentResultRecord, PublicUser, ScreenId, WorkspaceMode } from '../../shared/types';
import { BandIndicator, SyntheticBanner } from '../BrandMark';
import { FormulaFactorBars } from '../Charts';

interface ReadinessScreenProps {
  user: PublicUser;
  mode: WorkspaceMode;
  assessments: AssessmentResultRecord[];
  onNavigate: (screen: ScreenId) => void;
}

export function ReadinessScreen({
  user,
  mode,
  assessments,
  onNavigate,
}: ReadinessScreenProps) {
  const latest = assessments.find((a) => a.audience === mode) ?? null;

  return (
    <div className="space-y-6">
      <SyntheticBanner visible={user.isSyntheticDemo} />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-slate-500">
            Transparent Indicator Breakdown · {mode === 'sme' ? 'SME' : 'Individual'}
          </p>
          <h1 className="mt-0.5 font-display text-2xl font-bold text-slate-900">
            Credit Readiness &amp; Key Financial Ratios
          </h1>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('recommendations')}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#043927] px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-900"
        >
          <span>View Improvement Guidance</span>
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {!latest ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <p className="text-sm text-slate-600">
            Complete a {mode === 'sme' ? 'SME' : 'Individual'} assessment first to view formula-by-formula
            credit readiness indicators.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('assessment')}
            className="mt-4 min-h-[44px] rounded-xl bg-[#043927] px-5 py-2 text-sm font-semibold text-white"
          >
            Go to Assessment
          </button>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-5 space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <p className="text-xs font-medium text-slate-500">Readiness Tier (Threshold-Based)</p>
              <p className="mt-2 font-display text-3xl font-bold text-slate-900">
                {latest.output.readinessTier}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {latest.output.summaryStatement}
              </p>

              <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700">
                <div className="flex items-start gap-2">
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />
                  <div>
                    <p className="font-semibold text-slate-900">
                      No Unvalidated Composite Score ({latest.output.compositeScorePolicy})
                    </p>
                    <p className="mt-1">
                      SmartGrowth AI reports each deterministic ratio individually with its exact
                      formula and calculation version ({latest.calculationVersion}) rather than
                      hiding inputs behind an unvalidated 0–100 composite number.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex items-center gap-2">
                <Calculator className="h-4 w-4 text-emerald-700" aria-hidden="true" />
                <h2 className="font-display text-base font-bold text-slate-900">
                  Data Quality &amp; Edge-Case Flags
                </h2>
              </div>
              {latest.output.dataQualityFlags.length === 0 ? (
                <p className="mt-3 text-sm text-emerald-800">
                  All required financial inputs were provided with positive base income/revenue.
                </p>
              ) : (
                <ul className="mt-3 space-y-2 text-xs text-amber-900">
                  {latest.output.dataQualityFlags.map((flag) => (
                    <li
                      key={flag}
                      className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 font-mono"
                    >
                      {flag}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="font-display text-lg font-bold text-slate-900">
              Key Readiness Factors &amp; Audit Formulas
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Reproducible outputs computed server-side under {latest.calculationVersion}
            </p>
            <div className="mt-5">
              <FormulaFactorBars formulas={latest.output.formulas} />
            </div>

            <div className="mt-6 border-t border-slate-100 pt-5">
              <h3 className="text-sm font-semibold text-slate-900">Input Audit Trail</h3>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {latest.output.formulas.map((f) => (
                  <div
                    key={f.key}
                    className="rounded-xl border border-slate-200 bg-slate-50/60 p-3"
                  >
                    <p className="text-xs text-slate-500 truncate">{f.label}</p>
                    <p className="mt-1 font-mono text-sm font-semibold tabular-nums text-slate-900">
                      {f.formattedValue}
                    </p>
                    <div className="mt-1">
                      <BandIndicator band={f.band} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
