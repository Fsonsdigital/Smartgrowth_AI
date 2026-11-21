import type {
  AssessmentResultRecord,
  AssessmentTemplate,
  AuditLogEntry,
  BusinessMembership,
  DatasetBatch,
  DatasetFormat,
  DatasetQualityReport,
  DatasetRecordItem,
  DatasetSplit,
  DatasetStatus,
  DatasetType,
  IndividualProfile,
  LearningContentItem,
  PublicUser,
  RecommendationRecord,
  ReportRecord,
  SmeProfile,
  WorkspaceMode,
} from '../shared/types';

// Stored strictly in memory (never localStorage or sessionStorage)
let inMemoryToken: string | null = null;

export function setAuthToken(token: string | null): void {
  inMemoryToken = token;
}

export function getAuthToken(): string | null {
  return inMemoryToken;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (inMemoryToken) {
    headers.set('Authorization', `Bearer ${inMemoryToken}`);
  }

  const res = await fetch(path, { ...init, headers });
  const contentType = res.headers.get('content-type') ?? '';
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    if (contentType.includes('application/json')) {
      const errBody = (await res.json()) as { error?: string };
      if (errBody?.error) message = errBody.error;
    }
    throw new Error(message);
  }
  if (contentType.includes('application/json')) {
    return (await res.json()) as T;
  }
  return (await res.text()) as unknown as T;
}

export const api = {
  health: () =>
    request<{
      status: string;
      demoAccountsEnabled: boolean;
      geminiConfigured: boolean;
    }>('/api/health'),

  getDemoAccounts: () =>
    request<{ enabled: boolean; accounts: PublicUser[] }>('/api/auth/demo-accounts'),

  demoLogin: (userId: string) =>
    request<{ token: string; user: PublicUser }>('/api/auth/demo-login', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    }),

  login: (email: string, password: string) =>
    request<{ token: string; user: PublicUser }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (payload: {
    email: string;
    phone?: string;
    fullName: string;
    password: string;
    role: 'individual' | 'sme';
    businessName?: string;
    sector?: string;
  }) =>
    request<{ token: string; user: PublicUser }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getMe: () => request<{ user: PublicUser }>('/api/auth/me'),

  setMode: (mode: WorkspaceMode) =>
    request<{ user: PublicUser }>('/api/auth/mode', {
      method: 'PATCH',
      body: JSON.stringify({ mode }),
    }),

  getProfiles: () =>
    request<{
      individual: IndividualProfile | null;
      smes: SmeProfile[];
      memberships: BusinessMembership[];
    }>('/api/profiles'),

  updateIndividualProfile: (payload: Partial<IndividualProfile>) =>
    request<{ profile: IndividualProfile }>('/api/profiles/individual', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  createSmeProfile: (payload: {
    businessName: string;
    sector: string;
    registrationStatus: SmeProfile['registrationStatus'];
    staffCount: number;
    currency: string;
  }) =>
    request<{ sme: SmeProfile }>('/api/profiles/sme', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateSmeProfile: (
    smeId: string,
    payload: Partial<Pick<SmeProfile, 'businessName' | 'sector' | 'registrationStatus' | 'staffCount' | 'currency'>>
  ) =>
    request<{ sme: SmeProfile }>(`/api/profiles/sme/${encodeURIComponent(smeId)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  addSmeMember: (smeId: string, payload: { email: string; memberRole: 'finance_manager' | 'analyst' }) =>
    request<{ membership: BusinessMembership }>(
      `/api/profiles/sme/${encodeURIComponent(smeId)}/members`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    ),

  getAssessmentTemplate: (audience: WorkspaceMode) =>
    request<{ template: AssessmentTemplate }>(`/api/assessments/templates/${audience}`),

  listAssessments: (audience?: WorkspaceMode) =>
    request<{ results: AssessmentResultRecord[] }>(
      audience ? `/api/assessments?audience=${audience}` : '/api/assessments'
    ),

  submitAssessment: (payload: {
    audience: WorkspaceMode;
    answers: Record<string, unknown>;
    smeProfileId?: string | null;
  }) =>
    request<{ result: AssessmentResultRecord }>('/api/assessments', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  listRecommendations: (audience?: WorkspaceMode) =>
    request<{ recommendations: RecommendationRecord[] }>(
      audience ? `/api/recommendations?audience=${audience}` : '/api/recommendations'
    ),

  generateRecommendation: (payload: { assessmentResultId: string; question?: string }) =>
    request<{ recommendation: RecommendationRecord }>('/api/recommendations/generate', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  listKnowledge: (audience: WorkspaceMode | 'all') =>
    request<{ records: DatasetRecordItem[] }>(`/api/knowledge?audience=${audience}`),

  listLearning: () => request<{ items: LearningContentItem[] }>('/api/learning'),

  setLearningProgress: (contentId: string, completed: boolean) =>
    request<{ item: LearningContentItem }>(
      `/api/learning/${encodeURIComponent(contentId)}/progress`,
      {
        method: 'POST',
        body: JSON.stringify({ completed }),
      }
    ),

  listReports: () => request<{ reports: ReportRecord[] }>('/api/reports'),

  createReport: (payload: {
    assessmentResultId: string;
    reportType: 'financial_health' | 'credit_readiness';
  }) =>
    request<{ report: ReportRecord }>('/api/reports', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  adminOverview: () =>
    request<{
      counts: {
        users: number;
        assessments: number;
        recommendations: number;
        reports: number;
        datasetBatches: number;
        approvedKnowledgeRecords: number;
      };
      users: PublicUser[];
      auditLogs: AuditLogEntry[];
    }>('/api/admin/overview'),

  adminListDatasets: (type?: DatasetType) =>
    request<{ batches: DatasetBatch[] }>(
      type ? `/api/admin/datasets?type=${type}` : '/api/admin/datasets'
    ),

  adminGetBatch: (batchId: string) =>
    request<{ batch: DatasetBatch; records: DatasetRecordItem[] }>(
      `/api/admin/datasets/${encodeURIComponent(batchId)}`
    ),

  adminPreviewDataset: (payload: {
    datasetType: DatasetType;
    format: DatasetFormat;
    rawText: string;
  }) =>
    request<{ parsedRows: Array<Record<string, unknown>>; qualityReport: DatasetQualityReport }>(
      '/api/admin/datasets/preview',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    ),

  adminImportDataset: (payload: {
    name: string;
    datasetType: DatasetType;
    format: DatasetFormat;
    version: string;
    rawText: string;
  }) =>
    request<{ batch: DatasetBatch; records: DatasetRecordItem[] }>('/api/admin/datasets/import', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  adminReviewBatch: (batchId: string, decision: 'approved' | 'rejected', reviewNotes: string) =>
    request<{ batch: DatasetBatch; records: DatasetRecordItem[] }>(
      `/api/admin/datasets/${encodeURIComponent(batchId)}/review`,
      {
        method: 'POST',
        body: JSON.stringify({ decision, reviewNotes }),
      }
    ),

  adminAssignSplit: (recordId: string, split: DatasetSplit) =>
    request<{ record: DatasetRecordItem }>(
      `/api/admin/datasets/records/${encodeURIComponent(recordId)}/split`,
      {
        method: 'PATCH',
        body: JSON.stringify({ split }),
      }
    ),

  adminAssignBatchSplits: (
    batchId: string,
    ratios: { train: number; validation: number; test: number }
  ) =>
    request<{ batch: DatasetBatch; records: DatasetRecordItem[] }>(
      `/api/admin/datasets/${encodeURIComponent(batchId)}/assign-splits`,
      {
        method: 'POST',
        body: JSON.stringify(ratios),
      }
    ),

  adminExportBatch: async (batchId: string, format: DatasetFormat) => {
    const content = await request<string>(
      `/api/admin/datasets/${encodeURIComponent(batchId)}/export?format=${format}`
    );
    const blob = new Blob([content], {
      type: format === 'csv' ? 'text/csv;charset=utf-8' : 'application/x-ndjson',
    });
    triggerDownload(blob, `smartgrowth-${batchId}.${format}`);
  },

  adminListEvaluations: () =>
    request<{ evaluations: Array<DatasetRecordItem & { batchStatus: DatasetStatus }> }>(
      '/api/admin/evaluations'
    ),
};

export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
