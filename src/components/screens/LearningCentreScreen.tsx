import React from 'react';
import { BookOpen } from 'lucide-react';
import type { PublicUser, ScreenId } from '../../shared/types';
import { useLanguage } from '../../lib/i18n';
import { ComingSoonFeature } from '../ComingSoonFeature';

interface LearningCentreScreenProps {
  user: PublicUser;
  onNavigate: (screen: ScreenId) => void;
}

export function LearningCentreScreen({ user, onNavigate }: LearningCentreScreenProps) {
  const { isHausa } = useLanguage();

  return (
    <ComingSoonFeature
      user={user}
      categoryLabel={
        isHausa ? 'Mataki na 2 · Manhajar Koyo' : 'Phase 2 Module · Guided Curriculum'
      }
      title={
        isHausa
          ? 'Cibiyar Koyon Ilimin Kuɗi da Kasuwanci'
          : 'Financial & Business Learning Centre'
      }
      description={
        isHausa
          ? 'Darussa, bidiyon koyarwa, da bibiyar kammala karatu ga mutane da masu kasuwanci suna nan tafe nan ba da jimawa ba. Domin shawarwari kai tsaye bisa ga alkaluman ku, yi amfani da Mai Ba da Shawara na AI.'
          : 'Interactive courses, video walkthroughs, and completion tracking for households and SME founders are coming soon. For tailored, immediate guidance based on your numbers, use the AI Business Growth Coach.'
      }
      plannedCapabilities={
        isHausa
          ? [
              'Darussa, muƙaloli, da bidiyon koyo don Mutum Ɗaya da Kasuwanci (SME).',
              'Shawarwarin darussa masu alaƙa kai tsaye da sakamakon gwajin ku.',
              'Bibiyar ci gaba da shaidar kammala karatu.',
            ]
          : [
              'Modular courses, articles, and video lessons for Individuals and SMEs.',
              'Personalized lesson suggestions linked directly to your assessment ratios.',
              'Progress tracking and milestone completion badges.',
            ]
      }
      icon={BookOpen}
      onNavigate={onNavigate}
    />
  );
}
