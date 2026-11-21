import { GoogleGenAI, Type } from '@google/genai';
import crypto from 'node:crypto';
import type {
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
    regex: /\b(pre-?approved|guaranteed approval|loan approved|financing approved|credit approved)\b/i,
  },
  {
    label: 'SHARIAH_CERTIFICATION_CLAIM',
    regex: /\b(shariah[- ]certified|halal[- ]certified|fatwa issued|officially shariah compliant)\b/i,
  },
  {
    label: 'INVENTED_LOAN_TERMS',
    regex: /\b(apr of \d+%|interest rate of \d+%|guaranteed \d+% return)\b/i,
  },
];

const RESTRICTED_USER_REQUEST_REGEX =
  /\b(approve my loan|guarantee.*loan|give me a loan|issue.*fatwa|shariah certificate|which bank will approve|guaranteed return)\b/i;

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
  assessment: AssessmentResultRecord;
  question: string | null;
  sources: KnowledgeSourceRef[];
  kbSnippets: Array<{ title: string; content: string }>;
  unsupportedOrRestricted: boolean;
  refusalReason?: string;
}): StructuredAiOutput {
  const { audience, assessment, sources, kbSnippets, unsupportedOrRestricted, refusalReason } = params;

  if (unsupportedOrRestricted) {
    return {
      summary:
        refusalReason ??
        'This request falls outside SmartGrowth AI educational guidance. SmartGrowth AI explains your calculated financial metrics using approved literacy materials and does not issue loan approvals, specific lender terms, or Shariah certifications.',
      calculatedMetricsExplained: assessment.output.formulas.slice(0, 3).map((f) => ({
        metricLabel: f.label,
        observedValue: f.formattedValue,
        interpretation: f.explanation,
      })),
      educationalActions: [
        {
          title: 'Review your documented financial ratios',
          rationale:
            'Use your verified savings, expense, and debt ratios when preparing records for independent regulated financial institutions.',
          category: 'Financial Governance',
        },
      ],
      learningSuggestions: kbSnippets.map((s) => s.title),
      limitationsAndDisclosures: [
        'SmartGrowth AI provides financial education only — not lending decisions, provider endorsements, or religious/legal certification.',
        'All numeric indicators come strictly from your deterministic assessment calculation.',
      ],
      unsupportedOrRestricted: true,
      refusalReason:
        refusalReason ??
        'Cannot approve financing, invent provider terms, or issue Shariah certification.',
    };
  }

  const styleNote =
    audience === 'sme'
      ? 'SME operational cashflow review based strictly on your recorded business figures.'
      : 'Personal financial health review based strictly on your recorded household figures.';

  const actions = kbSnippets.slice(0, 3).map((snip) => ({
    title: snip.title,
    rationale: snip.content.slice(0, 220),
    category: audience === 'sme' ? 'SME Cashflow Education' : 'Personal Finance Education',
  }));

  if (actions.length === 0) {
    actions.push({
      title: 'Maintain disciplined monthly cashflow tracking',
      rationale:
        'Record monthly inflows, essential outflows, and scheduled debt obligations consistently before taking on new commitments.',
      category: 'Core Literacy',
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
    limitationsAndDisclosures: [
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
  }): Promise<RecommendationRecord> {
    const audience = params.assessment.audience;
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
        assessment: params.assessment,
        question: userQuestion,
        sources: refs,
        kbSnippets: kbRecords.map((r) => ({ title: r.title, content: r.content })),
        unsupportedOrRestricted: true,
        refusalReason:
          'SmartGrowth AI cannot issue financing approvals, recommend specific commercial lenders or loan terms, guarantee returns, or issue Shariah certification.',
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
        fallbackReason:
          'GEMINI_API_KEY is not configured on the server. Displayed deterministic, approved knowledge-base explanation instead.',
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
        ? 'Respond in an SME business-owner tone focused on operating cash movement, operating expense discipline, debt service burden, receivables/payables timing, and liquidity runway.'
        : 'Respond in a supportive personal financial literacy tone focused on household budgeting, savings rate, debt repayment capacity, and emergency cash buffers.';

    const systemInstruction = `You are the SmartGrowth AI Educational Financial Assistant (Prompt ${AI_PROMPT_VERSION}).
${audienceInstruction}
STRICT RULES:
1. ONLY explain the user's already calculated deterministic metrics provided in JSON. NEVER compute or invent a composite credit score or change any metric numbers.
2. ONLY ground advice in the APPROVED KNOWLEDGE BASE RECORDS supplied below.
3. NEVER invent external financial providers, specific loan interest rates, loan terms, financing approvals, or claim Shariah certification/fatwas.
4. If the user's question asks for something outside the approved knowledge base or violates Rule 3, set unsupportedOrRestricted=true and explain clearly in refusalReason.
5. Keep summary concise (2-4 sentences) and return valid JSON matching the schema.`;

    const promptPayload = {
      audience,
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
        'Explain my calculated financial indicators and suggest grounded educational next steps.',
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
          assessment: params.assessment,
          question: userQuestion,
          sources: refs,
          kbSnippets: kbRecords.map((r) => ({ title: r.title, content: r.content })),
          unsupportedOrRestricted: true,
          refusalReason:
            'Response withheld by automated safety check to avoid unverified financing, provider, or Shariah certification claims.',
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
        fallbackReason: `Gemini API call failed (${errorMsg}). Returned deterministic, approved knowledge-base explanation.`,
      });
    }
  }
}
