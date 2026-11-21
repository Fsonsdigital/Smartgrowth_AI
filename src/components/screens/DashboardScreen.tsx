import React from 'react';
import {
  ArrowUpRight,
  BookOpen,
  ClipboardCheck,
  FileText,
  Sparkles,
} from 'lucide-react';
import type {
  AssessmentResultRecord,
  PublicUser,
  ScreenId,
  SmeProfile,
  WorkspaceMode,
} from '../../shared/types';
import { BandIndicator, SyntheticBanner } from '../BrandMark';
import { FormulaFactorBars, RatioRingGauge } from '../Charts';

interface DashboardScreenProps {
  user: PublicUser;
  mode: WorkspaceMode;
  assessments: AssessmentResultRecord[];
  smes: SmeProfile[];
  loading: boolean;
  onModeChange: (mode: WorkspaceMode) => void;
  onNavigate: (screen: ScreenId) => void;
}

export function DashboardScreen({
  user,
  mode,
  assessments,
  smes,
  loading,
  onModeChange,
  onNavigate,
}: DashboardScreenProps) {
  const activeAssessments = assessments.filter((a) => a.audience === mode);
  const latest = activeAssessments[0] ?? null;

  const primaryGaugeFormula = latest?.output.formulas[0] ?? null;
  const secondaryGaugeFormula = latest?.output.formulas[2] ?? latest?.output.formulas[1] ?? null;

  return (
    <div className="space-y-6">
      <SyntheticBanner visible={user.isSyntheticDemo} />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-slate-500">
            {mode === 'sme' ? 'SME Workspace' : 'Individual Workspace'}
            <span aria-hidden="true"> · </span>
            <span>{user.fullName}</span>
          </p>
          <h1 className="mt-0.5 font-display text-2xl font-bold text-slate-900">
            {mode === 'sme'
              ? smes[0]?.businessName ?? 'SME Financial Overview'
              : 'Financial Health Overview'}
          </h1>
        </div>

        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1">
          <button
            type="button"
            onClick={() => onModeChange('individual')}
            className={`min-h-[40px] rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              mode === 'individual'
                ? 'bg-[#043927] text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Individual Mode
          </button>
          <button
            type="button"
            onClick={() => onModeChange('sme')}
            className={`min-h-[40px] rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              mode === 'sme'
                ? 'bg-[#043927] text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            SME / Business Mode
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="h-44 animate-pulse rounded-2xl border border-slate-200 bg-white" />
          <div className="h-44 animate-pulse rounded-2xl border border-slate-200 bg-white" />
        </div>
      ) : !latest ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <h2 className="font-display text-lg font-bold text-slate-900">
            No {mode === 'sme' ? 'SME' : 'Individual'} Assessment Recorded Yet
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
            Complete the 5-step {mode === 'sme' ? 'SME Cashflow' : 'Financial Health'} Assessment to
            compute deterministic ratios and unlock grounded AI guidance.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('assessment')}
            className="mt-5 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#043927] px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900"
          >
            <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
            <span>Start {mode === 'sme' ? 'SME' : 'Individual'} Assessment</span>
          </button>
        </div>
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-6 rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <p className="text-xs font-medium text-slate-500">
                    Deterministic Readiness Classification
                  </p>
                  <p className="mt-1 font-display text-xl font-bold text-slate-900">
                    {latest.output.readinessTier}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Version {latest.calculationVersion} · Unvalidated composite scoring disabled
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('readiness')}
                  className="inline-flex min-h-[40px] items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-900 whitespace-nowrap shrink-0"
                >
                  <span>View Details</span>
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
              <div className="mt-5">
                {primaryGaugeFormula && (
                  <RatioRingGauge
                    label={primaryGaugeFormula.label}
                    valuePct={
                      primaryGaugeFormula.unit === '%' ? primaryGaugeFormula.value : null
                    }
                    formattedValue={primaryGaugeFormula.formattedValue}
                    band={primaryGaugeFormula.band}
                  />
                )}
              </div>
            </div>

            <div className="lg:col-span-6 rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <p className="text-xs font-medium text-slate-500">
                    Secondary Financial Indicator
                  </p>
                  <p className="mt-1 font-display text-xl font-bold text-slate-900">
                    {secondaryGaugeFormula?.label ?? 'Debt & Cost Discipline'}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Updated {new Date(latest.createdAt).toLocaleDateString('en-US')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('assessment')}
                  className="inline-flex min-h-[40px] items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-900 whitespace-nowrap shrink-0"
                >
                  <span>Recalculate</span>
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
              <div className="mt-5">
                {secondaryGaugeFormula && (
                  <RatioRingGauge
                    label={secondaryGaugeFormula.formula}
                    valuePct={
                      secondaryGaugeFormula.unit === '%' ? secondaryGaugeFormula.value : null
                    }
                    formattedValue={secondaryGaugeFormula.formattedValue}
                    band={secondaryGaugeFormula.band}
                  />
                )}
              </div>
            </div>
          </div>

          <section className="space-y-3">
            <h2 className="font-display text-base font-bold text-slate-900">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <button
                type="button"
                onClick={() => onNavigate('assessment')}
                className="flex min-h-[84px] flex-col items-start justify-between rounded-2xl border border-slate-200 bg-white p-4 text-left transition-colors hover:border-emerald-500"
              >
                <ClipboardCheck className="h-5 w-5 text-emerald-700" aria-hidden="true" />
                <span className="mt-3 text-sm font-semibold text-slate-900">
                  Update Financial Data
                </span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('recommendations')}
                className="flex min-h-[84px] flex-col items-start justify-between rounded-2xl border border-slate-200 bg-white p-4 text-left transition-colors hover:border-emerald-500"
              >
                <Sparkles className="h-5 w-5 text-emerald-700" aria-hidden="true" />
                <span className="mt-3 text-sm font-semibold text-slate-900">
                  Explore AI Guidance
                </span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('learning')}
                className="flex min-h-[84px] flex-col items-start justify-between rounded-2xl border border-slate-200 bg-white p-4 text-left transition-colors hover:border-emerald-500"
              >
                <BookOpen className="h-5 w-5 text-emerald-700" aria-hidden="true" />
                <span className="mt-3 text-sm font-semibold text-slate-900">
                  Learn Financial Skills
                </span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('reports')}
                className="flex min-h-[84px] flex-col items-start justify-between rounded-2xl border border-slate-200 bg-white p-4 text-left transition-colors hover:border-emerald-500"
              >
                <FileText className="h-5 w-5 text-emerald-700" aria-hidden="true" />
                <span className="mt-3 text-sm font-semibold text-slate-900">View Reports</span>
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-display text-lg font-bold text-slate-900">
                  Calculated Ratios &amp; Formulas
                </h2>
                <p className="text-xs text-slate-500">{latest.output.summaryStatement}</p>
              </div>
              {latest.output.dataQualityFlags.length > 0 && (
                <p className="font-mono text-xs text-amber-700">
                  Flags: {latest.output.dataQualityFlags.join(', ')}
                </p>
              )}
            </div>
            <FormulaFactorBars formulas={latest.output.formulas} />
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="font-display text-base font-bold text-slate-900">
              Recent {mode === 'sme' ? 'SME' : 'Individual'} Assessment History
            </h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[540px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-medium text-slate-500">
                    <th className="py-2.5 pr-4">Date</th>
                    <th className="py-2.5 pr-4">Version</th>
                    <th className="py-2.5 pr-4">Readiness Tier</th>
                    <th className="py-2.5 pr-4">Primary Metric</th>
                    <th className="py-2.5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {activeAssessments.map((item) => {
                    const firstFormula = item.output.formulas[0];
                    return (
                      <tr key={item.id} className="border-b border-slate-100 last:border-b-0">
                        <td className="py-3 pr-4 font-mono text-xs tabular-nums text-slate-600">
                          {new Date(item.createdAt).toLocaleString('en-US')}
                        </td>
                        <td className="py-3 pr-4 font-mono text-xs text-slate-700">
                          {item.calculationVersion}
                        </td>
                        <td className="py-3 pr-4 font-medium text-slate-900">
                          {item.output.readinessTier}
                        </td>
                        <td className="py-3 pr-4 font-mono text-xs tabular-nums text-slate-800">
                          {firstFormula ? `${firstFormula.label}: ${firstFormula.formattedValue}` : '-'}
                        </td>
                        <td className="py-3 text-right">
                          {firstFormula && <BandIndicator band={firstFormula.band} />}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
