import React, { useState } from 'react';
import { ArrowLeft, Lock, Mail, UserCheck } from 'lucide-react';
import { SUPPORTED_CURRENCIES, type PublicUser, type ScreenId } from '../../shared/types';
import { api } from '../../lib/api';
import { BrandMark } from '../BrandMark';

interface AuthScreenProps {
  demoAccounts: PublicUser[];
  demoEnabled: boolean;
  onAuthenticated: (token: string, user: PublicUser) => void;
  onStartDemo: (userId: string) => void;
  loadingDemoId: string | null;
  onNavigate: (screen: ScreenId) => void;
}

export function AuthScreen({
  demoAccounts,
  demoEnabled,
  onAuthenticated,
  onStartDemo,
  loadingDemoId,
  onNavigate,
}: AuthScreenProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'individual' | 'sme'>('individual');
  const [currency, setCurrency] = useState('USD');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [sector, setSector] = useState('Retail & Trade');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === 'login') {
        const res = await api.login(email, password);
        onAuthenticated(res.token, res.user);
      } else {
        if (!acceptedTerms) {
          throw new Error(
            'Please accept the Data Privacy and Educational Use notice before creating your account.'
          );
        }
        const res = await api.register({
          email,
          phone: phone || undefined,
          fullName,
          password,
          role,
          currency,
          acceptedTerms,
          businessName: role === 'sme' ? businessName : undefined,
          sector: role === 'sme' ? sector : undefined,
        });
        onAuthenticated(res.token, res.user);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F4F7F6] px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() => onNavigate('onboarding')}
            className="inline-flex min-h-[44px] items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-emerald-600"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>Back to Welcome</span>
          </button>
          <div className="flex items-center shrink-0">
            <BrandMark size={32} />
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
            <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError(null);
                }}
                className={`min-h-[44px] flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                  mode === 'login'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setError(null);
                }}
                className={`min-h-[44px] flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                  mode === 'register'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Create Account
              </button>
            </div>

            <h1 className="mt-6 font-display text-2xl font-bold text-slate-900">
              {mode === 'login' ? 'Sign in to SmartGrowth AI' : 'Create your SmartGrowth account'}
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              {mode === 'login'
                ? 'Access your personal or SME financial assessments, recommendations, and reports.'
                : 'Choose Individual or SME mode. Passwords are hashed server-side with scrypt.'}
            </p>

            {error && (
              <div
                role="alert"
                className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {mode === 'register' && (
                <>
                  <div>
                    <label
                      htmlFor="auth-fullname"
                      className="block text-sm font-medium text-slate-700"
                    >
                      Full Name
                    </label>
                    <input
                      id="auth-fullname"
                      type="text"
                      required
                      minLength={2}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g., Zainab Yusuf"
                      className="mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
                    />
                  </div>

                  <div>
                    <span className="block text-sm font-medium text-slate-700">Account Type</span>
                    <div className="mt-1.5 grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setRole('individual')}
                        className={`min-h-[44px] rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                          role === 'individual'
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                            : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        Individual
                      </button>
                      <button
                        type="button"
                        onClick={() => setRole('sme')}
                        className={`min-h-[44px] rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                          role === 'sme'
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                            : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        SME / Business
                      </button>
                    </div>
                  </div>

                  {role === 'sme' && (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label
                          htmlFor="auth-biz-name"
                          className="block text-sm font-medium text-slate-700"
                        >
                          Business Name
                        </label>
                        <input
                          id="auth-biz-name"
                          type="text"
                          required
                          value={businessName}
                          onChange={(e) => setBusinessName(e.target.value)}
                          placeholder="e.g., Crescent Foods Ltd"
                          className="mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="auth-biz-sector"
                          className="block text-sm font-medium text-slate-700"
                        >
                          Business Sector
                        </label>
                        <input
                          id="auth-biz-sector"
                          type="text"
                          value={sector}
                          onChange={(e) => setSector(e.target.value)}
                          className="mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
                        />
                      </div>
                    </div>
                  )}

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="auth-currency"
                        className="block text-sm font-medium text-slate-700"
                      >
                        Preferred Currency
                      </label>
                      <select
                        id="auth-currency"
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        className="mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
                      >
                        {SUPPORTED_CURRENCIES.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label
                        htmlFor="auth-phone"
                        className="block text-sm font-medium text-slate-700"
                      >
                        Phone Number (Optional)
                      </label>
                      <input
                        id="auth-phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+1 555 000 0000"
                        className="mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label htmlFor="auth-email" className="block text-sm font-medium text-slate-700">
                  Email Address
                </label>
                <div className="relative mt-1.5">
                  <Mail
                    className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-slate-400"
                    aria-hidden="true"
                  />
                  <input
                    id="auth-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-white py-2 pl-10 pr-3.5 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="auth-password"
                  className="block text-sm font-medium text-slate-700"
                >
                  Password
                </label>
                <div className="relative mt-1.5">
                  <Lock
                    className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-slate-400"
                    aria-hidden="true"
                  />
                  <input
                    id="auth-password"
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-white py-2 pl-10 pr-3.5 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
                  />
                </div>
              </div>

              {mode === 'register' && (
                <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
                  />
                  <span>
                    I understand SmartGrowth AI calculates deterministic educational financial
                    indicators only and does not issue loan approvals, provider quotes, or Shariah
                    certifications. I consent to storing my submitted assessment records privately in
                    my account.
                  </span>
                </label>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="min-h-[48px] w-full rounded-xl bg-[#043927] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-900 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-emerald-600"
              >
                {submitting
                  ? 'Processing...'
                  : mode === 'login'
                    ? 'Sign In'
                    : 'Create Account'}
              </button>
            </form>
          </div>

          <div className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white p-6">
            <p className="text-xs font-medium text-amber-700">Synthetic Sandbox Accounts</p>
            <h2 className="mt-1 font-display text-lg font-bold text-slate-900">
              Quick Demonstration Access
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Test role-based access control, ownership isolation, and pre-seeded synthetic
              assessments with one click.
            </p>

            {!demoEnabled || demoAccounts.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">
                Synthetic demo login is disabled in this environment.
              </p>
            ) : (
              <div className="mt-5 space-y-3">
                {demoAccounts.map((acc) => (
                  <div
                    key={acc.id}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold uppercase text-emerald-700">{acc.role}</span>
                      <span className="text-slate-500">Synthetic Demo</span>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{acc.fullName}</p>
                    <p className="font-mono text-xs text-slate-500">{acc.email}</p>
                    <button
                      type="button"
                      disabled={loadingDemoId !== null}
                      onClick={() => onStartDemo(acc.id)}
                      className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg border border-emerald-700 bg-white px-3 py-2 text-xs font-semibold text-emerald-900 transition-colors hover:bg-emerald-50 disabled:opacity-60"
                    >
                      <UserCheck className="h-4 w-4" aria-hidden="true" />
                      <span>
                        {loadingDemoId === acc.id ? 'Starting session...' : `Sign in as ${acc.role}`}
                      </span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
