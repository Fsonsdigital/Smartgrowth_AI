import React, { createContext, useContext, useState } from 'react';
import { Globe } from 'lucide-react';
import type { AppLanguage, MetricBand } from '../shared/types';

interface LanguageContextValue {
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
  isHausa: boolean;
}

const LanguageContext = createContext<LanguageContextValue>({
  language: 'en',
  setLanguage: () => {},
  isHausa: false,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<AppLanguage>('en');
  return (
    <LanguageContext.Provider value={{ language, setLanguage, isHausa: language === 'ha' }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  return useContext(LanguageContext);
}

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { language, setLanguage } = useLanguage();
  return (
    <div
      role="group"
      aria-label="Language selection"
      className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shrink-0"
    >
      {!compact && <Globe className="ml-1.5 h-3.5 w-3.5 text-slate-500" aria-hidden="true" />}
      <button
        type="button"
        onClick={() => setLanguage('en')}
        aria-pressed={language === 'en'}
        className={`min-h-[32px] rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors whitespace-nowrap ${
          language === 'en'
            ? 'bg-[#043927] text-white'
            : 'text-slate-600 hover:text-slate-900'
        }`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLanguage('ha')}
        aria-pressed={language === 'ha'}
        className={`min-h-[32px] rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors whitespace-nowrap ${
          language === 'ha'
            ? 'bg-[#043927] text-white'
            : 'text-slate-600 hover:text-slate-900'
        }`}
      >
        Hausa
      </button>
    </div>
  );
}

export function translateBand(band: MetricBand, language: AppLanguage): string {
  if (language === 'en') return band;
  switch (band) {
    case 'Strong':
      return 'Mai Ƙarfi';
    case 'Stable':
      return 'Tsayayye';
    case 'Watch':
      return 'Lura';
    case 'Critical':
      return 'Matsananci';
    default:
      return 'Bayanai Ba Su Isa Ba';
  }
}

export function translateReadinessTier(tier: string, language: AppLanguage): string {
  if (language === 'en') return tier;
  switch (tier) {
    case 'Resilient':
      return 'Mai Juriya';
    case 'Developing':
      return 'Mai Haɓaka';
    case 'Vulnerable':
      return 'Mai Rauni';
    case 'Needs Data':
      return 'Ana Buƙatar Bayani';
    default:
      return tier;
  }
}

const HA_FORMULA_LABELS: Record<string, string> = {
  savingsRate: 'Adadin Tanadi',
  expenseToIncomeRatio: 'Kashe Kuɗi Kan Kuɗin Shiga',
  debtRepaymentToIncomeRatio: 'Biyan Bashi Kan Kuɗin Shiga',
  monthlySurplusOrDeficit: 'Ragi ko Gibin Wata-wata',
  emergencyBufferMonths: 'Watannin Tanadin Gaggawa',
  operatingCashMovement: 'Motsin Kuɗin Aiki na Wata',
  operatingExpenseRatio: 'Kudin Aiki Kan Kuɗin Shiga',
  debtRepaymentBurden: 'Nauyin Biyan Bashi',
  cashRunwayMonths: 'Watannin Juriyar Kuɗi',
  netWorkingCashPosition: 'Matsayin Kuɗin Aiki na Zahiri',
};

export function translateFormulaLabel(key: string, fallbackLabel: string, language: AppLanguage): string {
  if (language === 'en') return fallbackLabel;
  return HA_FORMULA_LABELS[key] ?? fallbackLabel;
}

const HA_QUESTION_MAP: Record<string, { label: string; helpText: string }> = {
  monthlyIncome: {
    label: 'Kuɗin Shiga na Wata-wata',
    helpText: 'Jimillar kuɗin da kuke samu a hannu kowane wata.',
  },
  incomeStability: {
    label: 'Yanayin Kuɗin Shiga',
    helpText: 'Zaɓi yadda kuɗin shigar ku na wata yake zuwa.',
  },
  monthlyExpenses: {
    label: 'Kashe Kuɗin Rayuwa na Wata',
    helpText: 'Gida, abinci, wuta/ruwa, sufuri, da sauran hidimomin yau da kullum.',
  },
  dependentsCount: {
    label: 'Yawan Masu Dogaro da Ku',
    helpText: 'Adadin mutanen da wannan kuɗin shiga ke kula da su.',
  },
  monthlySavings: {
    label: 'Adadin Tanadin Wata-wata',
    helpText: 'Kuɗin da kuke ajiyewa kowane wata a asusun tanadi ko adashi.',
  },
  totalLiquidSavings: {
    label: 'Jimillar Tanadin da Ake Da Shi a Hannu',
    helpText: 'Kuɗin tanadi da za a iya amfani da su nan take don gaggawa.',
  },
  monthlyDebtRepayment: {
    label: 'Biyan Bashi na Wata-wata',
    helpText: 'Jimillar kuɗin biyan bashi ko rance da ake biya kowane wata.',
  },
  totalDebt: {
    label: 'Jimillar Bashin da Ya Rage',
    helpText: 'Jimillar duk bashin da ba a gama biya ba.',
  },
  monthlyRevenue: {
    label: 'Kuɗin Shigar Kasuwanci na Wata (Gross Revenue)',
    helpText: 'Matsakaicin jimillar cinikin kuɗi da bashi kowane wata.',
  },
  recordKeepingMethod: {
    label: 'Hanyar Ajiye Lissafin Kasuwanci',
    helpText: 'Babbar hanyar da kuke amfani da ita wajen rubuta ciniki.',
  },
  monthlyOperatingExpenses: {
    label: 'Kuɗin Gudanar da Kasuwanci na Wata',
    helpText: 'Kayan sayarwa, albashi, hayar shago, mai, sufuri, da sauran kashe-kashe.',
  },
  monthlyDebtService: {
    label: 'Biyan Bashin Kasuwanci na Wata',
    helpText: 'Kuɗin biyan bashin kasuwanci ko kayan aiki kowane wata.',
  },
  cashOnHand: {
    label: 'Tsabar Kuɗin Kasuwanci a Hannu / Banki',
    helpText: 'Kuɗin da ke cikin asusun bankin kasuwanci da asusun shago.',
  },
  accountsReceivable: {
    label: 'Kuɗin da Ake Bi Bashi (Cikin Kwanaki 30)',
    helpText: 'Kuɗin da abokan ciniki za su biya cikin kwanaki 30 masu zuwa.',
  },
  accountsPayable: {
    label: 'Bashin Masu Kaya (Cikin Kwanaki 30)',
    helpText: 'Kuɗin da za a biya masu kawo kaya cikin kwanaki 30.',
  },
};

export function translateQuestion(
  fieldKey: string,
  fallbackLabel: string,
  fallbackHelpText: string,
  language: AppLanguage
): { label: string; helpText: string } {
  if (language === 'en') return { label: fallbackLabel, helpText: fallbackHelpText };
  return HA_QUESTION_MAP[fieldKey] ?? { label: fallbackLabel, helpText: fallbackHelpText };
}

const HA_OPTION_MAP: Record<string, string> = {
  steady: 'Tsayayye (Steady)',
  variable: 'Mai Sauyawa (Variable)',
  seasonal: 'Na Lokaci (Seasonal)',
  digital: 'Na’urar Zamani / App (Digital)',
  spreadsheet: 'Jadawali / Excel (Spreadsheet)',
  paper: 'Littafi / Takarda (Paper)',
  none: 'Babu Tsarin Rubutu (None)',
};

export function translateOption(opt: string, language: AppLanguage): string {
  if (language === 'en') return opt;
  return HA_OPTION_MAP[opt] ?? opt;
}
