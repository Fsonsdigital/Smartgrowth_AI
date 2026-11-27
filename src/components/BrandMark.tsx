import React from 'react';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import type { MetricBand } from '../shared/types';
import { translateBand, useLanguage } from '../lib/i18n';

export function BrandMark({ size = 32 }: { size?: number }) {
  return (
    <span className="inline-flex shrink-0 items-center rounded-xl bg-black px-2.5 py-1">
      <img
        src="/assets/aistudio/SmartGrowthAI_Logo__1__b01bd855.png"
        alt="SmartGrowth AI"
        referrerPolicy="no-referrer"
        style={{ height: `${size}px` }}
        className="w-auto object-contain"
      />
    </span>
  );
}

export function BandIndicator({ band }: { band: MetricBand }) {
  const { language } = useLanguage();
  const label = translateBand(band, language);

  if (band === 'Strong') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>{label}</span>
      </span>
    );
  }
  if (band === 'Stable') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-teal-700">
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>{label}</span>
      </span>
    );
  }
  if (band === 'Watch') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>{label}</span>
      </span>
    );
  }
  if (band === 'Critical') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700">
        <XCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>{label}</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
      <Info className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}

export function SyntheticBanner({ visible }: { visible: boolean }) {
  const { isHausa } = useLanguage();
  if (!visible) return null;
  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-2.5 text-xs text-amber-950"
    >
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />
        <span>
          {isHausa ? (
            <>
              <strong className="font-semibold">Bayanan Gwaji (Synthetic Data):</strong> Waɗannan
              alkaluman misali ne na gwaji da koyo a wannan asusun, ba bayanan kuɗin abokin ciniki
              na zahiri ba.
            </>
          ) : (
            <>
              <strong className="font-semibold">Synthetic Demonstration Data:</strong> Sample
              figures shown in this sandbox account are fabricated for testing and educational
              clarity, not real customer financial records.
            </>
          )}
        </span>
      </div>
    </div>
  );
}
