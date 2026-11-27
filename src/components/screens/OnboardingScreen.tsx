import React from 'react';
import {
  ArrowRight,
  BarChart3,
  Building2,
  ClipboardCheck,
  FileText,
  ShieldCheck,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import type { PublicUser, ScreenId } from '../../shared/types';
import { LanguageSwitcher, useLanguage } from '../../lib/i18n';
import { BrandMark } from '../BrandMark';

interface OnboardingScreenProps {
  demoAccounts: PublicUser[];
  demoEnabled: boolean;
  loadingDemoId: string | null;
  googleLoading: boolean;
  onGoogleSignIn: () => void;
  onStartDemo: (userId: string) => void;
  onNavigate: (screen: ScreenId) => void;
}

export function OnboardingScreen({
  demoAccounts,
  demoEnabled,
  loadingDemoId,
  googleLoading,
  onGoogleSignIn,
  onStartDemo,
  onNavigate,
}: OnboardingScreenProps) {
  const { isHausa } = useLanguage();

  const capabilities = [
    {
      icon: ClipboardCheck,
      title: isHausa ? 'Gwajin Lafiyar Kuɗi na AI' : 'AI Financial Health Assessment',
      active: true,
      status: isHausa ? 'Yana Aiki Yanzu' : 'Active Now',
      desc: isHausa
        ? 'Lissafi bayyananne na adadin tanadi, matsin kashe kuɗi, nauyin bashi, motsin kuɗin kasuwanci, da juriyar tsabar kuɗi.'
        : 'Transparent deterministic calculations for savings rate, expense pressure, debt burden, operating cash movement, and liquidity runway.',
    },
    {
      icon: Sparkles,
      title: isHausa ? 'Mai Ba da Shawara na AI (Growth Coach)' : 'AI Business Growth Coach',
      active: true,
      status: isHausa ? 'Yana Aiki Yanzu' : 'Active Now',
      desc: isHausa
        ? 'Shawarwarin Gemini da suka dogara da ilimin da aka amince da shi tare da madogara da matakan haɓaka kasuwanci da kuɗin kai.'
        : 'Server-side Gemini coaching grounded strictly in approved knowledge-base records with source citations and growth action steps.',
    },
    {
      icon: BarChart3,
      title: isHausa ? 'Shirye-shiryen Bashi da Ma’auni' : 'Credit Readiness Benchmarks',
      active: false,
      status: isHausa ? 'Nan Ba Da Jimawa Ba' : 'Coming Soon',
      desc: isHausa
        ? 'Kwatanta ma’auni na bankuna da tantance shirye-shiryen bashi ga ƙungiyoyi da masu zuba jari.'
        : 'Side-by-side lender readiness views and institutional threshold verification trails.',
    },
    {
      icon: Building2,
      title: isHausa ? 'Sashen Tawagar SME da Rassan Kasuwanci' : 'SME Team & Multi-Entity Workspace',
      active: false,
      status: isHausa ? 'Nan Ba Da Jimawa Ba' : 'Coming Soon',
      desc: isHausa
        ? 'Haɗin gwiwar manajan kuɗi da masu nazari tare da bibiyar rassan kasuwanci daban-daban.'
        : 'Multi-member team access for finance managers, analysts, and multi-branch cashflow comparisons.',
    },
    {
      icon: ShieldCheck,
      title: isHausa ? 'Kuɗi na Gaskiya da Cibiyar Koyo' : 'Ethical Finance & Learning Centre',
      active: false,
      status: isHausa ? 'Nan Ba Da Jimawa Ba' : 'Coming Soon',
      desc: isHausa
        ? 'Darussa, bidiyo, da bayanin ilimi kan tsarin kuɗi marar ruwa da adashin haɗin gwiwa.'
        : 'Curated courses, videos, and educational guides on non-interest and cooperative finance principles.',
    },
    {
      icon: FileText,
      title: isHausa ? 'Rahotanni da Fitar da Takardu' : 'Reports & Export Snapshots',
      active: false,
      status: isHausa ? 'Nan Ba Da Jimawa Ba' : 'Coming Soon',
      desc: isHausa
        ? 'Sauke rahotanni a tsarin PDF, HTML, da JSON tare da kayan aikin Data Lab.'
        : 'Downloadable PDF, HTML, and JSON readiness snapshots alongside governed Admin Data Lab tools.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#F4F7F6] text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
          <div className="flex items-center whitespace-nowrap shrink-0">
            <BrandMark size={34} />
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <a href="#capabilities" className="hover:text-slate-900 whitespace-nowrap shrink-0">
              {isHausa ? 'Fasali' : 'Capabilities'}
            </a>
            <a href="#demo-sandbox" className="hover:text-slate-900 whitespace-nowrap shrink-0">
              {isHausa ? 'Asusun Gwaji' : 'Demo Accounts'}
            </a>
            <a href="#methodology" className="hover:text-slate-900 whitespace-nowrap shrink-0">
              {isHausa ? 'Tsari' : 'Methodology'}
            </a>
          </nav>
          <div className="flex items-center gap-2.5 shrink-0">
            <LanguageSwitcher />
            <button
              type="button"
              onClick={() => onNavigate('auth')}
              className="min-h-[42px] rounded-lg bg-[#043927] px-3.5 py-2 text-xs sm:text-sm font-semibold text-white transition-colors hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-emerald-600 whitespace-nowrap shrink-0"
            >
              {isHausa ? 'Shiga / Yi Rajista' : 'Sign In / Register'}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-12 space-y-12">
        <section className="grid gap-8 lg:grid-cols-12 lg:items-stretch">
          <div className="lg:col-span-7 flex flex-col justify-between rounded-2xl bg-[#043927] p-6 text-white sm:p-10">
            <div>
              <p className="text-xs font-medium tracking-wide text-emerald-300">
                {isHausa
                  ? 'Kuɗi Mai Hikima · Makoma Mai Hasken Gaba'
                  : 'Smarter Finance · Brighter Futures'}
              </p>
              <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-white sm:text-5xl [text-wrap:balance]">
                {isHausa
                  ? 'Lafiyar Kuɗin Ku, Auna & Inganta'
                  : 'Your Financial Health, Measured & Improved'}
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-emerald-100">
                {isHausa
                  ? 'SmartGrowth AI yana haɗa ƙididdigar ma’aunin kuɗi na zahiri, nazarin kuɗin kasuwanci (SME), da Mai Ba da Shawara na AI don mutane, ƙananan masana’antu, da ƙungiyoyi.'
                  : 'SmartGrowth AI combines transparent deterministic financial ratios, SME cashflow analytics, and grounded educational guidance for individuals, small businesses, and cooperatives.'}
              </p>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={googleLoading}
                onClick={onGoogleSignIn}
                className="inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-emerald-400 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-white whitespace-nowrap shrink-0"
              >
                <span>
                  {googleLoading
                    ? isHausa
                      ? 'Ana haɗawa da Google...'
                      : 'Connecting Google...'
                    : isHausa
                      ? 'Fara da Google (Asusun Gaskiya)'
                      : 'Continue with Google (Real Account)'}
                </span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => onNavigate('auth')}
                className="inline-flex min-h-[48px] items-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-950/50 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-white whitespace-nowrap shrink-0"
              >
                <span>{isHausa ? 'Yi Rajista da Imel' : 'Sign In with Email'}</span>
              </button>
              <a
                href="#demo-sandbox"
                className="inline-flex min-h-[48px] items-center gap-2 rounded-xl px-3 py-3 text-sm font-medium text-emerald-200 underline-offset-4 hover:underline whitespace-nowrap shrink-0"
              >
                <span>{isHausa ? 'Duba Asusun Gwaji' : 'Explore Synthetic Demos'}</span>
              </a>
            </div>
          </div>

          <div className="lg:col-span-5 flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6">
            <div>
              <p className="text-xs font-medium text-emerald-700">
                {isHausa ? 'Matakin Farko · Fasali Masu Aiki' : 'Pilot Scope · Focused Launch'}
              </p>
              <h2 className="mt-1 font-display text-xl font-bold text-slate-900">
                {isHausa
                  ? 'Gwajin Lafiyar Kuɗi & Mai Ba da Shawara na AI'
                  : 'AI Financial Health & Growth Coach'}
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                {isHausa
                  ? 'Fara nan take da Gwajin Lafiyar Kuɗi na zahiri da Mai Ba da Shawara na AI—yayin da sauran sassan kamar Shirye-shiryen Bashi, Tawagar SME, Ilimin Kuɗi, Koyo, da Rahotanni ke nan a matsayin Nan Ba Da Jimawa Ba.'
                  : 'Launch immediately with deterministic Financial Health Assessments and the AI Business Growth Coach—while Credit Readiness, SME Teams, Ethical Finance, Learning, and Reports remain visible as Coming Soon.'}
              </p>
            </div>
            <div className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
              <img
                src="/assets/aistudio/IMG-20260910-WA0002_61581d2e.jpg"
                alt="SmartGrowth AI mobile and web product architecture reference"
                referrerPolicy="no-referrer"
                className="h-48 w-full object-cover object-top"
              />
              <div className="border-t border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-600">
                {isHausa
                  ? 'Tsarin manhajar SmartGrowth AI na wayar hannu da yanar gizo.'
                  : 'Reference brand palette & mobile-first product architecture.'}
              </div>
            </div>
          </div>
        </section>

        <section id="demo-sandbox" className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <p className="text-xs font-medium text-amber-700">
                {isHausa ? 'Asusun Gwaji na Misali' : 'Synthetic Demonstration Sandbox'}
              </p>
              <h2 className="mt-1 font-display text-2xl font-bold text-slate-900">
                {isHausa
                  ? 'Gwada Asusun Misali Nan Take'
                  : 'Launch a Sample Demonstration Account'}
              </h2>
              <p className="mt-1 max-w-2xl text-sm text-slate-600">
                {isHausa
                  ? 'Dukkan alkaluman da ke cikin asusun gwaji ƙirƙirarrun misalai ne don nuna yadda tsarin Mutum Ɗaya, SME, da Admin Data Lab suke aiki.'
                  : 'All numbers inside demonstration accounts are clearly labeled synthetic datasets created for verification of Individual, SME, and Admin Data Lab workflows.'}
              </p>
            </div>
          </div>

          {!demoEnabled || demoAccounts.length === 0 ? (
            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              {isHausa
                ? 'An kashe shiga ta asusun gwaji a wannan yanayin. Da fatan za a shiga ko a yi rajista.'
                : 'Demo quick-launch is disabled in this environment. Please sign in or register an account.'}
            </div>
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {demoAccounts.map((acc) => {
                const roleDesc = isHausa
                  ? acc.role === 'individual'
                    ? 'Asusun Mutum Ɗaya · Kasafin gida, adadin tanadi, nauyin bashi da shawarar AI.'
                    : acc.role === 'sme'
                      ? 'Asusun Kasuwanci (SME) · Motsin kuɗin Musa Agro Ventures, kuɗin aiki, da juriyar kuɗi.'
                      : 'Asusun Gudanarwa (Admin) · Lissafin tsaro, CSV/JSONL Data Lab, da tantance ilimin AI.'
                  : acc.role === 'individual'
                    ? 'Individual workspace · NGN household budget, savings rate, debt ratio & AI coaching.'
                    : acc.role === 'sme'
                      ? 'SME workspace · Musa Agro Ventures cashflow, operating expense ratio & AI growth coach.'
                      : 'Admin workspace · System audit logs, CSV/JSONL Data Lab, dataset approval & splits.';
                return (
                  <div
                    key={acc.id}
                    className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-5"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                        <span className="font-semibold uppercase tracking-wide text-emerald-700">
                          {acc.role}
                        </span>
                        <span>{isHausa ? 'Misalin Gwaji' : 'Synthetic Demo'}</span>
                      </div>
                      <h3 className="mt-2 font-display text-base font-bold text-slate-900">
                        {acc.fullName}
                      </h3>
                      <p className="mt-1 font-mono text-xs text-slate-500">{acc.email}</p>
                      <p className="mt-3 text-sm text-slate-600">{roleDesc}</p>
                    </div>
                    <button
                      type="button"
                      disabled={loadingDemoId !== null}
                      onClick={() => onStartDemo(acc.id)}
                      className="mt-5 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-[#043927] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-900 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-emerald-600"
                    >
                      <UserCheck className="h-4 w-4" aria-hidden="true" />
                      <span>
                        {loadingDemoId === acc.id
                          ? isHausa
                            ? 'Ana shiga...'
                            : 'Signing in...'
                          : isHausa
                            ? `Shiga a matsayin ${acc.role}`
                            : `Enter ${acc.role} Demo`}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section id="capabilities" className="space-y-5">
          <div>
            <p className="text-xs font-medium text-emerald-700">
              {isHausa ? 'Abubuwan da Ke Ciki' : 'Platform Capabilities'}
            </p>
            <h2 className="mt-1 font-display text-2xl font-bold text-slate-900">
              {isHausa
                ? 'Tsarin Lafiyar Kuɗi da Haɓaka Kasuwanci'
                : 'Complete Financial Health & Data Governance Suite'}
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {capabilities.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className={`rounded-2xl border bg-white p-6 ${
                    item.active ? 'border-emerald-200' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                        item.active
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <span
                      className={`rounded px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
                        item.active
                          ? 'bg-emerald-50 text-emerald-800'
                          : 'bg-amber-50 text-amber-800'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                  <h3 className="mt-4 font-display text-base font-bold text-slate-900">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section
          id="methodology"
          className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8"
        >
          <div className="flex items-start gap-3">
            <FileText className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" aria-hidden="true" />
            <div>
              <h2 className="font-display text-lg font-bold text-slate-900">
                {isHausa ? 'Gaskiya da Tsaron Lissafi' : 'Transparency & Safety Standards'}
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">
                {isHausa
                  ? 'SmartGrowth AI yana raba lissafin ma’aunin kuɗi na zahiri da bayanin AI. Kowane ma’auni yana nuna tsarin lissafinsa da sigarsa; ba a ƙirƙirar maki mara tushe. Shawarwarin AI suna amfani da bayanan ilimin da gudanarwa ta amince da su ne kawai, kuma ba sa ƙirƙirar sharuɗɗan bashi ko takardar shaidar Shari’a.'
                  : 'SmartGrowth AI strictly separates deterministic financial calculations from AI explanations. Every ratio displays its formula, version, and input quality flags; no unvalidated composite score is emitted. AI explanations retrieve only administrator-approved knowledge records and never invent external providers, loan terms, financing approvals, or Shariah certifications.'}
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
