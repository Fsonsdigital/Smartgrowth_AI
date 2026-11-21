import React from 'react';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Building2,
  Database,
  FileText,
  ShieldCheck,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import type { PublicUser, ScreenId } from '../../shared/types';
import { BrandMark } from '../BrandMark';

interface OnboardingScreenProps {
  demoAccounts: PublicUser[];
  demoEnabled: boolean;
  loadingDemoId: string | null;
  onStartDemo: (userId: string) => void;
  onNavigate: (screen: ScreenId) => void;
}

const CAPABILITIES = [
  {
    icon: BarChart3,
    title: 'Deterministic Financial Health',
    desc: 'Transparent ratio calculations for savings rate, expense pressure, debt burden, and monthly surplus or deficit.',
  },
  {
    icon: Building2,
    title: 'SME Cashflow & Liquidity',
    desc: 'Separate SME engine tracking operating cash movement, operating expense ratio, debt service, and runway.',
  },
  {
    icon: Sparkles,
    title: 'Grounded AI Education',
    desc: 'Server-side Gemini explanations grounded strictly in approved knowledge-base records with source citations.',
  },
  {
    icon: ShieldCheck,
    title: 'Ethical Finance Literacy',
    desc: 'Clear educational overview of non-interest and ethical finance principles without unverified certifications.',
  },
  {
    icon: BookOpen,
    title: 'Learning & Reports',
    desc: 'Structured financial literacy modules and downloadable financial health & readiness indicator reports.',
  },
  {
    icon: Database,
    title: 'SmartGrowth AI Data Lab',
    desc: 'Administrator workspace for CSV/JSONL dataset validation, duplicate hashing, approval, splits, and evaluation.',
  },
];

export function OnboardingScreen({
  demoAccounts,
  demoEnabled,
  loadingDemoId,
  onStartDemo,
  onNavigate,
}: OnboardingScreenProps) {
  return (
    <div className="min-h-screen bg-[#F4F7F6] text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-4 py-3.5 sm:px-6">
          <div className="flex items-center whitespace-nowrap shrink-0">
            <BrandMark size={34} />
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <a href="#capabilities" className="hover:text-slate-900 whitespace-nowrap shrink-0">
              Capabilities
            </a>
            <a href="#demo-sandbox" className="hover:text-slate-900 whitespace-nowrap shrink-0">
              Demo Accounts
            </a>
            <a href="#methodology" className="hover:text-slate-900 whitespace-nowrap shrink-0">
              Methodology
            </a>
          </nav>
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('auth')}
              className="min-h-[44px] rounded-lg bg-[#043927] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-emerald-600 whitespace-nowrap shrink-0"
            >
              Sign In / Register
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-12 space-y-12">
        <section className="grid gap-8 lg:grid-cols-12 lg:items-stretch">
          <div className="lg:col-span-7 flex flex-col justify-between rounded-2xl bg-[#043927] p-6 text-white sm:p-10">
            <div>
              <p className="text-xs font-medium tracking-wide text-emerald-300">
                Smarter Finance · Brighter Futures
              </p>
              <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-white sm:text-5xl [text-wrap:balance]">
                Your Financial Health, Measured &amp; Improved
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-emerald-100">
                SmartGrowth AI combines transparent deterministic financial ratios, SME cashflow
                analytics, and grounded educational guidance for individuals, small businesses, and
                cooperatives.
              </p>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => onNavigate('auth')}
                className="inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-emerald-400 focus-visible:outline-2 focus-visible:outline-white whitespace-nowrap shrink-0"
              >
                <span>Create Account</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
              <a
                href="#demo-sandbox"
                className="inline-flex min-h-[48px] items-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-950/50 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-white whitespace-nowrap shrink-0"
              >
                <span>Explore Synthetic Demos</span>
              </a>
            </div>
          </div>

          <div className="lg:col-span-5 flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6">
            <div>
              <p className="text-xs font-medium text-slate-500">Product Overview</p>
              <h2 className="mt-1 font-display text-xl font-bold text-slate-900">
                All 10 Core Screens &amp; Admin Data Lab
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Every workflow in the SmartGrowth AI platform is backed by server-side persistence,
                strict record ownership, and reproducible formulas.
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
                Reference brand palette &amp; 10-screen mobile-first product architecture.
              </div>
            </div>
          </div>
        </section>

        <section id="demo-sandbox" className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <p className="text-xs font-medium text-amber-700">
                Synthetic Demonstration Sandbox
              </p>
              <h2 className="mt-1 font-display text-2xl font-bold text-slate-900">
                Launch a Sample Demonstration Account
              </h2>
              <p className="mt-1 max-w-2xl text-sm text-slate-600">
                All numbers inside demonstration accounts are clearly labeled synthetic datasets
                created for verification of Individual, SME, and Admin Data Lab workflows.
              </p>
            </div>
          </div>

          {!demoEnabled || demoAccounts.length === 0 ? (
            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              Demo quick-launch is disabled in this environment. Please sign in or register an
              account.
            </div>
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {demoAccounts.map((acc) => {
                const roleDesc =
                  acc.role === 'individual'
                    ? 'Individual workspace · NGN household budget, savings rate, debt ratio & learning progress.'
                    : acc.role === 'sme'
                      ? 'SME workspace · Musa Agro Ventures cashflow, operating expense ratio, runway & team.'
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
                        <span>Synthetic Demo</span>
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
                        {loadingDemoId === acc.id ? 'Signing in...' : `Enter ${acc.role} Demo`}
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
            <p className="text-xs font-medium text-emerald-700">Platform Capabilities</p>
            <h2 className="mt-1 font-display text-2xl font-bold text-slate-900">
              Complete Financial Health &amp; Data Governance Suite
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CAPABILITIES.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="rounded-2xl border border-slate-200 bg-white p-6"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                    <Icon className="h-5 w-5" aria-hidden="true" />
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
                Transparency &amp; Safety Standards
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">
                SmartGrowth AI strictly separates deterministic financial calculations from AI
                explanations. Every ratio displays its formula, version, and input quality flags; no
                unvalidated composite score is emitted. AI explanations retrieve only
                administrator-approved knowledge records and never invent external providers, loan
                terms, financing approvals, or Shariah certifications.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
