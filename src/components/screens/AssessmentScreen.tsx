import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import type {
  AssessmentResultRecord,
  AssessmentTemplate,
  PublicUser,
  ScreenId,
  SmeProfile,
  WorkspaceMode,
} from '../../shared/types';
import { api } from '../../lib/api';
import { SyntheticBanner } from '../BrandMark';
import { FormulaFactorBars } from '../Charts';

interface AssessmentScreenProps {
  user: PublicUser;
  mode: WorkspaceMode;
  individualCurrency: string;
  smes: SmeProfile[];
  onModeChange: (mode: WorkspaceMode) => void;
  onAssessmentSaved: (result: AssessmentResultRecord) => void;
  onNavigate: (screen: ScreenId) => void;
}

const DEFAULT_INDIVIDUAL_ANSWERS: Record<string, string> = {
  monthlyIncome: '250000',
  incomeStability: 'steady',
  monthlyExpenses: '175000',
  dependentsCount: '1',
  monthlySavings: '45000',
  totalLiquidSavings: '360000',
  monthlyDebtRepayment: '20000',
  totalDebt: '80000',
};

const DEFAULT_SME_ANSWERS: Record<string, string> = {
  monthlyRevenue: '1200000',
  recordKeepingMethod: 'digital',
  monthlyOperatingExpenses: '840000',
  monthlyDebtService: '110000',
  cashOnHand: '1850000',
  accountsReceivable: '320000',
  accountsPayable: '260000',
};

function getInitialAnswers(isDemo: boolean, mode: WorkspaceMode): Record<string, string> {
  if (isDemo) {
    return mode === 'sme' ? DEFAULT_SME_ANSWERS : DEFAULT_INDIVIDUAL_ANSWERS;
  }
  return mode === 'sme' ? { recordKeepingMethod: 'digital' } : { incomeStability: 'steady' };
}

export function AssessmentScreen({
  user,
  mode,
  individualCurrency,
  smes,
  onModeChange,
  onAssessmentSaved,
  onNavigate,
}: AssessmentScreenProps) {
  const [template, setTemplate] = useState<AssessmentTemplate | null>(null);
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState<Record<string, string>>(() =>
    getInitialAnswers(user.isSyntheticDemo, mode)
  );
  const [selectedSmeId, setSelectedSmeId] = useState<string>(smes[0]?.id ?? '');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [calculatedResult, setCalculatedResult] = useState<AssessmentResultRecord | null>(null);

  const activeCurrency =
    mode === 'sme'
      ? smes.find((s) => s.id === selectedSmeId)?.currency ?? smes[0]?.currency ?? individualCurrency
      : individualCurrency;

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setCalculatedResult(null);
    setStep(1);
    setAnswers(getInitialAnswers(user.isSyntheticDemo, mode));
    api
      .getAssessmentTemplate(mode)
      .then((res) => {
        if (active) setTemplate(res.template);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load template.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [mode, user.isSyntheticDemo]);

  const maxStep = template
    ? Math.max(...template.questions.map((q) => q.stepNumber))
    : 5;
  const currentQuestions = template
    ? template.questions.filter((q) => q.stepNumber === step)
    : [];

  function handleFieldChange(key: string, val: string) {
    setAnswers((prev) => ({ ...prev, [key]: val }));
  }

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      const payloadAnswers: Record<string, unknown> = {};
      for (const q of template?.questions ?? []) {
        const raw = answers[q.fieldKey] ?? '';
        if (q.inputType === 'select') {
          payloadAnswers[q.fieldKey] = raw || (q.options?.[0] ?? '');
        } else if (raw === '') {
          payloadAnswers[q.fieldKey] = '';
        } else {
          const parsed = Number(raw);
          if (!Number.isFinite(parsed) || parsed < q.minValue) {
            throw new Error(`"${q.label}" must be a number >= ${q.minValue}.`);
          }
          payloadAnswers[q.fieldKey] = parsed;
        }
      }

      const res = await api.submitAssessment({
        audience: mode,
        answers: payloadAnswers,
        smeProfileId: mode === 'sme' ? selectedSmeId || undefined : undefined,
      });
      setCalculatedResult(res.result);
      onAssessmentSaved(res.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Calculation failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <SyntheticBanner visible={user.isSyntheticDemo} />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-slate-500">
            5-Step Assessment · {mode === 'sme' ? 'SME Engine' : 'Individual Engine'}
          </p>
          <h1 className="mt-0.5 font-display text-2xl font-bold text-slate-900">
            Financial Health Assessment
          </h1>
        </div>
        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1">
          <button
            type="button"
            onClick={() => onModeChange('individual')}
            className={`min-h-[40px] rounded-lg px-3.5 py-1.5 text-xs font-semibold ${
              mode === 'individual' ? 'bg-[#043927] text-white' : 'text-slate-600'
            }`}
          >
            Individual Form
          </button>
          <button
            type="button"
            onClick={() => onModeChange('sme')}
            className={`min-h-[40px] rounded-lg px-3.5 py-1.5 text-xs font-semibold ${
              mode === 'sme' ? 'bg-[#043927] text-white' : 'text-slate-600'
            }`}
          >
            SME Form
          </button>
        </div>
      </div>

      {loading ? (
        <div className="h-72 animate-pulse rounded-2xl border border-slate-200 bg-white" />
      ) : (
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white p-6">
            <div className="mb-6 flex items-center justify-between gap-2">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStep(s)}
                  className={`flex h-9 w-9 items-center justify-center rounded-full font-mono text-xs font-bold transition-colors ${
                    s === step
                      ? 'bg-[#043927] text-white'
                      : s < step
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 text-slate-500'
                  }`}
                  aria-label={`Step ${s}`}
                >
                  {s}
                </button>
              ))}
            </div>

            {mode === 'sme' && smes.length > 0 && step === 1 && (
              <div className="mb-5">
                <label htmlFor="sme-select" className="block text-sm font-medium text-slate-700">
                  Business Profile
                </label>
                <select
                  id="sme-select"
                  value={selectedSmeId}
                  onChange={(e) => setSelectedSmeId(e.target.value)}
                  className="mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-900"
                >
                  {smes.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.businessName} ({s.currency})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {error && (
              <div
                role="alert"
                className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
              >
                {error}
              </div>
            )}

            <div className="space-y-5">
              {currentQuestions.map((q) => (
                <div key={q.id}>
                  <label
                    htmlFor={`q_${q.fieldKey}`}
                    className="block text-sm font-semibold text-slate-900"
                  >
                    {q.label}
                    {q.isRequired && <span className="ml-1 text-red-600">*</span>}
                  </label>
                  <p id={`help_${q.fieldKey}`} className="mt-0.5 text-xs text-slate-500">
                    {q.helpText}
                  </p>
                  {q.inputType === 'select' ? (
                    <select
                      id={`q_${q.fieldKey}`}
                      aria-describedby={`help_${q.fieldKey}`}
                      value={answers[q.fieldKey] ?? ''}
                      onChange={(e) => handleFieldChange(q.fieldKey, e.target.value)}
                      className="mt-2 min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
                    >
                      {(q.options ?? []).map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="relative mt-2">
                      <span className="pointer-events-none absolute left-3.5 top-3 font-mono text-xs text-slate-500">
                        {q.inputType === 'currency' ? activeCurrency : q.unit}
                      </span>
                      <input
                        id={`q_${q.fieldKey}`}
                        aria-describedby={`help_${q.fieldKey}`}
                        type="number"
                        min={q.minValue}
                        step="any"
                        placeholder={user.isSyntheticDemo ? undefined : '0'}
                        value={answers[q.fieldKey] ?? ''}
                        onChange={(e) => handleFieldChange(q.fieldKey, e.target.value)}
                        className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-white py-2 pl-16 pr-3.5 font-mono text-sm tabular-nums text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-8 flex items-center justify-between gap-3 border-t border-slate-100 pt-5">
              <button
                type="button"
                disabled={step <= 1}
                onClick={() => setStep((s) => Math.max(1, s - 1))}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-40"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                <span>Previous</span>
              </button>

              {step < maxStep ? (
                <button
                  type="button"
                  onClick={() => setStep((s) => Math.min(maxStep, s + 1))}
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-[#043927] px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-900"
                >
                  <span>Next</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleSubmit}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  <span>{submitting ? 'Calculating...' : 'Calculate & Save'}</span>
                </button>
              )}
            </div>
          </div>

          <div className="lg:col-span-5 space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <p className="text-xs font-medium text-emerald-700">
                Template {template?.version}
              </p>
              <h2 className="mt-1 font-display text-lg font-bold text-slate-900">
                {template?.title}
              </h2>
              <p className="mt-1 text-sm text-slate-600">{template?.description}</p>
              <p className="mt-3 text-xs text-slate-500">
                Zero-income and missing optional values are handled safely without division-by-zero
                or opaque black-box scoring.
              </p>
            </div>

            {calculatedResult && (
              <div className="rounded-2xl border border-emerald-200 bg-white p-6">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold text-emerald-700">
                      Assessment Saved · {calculatedResult.calculationVersion}
                    </p>
                    <h3 className="mt-0.5 font-display text-lg font-bold text-slate-900">
                      Readiness Tier: {calculatedResult.output.readinessTier}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate('recommendations')}
                    className="min-h-[40px] rounded-lg bg-[#043927] px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-900 whitespace-nowrap shrink-0"
                  >
                    Ask AI Assistant
                  </button>
                </div>
                <div className="mt-4">
                  <FormulaFactorBars formulas={calculatedResult.output.formulas} />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
