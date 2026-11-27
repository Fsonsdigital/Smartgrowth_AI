import React, { useState } from 'react';
import { CheckCircle2, MessageSquarePlus, Star, X } from 'lucide-react';
import type { WorkspaceMode } from '../shared/types';
import { useLanguage } from '../lib/i18n';
import { submitPilotFeedbackToFirestore } from '../lib/firebase';

interface PilotFeedbackModalProps {
  open: boolean;
  onClose: () => void;
  firebaseUid: string | null;
  activeMode: WorkspaceMode;
}

export function PilotFeedbackModal({
  open,
  onClose,
  firebaseUid,
  activeMode,
}: PilotFeedbackModalProps) {
  const { language, isHausa } = useLanguage();
  const [usefulnessRating, setUsefulnessRating] = useState(5);
  const [recommendLikelihood, setRecommendLikelihood] = useState(5);
  const [mostValuableFeature, setMostValuableFeature] = useState<
    'health_assessment' | 'ai_growth_coach' | 'both'
  >('both');
  const [primaryUseCase, setPrimaryUseCase] = useState(
    activeMode === 'sme' ? 'Small Business Cashflow & Growth' : 'Personal Budgeting & Debt Control'
  );
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!firebaseUid) {
      setError(
        isHausa
          ? 'Da fatan za a shiga da Google (Firebase) don adana ra’ayin gwaji a cikin Cloud Firestore.'
          : 'Please sign in with Google (Firebase) to record pilot validation feedback directly in Cloud Firestore.'
      );
      return;
    }
    setSubmitting(true);
    try {
      await submitPilotFeedbackToFirestore(firebaseUid, {
        userRole: activeMode,
        language,
        usefulnessRating,
        recommendLikelihood,
        mostValuableFeature,
        primaryUseCase,
        comment,
      });
      setSubmitted(true);
      setComment('');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : isHausa
            ? 'An kasa adana ra’ayin.'
            : 'Unable to submit feedback.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isHausa ? 'Ra’ayin Gwaji na Masu Amfani' : 'Pilot Prototype Feedback'}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <MessageSquarePlus className="h-5 w-5 text-emerald-700" aria-hidden="true" />
            <div>
              <h2 className="font-display text-lg font-bold text-slate-900">
                {isHausa ? 'Taimaka Mana Inganta SmartGrowth AI' : 'Help Validate SmartGrowth AI'}
              </h2>
              <p className="text-xs text-slate-500">
                {isHausa
                  ? 'Ra’ayin ku yana taimaka mana tabbatar da amfanin manhajar ga masu amfani da masu zuba jari.'
                  : 'Real-user prototype feedback stored in Firestore for product validation.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setSubmitted(false);
              onClose();
            }}
            aria-label={isHausa ? 'Rufe' : 'Close'}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {submitted ? (
          <div className="py-6 text-center space-y-3">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" aria-hidden="true" />
            <h3 className="font-display text-base font-bold text-slate-900">
              {isHausa ? 'Mun Gode da Ra’ayin Ku!' : 'Thank You for Your Validation Feedback!'}
            </h3>
            <p className="text-sm text-slate-600">
              {isHausa
                ? 'An adana ra’ayin ku cikin nasara.'
                : 'Your feedback has been recorded in Firestore.'}
            </p>
            <button
              type="button"
              onClick={() => {
                setSubmitted(false);
                onClose();
              }}
              className="mt-2 min-h-[42px] rounded-xl bg-[#043927] px-5 text-sm font-semibold text-white hover:bg-emerald-900"
            >
              {isHausa ? 'Koma Manhaja' : 'Return to Workspace'}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            {error && (
              <div
                role="alert"
                className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-900"
              >
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700">
                {isHausa
                  ? 'Yaya amfanin Gwajin Lafiyar Kuɗi da Mai Ba da Shawara na AI?'
                  : 'How useful is this prototype for your financial decisions?'}
              </label>
              <div className="mt-2 flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setUsefulnessRating(n)}
                    className={`flex h-10 flex-1 items-center justify-center gap-1 rounded-xl border text-xs font-semibold ${
                      usefulnessRating >= n
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                        : 'border-slate-200 text-slate-500'
                    }`}
                  >
                    <Star className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{n}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">
                {isHausa
                  ? 'Za ka ba da shawarar wannan manhaja ga abokai ko kasuwanci?'
                  : 'How likely are you to recommend SmartGrowth AI (1–5)?'}
              </label>
              <div className="mt-2 flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRecommendLikelihood(n)}
                    className={`flex h-10 flex-1 items-center justify-center rounded-xl border text-xs font-semibold ${
                      recommendLikelihood === n
                        ? 'border-emerald-600 bg-[#043927] text-white'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label
                htmlFor="fb-feature"
                className="block text-xs font-semibold text-slate-700"
              >
                {isHausa ? 'Wane fasali ya fi maka amfani?' : 'Most Valuable Feature'}
              </label>
              <select
                id="fb-feature"
                value={mostValuableFeature}
                onChange={(e) =>
                  setMostValuableFeature(
                    e.target.value as 'health_assessment' | 'ai_growth_coach' | 'both'
                  )
                }
                className="mt-1 min-h-[42px] w-full rounded-xl border border-slate-300 bg-white px-3 text-xs"
              >
                <option value="both">
                  {isHausa
                    ? 'Duka Biyun (Gwajin Kuɗi + Mai Ba da Shawara na AI)'
                    : 'Both (Health Assessment + AI Growth Coach)'}
                </option>
                <option value="health_assessment">
                  {isHausa ? 'Gwajin Lafiyar Kuɗi na AI' : 'AI Financial Health Assessment'}
                </option>
                <option value="ai_growth_coach">
                  {isHausa ? 'Mai Ba da Shawara na AI' : 'AI Business Growth Coach'}
                </option>
              </select>
            </div>

            <div>
              <label htmlFor="fb-usecase" className="block text-xs font-semibold text-slate-700">
                {isHausa ? 'Babban Dalilin Amfani' : 'Primary Use Case'}
              </label>
              <input
                id="fb-usecase"
                type="text"
                required
                maxLength={120}
                value={primaryUseCase}
                onChange={(e) => setPrimaryUseCase(e.target.value)}
                className="mt-1 min-h-[42px] w-full rounded-xl border border-slate-300 px-3 text-xs"
              />
            </div>

            <div>
              <label htmlFor="fb-comment" className="block text-xs font-semibold text-slate-700">
                {isHausa
                  ? 'Wane gyara ko ƙarin abu kake son gani?'
                  : 'What should we improve next before full launch?'}
              </label>
              <textarea
                id="fb-comment"
                rows={3}
                maxLength={1000}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={
                  isHausa
                    ? 'Rubuta shawararka ko matsalar da ka gani...'
                    : 'Share what worked well, what confused you, or what feature you need next...'
                }
                className="mt-1 w-full rounded-xl border border-slate-300 p-3 text-xs"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="min-h-[44px] w-full rounded-xl bg-[#043927] px-4 text-sm font-semibold text-white hover:bg-emerald-900 disabled:opacity-60"
            >
              {submitting
                ? isHausa
                  ? 'Ana aikawa...'
                  : 'Submitting...'
                : isHausa
                  ? 'Aika Ra’ayi'
                  : 'Submit Validation Feedback'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
