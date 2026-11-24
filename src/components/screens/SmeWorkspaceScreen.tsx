import React, { useState } from 'react';
import { Building2, Plus, UserPlus } from 'lucide-react';
import {
  SUPPORTED_CURRENCIES,
  type AssessmentResultRecord,
  type BusinessMembership,
  type PublicUser,
  type ScreenId,
  type SmeProfile,
} from '../../shared/types';
import { api } from '../../lib/api';
import { SyntheticBanner } from '../BrandMark';
import { FormulaFactorBars, SmeCashflowComparisonChart } from '../Charts';

interface SmeWorkspaceScreenProps {
  user: PublicUser;
  smes: SmeProfile[];
  memberships: BusinessMembership[];
  assessments: AssessmentResultRecord[];
  onProfilesUpdated: () => Promise<void>;
  onNavigate: (screen: ScreenId) => void;
}

export function SmeWorkspaceScreen({
  user,
  smes,
  memberships,
  assessments,
  onProfilesUpdated,
  onNavigate,
}: SmeWorkspaceScreenProps) {
  const activeSme = smes[0] ?? null;
  const latestSmeAssessment = assessments.find((a) => a.audience === 'sme') ?? null;

  const [bizName, setBizName] = useState(activeSme?.businessName ?? '');
  const [sector, setSector] = useState(activeSme?.sector ?? 'Agribusiness & Retail');
  const [regStatus, setRegStatus] = useState<SmeProfile['registrationStatus']>(
    activeSme?.registrationStatus ?? 'in_progress'
  );
  const [staffCount, setStaffCount] = useState(String(activeSme?.staffCount ?? 1));
  const [currency, setCurrency] = useState(activeSme?.currency ?? 'USD');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'finance_manager' | 'analyst'>('finance_manager');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (activeSme) {
      setBizName(activeSme.businessName);
      setSector(activeSme.sector);
      setRegStatus(activeSme.registrationStatus);
      setStaffCount(String(activeSme.staffCount));
      setCurrency(activeSme.currency);
    }
  }, [activeSme]);

  async function handleSaveSme(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setStatusMessage(null);
    setSaving(true);
    try {
      if (activeSme) {
        await api.updateSmeProfile(activeSme.id, {
          businessName: bizName,
          sector,
          registrationStatus: regStatus,
          staffCount: Number(staffCount) || 1,
          currency,
        });
        setStatusMessage('SME business profile updated.');
      } else {
        await api.createSmeProfile({
          businessName: bizName,
          sector,
          registrationStatus: regStatus,
          staffCount: Number(staffCount) || 1,
          currency,
        });
        setStatusMessage('SME business profile created.');
      }
      await onProfilesUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save SME profile.');
    } finally {
      setSaving(false);
    }
  }

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    if (!activeSme) return;
    setError(null);
    setStatusMessage(null);
    try {
      await api.addSmeMember(activeSme.id, { email: inviteEmail, memberRole: inviteRole });
      setInviteEmail('');
      setStatusMessage('Business team member added.');
      await onProfilesUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add member.');
    }
  }

  return (
    <div className="space-y-6">
      <SyntheticBanner visible={user.isSyntheticDemo} />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-slate-500">
            SME Cashflow &amp; Business Membership
          </p>
          <h1 className="mt-0.5 font-display text-2xl font-bold text-slate-900">
            SME / Business Workspace
          </h1>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('assessment')}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#043927] px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-900"
        >
          <Building2 className="h-4 w-4" aria-hidden="true" />
          <span>Run SME Assessment</span>
        </button>
      </div>

      {statusMessage && (
        <div
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
        >
          {statusMessage}
        </div>
      )}
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7 space-y-6">
          {latestSmeAssessment ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-6">
              <div>
                <p className="text-xs font-medium text-emerald-700">
                  Latest SME Engine ({latestSmeAssessment.calculationVersion})
                </p>
                <h2 className="mt-1 font-display text-lg font-bold text-slate-900">
                  Cashflow &amp; Operating Position
                </h2>
              </div>
              <SmeCashflowComparisonChart
                revenue={Number(latestSmeAssessment.output.metrics.monthlyRevenue ?? 0)}
                opex={Number(latestSmeAssessment.output.metrics.monthlyOperatingExpenses ?? 0)}
                debtService={Number(latestSmeAssessment.output.metrics.monthlyDebtService ?? 0)}
                cashOnHand={Number(latestSmeAssessment.output.metrics.cashOnHand ?? 0)}
                currency={activeSme?.currency ?? 'NGN'}
              />
              <div className="border-t border-slate-100 pt-4">
                <FormulaFactorBars formulas={latestSmeAssessment.output.formulas} />
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
              <h2 className="font-display text-lg font-bold text-slate-900">
                No SME Financial Assessment Yet
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Create or confirm your business profile, then run the SME Cashflow Assessment to
                compute operating cash movement, expense ratio, debt burden, and cash runway.
              </p>
              <button
                type="button"
                onClick={() => onNavigate('assessment')}
                className="mt-4 min-h-[44px] rounded-xl bg-[#043927] px-5 py-2 text-sm font-semibold text-white"
              >
                Start SME Assessment
              </button>
            </div>
          )}

          {activeSme && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="font-display text-base font-bold text-slate-900">
                Business Membership ({memberships.length})
              </h2>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[420px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs text-slate-500">
                      <th className="py-2 pr-4">Member</th>
                      <th className="py-2 pr-4">Email</th>
                      <th className="py-2 pr-4">Role</th>
                      <th className="py-2 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {memberships.map((m) => (
                      <tr key={m.id} className="border-b border-slate-100 last:border-b-0">
                        <td className="py-2.5 pr-4 font-medium text-slate-900">{m.memberName}</td>
                        <td className="py-2.5 pr-4 font-mono text-xs text-slate-600">
                          {m.memberEmail}
                        </td>
                        <td className="py-2.5 pr-4 text-xs capitalize text-slate-700">
                          {m.memberRole.replace('_', ' ')}
                        </td>
                        <td className="py-2.5 text-right text-xs font-medium text-emerald-700">
                          {m.status}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {activeSme.ownerUserId === user.id && (
                <form onSubmit={handleAddMember} className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                  <label htmlFor="invite-email" className="sr-only">
                    Registered Member Email
                  </label>
                  <input
                    id="invite-email"
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="Existing user email to add"
                    className="min-h-[44px] flex-1 rounded-xl border border-slate-300 px-3 text-sm"
                  />
                  <select
                    aria-label="Member role"
                    value={inviteRole}
                    onChange={(e) =>
                      setInviteRole(e.target.value as 'finance_manager' | 'analyst')
                    }
                    className="min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 text-sm"
                  >
                    <option value="finance_manager">Finance Manager</option>
                    <option value="analyst">Analyst</option>
                  </select>
                  <button
                    type="submit"
                    className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800"
                  >
                    <UserPlus className="h-4 w-4" aria-hidden="true" />
                    <span>Add Member</span>
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

        <div className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="font-display text-lg font-bold text-slate-900">
            {activeSme ? 'Business Profile Details' : 'Create SME Business Profile'}
          </h2>
          <form onSubmit={handleSaveSme} className="mt-5 space-y-4">
            <div>
              <label htmlFor="sme-name" className="block text-sm font-medium text-slate-700">
                Business Name
              </label>
              <input
                id="sme-name"
                type="text"
                required
                value={bizName}
                onChange={(e) => setBizName(e.target.value)}
                placeholder="e.g., Musa Agro Ventures"
                className="mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-300 px-3.5 text-sm"
              />
            </div>

            <div>
              <label htmlFor="sme-sector" className="block text-sm font-medium text-slate-700">
                Industry Sector
              </label>
              <input
                id="sme-sector"
                type="text"
                required
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                className="mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-300 px-3.5 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="sme-reg" className="block text-sm font-medium text-slate-700">
                  Registration
                </label>
                <select
                  id="sme-reg"
                  value={regStatus}
                  onChange={(e) =>
                    setRegStatus(e.target.value as SmeProfile['registrationStatus'])
                  }
                  className="mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3 text-sm"
                >
                  <option value="registered">Registered</option>
                  <option value="in_progress">In Progress</option>
                  <option value="informal">Informal</option>
                </select>
              </div>
              <div>
                <label htmlFor="sme-staff" className="block text-sm font-medium text-slate-700">
                  Staff Count
                </label>
                <input
                  id="sme-staff"
                  type="number"
                  min={1}
                  value={staffCount}
                  onChange={(e) => setStaffCount(e.target.value)}
                  className="mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-300 px-3.5 font-mono text-sm tabular-nums"
                />
              </div>
            </div>

            <div>
              <label htmlFor="sme-currency" className="block text-sm font-medium text-slate-700">
                Reporting Currency
              </label>
              <select
                id="sme-currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3 text-sm"
              >
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[#043927] px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900 disabled:opacity-60"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span>{saving ? 'Saving...' : activeSme ? 'Save Business Profile' : 'Create SME Profile'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
