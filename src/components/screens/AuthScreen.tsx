import React, { useState } from 'react';
import { ArrowLeft, Lock, Mail, UserCheck } from 'lucide-react';
import { SUPPORTED_CURRENCIES, type PublicUser, type ScreenId } from '../../shared/types';
import { api } from '../../lib/api';
import { LanguageSwitcher, useLanguage } from '../../lib/i18n';
import { BrandMark } from '../BrandMark';

interface AuthScreenProps {
  demoAccounts: PublicUser[];
  demoEnabled: boolean;
  onAuthenticated: (token: string, user: PublicUser) => void;
  onGoogleSignIn: () => Promise<void> | void;
  googleLoading: boolean;
  onStartDemo: (userId: string) => void;
  loadingDemoId: string | null;
  onNavigate: (screen: ScreenId) => void;
}

export function AuthScreen({
  demoAccounts,
  demoEnabled,
  onAuthenticated,
  onGoogleSignIn,
  googleLoading,
  onStartDemo,
  loadingDemoId,
  onNavigate,
}: AuthScreenProps) {
  const { isHausa } = useLanguage();
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
            isHausa
              ? 'Da fatan za a amince da sanarwar Sirrin Bayanai da Amfani da Ilimi kafin buɗe asusu.'
              : 'Please accept the Data Privacy and Educational Use notice before creating your account.'
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
      setError(
        err instanceof Error
          ? err.message
          : isHausa
            ? 'Shiga ko rajista ta ci tura.'
            : 'Authentication failed.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F4F7F6] px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onNavigate('onboarding')}
            className="inline-flex min-h-[44px] items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-emerald-600"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>{isHausa ? 'Koma Shafin Maraba' : 'Back to Welcome'}</span>
          </button>
          <div className="flex items-center gap-3 shrink-0">
            <LanguageSwitcher />
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
                {isHausa ? 'Shiga' : 'Sign In'}
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
                {isHausa ? 'Buɗe Asusu' : 'Create Account'}
              </button>
            </div>

            <h1 className="mt-6 font-display text-2xl font-bold text-slate-900">
              {mode === 'login'
                ? isHausa
                  ? 'Shiga SmartGrowth AI'
                  : 'Sign in to SmartGrowth AI'
                : isHausa
                  ? 'Buɗe Asusun SmartGrowth'
                  : 'Create your SmartGrowth account'}
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              {mode === 'login'
                ? isHausa
                  ? 'Shiga don amfani da Gwajin Lafiyar Kuɗi na AI da Mai Ba da Shawara na AI.'
                  : 'Access your AI Financial Health Assessment and AI Business Growth Coach.'
                : isHausa
                  ? 'Zaɓi tsarin Mutum Ɗaya ko Kasuwanci (SME). Ana kiyaye kalmar sirri da scrypt.'
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

            <div className="mt-5">
              <button
                type="button"
                disabled={googleLoading || submitting}
                onClick={async () => {
                  setError(null);
                  try {
                    await onGoogleSignIn();
                  } catch (err) {
                    setError(
                      err instanceof Error
                        ? err.message
                        : isHausa
                          ? 'Shiga da Google ta ci tura.'
                          : 'Google Sign-In failed.'
                    );
                  }
                }}
                className="flex min-h-[48px] w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-xs transition-colors hover:bg-slate-50 disabled:opacity-60"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
                  />
                </svg>
                <span>
                  {googleLoading
                    ? isHausa
                      ? 'Ana haɗawa da Google...'
                      : 'Connecting Google Account...'
                    : isHausa
                      ? 'Ci gaba da Google (Firebase Cloud)'
                      : 'Continue with Google (Persistent Cloud Account)'}
                </span>
              </button>
              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-xs font-medium text-slate-400">
                  {isHausa ? 'ko da imel' : 'or with email'}
                </span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <>
                  <div>
                    <label
                      htmlFor="auth-fullname"
                      className="block text-sm font-medium text-slate-700"
                    >
                      {isHausa ? 'Cikakken Suna' : 'Full Name'}
                    </label>
                    <input
                      id="auth-fullname"
                      type="text"
                      required
                      minLength={2}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder={isHausa ? 'misali, Zainab Yusuf' : 'e.g., Zainab Yusuf'}
                      className="mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
                    />
                  </div>

                  <div>
                    <span className="block text-sm font-medium text-slate-700">
                      {isHausa ? 'Nau’in Asusu' : 'Account Type'}
                    </span>
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
                        {isHausa ? 'Mutum Ɗaya' : 'Individual'}
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
                        {isHausa ? 'Kasuwanci / SME' : 'SME / Business'}
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
                          {isHausa ? 'Sunan Kasuwanci' : 'Business Name'}
                        </label>
                        <input
                          id="auth-biz-name"
                          type="text"
                          required
                          value={businessName}
                          onChange={(e) => setBusinessName(e.target.value)}
                          placeholder={
                            isHausa ? 'misali, Crescent Foods Ltd' : 'e.g., Crescent Foods Ltd'
                          }
                          className="mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="auth-biz-sector"
                          className="block text-sm font-medium text-slate-700"
                        >
                          {isHausa ? 'Fannin Kasuwanci' : 'Business Sector'}
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
                        {isHausa ? 'Kuɗin da Ake So' : 'Preferred Currency'}
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
                        {isHausa ? 'Lambar Waya (Na Zaɓi)' : 'Phone Number (Optional)'}
                      </label>
                      <input
                        id="auth-phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+234 800 000 0000"
                        className="mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label htmlFor="auth-email" className="block text-sm font-medium text-slate-700">
                  {isHausa ? 'Adireshin Imel' : 'Email Address'}
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
                  {isHausa ? 'Kalmar Sirri' : 'Password'}
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
                    placeholder={isHausa ? 'Akalla haruffa 8' : 'Minimum 8 characters'}
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
                    {isHausa
                      ? 'Na fahimci cewa SmartGrowth AI yana ƙididdige ma’aunin ilimin kuɗi ne kawai, kuma ba ya amincewa da bashi, zaɓar banki, ko bayar da takardar shaidar Shari’a. Na amince a adana bayanan gwajina a asusuna cikin sirri.'
                      : 'I understand SmartGrowth AI calculates deterministic educational financial indicators only and does not issue loan approvals, provider quotes, or Shariah certifications. I consent to storing my submitted assessment records privately in my account.'}
                  </span>
                </label>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="min-h-[48px] w-full rounded-xl bg-[#043927] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-900 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-emerald-600"
              >
                {submitting
                  ? isHausa
                    ? 'Ana sarrafawa...'
                    : 'Processing...'
                  : mode === 'login'
                    ? isHausa
                      ? 'Shiga'
                      : 'Sign In'
                    : isHausa
                      ? 'Buɗe Asusu'
                      : 'Create Account'}
              </button>
            </form>
          </div>

          <div className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white p-6">
            <p className="text-xs font-medium text-amber-700">
              {isHausa ? 'Asusun Gwaji na Misali' : 'Synthetic Sandbox Accounts'}
            </p>
            <h2 className="mt-1 font-display text-lg font-bold text-slate-900">
              {isHausa ? 'Shiga Cikin Sauƙi Don Gwaji' : 'Quick Demonstration Access'}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {isHausa
                ? 'Gwada tsarin raba iko, sirrin bayanai, da misalan tantancewar lafiyar kuɗi da dannawa ɗaya.'
                : 'Test role-based access control, ownership isolation, and pre-seeded synthetic assessments with one click.'}
            </p>

            {!demoEnabled || demoAccounts.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">
                {isHausa
                  ? 'An kashe shigar gwaji a wannan yanayin.'
                  : 'Synthetic demo login is disabled in this environment.'}
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
                      <span className="text-slate-500">
                        {isHausa ? 'Misalin Gwaji' : 'Synthetic Demo'}
                      </span>
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
                        {loadingDemoId === acc.id
                          ? isHausa
                            ? 'Ana shiga...'
                            : 'Starting session...'
                          : isHausa
                            ? `Shiga a matsayin ${acc.role}`
                            : `Sign in as ${acc.role}`}
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
