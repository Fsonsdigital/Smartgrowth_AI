import React, { useState } from 'react';
import { AlertCircle, BookOpen, Send, ShieldCheck, Sparkles } from 'lucide-react';
import type {
  AssessmentResultRecord,
  PublicUser,
  RecommendationRecord,
  ScreenId,
  WorkspaceMode,
} from '../../shared/types';
import { api } from '../../lib/api';
import { saveRecommendationToFirestore } from '../../lib/firebase';
import { useLanguage } from '../../lib/i18n';
import { SyntheticBanner } from '../BrandMark';

interface RecommendationsScreenProps {
  user: PublicUser;
  firebaseUid: string | null;
  activeCurrency: string;
  mode: WorkspaceMode;
  assessments: AssessmentResultRecord[];
  recommendations: RecommendationRecord[];
  onRecommendationCreated: (rec: RecommendationRecord) => void;
  onModeChange: (mode: WorkspaceMode) => void;
  onNavigate: (screen: ScreenId) => void;
}

export function RecommendationsScreen({
  user,
  firebaseUid,
  activeCurrency,
  mode,
  assessments,
  recommendations,
  onRecommendationCreated,
  onModeChange,
  onNavigate,
}: RecommendationsScreenProps) {
  const { language, isHausa } = useLanguage();
  const latestAssessment = assessments.find((a) => a.audience === mode) ?? null;
  const filteredRecs = recommendations.filter((r) => r.audience === mode);
  const activeRec = filteredRecs[0] ?? null;

  const [question, setQuestion] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAsk(customQuestion?: string) {
    if (!latestAssessment) return;
    setError(null);
    setGenerating(true);
    try {
      const q = (customQuestion ?? question).trim();
      const res = await api.generateRecommendation({
        assessmentResultId: latestAssessment.id,
        question: q || undefined,
        language,
        assessmentFallback: {
          audience: latestAssessment.audience,
          answers: latestAssessment.answers,
          currency: activeCurrency,
        },
      });
      if (firebaseUid) {
        await saveRecommendationToFirestore(firebaseUid, res.recommendation, language);
      }
      onRecommendationCreated(res.recommendation);
      if (!customQuestion) setQuestion('');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : isHausa
            ? 'An kasa samar da shawarar AI.'
            : 'Failed to generate AI guidance.'
      );
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-6">
      <SyntheticBanner visible={user.isSyntheticDemo} />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-slate-500">
            {isHausa
              ? 'Mai Ba da Shawara na Gemini · Dogara da Ilimin da Aka Amince da Shi'
              : 'Server-Side Gemini Coach · Grounded in Approved Knowledge'}
          </p>
          <h1 className="mt-0.5 font-display text-2xl font-bold text-slate-900">
            {isHausa ? 'Mai Ba da Shawara na AI (Business Growth Coach)' : 'AI Business Growth Coach'}
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
            {isHausa ? 'Lafiyar Kuɗin Kai' : 'Personal Health'}
          </button>
          <button
            type="button"
            onClick={() => onModeChange('sme')}
            className={`min-h-[40px] rounded-lg px-3.5 py-1.5 text-xs font-semibold ${
              mode === 'sme' ? 'bg-[#043927] text-white' : 'text-slate-600'
            }`}
          >
            {isHausa ? 'Haɓaka Kasuwanci / SME' : 'Business / SME Growth'}
          </button>
        </div>
      </div>

      {!latestAssessment ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <p className="text-sm text-slate-600">
            {isHausa
              ? `Kammala Gwajin Lafiyar Kuɗi na ${mode === 'sme' ? 'Kasuwanci (SME)' : 'Mutum Ɗaya'} don Mai Ba da Shawara na AI ya bayyana ma’aunin ku.`
              : `Complete a ${mode === 'sme' ? 'SME' : 'Individual'} assessment so the AI assistant can explain your calculated financial ratios.`}
          </p>
          <button
            type="button"
            onClick={() => onNavigate('assessment')}
            className="mt-4 min-h-[44px] rounded-xl bg-[#043927] px-5 py-2 text-sm font-semibold text-white"
          >
            {isHausa ? 'Fara Gwaji' : 'Run Assessment'}
          </button>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-5 space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-700" aria-hidden="true" />
                <h2 className="font-display text-base font-bold text-slate-900">
                  {isHausa
                    ? 'Tattaunawa Bisa Sakamakon Gwajin Ku'
                    : 'Coach Session · Based on Your Latest Assessment'}
                </h2>
              </div>
              <p className="mt-1 text-xs text-slate-600">
                {isHausa
                  ? `Dogara da bayanan ilimin da aka amince da su don ${mode.toUpperCase()}. Ba ya ƙirƙirar amincewar bashi, bankuna, ko takardar shaidar Shari’a.`
                  : `Grounded in approved knowledge-base records for ${mode.toUpperCase()} growth coaching. Never invents loan approvals, external lenders, or Shariah certificates.`}
              </p>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleAsk();
                }}
                className="mt-4 space-y-3"
              >
                <label htmlFor="ai-question" className="sr-only">
                  {isHausa
                    ? 'Yi wa Mai Ba da Shawara na AI tambaya'
                    : 'Ask your AI Business Growth Coach'}
                </label>
                <textarea
                  id="ai-question"
                  rows={3}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder={
                    isHausa
                      ? mode === 'sme'
                        ? 'misali, Ta yaya zan inganta motsin kuɗin aiki da juriyar tsabar kuɗin kasuwancina?'
                        : 'misali, Yaya ya kamata in daidaita tsakanin tanadi da biyan bashi kowane wata?'
                      : mode === 'sme'
                        ? 'e.g., How can I improve operating cash movement, margins, and cash runway?'
                        : 'e.g., How should I prioritize savings buffer vs monthly debt repayments?'
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
                />
                <button
                  type="submit"
                  disabled={generating}
                  className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[#043927] px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900 disabled:opacity-60"
                >
                  <Send className="h-4 w-4" aria-hidden="true" />
                  <span>
                    {generating
                      ? isHausa
                        ? 'Ana Shirya Shawarar AI...'
                        : 'Generating Growth Coaching...'
                      : isHausa
                        ? 'Samo Shawarar AI'
                        : 'Get AI Growth Coaching'}
                  </span>
                </button>
              </form>

              <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
                <p className="text-xs font-medium text-slate-500">
                  {isHausa ? 'Misalan Tambayoyi' : 'Suggested Coaching Prompts'}
                </p>
                <button
                  type="button"
                  disabled={generating}
                  onClick={() =>
                    handleAsk(
                      isHausa
                        ? mode === 'sme'
                          ? 'Yi bayanin motsin kuɗin kasuwancina kuma ka ba da matakan haɓaka kasuwanci.'
                          : 'Yi bayanin kowane ma’aunin kuɗina da mataki na gaba mai yiwuwa.'
                        : mode === 'sme'
                          ? 'Diagnose my operating cash movement and suggest practical cashflow growth steps.'
                          : 'Explain each of my calculated ratios and one realistic next growth step.'
                    )
                  }
                  className="block min-h-[40px] w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-100"
                >
                  {isHausa
                    ? mode === 'sme'
                      ? 'Nazarin motsin kuɗi & matakan haɓaka kasuwanci'
                      : 'Yi bayanin kowane ma’aunin kuɗina'
                    : mode === 'sme'
                      ? 'Diagnose cashflow & practical growth steps'
                      : 'Explain each of my calculated ratios'}
                </button>
                <button
                  type="button"
                  disabled={generating}
                  onClick={() =>
                    handleAsk(
                      isHausa
                        ? 'Ka amince da bashin kasuwanci na $50,000 a yau'
                        : 'Approve my $50,000 business loan today'
                    )
                  }
                  className="block min-h-[40px] w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-100"
                >
                  {isHausa
                    ? 'Gwada Iyakar Tsaro: Neman amincewar bashi'
                    : 'Test Safety Boundary: Request financing approval'}
                </button>
              </div>

              {error && (
                <div
                  role="alert"
                  className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-800"
                >
                  {error}
                </div>
              )}
            </div>

            {filteredRecs.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <h3 className="font-display text-sm font-bold text-slate-900">
                  {isHausa
                    ? `Tarihin Shawarwari (${filteredRecs.length})`
                    : `Saved Guidance History (${filteredRecs.length})`}
                </h3>
                <ul className="mt-3 space-y-2.5 text-xs">
                  {filteredRecs.slice(0, 4).map((rec) => (
                    <li
                      key={rec.id}
                      className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-slate-700"
                    >
                      <p className="font-medium text-slate-900">
                        {rec.question ?? (isHausa ? 'Bayanin Gwaji' : 'Assessment Explanation')}
                      </p>
                      <p className="mt-1 font-mono text-[11px] text-slate-500">
                        {rec.promptVersion} · {rec.modelName} ·{' '}
                        {new Date(rec.createdAt).toLocaleDateString('en-US')}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="lg:col-span-7 space-y-4">
            {!activeRec ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
                <p className="text-sm text-slate-600">
                  {isHausa
                    ? `Danna "Samo Shawarar AI" don samun cikakken bayani mai madogara game da gwajin ${mode} naku.`
                    : `Click "Get AI Growth Coaching" to generate a structured, source-attributed explanation of your ${mode} assessment.`}
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
                  <div>
                    <p className="font-mono text-xs text-slate-500">
                      {activeRec.promptVersion} · {activeRec.modelName}
                    </p>
                    <h2 className="mt-0.5 font-display text-lg font-bold text-slate-900">
                      {isHausa ? 'Shawarar Ilimi Mai Tushe' : 'Grounded Educational Guidance'}
                    </h2>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                    <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                    <span>
                      {activeRec.safetyPassed
                        ? isHausa
                          ? 'An Tabbatar da Tsaro'
                          : 'Safety Verified'
                        : isHausa
                          ? 'An Kiyaye Iyakar Tsaro'
                          : 'Guardrail Held'}
                    </span>
                  </div>
                </div>

                {activeRec.fallbackUsed && activeRec.fallbackReason && (
                  <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <div>
                      <p className="font-semibold">
                        {isHausa
                          ? 'Bayanin Ilimi na Zahiri Yana Aiki'
                          : 'Deterministic Knowledge-Base Fallback Active'}
                      </p>
                      <p className="mt-0.5">{activeRec.fallbackReason}</p>
                    </div>
                  </div>
                )}

                {activeRec.structuredOutput.unsupportedOrRestricted && (
                  <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
                    <p className="font-semibold">
                      {isHausa ? 'An Kiyaye Ƙa’idar Tsaro' : 'Policy Boundary Enforced'}
                    </p>
                    <p className="mt-1">
                      {activeRec.structuredOutput.refusalReason ??
                        activeRec.structuredOutput.summary}
                    </p>
                  </div>
                )}

                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {isHausa ? 'Taƙaitaccen Bayani' : 'Summary'}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-800">
                    {activeRec.structuredOutput.summary}
                  </p>
                </div>

                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {isHausa ? 'Bayanin Ma’aunin da Aka Ƙididdige' : 'Your Calculated Metrics Explained'}
                  </h3>
                  <div className="mt-2 space-y-2.5">
                    {activeRec.structuredOutput.calculatedMetricsExplained.map((m) => (
                      <div
                        key={m.metricLabel}
                        className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-slate-900">
                            {m.metricLabel}
                          </span>
                          <span className="font-mono text-sm font-semibold tabular-nums text-emerald-800">
                            {m.observedValue}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-600">{m.interpretation}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {isHausa ? 'Matakan Aiki na Koyo da Haɓaka' : 'Educational Action Steps'}
                  </h3>
                  <div className="mt-2 space-y-2.5">
                    {activeRec.structuredOutput.educationalActions.map((act) => (
                      <div
                        key={act.title}
                        className="rounded-xl border border-slate-200 bg-white p-3.5"
                      >
                        <p className="text-xs font-medium text-emerald-700">{act.category}</p>
                        <p className="mt-0.5 text-sm font-semibold text-slate-900">{act.title}</p>
                        <p className="mt-1 text-xs leading-relaxed text-slate-600">
                          {act.rationale}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                    <BookOpen className="h-4 w-4 text-emerald-700" aria-hidden="true" />
                    <span>
                      {isHausa
                        ? `Madogaran Ilimi da Aka Tabbatar (${activeRec.sources.length})`
                        : `Approved Knowledge Sources Cited (${activeRec.sources.length})`}
                    </span>
                  </div>
                  <ul className="mt-2 space-y-1.5 text-xs text-slate-600">
                    {activeRec.sources.map((src) => (
                      <li key={src.recordId} className="font-mono">
                        [{src.recordId}] {src.title} · {src.source} (v{src.version})
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-xl bg-slate-50 p-3.5 text-xs text-slate-600">
                  {activeRec.structuredOutput.limitationsAndDisclosures.map((note) => (
                    <p key={note} className="mt-1 first:mt-0">
                      {note}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
