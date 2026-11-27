import React from 'react';
import { Building2 } from 'lucide-react';
import type { PublicUser, ScreenId } from '../../shared/types';
import { useLanguage } from '../../lib/i18n';
import { ComingSoonFeature } from '../ComingSoonFeature';

interface SmeWorkspaceScreenProps {
  user: PublicUser;
  onNavigate: (screen: ScreenId) => void;
}

export function SmeWorkspaceScreen({ user, onNavigate }: SmeWorkspaceScreenProps) {
  const { isHausa } = useLanguage();

  return (
    <ComingSoonFeature
      user={user}
      categoryLabel={
        isHausa
          ? 'Mataki na 2 · Sashen Haɗin Gwiwar Kasuwanci'
          : 'Phase 2 Module · Multi-User Organization Workspace'
      }
      title={
        isHausa
          ? 'Sashen Tawagar SME da Rassan Kasuwanci'
          : 'SME Team & Multi-Entity Workspace'
      }
      description={
        isHausa
          ? 'Tsarin gayyatar ma’aikata da gudanar da rassan kasuwanci da dama yana nan tafe nan ba da jimawa ba. Tuni kuna iya amfani da Tsarin Kasuwanci (SME) wajen gwajin lafiyar kuɗi da tuntuɓar Mai Ba da Shawara na AI.'
          : 'Multi-member SME team roles, branch entity management, and collaborative cashflow workspaces are coming soon. You can already run Business/SME Financial Health Assessments and consult the AI Business Growth Coach using Business Mode.'
      }
      plannedCapabilities={
        isHausa
          ? [
              'Gayyatar manajan kuɗi da masu nazarin lissafi cikin asusun kasuwanci.',
              'Gudanar da kamfanoni ko rassan kasuwanci fiye da ɗaya.',
              'Kwatanta motsin kuɗin aiki da juriyar tsabar kuɗi a lokuta daban-daban.',
            ]
          : [
              'Invite finance managers and analysts into shared business workspaces.',
              'Manage multiple business entities, sectors, and registration milestones.',
              'Track multi-period operating cashflow and liquidity runway comparisons.',
            ]
      }
      icon={Building2}
      onNavigate={onNavigate}
    />
  );
}
