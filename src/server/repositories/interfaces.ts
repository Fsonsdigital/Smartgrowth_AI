import type {
  AssessmentCalculationOutput,
  AssessmentResultRecord,
  AssessmentTemplate,
  AuditLogEntry,
  BusinessMembership,
  DatasetBatch,
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
  UserRole,
  WorkspaceMode,
} from '../../shared/types.js';

export interface UserWithPassword extends PublicUser {
  passwordHash: string;
}

export interface CreateUserInput {
  id: string;
  email: string;
  phone: string | null;
  fullName: string;
  passwordHash: string;
  role: UserRole;
  activeMode: WorkspaceMode;
  isSyntheticDemo?: boolean;
}

export interface IUserRepository {
  findByEmail(email: string): UserWithPassword | null;
  findById(id: string): PublicUser | null;
  listDemoUsers(): PublicUser[];
  listAllUsers(): PublicUser[];
  create(input: CreateUserInput): PublicUser;
  updateActiveMode(userId: string, mode: WorkspaceMode): PublicUser | null;
}

export interface IProfileRepository {
  getIndividualProfile(userId: string): IndividualProfile | null;
  upsertIndividualProfile(profile: Omit<IndividualProfile, 'updatedAt'>): IndividualProfile;
  listSmeProfilesForUser(userId: string): SmeProfile[];
  getSmeProfileById(smeProfileId: string): SmeProfile | null;
  createSmeProfile(profile: Omit<SmeProfile, 'updatedAt'>): SmeProfile;
  updateSmeProfile(
    smeProfileId: string,
    patch: Partial<Pick<SmeProfile, 'businessName' | 'sector' | 'registrationStatus' | 'staffCount' | 'currency'>>
  ): SmeProfile | null;
  listBusinessMemberships(smeProfileId: string): BusinessMembership[];
  hasSmeMembership(smeProfileId: string, userId: string): boolean;
  addBusinessMembership(input: {
    id: string;
    smeProfileId: string;
    userId: string;
    memberRole: 'owner' | 'finance_manager' | 'analyst';
    status: 'active' | 'invited';
  }): BusinessMembership;
}

export interface IAssessmentRepository {
  getTemplateByAudience(audience: WorkspaceMode): AssessmentTemplate | null;
  saveAssessment(params: {
    submissionId: string;
    resultId: string;
    userId: string;
    smeProfileId: string | null;
    templateId: string;
    audience: WorkspaceMode;
    answers: Record<string, unknown>;
    output: AssessmentCalculationOutput;
  }): AssessmentResultRecord;
  listResultsForUser(userId: string, audience?: WorkspaceMode): AssessmentResultRecord[];
  getResultById(resultId: string): AssessmentResultRecord | null;
}

export interface IRecommendationRepository {
  create(record: Omit<RecommendationRecord, 'createdAt'>): RecommendationRecord;
  listForUser(userId: string, audience?: WorkspaceMode): RecommendationRecord[];
  getById(id: string): RecommendationRecord | null;
}

export interface ILearningRepository {
  listAllForUser(userId: string): LearningContentItem[];
  getById(contentId: string, userId: string): LearningContentItem | null;
  markCompleted(userId: string, contentId: string, completed: boolean): void;
  createContent(item: Omit<LearningContentItem, 'completed' | 'completedAt'>): LearningContentItem;
}

export interface IReportRepository {
  create(report: Omit<ReportRecord, 'createdAt'>): ReportRecord;
  listForUser(userId: string): ReportRecord[];
  getById(reportId: string): ReportRecord | null;
}

export interface IDatasetRepository {
  createBatchWithRecords(params: {
    batch: Omit<DatasetBatch, 'createdAt' | 'reviewedAt' | 'autoTrained'>;
    records: Array<Omit<DatasetRecordItem, 'createdAt'>>;
  }): DatasetBatch;
  listBatches(datasetType?: DatasetType): DatasetBatch[];
  getBatchById(batchId: string): DatasetBatch | null;
  listRecordsForBatch(batchId: string): DatasetRecordItem[];
  listExistingHashes(datasetType: DatasetType): Set<string>;
  listApprovedKnowledgeRecords(audience: WorkspaceMode | 'all'): DatasetRecordItem[];
  listEvaluationRecords(statusFilter?: DatasetStatus): Array<DatasetRecordItem & { batchStatus: DatasetStatus }>;
  reviewBatch(params: {
    batchId: string;
    status: 'approved' | 'rejected';
    reviewedBy: string;
    reviewNotes: string;
  }): DatasetBatch | null;
  assignSplitForRecord(recordId: string, split: DatasetSplit): DatasetRecordItem | null;
  assignBatchSplits(batchId: string, ratios: { train: number; validation: number; test: number }): DatasetQualityReport | null;
}

export interface IAuditRepository {
  log(entry: {
    id: string;
    actorUserId: string | null;
    actorEmail: string | null;
    action: string;
    resourceType: string;
    resourceId: string | null;
    details: Record<string, unknown>;
  }): void;
  listRecent(limit?: number): AuditLogEntry[];
  getSystemCounts(): {
    users: number;
    assessments: number;
    recommendations: number;
    reports: number;
    datasetBatches: number;
    approvedKnowledgeRecords: number;
  };
}
