import React, { useState } from 'react';
import { Download, FileText, Printer } from 'lucide-react';
import type {
  AssessmentResultRecord,
  PublicUser,
  ReportRecord,
  WorkspaceMode,
} from '../../shared/types';
import { api, triggerDownload } from '../../lib/api';
import { BandIndicator, SyntheticBanner } from '../BrandMark';

interface ReportsScreenProps {
  user: PublicUser;
  mode: WorkspaceMode;
  assessments: AssessmentResultRecord[];
  reports: ReportRecord[];
  onReportCreated: (report: ReportRecord) => void;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function ReportsScreen({
  user,
  mode,
  assessments,
  reports,
  onReportCreated,
}: ReportsScreenProps) {
  const [reportType, setReportType] = useState<'financial_health' | 'credit_readiness'>(
    'financial_health'
  );
  const [selectedReport, setSelectedReport] = useState<ReportRecord | null>(reports[0] ?? null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (!selectedReport && reports.length > 0) {
      setSelectedReport(reports[0]);
    }
  }, [reports, selectedReport]);

  const latestAssessment = assessments.find((a) => a.audience === mode) ?? assessments[0] ?? null;

  async function handleGenerateReport() {
    if (!latestAssessment) return;
    setError(null);
    setCreating(true);
    try {
      const res = await api.createReport({
        assessmentResultId: latestAssessment.id,
        reportType,
      });
      onReportCreated(res.report);
      setSelectedReport(res.report);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create report.');
    } finally {
      setCreating(false);
    }
  }

  function downloadJson(report: ReportRecord) {
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    triggerDownload(blob, `${report.id}.json`);
  }

  function downloadHtml(report: ReportRecord) {
    const rows = report.snapshot.formulas
      .map(
        (f) =>
          `<tr><td>${escapeHtml(f.label)}</td><td><code>${escapeHtml(f.formula)}</code></td><td><strong>${escapeHtml(f.formattedValue)}</strong></td><td>${escapeHtml(f.band)}</td></tr>`
      )
      .join('');
    const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(
      report.title
    )}</title><style>body{font-family:system-ui,sans-serif;max-width:820px;margin:40px auto;color:#0f172a;padding:0 20px}h1{color:#043927}table{width:100%;border-collapse:collapse;margin:24px 0}th,td{border:1px solid #cbd5e1;padding:10px;text-align:left;font-size:14px}th{background:#f1f5f9}.note{background:#fffbeb;border:1px solid #fde68a;padding:12px;border-radius:8px;font-size:13px}</style></head><body><h1>${escapeHtml(
      report.title
    )}</h1><p>Owner: ${escapeHtml(report.snapshot.ownerName)} | Audience: ${escapeHtml(
      report.snapshot.audience.toUpperCase()
    )} | Tier: ${escapeHtml(report.snapshot.readinessTier)} | Version: ${escapeHtml(
      report.snapshot.calculationVersion
    )}</p><p>Generated: ${escapeHtml(report.snapshot.generatedAt)}</p><table><thead><tr><th>Indicator</th><th>Formula</th><th>Result</th><th>Band</th></tr></thead><tbody>${rows}</tbody></table><div class="note">${escapeHtml(
      report.snapshot.disclaimer
    )}</div></body></html>`;
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    triggerDownload(blob, `${report.id}.html`);
  }

  return (
    <div className="space-y-6">
      <SyntheticBanner visible={user.isSyntheticDemo} />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-slate-500">
            Auditable Financial Snapshots &amp; Exports
          </p>
          <h1 className="mt-0.5 font-display text-2xl font-bold text-slate-900">Reports</h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1">
            <button
              type="button"
              onClick={() => setReportType('financial_health')}
              className={`min-h-[38px] rounded-lg px-3 py-1.5 text-xs font-semibold ${
                reportType === 'financial_health' ? 'bg-[#043927] text-white' : 'text-slate-600'
              }`}
            >
              Financial Health
            </button>
            <button
              type="button"
              onClick={() => setReportType('credit_readiness')}
              className={`min-h-[38px] rounded-lg px-3 py-1.5 text-xs font-semibold ${
                reportType === 'credit_readiness' ? 'bg-[#043927] text-white' : 'text-slate-600'
              }`}
            >
              Credit Readiness
            </button>
          </div>
          <button
            type="button"
            disabled={!latestAssessment || creating}
            onClick={handleGenerateReport}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#043927] px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-900 disabled:opacity-50"
          >
            <FileText className="h-4 w-4" aria-hidden="true" />
            <span>{creating ? 'Generating...' : 'Generate Snapshot'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="font-display text-base font-bold text-slate-900">
            Saved Reports ({reports.length})
          </h2>
          {reports.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">
              No saved reports yet. Click &ldquo;Generate Snapshot&rdquo; to archive your latest
              calculated ratios.
            </p>
          ) : (
            <div className="mt-4 space-y-2.5">
              {reports.map((rep) => (
                <button
                  key={rep.id}
                  type="button"
                  onClick={() => setSelectedReport(rep)}
                  className={`block w-full rounded-xl border p-4 text-left transition-colors ${
                    selectedReport?.id === rep.id
                      ? 'border-emerald-600 bg-emerald-50/60'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <p className="text-xs font-medium text-emerald-700">
                    {rep.reportType === 'credit_readiness'
                      ? 'Credit Readiness Indicators'
                      : 'Financial Health Report'}
                    {' · '}
                    {rep.snapshot.audience.toUpperCase()}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{rep.title}</p>
                  <p className="mt-1 font-mono text-xs text-slate-500">
                    {new Date(rep.createdAt).toLocaleString('en-US')}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-7">
          {!selectedReport ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
              Select a report on the left or generate a new snapshot to preview and download.
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <p className="font-mono text-xs text-slate-500">
                    {selectedReport.snapshot.calculationVersion} · Tier:{' '}
                    {selectedReport.snapshot.readinessTier}
                  </p>
                  <h2 className="mt-1 font-display text-xl font-bold text-slate-900">
                    {selectedReport.title}
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-600">
                    Account: {selectedReport.snapshot.ownerName}
                  </p>
                </div>

                <div className="no-print flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                  >
                    <Printer className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Print / PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadHtml(selectedReport)}
                    className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-[#043927] px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-900"
                  >
                    <Download className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>HTML Report</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadJson(selectedReport)}
                    className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                  >
                    <Download className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>JSON</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[500px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs text-slate-500">
                      <th className="py-2 pr-3">Indicator</th>
                      <th className="py-2 pr-3">Formula</th>
                      <th className="py-2 pr-3 text-right">Value</th>
                      <th className="py-2 text-right">Band</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedReport.snapshot.formulas.map((f) => (
                      <tr key={f.key} className="border-b border-slate-100 last:border-b-0">
                        <td className="py-2.5 pr-3 font-medium text-slate-900">{f.label}</td>
                        <td className="py-2.5 pr-3 font-mono text-xs text-slate-500">{f.formula}</td>
                        <td className="py-2.5 pr-3 text-right font-mono text-xs font-semibold tabular-nums text-slate-900">
                          {f.formattedValue}
                        </td>
                        <td className="py-2.5 text-right">
                          <BandIndicator band={f.band} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {selectedReport.snapshot.latestRecommendationSummary && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold text-slate-700">Included Guidance Summary</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">
                    {selectedReport.snapshot.latestRecommendationSummary}
                  </p>
                </div>
              )}

              <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-950">
                {selectedReport.snapshot.disclaimer}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
