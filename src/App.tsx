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
  BusinessMembership,
  LearningContentItem,
  PublicUser,
  RecommendationRecord,
  ReportRecord,
  ScreenId,
  SmeProfile,
  WorkspaceMode,
} from './shared/types';
import { api, setAuthToken } from './lib/api';
import { BrandMark } from './components/BrandMark';
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
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
}> = [
  { id: 'dashboard', label: 'Dashboard', icon: Home },
  { id: 'assessment', label: 'Assessment', icon: ClipboardCheck },
  { id: 'readiness', label: 'Credit Readiness', icon: BarChart3 },
  { id: 'recommendations', label: 'AI Coach', icon: Sparkles },
  { id: 'sme', label: 'SME / Business', icon: Building2 },
  { id: 'ethical', label: 'Ethical Finance', icon: Handshake },
  { id: 'learning', label: 'Learning Centre', icon: BookOpen },
  { id: 'reports', label: 'Reports', icon: FileText },
  { id: 'admin', label: 'Admin & Data Lab', icon: Database, adminOnly: true },
];

export default function App() {
  const [screen, setScreen] = useState<ScreenId>('onboarding');
  const [user, setUser] = useState<PublicUser | null>(null);
  const [mode, setMode] = useState<WorkspaceMode>('individual');
  const [demoAccounts, setDemoAccounts] = useState<PublicUser[]>([]);
  const [demoEnabled, setDemoEnabled] = useState(true);
  const [loadingDemoId, setLoadingDemoId] = useState<string | null>(null);

  const [assessments, setAssessments] = useState<AssessmentResultRecord[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendationRecord[]>([]);
  const [learningItems, setLearningItems] = useState<LearningContentItem[]>([]);
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [smes, setSmes] = useState<SmeProfile[]>([]);
  const [memberships, setMemberships] = useState<BusinessMembership[]>([]);
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

  const loadWorkspaceData = useCallback(async () => {
    setLoadingData(true);
    setGlobalError(null);
    try {
      const [profRes, assessRes, recRes, learnRes, repRes] = await Promise.all([
        api.getProfiles(),
        api.listAssessments(),
        api.listRecommendations(),
        api.listLearning(),
        api.listReports(),
      ]);
      setSmes(profRes.smes);
      setMemberships(profRes.memberships);
      setAssessments(assessRes.results);
      setRecommendations(recRes.recommendations);
      setLearningItems(learnRes.items);
      setReports(repRes.reports);
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : 'Failed to load workspace data.');
    } finally {
      setLoadingData(false);
    }
  }, []);

  function handleAuthenticated(token: string, loggedUser: PublicUser) {
    setAuthToken(token);
    setUser(loggedUser);
    setMode(loggedUser.activeMode);
    setScreen(loggedUser.role === 'admin' ? 'admin' : 'dashboard');
    void loadWorkspaceData();
  }

  async function handleStartDemo(userId: string) {
    setLoadingDemoId(userId);
    setGlobalError(null);
    try {
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
    if (user) {
      try {
        const res = await api.setMode(nextMode);
        setUser(res.user);
      } catch {
        // Mode state remains locally responsive even if offline
      }
    }
  }

  function handleLogout() {
    setAuthToken(null);
    setUser(null);
    setAssessments([]);
    setRecommendations([]);
    setReports([]);
    setSmes([]);
    setMemberships([]);
    setMobileMenuOpen(false);
    setScreen('onboarding');
  }

  function navigateTo(target: ScreenId) {
    setMobileMenuOpen(false);
    setScreen(target);
  }

  if (!user || screen === 'onboarding' || screen === 'auth') {
    if (screen === 'auth') {
      return (
        <AuthScreen
          demoAccounts={demoAccounts}
          demoEnabled={demoEnabled}
          loadingDemoId={loadingDemoId}
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
        onStartDemo={handleStartDemo}
        onNavigate={navigateTo}
      />
    );
  }

  const visibleNav = NAV_ITEMS.filter((item) => !item.adminOnly || user.role === 'admin');
  const activeNavLabel = visibleNav.find((n) => n.id === screen)?.label ?? 'Dashboard';

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
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigateTo(item.id)}
                  className={`flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-[#043927] text-white'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="truncate">{item.label}</span>
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
              <span>Sign Out</span>
            </button>
          </div>
        </aside>

        {/* Main Workspace Area */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Top Bar */}
          <header className="no-print sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b border-slate-200 bg-white/95 px-4 backdrop-blur-md sm:px-6">
            <div className="flex items-center gap-3 min-w-0">
              <div className="lg:hidden flex items-center shrink-0">
                <BrandMark size={28} />
              </div>
              <span className="text-sm font-semibold text-slate-900 truncate">
                {activeNavLabel}
              </span>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => navigateTo('assessment')}
                className="hidden sm:inline-flex min-h-[38px] items-center rounded-lg bg-[#043927] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-900 whitespace-nowrap shrink-0"
              >
                New Assessment
              </button>
              <button
                type="button"
                aria-label="Open navigation menu"
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
                mode={mode}
                assessments={assessments}
                smes={smes}
                loading={loadingData}
                onModeChange={handleModeChange}
                onNavigate={navigateTo}
              />
            )}
            {screen === 'assessment' && (
              <AssessmentScreen
                user={user}
                mode={mode}
                smes={smes}
                onModeChange={handleModeChange}
                onAssessmentSaved={(res) => setAssessments((prev) => [res, ...prev])}
                onNavigate={navigateTo}
              />
            )}
            {screen === 'readiness' && (
              <ReadinessScreen
                user={user}
                mode={mode}
                assessments={assessments}
                onNavigate={navigateTo}
              />
            )}
            {screen === 'recommendations' && (
              <RecommendationsScreen
                user={user}
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
              <SmeWorkspaceScreen
                user={user}
                smes={smes}
                memberships={memberships}
                assessments={assessments}
                onProfilesUpdated={loadWorkspaceData}
                onNavigate={navigateTo}
              />
            )}
            {screen === 'ethical' && (
              <EthicalFinanceScreen user={user} mode={mode} onNavigate={navigateTo} />
            )}
            {screen === 'learning' && (
              <LearningCentreScreen
                user={user}
                items={learningItems}
                onUpdated={(updated) =>
                  setLearningItems((prev) =>
                    prev.map((it) => (it.id === updated.id ? updated : it))
                  )
                }
              />
            )}
            {screen === 'reports' && (
              <ReportsScreen
                user={user}
                mode={mode}
                assessments={assessments}
                reports={reports}
                onReportCreated={(rep) => setReports((prev) => [rep, ...prev])}
              />
            )}
            {screen === 'admin' && <AdminDataLabScreen user={user} />}
          </main>
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar (Compact <= 64px) */}
      <nav
        aria-label="Mobile Bottom Navigation"
        className="no-print fixed bottom-0 left-0 right-0 z-40 grid h-16 grid-cols-5 border-t border-slate-200 bg-white/95 backdrop-blur-md lg:hidden"
      >
        {(
          [
            ['dashboard', 'Home', Home],
            ['assessment', 'Assess', ClipboardCheck],
            ['recommendations', 'AI', Sparkles],
            ['learning', 'Learn', BookOpen],
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
              <span>{label}</span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className="flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-slate-600"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
          <span>More</span>
        </button>
      </nav>

      {/* Mobile Drawer for All 10+ Screens */}
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
                aria-label="Close menu"
                onClick={() => setMobileMenuOpen(false)}
                className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-4 flex-1 space-y-1 overflow-y-auto">
              {visibleNav.map((item) => {
                const Icon = item.icon;
                const active = screen === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => navigateTo(item.id)}
                    className={`flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3.5 text-sm font-medium ${
                      active ? 'bg-[#043927] text-white' : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    <span>{item.label}</span>
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
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
