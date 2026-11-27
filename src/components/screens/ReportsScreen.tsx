import React from 'react';
import { FileText } from 'lucide-react';
import type { PublicUser, ScreenId } from '../../shared/types';
import { useLanguage } from '../../lib/i18n';
import { ComingSoonFeature } from '../ComingSoonFeature';

interface ReportsScreenProps {
  user: PublicUser;
  onNavigate: (screen: ScreenId) => void;
}

export function ReportsScreen({ user, onNavigate }: ReportsScreenProps) {
  const { isHausa } = useLanguage();

  return (
    <ComingSoonFeature
      user={user}
      categoryLabel={
        isHausa
          ? 'Mataki na 2 · Fitar da Rahoto'
          : 'Phase 2 Module · Exports & Partner Sharing'
      }
      title={
        isHausa
          ? 'Sauke Rahotanni da Takardun Kuɗi'
          : 'Downloadable Reports & Financial Snapshots'
      }
      description={
        isHausa
          ? 'Sauke rahotanni a tsarin PDF, HTML, da JSON domin bankuna, masu ba da shawara, da masu zuba jari zai fito nan ba da jimawa ba. Gwajin lafiyar kuɗi da Mai Ba da Shawara na AI suna nan suna aiki yanzu.'
          : 'PDF, HTML, and JSON snapshot exports for banks, advisors, and investors are coming soon. Your real-time financial health assessment ratios and AI Business Growth Coach recommendations remain available immediately.'
      }
      plannedCapabilities={
        isHausa
          ? [
              'Fitar da rahotannin lafiyar kuɗi a tsarin PDF da HTML cikin sauƙi.',
              'Ajiyayyen bayanan JSON masu ɗauke da sigar lissafi da gargaɗin ilimi.',
              'Rahotanni masu ɗauke da tambarin bankuna ko ƙungiyoyin haɗin gwiwa.',
            ]
          : [
              'One-click printable PDF and formatted HTML financial health reports.',
              'Auditable JSON snapshots with exact calculation versions and disclaimers.',
              'Co-branded institutional report headers for bank and MFI partners.',
            ]
      }
      icon={FileText}
      onNavigate={onNavigate}
    />
  );
}
