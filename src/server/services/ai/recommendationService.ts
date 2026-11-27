import { GoogleGenAI, Type } from '@google/genai';
import crypto from 'node:crypto';
import type {
  AppLanguage,
  AssessmentResultRecord,
  KnowledgeSourceRef,
  RecommendationRecord,
  StructuredAiOutput,
  WorkspaceMode,
} from '../../../shared/types.js';
import type { KnowledgeRetrievalService } from './knowledgeService.js';
import type { IRecommendationRepository } from '../../repositories/interfaces.js';

export const AI_PROMPT_VERSION = 'sg-edu-prompt-v1.3.0';
export const AI_MODEL_NAME = 'gemini-4-hydrogen';

const PROHIBITED_OUTPUT_PATTERNS: Array<{ label: string; regex: RegExp }> = [
  {
    label: 'FINANCING_APPROVAL_CLAIM',
    regex:
      /\b(pre-?approved|guaranteed approval|loan approved|financing approved|credit approved|an amince da bashi|an ba da bashi|garantin amincewar bashi)\b/i,
  },
  {
    label: 'SHARIAH_CERTIFICATION_CLAIM',
    regex:
      /\b(shariah[- ]certified|halal[- ]certified|fatwa issued|officially shariah compliant|takardar shaidar shariah|an bayar da fatawa)\b/i,
  },
  {
    label: 'INVENTED_LOAN_TERMS',
    regex: /\b(apr of \d+%|interest rate of \d+%|guaranteed \d+% return|garantin ribar \d+%)\b/i,
  },
];

const RESTRICTED_USER_REQUEST_REGEX =
  /\b(approve my loan|guarantee.*loan|give me a loan|issue.*fatwa|shariah certificate|which bank will approve|guaranteed return|amince da bashi|ba ni bashi|takardar shariah|fatawa|garantin riba|wane banki zai ba ni bashi)\b/i;

export function runSafetyCheck(output: StructuredAiOutput): {
  passed: boolean;
  flags: string[];
} {
  const serialized = JSON.stringify(output);
  const flags: string[] = [];
  for (const rule of PROHIBITED_OUTPUT_PATTERNS) {
    if (rule.regex.test(serialized)) {
      flags.push(rule.label);
    }
  }
  return {
    passed: flags.length === 0,
    flags,
  };
}

function buildDeterministicFallback(params: {
  audience: WorkspaceMode;
  language: AppLanguage;
  assessment: AssessmentResultRecord;
  question: string | null;
  sources: KnowledgeSourceRef[];
  kbSnippets: Array<{ title: string; content: string }>;
  unsupportedOrRestricted: boolean;
  refusalReason?: string;
}): StructuredAiOutput {
  const {
    audience,
    language,
    assessment,
    sources,
    kbSnippets,
    unsupportedOrRestricted,
    refusalReason,
  } = params;
  const isHausa = language === 'ha';

  if (unsupportedOrRestricted) {
    return {
      summary:
        refusalReason ??
        (isHausa
          ? 'Wannan buƙatar tana wajen iyakar shawarwarin ilimi na SmartGrowth AI. SmartGrowth AI yana bayyana ƙididdigar ma’aunin kuɗin ku ta hanyar amfani da bayanan ilimi da aka amince da su ne kawai, kuma ba ya amincewa da bashi, ba ya bada ƙa’idojin banki, ko takardar shaidar Shari’a.'
          : 'This request falls outside SmartGrowth AI educational guidance. SmartGrowth AI explains your calculated financial metrics using approved literacy materials and does not issue loan approvals, specific lender terms, or Shariah certifications.'),
      calculatedMetricsExplained: assessment.output.formulas.slice(0, 3).map((f) => ({
        metricLabel: f.label,
        observedValue: f.formattedValue,
        interpretation: f.explanation,
      })),
      educationalActions: [
        {
          title: isHausa
            ? 'Duba bayanan ma’aunin kuɗin ku da aka tabbatar'
            : 'Review your documented financial ratios',
          rationale: isHausa
            ? 'Yi amfani da bayanan tanadi, kashe kuɗi, da bashin ku wajen shirya takardu kafin tuntuɓar hukumomin kuɗi masu lasisi.'
            : 'Use your verified savings, expense, and debt ratios when preparing records for independent regulated financial institutions.',
          category: isHausa ? 'Tsarin Kuɗi' : 'Financial Governance',
        },
      ],
      learningSuggestions: kbSnippets.map((s) => s.title),
      limitationsAndDisclosures: isHausa
        ? [
            'SmartGrowth AI yana bayar da ilimin kuɗi ne kawai — ba ya yanke hukuncin bashi, zaɓar banki, ko bayar da shaidar Shari’a/doka.',
            'Dukkan alkaluma sun fito ne kai tsaye daga lissafin tantancewar ku na zahiri.',
          ]
        : [
            'SmartGrowth AI provides financial education only — not lending decisions, provider endorsements, or religious/legal certification.',
            'All numeric indicators come strictly from your deterministic assessment calculation.',
          ],
      unsupportedOrRestricted: true,
      refusalReason:
        refusalReason ??
        (isHausa
          ? 'Ba za a iya amincewa da bashi, ƙirƙirar sharuɗɗan banki, ko bayar da takardar shaidar Shari’a ba.'
          : 'Cannot approve financing, invent provider terms, or issue Shariah certification.'),
    };
  }

  const styleNote = isHausa
    ? audience === 'sme'
      ? 'Binciken kuɗin kasuwancin SME bisa ga bayanan da kuka shigar.'
      : 'Binciken lafiyar kuɗin kai bisa ga bayanan ku na wata-wata.'
    : audience === 'sme'
      ? 'SME operational cashflow review based strictly on your recorded business figures.'
      : 'Personal financial health review based strictly on your recorded household figures.';

  const actions = kbSnippets.slice(0, 3).map((snip) => ({
    title: snip.title,
    rationale: snip.content.slice(0, 220),
    category: isHausa
      ? audience === 'sme'
        ? 'Ilimin Kuɗin Kasuwanci (SME)'
        : 'Ilimin Kuɗin Kai'
      : audience === 'sme'
        ? 'SME Cashflow Education'
        : 'Personal Finance Education',
  }));

  if (actions.length === 0) {
    actions.push({
      title: isHausa
        ? 'Ci gaba da bibiyar kuɗin shiga da fita kowane wata'
        : 'Maintain disciplined monthly cashflow tracking',
      rationale: isHausa
        ? 'Rubuta kuɗin da ke shigowa, muhimman kashe kuɗi, da biyan bashi a kai a kai kafin ɗaukar sabbin nauye-nauye.'
        : 'Record monthly inflows, essential outflows, and scheduled debt obligations consistently before taking on new commitments.',
      category: isHausa ? 'Tushen Ilimin Kuɗi' : 'Core Literacy',
    });
  }

  return {
    summary: `${styleNote} ${assessment.output.summaryStatement}`,
    calculatedMetricsExplained: assessment.output.formulas.map((f) => ({
      metricLabel: f.label,
      observedValue: f.formattedValue,
      interpretation: `${f.band}: ${f.explanation}`,
    })),
    educationalActions: actions,
    learningSuggestions: sources.map((s) => s.title),
    limitationsAndDisclosures: isHausa
      ? [
          `An ƙididdige shi da tsarin ${assessment.calculationVersion}; ba a ƙirƙiri maki mara tushe ba.`,
          'Shawarar ilimi ce kawai: SmartGrowth AI ba ya bada shawarar takamaiman banki, sharuɗɗan bashi, amincewar bashi, ko shaidar Shari’a.',
        ]
      : [
          `Calculated deterministically under ${assessment.calculationVersion}; no unvalidated composite score is generated.`,
          'Educational guidance only: SmartGrowth AI does not recommend specific external providers, quote loan terms, approve financing, or issue Shariah certification.',
        ],
    unsupportedOrRestricted: false,
  };
}

export class RecommendationService {
  constructor(
    private readonly knowledgeService: KnowledgeRetrievalService,
    private readonly recommendationRepo: IRecommendationRepository
  ) {}

  async generateForAssessment(params: {
    userId: string;
    assessment: AssessmentResultRecord;
    question?: string | null;
    language?: AppLanguage;
  }): Promise<RecommendationRecord> {
    const audience = params.assessment.audience;
    const language: AppLanguage = params.language === 'ha' ? 'ha' : 'en';
    const isHausa = language === 'ha';
    const userQuestion = params.question?.trim() || null;

    const queryText = [
      userQuestion ?? '',
      audience,
      params.assessment.output.readinessTier,
      ...params.assessment.output.dataQualityFlags,
      ...params.assessment.output.formulas.map((f) => `${f.label} ${f.band}`),
    ].join(' ');

    const { records: kbRecords, refs } = this.knowledgeService.retrieveApproved({
      audience,
      queryText,
      flags: params.assessment.output.dataQualityFlags,
      limit: 4,
    });

    // Check restricted user prompt before calling Gemini
    if (userQuestion && RESTRICTED_USER_REQUEST_REGEX.test(userQuestion)) {
      const refusalOutput = buildDeterministicFallback({
        audience,
        language,
        assessment: params.assessment,
        question: userQuestion,
        sources: refs,
        kbSnippets: kbRecords.map((r) => ({ title: r.title, content: r.content })),
        unsupportedOrRestricted: true,
        refusalReason: isHausa
          ? 'SmartGrowth AI ba ya bada amincewar bashi, ba ya bada shawarar takamaiman banki ko sharuɗɗan bashi, ba ya bada garantin riba, kuma ba ya bayar da takardar shaidar Shari’a.'
          : 'SmartGrowth AI cannot issue financing approvals, recommend specific commercial lenders or loan terms, guarantee returns, or issue Shariah certification.',
      });

      return this.recommendationRepo.create({
        id: `rec_${crypto.randomUUID()}`,
        userId: params.userId,
        assessmentResultId: params.assessment.id,
        audience,
        promptVersion: AI_PROMPT_VERSION,
        modelName: 'policy-guardrail',
        question: userQuestion,
        structuredOutput: refusalOutput,
        sources: refs,
        safetyPassed: true,
        safetyFlags: ['RESTRICTED_REQUEST_BLOCKED'],
        fallbackUsed: false,
        fallbackReason: null,
      });
    }

    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      const fallbackOutput = buildDeterministicFallback({
        audience,
        language,
        assessment: params.assessment,
        question: userQuestion,
        sources: refs,
        kbSnippets: kbRecords.map((r) => ({ title: r.title, content: r.content })),
        unsupportedOrRestricted: false,
      });

      return this.recommendationRepo.create({
        id: `rec_${crypto.randomUUID()}`,
        userId: params.userId,
        assessmentResultId: params.assessment.id,
        audience,
        promptVersion: AI_PROMPT_VERSION,
        modelName: AI_MODEL_NAME,
        question: userQuestion,
        structuredOutput: fallbackOutput,
        sources: refs,
        safetyPassed: true,
        safetyFlags: [],
        fallbackUsed: true,
        fallbackReason: isHausa
          ? 'Ba a saita GEMINI_API_KEY a uwar garken ba. An nuna bayanin ilimi na zahiri daga bayanan da aka amince da su.'
          : 'GEMINI_API_KEY is not configured on the server. Displayed deterministic, approved knowledge-base explanation instead.',
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const audienceInstruction =
      audience === 'sme'
        ? 'Respond as an AI Business Growth Coach in an SME business-owner tone focused on operating cash movement, operating expense discipline, debt service burden, receivables/payables timing, and liquidity runway.'
        : 'Respond as an AI Financial Health & Growth Coach in a supportive personal financial literacy tone focused on household budgeting, savings rate, debt repayment capacity, and emergency cash buffers.';

    const languageInstruction = isHausa
      ? 'LANGUAGE REQUIREMENT: Write ALL narrative strings in the JSON response (summary, calculatedMetricsExplained.metricLabel, calculatedMetricsExplained.interpretation, educationalActions.title, educationalActions.rationale, educationalActions.category, learningSuggestions, limitationsAndDisclosures, refusalReason) in clear, natural, standard Hausa (Harshen Hausa). Keep numeric figures and currency codes exact.'
      : 'LANGUAGE REQUIREMENT: Write all narrative strings in clear, natural English.';

    const systemInstruction = `You are the SmartGrowth AI Business Growth Coach & Financial Health Educator (Prompt ${AI_PROMPT_VERSION}).
${audienceInstruction}
${languageInstruction}
STRICT RULES:
1. ONLY explain the user's already calculated deterministic metrics provided in JSON. NEVER compute or invent a composite credit score or change any metric numbers.
2. ONLY ground advice in the APPROVED KNOWLEDGE BASE RECORDS supplied below.
3. NEVER invent external financial providers, specific loan interest rates, loan terms, financing approvals, or claim Shariah certification/fatwas.
4. If the user's question asks for something outside the approved knowledge base or violates Rule 3, set unsupportedOrRestricted=true and explain clearly in refusalReason.
5. Keep summary concise (2-4 sentences) and return valid JSON matching the schema.`;

    const promptPayload = {
      audience,
      responseLanguage: isHausa ? 'Hausa (ha)' : 'English (en)',
      calculationVersion: params.assessment.calculationVersion,
      readinessTier: params.assessment.output.readinessTier,
      dataQualityFlags: params.assessment.output.dataQualityFlags,
      calculatedFormulas: params.assessment.output.formulas.map((f) => ({
        label: f.label,
        formula: f.formula,
        formattedValue: f.formattedValue,
        band: f.band,
      })),
      approvedKnowledgeBase: kbRecords.map((r) => ({
        recordId: r.externalId || r.id,
        title: r.title,
        audience: r.audience,
        content: r.content,
        source: r.metadata.source ?? 'SmartGrowth Approved KB',
      })),
      userQuestion:
        userQuestion ??
        (isHausa
          ? 'Yi bayanin ma’aunin kuɗina da aka ƙididdige kuma ka ba da shawarwarin haɓaka na gaba.'
          : 'Explain my calculated financial indicators and suggest grounded educational next steps.'),
    };

    try {
      const response = await ai.models.generateContent({
        model: AI_MODEL_NAME,
        contents: JSON.stringify(promptPayload),
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              calculatedMetricsExplained: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    metricLabel: { type: Type.STRING },
                    observedValue: { type: Type.STRING },
                    interpretation: { type: Type.STRING },
                  },
                },
              },
              educationalActions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    rationale: { type: Type.STRING },
                    category: { type: Type.STRING },
                  },
                },
              },
              learningSuggestions: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              limitationsAndDisclosures: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              unsupportedOrRestricted: { type: Type.BOOLEAN },
              refusalReason: { type: Type.STRING },
            },
          },
        },
      });

      const rawText = (response.text ?? '').trim();
      const parsed = JSON.parse(rawText) as StructuredAiOutput;
      const safety = runSafetyCheck(parsed);

      if (!safety.passed) {
        const sanitizedFallback = buildDeterministicFallback({
          audience,
          language,
          assessment: params.assessment,
          question: userQuestion,
          sources: refs,
          kbSnippets: kbRecords.map((r) => ({ title: r.title, content: r.content })),
          unsupportedOrRestricted: true,
          refusalReason: isHausa
            ? 'An dakatar da amsar ta hanyar tantancewar tsaro don guje wa iƙirarin bashi, banki, ko shaidar Shari’a da ba a tabbatar ba.'
            : 'Response withheld by automated safety check to avoid unverified financing, provider, or Shariah certification claims.',
        });

        return this.recommendationRepo.create({
          id: `rec_${crypto.randomUUID()}`,
          userId: params.userId,
          assessmentResultId: params.assessment.id,
          audience,
          promptVersion: AI_PROMPT_VERSION,
          modelName: AI_MODEL_NAME,
          question: userQuestion,
          structuredOutput: sanitizedFallback,
          sources: refs,
          safetyPassed: false,
          safetyFlags: safety.flags,
          fallbackUsed: true,
          fallbackReason: `Safety guardrail triggered: ${safety.flags.join(', ')}`,
        });
      }

      return this.recommendationRepo.create({
        id: `rec_${crypto.randomUUID()}`,
        userId: params.userId,
        assessmentResultId: params.assessment.id,
        audience,
        promptVersion: AI_PROMPT_VERSION,
        modelName: AI_MODEL_NAME,
        question: userQuestion,
        structuredOutput: parsed,
        sources: refs,
        safetyPassed: true,
        safetyFlags: [],
        fallbackUsed: false,
        fallbackReason: null,
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown Gemini API error';
      const fallbackOutput = buildDeterministicFallback({
        audience,
        language,
        assessment: params.assessment,
        question: userQuestion,
        sources: refs,
        kbSnippets: kbRecords.map((r) => ({ title: r.title, content: r.content })),
        unsupportedOrRestricted: false,
      });

      return this.recommendationRepo.create({
        id: `rec_${crypto.randomUUID()}`,
        userId: params.userId,
        assessmentResultId: params.assessment.id,
        audience,
        promptVersion: AI_PROMPT_VERSION,
        modelName: AI_MODEL_NAME,
        question: userQuestion,
        structuredOutput: fallbackOutput,
        sources: refs,
        safetyPassed: true,
        safetyFlags: ['UPSTREAM_AI_ERROR'],
        fallbackUsed: true,
        fallbackReason: isHausa
          ? `Kiran Gemini API ya ci tura (${errorMsg}). An nuna bayanin ilimi na zahiri daga bayanan da aka amince da su.`
          : `Gemini API call failed (${errorMsg}). Returned deterministic, approved knowledge-base explanation.`,
      });
    }
  }
}
