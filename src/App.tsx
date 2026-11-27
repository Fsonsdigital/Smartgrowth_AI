import React, { useCallback, useEffect, useState } from 'react';
import {
  BarChart3,
  BookOpen,
  Building2,
  ClipboardCheck,
  Database,
  FileText,
  Handshake,
  Home,
  LogOut,
  Menu,
  Sparkles,
  X,
} from 'lucide-react';
import type {
  AssessmentResultRecord,
  IndividualProfile,
  PublicUser,
  RecommendationRecord,
  ScreenId,
  SmeProfile,
  WorkspaceMode,
} from './shared/types';
import { api, setAuthToken } from './lib/api';
import {
  auth,
  ensureFirestoreUserProfile,
  onAuthStateChanged,
  signInWithGooglePopup,
  signOutFirebase,
  subscribeUserWorkspace,
  updateFirestoreUserProfile,
} from './lib/firebase';
import { LanguageProvider, LanguageSwitcher, useLanguage } from './lib/i18n';
import { BrandMark } from './components/BrandMark';
import { PilotFeedbackModal } from './components/PilotFeedbackModal';
import { OnboardingScreen } from './components/screens/OnboardingScreen';
import { AuthScreen } from './components/screens/AuthScreen';
import { DashboardScreen } from './components/screens/DashboardScreen';
import { AssessmentScreen } from './components/screens/AssessmentScreen';
import { ReadinessScreen } from './components/screens/ReadinessScreen';
import { RecommendationsScreen } from './components/screens/RecommendationsScreen';
import { SmeWorkspaceScreen } from './components/screens/SmeWorkspaceScreen';
import { EthicalFinanceScreen } from './components/screens/EthicalFinanceScreen';
import { LearningCentreScreen } from './components/screens/LearningCentreScreen';
import { ReportsScreen } from './components/screens/ReportsScreen';
import { AdminDataLabScreen } from './components/screens/AdminDataLabScreen';

const NAV_ITEMS: Array<{
  id: ScreenId;
  labelEn: string;
  labelHa: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
  comingSoon?: boolean;
}> = [
  { id: 'dashboard', labelEn: 'Overview', labelHa: 'Taƙaitaccen Bayani', icon: Home },
  {
    id: 'assessment',
    labelEn: 'AI Financial Health',
    labelHa: 'Lafiyar Kuɗi ta AI',
    icon: ClipboardCheck,
  },
  {
    id: 'recommendations',
    labelEn: 'AI Growth Coach',
    labelHa: 'Mai Ba da Shawara na AI',
    icon: Sparkles,
  },
  {
    id: 'readiness',
    labelEn: 'Credit Readiness',
    labelHa: 'Shirye-shiryen Bashi',
    icon: BarChart3,
    comingSoon: true,
  },
  {
    id: 'sme',
    labelEn: 'SME Workspace',
    labelHa: 'Sashen Kasuwanci (SME)',
    icon: Building2,
    comingSoon: true,
  },
  {
    id: 'ethical',
    labelEn: 'Ethical Finance',
    labelHa: 'Kuɗi na Gaskiya',
    icon: Handshake,
    comingSoon: true,
  },
  {
    id: 'learning',
    labelEn: 'Learning Centre',
    labelHa: 'Cibiyar Koyo',
    icon: BookOpen,
    comingSoon: true,
  },
  {
    id: 'reports',
    labelEn: 'Reports',
    labelHa: 'Rahotanni',
    icon: FileText,
    comingSoon: true,
  },
  {
    id: 'admin',
    labelEn: 'Admin & Data Lab',
    labelHa: 'Gudanarwa & Data Lab',
    icon: Database,
    adminOnly: true,
  },
];

function AppContent() {
  const { language, isHausa } = useLanguage();
  const [screen, setScreen] = useState<ScreenId>('onboarding');
  const [user, setUser] = useState<PublicUser | null>(null);
  const [firebaseUid, setFirebaseUid] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [mode, setMode] = useState<WorkspaceMode>('individual');
  const [demoAccounts, setDemoAccounts] = useState<PublicUser[]>([]);
  const [demoEnabled, setDemoEnabled] = useState(true);
  const [loadingDemoId, setLoadingDemoId] = useState<string | null>(null);

  const [assessments, setAssessments] = useState<AssessmentResultRecord[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendationRecord[]>([]);
  const [individualProfile, setIndividualProfile] = useState<IndividualProfile | null>(null);
  const [smes, setSmes] = useState<SmeProfile[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    api
      .getDemoAccounts()
      .then((res) => {
        setDemoEnabled(res.enabled);
        setDemoAccounts(res.accounts);
      })
      .catch(() => {
        setDemoEnabled(false);
      });
  }, []);

  useEffect(() => {
    let unsubFirestore: (() => void) | null = null;
    const unsubAuth = onAuthStateChanged(auth, async (fbUser) => {
      if (unsubFirestore) {
        unsubFirestore();
        unsubFirestore = null;
      }
      if (!fbUser) {
        setFirebaseUid(null);
        setAuthReady(true);
        return;
      }

      try {
        setLoadingData(true);
        const idToken = await fbUser.getIdToken();
        const sessionRes = await api.firebaseSession({ idToken });
        setAuthToken(sessionRes.token);
        setUser(sessionRes.user);
        setFirebaseUid(fbUser.uid);

        const fbProfile = await ensureFirestoreUserProfile(fbUser, language, {
          activeMode: sessionRes.user.activeMode,
          currency: 'USD',
        });
        if (fbProfile) {
          setMode(fbProfile.activeMode);
        } else {
          setMode(sessionRes.user.activeMode);
        }

        setScreen((prev) =>
          prev === 'onboarding' || prev === 'auth'
            ? sessionRes.user.role === 'admin'
              ? 'admin'
              : 'dashboard'
            : prev
        );

        unsubFirestore = subscribeUserWorkspace(fbUser.uid, {
          onProfile: (prof, activeMode) => {
            setIndividualProfile(prof);
            setMode(activeMode);
          },
          onSmes: (list) => setSmes(list),
          onAssessments: (list) => setAssessments(list),
          onRecommendations: (list) => setRecommendations(list),
        });
      } catch (err) {
        setGlobalError(
          err instanceof Error
            ? err.message
            : isHausa
              ? 'An kasa haɗa asusun Firebase.'
              : 'Unable to verify Firebase session.'
        );
      } finally {
        setLoadingData(false);
        setAuthReady(true);
      }
    });

    return () => {
      if (unsubFirestore) unsubFirestore();
      unsubAuth();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadWorkspaceData = useCallback(async () => {
    setLoadingData(true);
    setGlobalError(null);
    try {
      const [profRes, assessRes, recRes] = await Promise.all([
        api.getProfiles(),
        api.listAssessments(),
        api.listRecommendations(),
      ]);
      setIndividualProfile(profRes.individual);
      setSmes(profRes.smes);
      setAssessments(assessRes.results);
      setRecommendations(recRes.recommendations);
    } catch (err) {
      setGlobalError(
        err instanceof Error
          ? err.message
          : isHausa
            ? 'An kasa loda bayanan asusun.'
            : 'Failed to load workspace data.'
      );
    } finally {
      setLoadingData(false);
    }
  }, [isHausa]);

  function handleAuthenticated(token: string, loggedUser: PublicUser) {
    setAuthToken(token);
    setUser(loggedUser);
    setMode(loggedUser.activeMode);
    setScreen(loggedUser.role === 'admin' ? 'admin' : 'dashboard');
    void loadWorkspaceData();
  }

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    setGlobalError(null);
    try {
      await signInWithGooglePopup();
    } catch (err) {
      setGlobalError(
        err instanceof Error
          ? err.message
          : isHausa
            ? 'Shiga da Google ta ci tura.'
            : 'Google Sign-In failed.'
      );
      throw err;
    } finally {
      setGoogleLoading(false);
    }
  }

  async function handleStartDemo(userId: string) {
    setLoadingDemoId(userId);
    setGlobalError(null);
    try {
      if (auth.currentUser) {
        await signOutFirebase();
      }
      const res = await api.demoLogin(userId);
      handleAuthenticated(res.token, res.user);
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : 'Unable to start demo session.');
    } finally {
      setLoadingDemoId(null);
    }
  }

  async function handleModeChange(nextMode: WorkspaceMode) {
    setMode(nextMode);
    if (firebaseUid) {
      try {
        await updateFirestoreUserProfile(firebaseUid, { activeMode: nextMode });
      } catch {
        // remain responsive locally
      }
    }
    if (user) {
      try {
        const res = await api.setMode(nextMode);
        setUser(res.user);
      } catch {
        // Mode state remains locally responsive even if offline
      }
    }
  }

  async function handleLogout() {
    if (auth.currentUser) {
      await signOutFirebase();
    }
    setAuthToken(null);
    setUser(null);
    setFirebaseUid(null);
    setAssessments([]);
    setRecommendations([]);
    setIndividualProfile(null);
    setSmes([]);
    setMobileMenuOpen(false);
    setScreen('onboarding');
  }

  function navigateTo(target: ScreenId) {
    setMobileMenuOpen(false);
    setScreen(target);
  }

  if (!authReady && !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F4F7F6] p-6">
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-4 text-sm font-medium text-slate-600">
          {isHausa ? 'Ana shirya SmartGrowth AI...' : 'Loading SmartGrowth AI...'}
        </div>
      </div>
    );
  }

  if (!user || screen === 'onboarding' || screen === 'auth') {
    if (screen === 'auth') {
      return (
        <AuthScreen
          demoAccounts={demoAccounts}
          demoEnabled={demoEnabled}
          loadingDemoId={loadingDemoId}
          googleLoading={googleLoading}
          onGoogleSignIn={handleGoogleSignIn}
          onAuthenticated={handleAuthenticated}
          onStartDemo={handleStartDemo}
          onNavigate={navigateTo}
        />
      );
    }
    return (
      <OnboardingScreen
        demoAccounts={demoAccounts}
        demoEnabled={demoEnabled}
        loadingDemoId={loadingDemoId}
        googleLoading={googleLoading}
        onGoogleSignIn={handleGoogleSignIn}
        onStartDemo={handleStartDemo}
        onNavigate={navigateTo}
      />
    );
  }

  const visibleNav = NAV_ITEMS.filter((item) => !item.adminOnly || user.role === 'admin');
  const activeItem = visibleNav.find((n) => n.id === screen);
  const activeNavLabel = activeItem
    ? isHausa
      ? activeItem.labelHa
      : activeItem.labelEn
    : isHausa
      ? 'Taƙaitaccen Bayani'
      : 'Overview';

  return (
    <div className="min-h-screen bg-[#F4F7F6] text-slate-900">
      <div className="flex min-h-screen">
        {/* Desktop Sidebar */}
        <aside className="no-print hidden lg:flex lg:w-64 lg:shrink-0 lg:flex-col border-r border-slate-200 bg-white">
          <div className="flex items-center border-b border-slate-200 px-5 py-3.5">
            <BrandMark size={34} />
          </div>

          <nav aria-label="Primary Sidebar" className="flex-1 space-y-1 p-3">
            {visibleNav.map((item) => {
              const Icon = item.icon;
              const isActive = screen === item.id;
              const label = isHausa ? item.labelHa : item.labelEn;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigateTo(item.id)}
                  className={`flex min-h-[44px] w-full items-center justify-between gap-2 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-[#043927] text-white'
                      : item.comingSoon
                        ? 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">{label}</span>
                  </span>
                  {item.comingSoon && (
                    <span
                      className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                        isActive
                          ? 'bg-emerald-800 text-emerald-100'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {isHausa ? 'Nan Gaba' : 'Soon'}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="border-t border-slate-200 p-4 space-y-3">
            <div className="text-xs">
              <p className="font-semibold text-slate-900 truncate">{user.fullName}</p>
              <p className="font-mono text-slate-500 truncate">
                {user.role.toUpperCase()} · {user.email}
              </p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="flex min-h-[40px] w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{isHausa ? 'Fita' : 'Sign Out'}</span>
            </button>
          </div>
        </aside>

        {/* Main Workspace Area */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Top Bar */}
          <header className="no-print sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur-md sm:px-6">
            <div className="flex items-center gap-3 min-w-0">
              <div className="lg:hidden flex items-center shrink-0">
                <BrandMark size={28} />
              </div>
              <span className="text-sm font-semibold text-slate-900 truncate">
                {activeNavLabel}
              </span>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <LanguageSwitcher compact />
              <button
                type="button"
                onClick={() => navigateTo('assessment')}
                className="hidden sm:inline-flex min-h-[38px] items-center rounded-lg bg-[#043927] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-900 whitespace-nowrap shrink-0"
              >
                {isHausa ? 'Sabon Gwaji' : 'New Health Assessment'}
              </button>
              <button
                type="button"
                aria-label={isHausa ? 'Buɗe jerin shafuka' : 'Open navigation menu'}
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-slate-700"
              >
                <Menu className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </header>

          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 pb-24 sm:px-6 lg:pb-10">
            {globalError && (
              <div
                role="alert"
                className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
              >
                {globalError}
              </div>
            )}

            {screen === 'dashboard' && (
              <DashboardScreen
                user={user}
                firebaseUid={firebaseUid}
                mode={mode}
                assessments={assessments}
                individualProfile={individualProfile}
                smes={smes}
                loading={loadingData}
                onIndividualProfileUpdated={setIndividualProfile}
                onSmeProfileSaved={(saved) =>
                  setSmes((prev) => {
                    const idx = prev.findIndex((s) => s.id === saved.id);
                    if (idx >= 0) {
                      const next = [...prev];
                      next[idx] = saved;
                      return next;
                    }
                    return [saved, ...prev];
                  })
                }
                onModeChange={handleModeChange}
                onNavigate={navigateTo}
                onOpenFeedback={() => setFeedbackOpen(true)}
              />
            )}
            {screen === 'assessment' && (
              <AssessmentScreen
                user={user}
                firebaseUid={firebaseUid}
                mode={mode}
                individualCurrency={individualProfile?.currency ?? 'USD'}
                smes={smes}
                onModeChange={handleModeChange}
                onAssessmentSaved={(res) => setAssessments((prev) => [res, ...prev])}
                onNavigate={navigateTo}
              />
            )}
            {screen === 'readiness' && (
              <ReadinessScreen user={user} onNavigate={navigateTo} />
            )}
            {screen === 'recommendations' && (
              <RecommendationsScreen
                user={user}
                firebaseUid={firebaseUid}
                activeCurrency={
                  mode === 'sme'
                    ? smes[0]?.currency ?? individualProfile?.currency ?? 'USD'
                    : individualProfile?.currency ?? 'USD'
                }
                mode={mode}
                assessments={assessments}
                recommendations={recommendations}
                onRecommendationCreated={(rec) =>
                  setRecommendations((prev) => [rec, ...prev])
                }
                onModeChange={handleModeChange}
                onNavigate={navigateTo}
              />
            )}
            {screen === 'sme' && (
              <SmeWorkspaceScreen user={user} onNavigate={navigateTo} />
            )}
            {screen === 'ethical' && (
              <EthicalFinanceScreen user={user} onNavigate={navigateTo} />
            )}
            {screen === 'learning' && (
              <LearningCentreScreen user={user} onNavigate={navigateTo} />
            )}
            {screen === 'reports' && (
              <ReportsScreen user={user} onNavigate={navigateTo} />
            )}
            {screen === 'admin' && <AdminDataLabScreen user={user} />}
          </main>
        </div>
      </div>

      <PilotFeedbackModal
        open={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        firebaseUid={firebaseUid}
        activeMode={mode}
      />

      {/* Mobile Bottom Navigation Bar (Compact <= 64px) */}
      <nav
        aria-label="Mobile Bottom Navigation"
        className="no-print fixed bottom-0 left-0 right-0 z-40 grid h-16 grid-cols-4 border-t border-slate-200 bg-white/95 backdrop-blur-md lg:hidden"
      >
        {(
          [
            ['dashboard', isHausa ? 'Babba' : 'Overview', Home],
            ['assessment', isHausa ? 'Gwaji' : 'Health Score', ClipboardCheck],
            ['recommendations', isHausa ? 'Shawarar AI' : 'Growth Coach', Sparkles],
          ] as const
        ).map(([id, label, Icon]) => {
          const active = screen === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => navigateTo(id)}
              className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
                active ? 'text-emerald-700' : 'text-slate-600'
              }`}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              <span className="truncate max-w-full px-1">{label}</span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className="flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-slate-600"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
          <span>{isHausa ? 'Sauran' : 'Roadmap'}</span>
        </button>
      </nav>

      {/* Mobile Drawer for Active & Coming Soon Platform Screens */}
      {mobileMenuOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="All Platform Screens"
          className="fixed inset-0 z-50 flex justify-end bg-black/50 lg:hidden"
        >
          <div className="flex h-full w-80 max-w-full flex-col bg-white p-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center">
                <BrandMark size={30} />
              </div>
              <button
                type="button"
                aria-label={isHausa ? 'Rufe menu' : 'Close menu'}
                onClick={() => setMobileMenuOpen(false)}
                className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-3 flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-medium text-slate-600">
                {isHausa ? 'Harshe / Language' : 'Language / Harshe'}
              </span>
              <LanguageSwitcher compact />
            </div>

            <div className="mt-4 flex-1 space-y-1 overflow-y-auto">
              {visibleNav.map((item) => {
                const Icon = item.icon;
                const active = screen === item.id;
                const label = isHausa ? item.labelHa : item.labelEn;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => navigateTo(item.id)}
                    className={`flex min-h-[44px] w-full items-center justify-between gap-2 rounded-xl px-3.5 text-sm font-medium ${
                      active
                        ? 'bg-[#043927] text-white'
                        : item.comingSoon
                          ? 'text-slate-500 hover:bg-slate-50'
                          : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                      <span>{label}</span>
                    </span>
                    {item.comingSoon && (
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                          active ? 'bg-emerald-800 text-emerald-100' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {isHausa ? 'Nan Gaba' : 'Soon'}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="border-t border-slate-100 pt-4 space-y-3">
              <div className="text-xs text-slate-600">
                <p className="font-semibold text-slate-900">{user.fullName}</p>
                <p className="font-mono">{user.email}</p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                <span>{isHausa ? 'Fita' : 'Sign Out'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}
