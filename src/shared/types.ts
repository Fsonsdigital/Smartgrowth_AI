export type AppLanguage = 'en' | 'ha';
export type UserRole = 'individual' | 'sme' | 'admin';
export type WorkspaceMode = 'individual' | 'sme';
export type MetricBand = 'Strong' | 'Stable' | 'Watch' | 'Critical' | 'Insufficient Data';

export const SUPPORTED_CURRENCIES = [
  { code: 'USD', label: 'USD ($) — US Dollar' },
  { code: 'GBP', label: 'GBP (£) — British Pound' },
  { code: 'EUR', label: 'EUR (€) — Euro' },
  { code: 'NGN', label: 'NGN (₦) — Nigerian Naira' },
  { code: 'KES', label: 'KES — Kenyan Shilling' },
  { code: 'GHS', label: 'GHS — Ghanaian Cedi' },
  { code: 'ZAR', label: 'ZAR — South African Rand' },
  { code: 'AED', label: 'AED — UAE Dirham' },
  { code: 'SAR', label: 'SAR — Saudi Riyal' },
  { code: 'MYR', label: 'MYR — Malaysian Ringgit' },
  { code: 'INR', label: 'INR (₹) — Indian Rupee' },
  { code: 'CAD', label: 'CAD ($) — Canadian Dollar' },
] as const;

export type ScreenId =
  | 'onboarding'
  | 'auth'
  | 'dashboard'
  | 'assessment'
  | 'readiness'
  | 'recommendations'
  | 'sme'
  | 'ethical'
  | 'learning'
  | 'reports'
  | 'admin';

export interface PublicUser {
  id: string;
  email: string;
  phone: string | null;
  fullName: string;
  role: UserRole;
  activeMode: WorkspaceMode;
  isSyntheticDemo: boolean;
  createdAt: string;
}

export interface IndividualProfile {
  id: string;
  userId: string;
  occupation: string;
  city: string;
  currency: string;
  monthlyIncomeGoal: number;
  emergencyFundTargetMonths: number;
  updatedAt: string;
}

export interface SmeProfile {
  id: string;
  ownerUserId: string;
  businessName: string;
  sector: string;
  registrationStatus: 'registered' | 'informal' | 'in_progress';
  staffCount: number;
  currency: string;
  updatedAt: string;
}

export interface BusinessMembership {
  id: string;
  smeProfileId: string;
  userId: string;
  memberName: string;
  memberEmail: string;
  memberRole: 'owner' | 'finance_manager' | 'analyst';
  status: 'active' | 'invited';
  createdAt: string;
}

export interface AssessmentQuestion {
  id: string;
  templateId: string;
  fieldKey: string;
  stepNumber: number;
  label: string;
  helpText: string;
  inputType: 'currency' | 'number' | 'select';
  unit: string;
  isRequired: boolean;
  minValue: number;
  sortOrder: number;
  options?: string[];
}

export interface AssessmentTemplate {
  id: string;
  slug: string;
  audience: WorkspaceMode;
  title: string;
  version: string;
  description: string;
  questions: AssessmentQuestion[];
}

export interface FormulaExplanation {
  key: string;
  label: string;
  formula: string;
  inputsUsed: Record<string, number | string | null>;
  value: number | null;
  formattedValue: string;
  unit: '%' | 'currency' | 'months' | 'ratio';
  band: MetricBand;
  explanation: string;
}

export interface IndividualAssessmentInput {
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlySavings: number;
  totalLiquidSavings: number;
  monthlyDebtRepayment: number;
  totalDebt: number;
  dependentsCount: number;
  incomeStability: 'steady' | 'variable' | 'seasonal';
}

export interface SmeAssessmentInput {
  monthlyRevenue: number;
  monthlyOperatingExpenses: number;
  monthlyDebtService: number;
  cashOnHand: number;
  accountsReceivable: number;
  accountsPayable: number;
  recordKeepingMethod: 'digital' | 'spreadsheet' | 'paper' | 'none';
}

export interface AssessmentCalculationOutput {
  audience: WorkspaceMode;
  calculationVersion: string;
  compositeScore: null;
  compositeScorePolicy: 'DISABLED_UNVALIDATED_COMPOSITE';
  readinessTier: 'Resilient' | 'Developing' | 'Vulnerable' | 'Needs Data';
  summaryStatement: string;
  metrics: Record<string, number | null>;
  formulas: FormulaExplanation[];
  dataQualityFlags: string[];
}

export interface AssessmentResultRecord {
  id: string;
  submissionId: string;
  userId: string;
  smeProfileId: string | null;
  audience: WorkspaceMode;
  calculationVersion: string;
  answers: Record<string, unknown>;
  output: AssessmentCalculationOutput;
  createdAt: string;
}

export interface KnowledgeSourceRef {
  recordId: string;
  title: string;
  audience: string;
  version: string;
  source: string;
}

export interface StructuredAiOutput {
  summary: string;
  calculatedMetricsExplained: Array<{
    metricLabel: string;
    observedValue: string;
    interpretation: string;
  }>;
  educationalActions: Array<{
    title: string;
    rationale: string;
    category: string;
  }>;
  learningSuggestions: string[];
  limitationsAndDisclosures: string[];
  unsupportedOrRestricted: boolean;
  refusalReason?: string;
}

export interface RecommendationRecord {
  id: string;
  userId: string;
  assessmentResultId: string | null;
  audience: WorkspaceMode;
  promptVersion: string;
  modelName: string;
  question: string | null;
  structuredOutput: StructuredAiOutput;
  sources: KnowledgeSourceRef[];
  safetyPassed: boolean;
  safetyFlags: string[];
  fallbackUsed: boolean;
  fallbackReason: string | null;
  createdAt: string;
}

export interface LearningContentItem {
  id: string;
  slug: string;
  title: string;
  category: 'courses' | 'articles' | 'videos';
  audience: 'individual' | 'sme' | 'all';
  durationMinutes: number;
  level: 'Beginner' | 'Intermediate' | 'Applied';
  summary: string;
  bodyMarkdown: string;
  sourceRef: string;
  completed: boolean;
  completedAt: string | null;
}

export interface ReportRecord {
  id: string;
  userId: string;
  assessmentResultId: string;
  reportType: 'financial_health' | 'credit_readiness';
  title: string;
  snapshot: {
    generatedAt: string;
    isSyntheticDemo: boolean;
    ownerName: string;
    currency: string;
    audience: WorkspaceMode;
    calculationVersion: string;
    readinessTier: string;
    formulas: FormulaExplanation[];
    dataQualityFlags: string[];
    latestRecommendationSummary: string | null;
    disclaimer: string;
  };
  createdAt: string;
}

export type DatasetType = 'knowledge_base' | 'evaluation' | 'fine_tuning';
export type DatasetFormat = 'csv' | 'jsonl';
export type DatasetStatus = 'pending_review' | 'approved' | 'rejected';
export type DatasetSplit = 'unassigned' | 'train' | 'validation' | 'test';

export interface DatasetQualityReport {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  completenessRate: number;
  audienceBreakdown: Record<string, number>;
  splitBreakdown: Record<DatasetSplit, number>;
  schemaIssues: Array<{ rowNumber: number; errors: string[] }>;
}

export interface DatasetBatch {
  id: string;
  name: string;
  datasetType: DatasetType;
  sourceFormat: DatasetFormat;
  version: string;
  status: DatasetStatus;
  autoTrained: false;
  uploadedBy: string;
  reviewedBy: string | null;
  reviewNotes: string | null;
  qualityReport: DatasetQualityReport;
  totalRecords: number;
  validRecords: number;
  duplicateCount: number;
  createdAt: string;
  reviewedAt: string | null;
}

export interface DatasetRecordItem {
  id: string;
  batchId: string;
  datasetType: DatasetType;
  externalId: string;
  audience: 'individual' | 'sme' | 'all';
  title: string;
  content: string;
  metadata: Record<string, unknown>;
  split: DatasetSplit;
  contentHash: string;
  validationStatus: 'valid' | 'invalid' | 'duplicate';
  validationErrors: string[];
  isActiveInKb: boolean;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  actorUserId: string | null;
  actorEmail: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  details: Record<string, unknown>;
  createdAt: string;
}
