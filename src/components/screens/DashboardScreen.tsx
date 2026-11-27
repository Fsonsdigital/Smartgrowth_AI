import React, { useEffect, useState } from 'react';
import {
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Building2,
  ClipboardCheck,
  Clock,
  FileText,
  Handshake,
  MessageSquarePlus,
  Settings,
  Sparkles,
} from 'lucide-react';
import {
  SUPPORTED_CURRENCIES,
  type AssessmentResultRecord,
  type IndividualProfile,
  type PublicUser,
  type ScreenId,
  type SmeProfile,
  type WorkspaceMode,
} from '../../shared/types';
import { api } from '../../lib/api';
import { saveSmeToFirestore, updateFirestoreUserProfile } from '../../lib/firebase';
import {
  translateFormulaLabel,
  translateReadinessTier,
  useLanguage,
} from '../../lib/i18n';
import { BandIndicator, SyntheticBanner } from '../BrandMark';
import { FormulaFactorBars, RatioRingGauge } from '../Charts';

interface DashboardScreenProps {
  user: PublicUser;
  firebaseUid: string | null;
  mode: WorkspaceMode;
  assessments: AssessmentResultRecord[];
  individualProfile: IndividualProfile | null;
  smes: SmeProfile[];
  loading: boolean;
  onIndividualProfileUpdated: (profile: IndividualProfile) => void;
  onSmeProfileSaved: (sme: SmeProfile) => void;
  onModeChange: (mode: WorkspaceMode) => void;
  onNavigate: (screen: ScreenId) => void;
  onOpenFeedback: () => void;
}

export function DashboardScreen({
  user,
  firebaseUid,
  mode,
  assessments,
  individualProfile,
  smes,
  loading,
  onIndividualProfileUpdated,
  onSmeProfileSaved,
  onModeChange,
  onNavigate,
  onOpenFeedback,
}: DashboardScreenProps) {
  const { language, isHausa } = useLanguage();
  const activeAssessments = assessments.filter((a) => a.audience === mode);
  const latest = activeAssessments[0] ?? null;

  const primaryGaugeFormula = latest?.output.formulas[0] ?? null;
  const secondaryGaugeFormula = latest?.output.formulas[2] ?? latest?.output.formulas[1] ?? null;

  const [editingProfile, setEditingProfile] = useState(false);
  const [currency, setCurrency] = useState(individualProfile?.currency ?? 'USD');
  const [occupation, setOccupation] = useState(individualProfile?.occupation ?? '');
  const [city, setCity] = useState(individualProfile?.city ?? '');
  const [incomeGoal, setIncomeGoal] = useState(
    String(individualProfile?.monthlyIncomeGoal ?? 0)
  );
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileNotice, setProfileNotice] = useState<string | null>(null);

  const [smeName, setSmeName] = useState(smes[0]?.businessName ?? '');
  const [smeSector, setSmeSector] = useState(smes[0]?.sector ?? 'Retail & Trade');
  const [smeCurrency, setSmeCurrency] = useState(smes[0]?.currency ?? 'USD');
  const [smeStaffCount, setSmeStaffCount] = useState(String(smes[0]?.staffCount ?? 1));

  useEffect(() => {
    if (individualProfile) {
      setCurrency(individualProfile.currency);
      setOccupation(individualProfile.occupation);
      setCity(individualProfile.city);
      setIncomeGoal(String(individualProfile.monthlyIncomeGoal));
    }
  }, [individualProfile]);

  useEffect(() => {
    if (smes[0]) {
      setSmeName(smes[0].businessName);
      setSmeSector(smes[0].sector);
      setSmeCurrency(smes[0].currency);
      setSmeStaffCount(String(smes[0].staffCount));
    }
  }, [smes]);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    setProfileNotice(null);
    try {
      const res = await api.updateIndividualProfile({
        currency,
        occupation,
        city,
        monthlyIncomeGoal: Number(incomeGoal) || 0,
      });
      onIndividualProfileUpdated(res.profile);
      if (firebaseUid) {
        await updateFirestoreUserProfile(firebaseUid, {
          currency: res.profile.currency,
          occupation: res.profile.occupation,
          city: res.profile.city,
          monthlyIncomeGoal: res.profile.monthlyIncomeGoal,
          preferredLanguage: language,
        });
      }
      setProfileNotice(
        isHausa
          ? `An adana bayanai (${res.profile.currency}).`
          : `Profile saved (${res.profile.currency}).`
      );
      setEditingProfile(false);
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleSaveSmeProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    setProfileNotice(null);
    try {
      const target = smes[0];
      const saved = target
        ? (
            await api.updateSmeProfile(target.id, {
              businessName: smeName,
              sector: smeSector,
              currency: smeCurrency,
              staffCount: Number(smeStaffCount) || 1,
            })
          ).sme
        : (
            await api.createSmeProfile({
              businessName: smeName,
              sector: smeSector,
              registrationStatus: 'in_progress',
              staffCount: Number(smeStaffCount) || 1,
              currency: smeCurrency,
            })
          ).sme;
      onSmeProfileSaved(saved);
      if (firebaseUid) {
        await saveSmeToFirestore(firebaseUid, saved);
      }
      setProfileNotice(
        isHausa
          ? `An adana bayanan kasuwanci (${saved.businessName} · ${saved.currency}).`
          : `Business profile saved (${saved.businessName} · ${saved.currency}).`
      );
      setEditingProfile(false);
    } finally {
      setSavingProfile(false);
    }
  }

  const roadmapItems = [
    [
      'readiness',
      isHausa ? 'Shirye-shiryen Bashi' : 'Credit Readiness',
      isHausa ? 'Kwatanta ma’auni da shirye-shiryen banki' : 'Benchmarking & lender readiness views',
      BarChart3,
    ],
    [
      'sme',
      isHausa ? 'Sashen Kasuwanci (SME)' : 'SME Workspace',
      isHausa ? 'Tawagar ma’aikata da rassa da dama' : 'Multi-member teams & entities',
      Building2,
    ],
    [
      'ethical',
      isHausa ? 'Kuɗi na Gaskiya' : 'Ethical Finance',
      isHausa ? 'Ilimin kuɗi marar ruwa da adashi' : 'Non-interest & cooperative guides',
      Handshake,
    ],
    [
      'learning',
      isHausa ? 'Cibiyar Koyo' : 'Learning Centre',
      isHausa ? 'Darussa da bidiyon koyo' : 'Interactive courses & videos',
      BookOpen,
    ],
    [
      'reports',
      isHausa ? 'Rahotanni' : 'Reports & Exports',
      isHausa ? 'Fitar da PDF, HTML & JSON' : 'PDF, HTML & JSON snapshots',
      FileText,
    ],
  ] as const;

  return (
    <div className="space-y-6">
      <SyntheticBanner visible={user.isSyntheticDemo} />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-slate-500">
            {mode === 'sme'
              ? isHausa
                ? 'Sashen Kasuwanci (SME)'
                : 'SME Workspace'
              : isHausa
                ? 'Sashen Mutum Ɗaya'
                : 'Individual Workspace'}
            <span aria-hidden="true"> · </span>
            <span>{user.fullName}</span>
            <span aria-hidden="true"> · </span>
            <span className="font-mono">
              {mode === 'sme'
                ? smes[0]?.currency ?? 'USD'
                : individualProfile?.currency ?? 'USD'}
            </span>
          </p>
          <h1 className="mt-0.5 font-display text-2xl font-bold text-slate-900">
            {mode === 'sme'
              ? smes[0]?.businessName ??
                (isHausa ? 'Taƙaitaccen Kuɗin Kasuwanci' : 'SME Financial Overview')
              : isHausa
                ? 'Taƙaitaccen Lafiyar Kuɗi'
                : 'Financial Health Overview'}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onOpenFeedback}
            className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 text-xs font-semibold text-emerald-900 hover:bg-emerald-100"
          >
            <MessageSquarePlus className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{isHausa ? 'Ra’ayin Gwaji' : 'Share Pilot Feedback'}</span>
          </button>
          <button
            type="button"
            onClick={() => setEditingProfile((v) => !v)}
            className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Settings className="h-3.5 w-3.5" aria-hidden="true" />
            <span>
              {mode === 'sme'
                ? isHausa
                  ? 'Bayanan Kasuwanci'
                  : 'Business Setup'
                : isHausa
                  ? 'Kuɗi & Bayani'
                  : 'Currency & Profile'}
            </span>
          </button>
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
              {isHausa ? 'Mutum Ɗaya' : 'Individual Mode'}
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
              {isHausa ? 'Kasuwanci (SME)' : 'SME / Business Mode'}
            </button>
          </div>
        </div>
      </div>

      {profileNotice && (
        <div
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-medium text-emerald-900"
        >
          {profileNotice}
        </div>
      )}

      {editingProfile && mode === 'sme' && (
        <form
          onSubmit={handleSaveSmeProfile}
          className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-4"
        >
          <div>
            <label htmlFor="sme-name" className="block text-xs font-medium text-slate-700">
              {isHausa ? 'Sunan Kasuwanci' : 'Business Name'}
            </label>
            <input
              id="sme-name"
              type="text"
              required
              minLength={2}
              value={smeName}
              onChange={(e) => setSmeName(e.target.value)}
              placeholder={isHausa ? 'misali, Amina Foods' : 'e.g., Amina Foods Ltd'}
              className="mt-1 min-h-[40px] w-full rounded-xl border border-slate-300 px-3 text-xs"
            />
          </div>
          <div>
            <label htmlFor="sme-sector" className="block text-xs font-medium text-slate-700">
              {isHausa ? 'Fannin Kasuwanci' : 'Sector'}
            </label>
            <input
              id="sme-sector"
              type="text"
              value={smeSector}
              onChange={(e) => setSmeSector(e.target.value)}
              className="mt-1 min-h-[40px] w-full rounded-xl border border-slate-300 px-3 text-xs"
            />
          </div>
          <div>
            <label htmlFor="sme-currency" className="block text-xs font-medium text-slate-700">
              {isHausa ? 'Nau’in Kuɗi' : 'Currency'}
            </label>
            <select
              id="sme-currency"
              value={smeCurrency}
              onChange={(e) => setSmeCurrency(e.target.value)}
              className="mt-1 min-h-[40px] w-full rounded-xl border border-slate-300 bg-white px-3 text-xs"
            >
              {SUPPORTED_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label htmlFor="sme-staff" className="block text-xs font-medium text-slate-700">
                {isHausa ? 'Ma’aikata' : 'Staff Count'}
              </label>
              <input
                id="sme-staff"
                type="number"
                min={1}
                value={smeStaffCount}
                onChange={(e) => setSmeStaffCount(e.target.value)}
                className="mt-1 min-h-[40px] w-full rounded-xl border border-slate-300 px-3 font-mono text-xs"
              />
            </div>
            <button
              type="submit"
              disabled={savingProfile}
              className="min-h-[40px] rounded-xl bg-[#043927] px-4 text-xs font-semibold text-white hover:bg-emerald-900"
            >
              {savingProfile
                ? isHausa
                  ? 'Ana adanawa...'
                  : 'Saving...'
                : isHausa
                  ? 'Ajiye'
                  : 'Save'}
            </button>
          </div>
        </form>
      )}

      {editingProfile && mode === 'individual' && (
        <form
          onSubmit={handleSaveProfile}
          className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-4"
        >
          <div>
            <label htmlFor="dash-currency" className="block text-xs font-medium text-slate-700">
              {isHausa ? 'Nau’in Kuɗi' : 'Currency'}
            </label>
            <select
              id="dash-currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="mt-1 min-h-[40px] w-full rounded-xl border border-slate-300 bg-white px-3 text-xs"
            >
              {SUPPORTED_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="dash-occupation" className="block text-xs font-medium text-slate-700">
              {isHausa ? 'Sana’a / Aiki' : 'Occupation'}
            </label>
            <input
              id="dash-occupation"
              type="text"
              value={occupation}
              onChange={(e) => setOccupation(e.target.value)}
              placeholder={isHausa ? 'misali, Kasuwanci' : 'e.g., Operations Lead'}
              className="mt-1 min-h-[40px] w-full rounded-xl border border-slate-300 px-3 text-xs"
            />
          </div>
          <div>
            <label htmlFor="dash-city" className="block text-xs font-medium text-slate-700">
              {isHausa ? 'Gari / Ƙasa' : 'City / Country'}
            </label>
            <input
              id="dash-city"
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder={isHausa ? 'misali, Kano / Abuja' : 'e.g., London / Nairobi'}
              className="mt-1 min-h-[40px] w-full rounded-xl border border-slate-300 px-3 text-xs"
            />
          </div>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label htmlFor="dash-goal" className="block text-xs font-medium text-slate-700">
                {isHausa ? `Manufar Wata (${currency})` : `Monthly Goal (${currency})`}
              </label>
              <input
                id="dash-goal"
                type="number"
                min={0}
                value={incomeGoal}
                onChange={(e) => setIncomeGoal(e.target.value)}
                className="mt-1 min-h-[40px] w-full rounded-xl border border-slate-300 px-3 font-mono text-xs"
              />
            </div>
            <button
              type="submit"
              disabled={savingProfile}
              className="min-h-[40px] rounded-xl bg-[#043927] px-4 text-xs font-semibold text-white hover:bg-emerald-900"
            >
              {savingProfile
                ? isHausa
                  ? 'Ana adanawa...'
                  : 'Saving...'
                : isHausa
                  ? 'Ajiye'
                  : 'Save'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="h-44 animate-pulse rounded-2xl border border-slate-200 bg-white" />
          <div className="h-44 animate-pulse rounded-2xl border border-slate-200 bg-white" />
        </div>
      ) : !latest ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <h2 className="font-display text-lg font-bold text-slate-900">
            {isHausa
              ? `Ba a Yi Gwajin Lafiyar Kuɗin ${mode === 'sme' ? 'Kasuwanci (SME)' : 'Mutum Ɗaya'} Tukuna Ba`
              : `No ${mode === 'sme' ? 'SME' : 'Individual'} Assessment Recorded Yet`}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
            {isHausa
              ? 'Cika matakan tantancewa 5 don ƙididdige ma’aunin kuɗin ku da samun shawarwarin Mai Ba da Shawara na AI.'
              : `Complete the 5-step ${mode === 'sme' ? 'SME Cashflow' : 'Financial Health'} Assessment to compute deterministic ratios and unlock grounded AI guidance.`}
          </p>
          <button
            type="button"
            onClick={() => onNavigate('assessment')}
            className="mt-5 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#043927] px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900"
          >
            <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
            <span>
              {isHausa
                ? 'Fara Gwajin Lafiyar Kuɗi'
                : `Start ${mode === 'sme' ? 'SME' : 'Individual'} Assessment`}
            </span>
          </button>
        </div>
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-6 rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <p className="text-xs font-medium text-slate-500">
                    {isHausa
                      ? 'Matsayin Lafiyar Kuɗi na Zahiri'
                      : 'Deterministic Readiness Classification'}
                  </p>
                  <p className="mt-1 font-display text-xl font-bold text-slate-900">
                    {translateReadinessTier(latest.output.readinessTier, language)}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {isHausa
                      ? `Siga ${latest.calculationVersion} · Ba a amfani da maki marar tushe`
                      : `Version ${latest.calculationVersion} · Unvalidated composite scoring disabled`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('assessment')}
                  className="inline-flex min-h-[40px] items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-900 whitespace-nowrap shrink-0"
                >
                  <span>{isHausa ? 'Sabunta Gwaji' : 'Update Assessment'}</span>
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
              <div className="mt-5">
                {primaryGaugeFormula && (
                  <RatioRingGauge
                    label={translateFormulaLabel(
                      primaryGaugeFormula.key,
                      primaryGaugeFormula.label,
                      language
                    )}
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
                    {isHausa ? 'Ma’auni na Biyu' : 'Secondary Financial Indicator'}
                  </p>
                  <p className="mt-1 font-display text-xl font-bold text-slate-900">
                    {secondaryGaugeFormula
                      ? translateFormulaLabel(
                          secondaryGaugeFormula.key,
                          secondaryGaugeFormula.label,
                          language
                        )
                      : isHausa
                        ? 'Tsarin Bashi da Kashe Kuɗi'
                        : 'Debt & Cost Discipline'}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {isHausa ? 'An sabunta' : 'Updated'}{' '}
                    {new Date(latest.createdAt).toLocaleDateString('en-US')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('recommendations')}
                  className="inline-flex min-h-[40px] items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-900 whitespace-nowrap shrink-0"
                >
                  <span>{isHausa ? 'Tambayi Mai Ba da Shawara' : 'Ask Growth Coach'}</span>
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
            <h2 className="font-display text-base font-bold text-slate-900">
              {isHausa ? 'Fasali Masu Aiki Yanzu' : 'Active Capabilities'}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => onNavigate('assessment')}
                className="flex min-h-[96px] items-start justify-between gap-4 rounded-2xl border border-emerald-200 bg-white p-5 text-left transition-colors hover:border-emerald-500"
              >
                <div>
                  <span className="inline-block rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-800">
                    {isHausa ? 'Yana Aiki' : 'Active'}
                  </span>
                  <p className="mt-2 font-display text-base font-bold text-slate-900">
                    {isHausa ? 'Gwajin Lafiyar Kuɗi na AI' : 'AI Financial Health Assessment'}
                  </p>
                  <p className="mt-1 text-xs text-slate-600">
                    {isHausa
                      ? 'Ƙididdige tanadi, kashe kuɗi, nauyin bashi, da motsin kuɗin kasuwanci ga Mutum Ɗaya da SME.'
                      : 'Compute deterministic savings, expense, debt, and cashflow ratios across Individual and Business modes.'}
                  </p>
                </div>
                <ClipboardCheck className="h-5 w-5 shrink-0 text-emerald-700" aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={() => onNavigate('recommendations')}
                className="flex min-h-[96px] items-start justify-between gap-4 rounded-2xl border border-emerald-200 bg-white p-5 text-left transition-colors hover:border-emerald-500"
              >
                <div>
                  <span className="inline-block rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-800">
                    {isHausa ? 'Yana Aiki' : 'Active'}
                  </span>
                  <p className="mt-2 font-display text-base font-bold text-slate-900">
                    {isHausa ? 'Mai Ba da Shawara na AI (Growth Coach)' : 'AI Business Growth Coach'}
                  </p>
                  <p className="mt-1 text-xs text-slate-600">
                    {isHausa
                      ? 'Samu shawarwarin haɓaka kasuwanci, motsin kuɗi, da matakan gaba bisa ga sakamakon gwajin ku.'
                      : 'Get grounded coaching on cash movement, margin efficiency, and realistic next steps from your assessment.'}
                  </p>
                </div>
                <Sparkles className="h-5 w-5 shrink-0 text-emerald-700" aria-hidden="true" />
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-display text-lg font-bold text-slate-900">
                  {isHausa ? 'Ma’aunin Kuɗi da Lissafi' : 'Calculated Ratios & Formulas'}
                </h2>
                <p className="text-xs text-slate-500">{latest.output.summaryStatement}</p>
              </div>
              {latest.output.dataQualityFlags.length > 0 && (
                <p className="font-mono text-xs text-amber-700">
                  {isHausa ? 'Alamomi' : 'Flags'}: {latest.output.dataQualityFlags.join(', ')}
                </p>
              )}
            </div>
            <FormulaFactorBars formulas={latest.output.formulas} />
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="font-display text-base font-bold text-slate-900">
              {isHausa
                ? `Tarihin Gwajin ${mode === 'sme' ? 'Kasuwanci (SME)' : 'Mutum Ɗaya'}`
                : `Recent ${mode === 'sme' ? 'SME / Business' : 'Individual'} Assessment History`}
            </h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[540px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-medium text-slate-500">
                    <th className="py-2.5 pr-4">{isHausa ? 'Kwanan Wata' : 'Date'}</th>
                    <th className="py-2.5 pr-4">{isHausa ? 'Siga' : 'Version'}</th>
                    <th className="py-2.5 pr-4">{isHausa ? 'Matsayi' : 'Readiness Tier'}</th>
                    <th className="py-2.5 pr-4">{isHausa ? 'Babban Ma’auni' : 'Primary Metric'}</th>
                    <th className="py-2.5 text-right">{isHausa ? 'Yanayi' : 'Status'}</th>
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
                          {translateReadinessTier(item.output.readinessTier, language)}
                        </td>
                        <td className="py-3 pr-4 font-mono text-xs tabular-nums text-slate-800">
                          {firstFormula
                            ? `${translateFormulaLabel(
                                firstFormula.key,
                                firstFormula.label,
                                language
                              )}: ${firstFormula.formattedValue}`
                            : '-'}
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

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-base font-bold text-slate-900">
            {isHausa ? 'Taswirar Manhaja · Nan Ba Da Jimawa Ba' : 'Platform Roadmap · Coming Soon'}
          </h2>
          <span className="text-xs text-slate-500">
            {isHausa
              ? 'Ƙarin fasali da ke tafe a Mataki na 2'
              : 'Additional modules scheduled for Phase 2'}
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {roadmapItems.map(([id, title, subtitle, Icon]) => (
            <button
              key={id}
              type="button"
              onClick={() => onNavigate(id)}
              className="flex flex-col items-start justify-between rounded-2xl border border-slate-200 bg-white/80 p-4 text-left transition-colors hover:border-slate-300 hover:bg-white"
            >
              <div className="flex w-full items-center justify-between gap-2">
                <Icon className="h-4 w-4 text-slate-500" aria-hidden="true" />
                <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
                  <Clock className="h-2.5 w-2.5" aria-hidden="true" />
                  <span>{isHausa ? 'Nan Gaba' : 'Soon'}</span>
                </span>
              </div>
              <div className="mt-3">
                <p className="text-sm font-semibold text-slate-900">{title}</p>
                <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
