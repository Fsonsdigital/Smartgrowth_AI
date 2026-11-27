import React from 'react';
import { Handshake } from 'lucide-react';
import type { PublicUser, ScreenId } from '../../shared/types';
import { useLanguage } from '../../lib/i18n';
import { ComingSoonFeature } from '../ComingSoonFeature';

interface EthicalFinanceScreenProps {
  user: PublicUser;
  onNavigate: (screen: ScreenId) => void;
}

export function EthicalFinanceScreen({ user, onNavigate }: EthicalFinanceScreenProps) {
  const { isHausa } = useLanguage();

  return (
    <ComingSoonFeature
      user={user}
      categoryLabel={
        isHausa
          ? 'Mataki na 2 · Tsarin Kuɗi Marar Ruwa'
          : 'Phase 2 Module · Ethical & Non-Interest Finance'
      }
      title={
        isHausa
          ? 'Cibiyar Ilimin Kuɗi na Gaskiya da Rashin Ruwa'
          : 'Ethical Finance & Inclusion Hub'
      }
      description={
        isHausa
          ? 'Bayanin ilimi game da cinikayya mai gaskiya, raba riba da asara, da adashin haɗin gwiwa zai fito nan ba da jimawa ba. Mai Ba da Shawara na AI ya riga yana kiyaye ƙa’idar rashin bayar da takardar shaidar Shari’a ba tare da izini ba.'
          : 'Educational guides on asset-backed trade, profit-sharing partnerships, and cooperative savings structures are coming soon as a standalone hub. Your AI Business Growth Coach already respects strict non-certification educational boundaries.'
      }
      plannedCapabilities={
        isHausa
          ? [
              'Koyarwa game da tsarin kuɗi marar ruwa da cinikayyar kadarori.',
              'Tsarin adashin haɗin gwiwa da tanadi na al’umma.',
              'Taskar ilimin kuɗi da aka tantance don mutane da ƙananan masana’antu.',
            ]
          : [
              'Structured educational references for non-interest and asset-backed trade models.',
              'Cooperative and community savings pool literacy resources.',
              'Curated approved knowledge library filtered by Individual and Business needs.',
            ]
      }
      icon={Handshake}
      onNavigate={onNavigate}
    />
  );
}
