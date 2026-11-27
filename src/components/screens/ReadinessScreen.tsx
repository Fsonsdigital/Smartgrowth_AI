import React from 'react';
import { BarChart3 } from 'lucide-react';
import type { PublicUser, ScreenId } from '../../shared/types';
import { useLanguage } from '../../lib/i18n';
import { ComingSoonFeature } from '../ComingSoonFeature';

interface ReadinessScreenProps {
  user: PublicUser;
  onNavigate: (screen: ScreenId) => void;
}

export function ReadinessScreen({ user, onNavigate }: ReadinessScreenProps) {
  const { isHausa } = useLanguage();

  return (
    <ComingSoonFeature
      user={user}
      categoryLabel={
        isHausa ? 'Mataki na 2 · Shirye-shiryen Bashi' : 'Phase 2 Module · Underwriting Readiness'
      }
      title={
        isHausa
          ? 'Shirye-shiryen Bashi da Ma’aunin Banki'
          : 'Credit Readiness & Key Indicator Benchmarks'
      }
      description={
        isHausa
          ? 'Hanyoyin duba shirye-shiryen bashi ga bankuna da kwatanta ƙididdiga za su fito nan ba da jimawa ba. A halin yanzu, ku gudanar da Gwajin Lafiyar Kuɗi na AI don duba ma’aunin tanadi, bashi, da kuɗin shiga.'
          : 'Dedicated lender-facing readiness views, threshold benchmarking, and institutional preparation tools are coming soon. In the meantime, run your AI Financial Health Assessment to inspect all core savings, debt, and operating cashflow ratios.'
      }
      plannedCapabilities={
        isHausa
          ? [
              'Kwatanta ma’auni tsakanin Mutum Ɗaya da Kasuwanci (SME).',
              'Tabbatar da ma’auni don shirye-shiryen tuntuɓar banki ko masu zuba jari.',
              'Bibiyar ci gaban ƙididdigar kuɗi a kowane zango.',
            ]
          : [
              'Side-by-side threshold benchmarks across Individual and Business tiers.',
              'Lender & partner-institution readiness indicator verification trails.',
              'Historical ratio progression tracking across quarterly assessments.',
            ]
      }
      icon={BarChart3}
      onNavigate={onNavigate}
    />
  );
}
