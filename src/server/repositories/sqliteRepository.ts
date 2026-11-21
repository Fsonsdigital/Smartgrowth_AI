import type Database from 'better-sqlite3';
import type {
  AssessmentCalculationOutput,
  AssessmentQuestion,
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
  WorkspaceMode,
} from '../../shared/types.js';
import type {
  CreateUserInput,
  IAssessmentRepository,
  IAuditRepository,
  IDatasetRepository,
  ILearningRepository,
  IProfileRepository,
  IRecommendationRepository,
  IReportRepository,
  IUserRepository,
  UserWithPassword,
} from './interfaces.js';

function mapUser(row: Record<string, unknown>): PublicUser {
  return {
    id: String(row.id),
    email: String(row.email),
    phone: row.phone ? String(row.phone) : null,
    fullName: String(row.full_name),
    role: row.role as PublicUser['role'],
    activeMode: row.active_mode as WorkspaceMode,
    isSyntheticDemo: Number(row.is_synthetic_demo) === 1,
    createdAt: String(row.created_at),
  };
}

export class SqliteUserRepository implements IUserRepository {
  constructor(private readonly db: Database.Database) {}

  findByEmail(email: string): UserWithPassword | null {
    const row = this.db
      .prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)')
      .get(email.trim()) as Record<string, unknown> | undefined;
    if (!row) return null;
    return {
      ...mapUser(row),
      passwordHash: String(row.password_hash),
    };
  }

  findById(id: string): PublicUser | null {
    const row = this.db.prepare('SELECT * FROM users WHERE id = ?').get(id) as
      | Record<string, unknown>
      | undefined;
    return row ? mapUser(row) : null;
  }

  listDemoUsers(): PublicUser[] {
    const rows = this.db
      .prepare('SELECT * FROM users WHERE is_synthetic_demo = 1 ORDER BY role ASC, created_at ASC')
      .all() as Array<Record<string, unknown>>;
    return rows.map(mapUser);
  }

  listAllUsers(): PublicUser[] {
    const rows = this.db
      .prepare('SELECT * FROM users ORDER BY created_at DESC')
      .all() as Array<Record<string, unknown>>;
    return rows.map(mapUser);
  }

  create(input: CreateUserInput): PublicUser {
    const now = new Date().toISOString();
    this.db
      .prepare(
        `INSERT INTO users (id, email, phone, full_name, password_hash, role, active_mode, is_synthetic_demo, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        input.id,
        input.email.toLowerCase().trim(),
        input.phone,
        input.fullName.trim(),
        input.passwordHash,
        input.role,
        input.activeMode,
        input.isSyntheticDemo ? 1 : 0,
        now,
        now
      );
    return this.findById(input.id)!;
  }

  updateActiveMode(userId: string, mode: WorkspaceMode): PublicUser | null {
    const now = new Date().toISOString();
    this.db
      .prepare('UPDATE users SET active_mode = ?, updated_at = ? WHERE id = ?')
      .run(mode, now, userId);
    return this.findById(userId);
  }
}

export class SqliteProfileRepository implements IProfileRepository {
  constructor(private readonly db: Database.Database) {}

  getIndividualProfile(userId: string): IndividualProfile | null {
    const row = this.db
      .prepare('SELECT * FROM individual_profiles WHERE user_id = ?')
      .get(userId) as Record<string, unknown> | undefined;
    if (!row) return null;
    return {
      id: String(row.id),
      userId: String(row.user_id),
      occupation: String(row.occupation),
      city: String(row.city),
      currency: String(row.currency),
      monthlyIncomeGoal: Number(row.monthly_income_goal),
      emergencyFundTargetMonths: Number(row.emergency_fund_target_months),
      updatedAt: String(row.updated_at),
    };
  }

  upsertIndividualProfile(profile: Omit<IndividualProfile, 'updatedAt'>): IndividualProfile {
    const now = new Date().toISOString();
    const existing = this.getIndividualProfile(profile.userId);
    if (existing) {
      this.db
        .prepare(
          `UPDATE individual_profiles
           SET occupation = ?, city = ?, currency = ?, monthly_income_goal = ?, emergency_fund_target_months = ?, updated_at = ?
           WHERE user_id = ?`
        )
        .run(
          profile.occupation,
          profile.city,
          profile.currency,
          profile.monthlyIncomeGoal,
          profile.emergencyFundTargetMonths,
          now,
          profile.userId
        );
    } else {
      this.db
        .prepare(
          `INSERT INTO individual_profiles (id, user_id, occupation, city, currency, monthly_income_goal, emergency_fund_target_months, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          profile.id,
          profile.userId,
          profile.occupation,
          profile.city,
          profile.currency,
          profile.monthlyIncomeGoal,
          profile.emergencyFundTargetMonths,
          now
        );
    }
    return this.getIndividualProfile(profile.userId)!;
  }

  private mapSme(row: Record<string, unknown>): SmeProfile {
    return {
      id: String(row.id),
      ownerUserId: String(row.owner_user_id),
      businessName: String(row.business_name),
      sector: String(row.sector),
      registrationStatus: row.registration_status as SmeProfile['registrationStatus'],
      staffCount: Number(row.staff_count),
      currency: String(row.currency),
      updatedAt: String(row.updated_at),
    };
  }

  listSmeProfilesForUser(userId: string): SmeProfile[] {
    const rows = this.db
      .prepare(
        `SELECT DISTINCT sp.* FROM sme_profiles sp
         LEFT JOIN business_memberships bm ON bm.sme_profile_id = sp.id
         WHERE sp.owner_user_id = ? OR (bm.user_id = ? AND bm.status = 'active')
         ORDER BY sp.updated_at DESC`
      )
      .all(userId, userId) as Array<Record<string, unknown>>;
    return rows.map((r) => this.mapSme(r));
  }

  getSmeProfileById(smeProfileId: string): SmeProfile | null {
    const row = this.db.prepare('SELECT * FROM sme_profiles WHERE id = ?').get(smeProfileId) as
      | Record<string, unknown>
      | undefined;
    return row ? this.mapSme(row) : null;
  }

  createSmeProfile(profile: Omit<SmeProfile, 'updatedAt'>): SmeProfile {
    const now = new Date().toISOString();
    this.db
      .prepare(
        `INSERT INTO sme_profiles (id, owner_user_id, business_name, sector, registration_status, staff_count, currency, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        profile.id,
        profile.ownerUserId,
        profile.businessName,
        profile.sector,
        profile.registrationStatus,
        profile.staffCount,
        profile.currency,
        now
      );
    return this.getSmeProfileById(profile.id)!;
  }

  updateSmeProfile(
    smeProfileId: string,
    patch: Partial<Pick<SmeProfile, 'businessName' | 'sector' | 'registrationStatus' | 'staffCount' | 'currency'>>
  ): SmeProfile | null {
    const current = this.getSmeProfileById(smeProfileId);
    if (!current) return null;
    const now = new Date().toISOString();
    this.db
      .prepare(
        `UPDATE sme_profiles
         SET business_name = ?, sector = ?, registration_status = ?, staff_count = ?, currency = ?, updated_at = ?
         WHERE id = ?`
      )
      .run(
        patch.businessName ?? current.businessName,
        patch.sector ?? current.sector,
        patch.registrationStatus ?? current.registrationStatus,
        patch.staffCount ?? current.staffCount,
        patch.currency ?? current.currency,
        now,
        smeProfileId
      );
    return this.getSmeProfileById(smeProfileId);
  }

  listBusinessMemberships(smeProfileId: string): BusinessMembership[] {
    const rows = this.db
      .prepare(
        `SELECT bm.*, u.full_name AS member_name, u.email AS member_email
         FROM business_memberships bm
         JOIN users u ON u.id = bm.user_id
         WHERE bm.sme_profile_id = ?
         ORDER BY bm.created_at ASC`
      )
      .all(smeProfileId) as Array<Record<string, unknown>>;
    return rows.map((row) => ({
      id: String(row.id),
      smeProfileId: String(row.sme_profile_id),
      userId: String(row.user_id),
      memberName: String(row.member_name),
      memberEmail: String(row.member_email),
      memberRole: row.member_role as BusinessMembership['memberRole'],
      status: row.status as BusinessMembership['status'],
      createdAt: String(row.created_at),
    }));
  }

  hasSmeMembership(smeProfileId: string, userId: string): boolean {
    const row = this.db
      .prepare(
        `SELECT sp.id FROM sme_profiles sp
         LEFT JOIN business_memberships bm ON bm.sme_profile_id = sp.id AND bm.user_id = ?
         WHERE sp.id = ? AND (sp.owner_user_id = ? OR (bm.user_id = ? AND bm.status = 'active'))`
      )
      .get(userId, smeProfileId, userId, userId);
    return Boolean(row);
  }

  addBusinessMembership(input: {
    id: string;
    smeProfileId: string;
    userId: string;
    memberRole: 'owner' | 'finance_manager' | 'analyst';
    status: 'active' | 'invited';
  }): BusinessMembership {
    const now = new Date().toISOString();
    this.db
      .prepare(
        `INSERT INTO business_memberships (id, sme_profile_id, user_id, member_role, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(sme_profile_id, user_id) DO UPDATE SET member_role = excluded.member_role, status = excluded.status`
      )
      .run(input.id, input.smeProfileId, input.userId, input.memberRole, input.status, now);

    const rows = this.listBusinessMemberships(input.smeProfileId);
    return rows.find((r) => r.userId === input.userId)!;
  }
}

export class SqliteAssessmentRepository implements IAssessmentRepository {
  constructor(private readonly db: Database.Database) {}

  getTemplateByAudience(audience: WorkspaceMode): AssessmentTemplate | null {
    const tpl = this.db
      .prepare('SELECT * FROM assessment_templates WHERE audience = ? AND is_active = 1 LIMIT 1')
      .get(audience) as Record<string, unknown> | undefined;
    if (!tpl) return null;

    const qRows = this.db
      .prepare('SELECT * FROM assessment_questions WHERE template_id = ? ORDER BY sort_order ASC')
      .all(String(tpl.id)) as Array<Record<string, unknown>>;

    const questions: AssessmentQuestion[] = qRows.map((q) => ({
      id: String(q.id),
      templateId: String(q.template_id),
      fieldKey: String(q.field_key),
      stepNumber: Number(q.step_number),
      label: String(q.label),
      helpText: String(q.help_text),
      inputType: q.input_type as AssessmentQuestion['inputType'],
      unit: String(q.unit),
      isRequired: Number(q.is_required) === 1,
      minValue: Number(q.min_value),
      sortOrder: Number(q.sort_order),
      options: q.options_json ? (JSON.parse(String(q.options_json)) as string[]) : undefined,
    }));

    return {
      id: String(tpl.id),
      slug: String(tpl.slug),
      audience: tpl.audience as WorkspaceMode,
      title: String(tpl.title),
      version: String(tpl.version),
      description: String(tpl.description),
      questions,
    };
  }

  saveAssessment(params: {
    submissionId: string;
    resultId: string;
    userId: string;
    smeProfileId: string | null;
    templateId: string;
    audience: WorkspaceMode;
    answers: Record<string, unknown>;
    output: AssessmentCalculationOutput;
  }): AssessmentResultRecord {
    const now = new Date().toISOString();
    const tx = this.db.transaction(() => {
      this.db
        .prepare(
          `INSERT INTO assessment_submissions (id, user_id, sme_profile_id, template_id, audience, answers_json, calculation_version, status, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'calculated', ?)`
        )
        .run(
          params.submissionId,
          params.userId,
          params.smeProfileId,
          params.templateId,
          params.audience,
          JSON.stringify(params.answers),
          params.output.calculationVersion,
          now
        );

      this.db
        .prepare(
          `INSERT INTO assessment_results (id, submission_id, user_id, sme_profile_id, audience, calculation_version, output_json, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          params.resultId,
          params.submissionId,
          params.userId,
          params.smeProfileId,
          params.audience,
          params.output.calculationVersion,
          JSON.stringify(params.output),
          now
        );
    });
    tx();
    return this.getResultById(params.resultId)!;
  }

  private mapResultRow(row: Record<string, unknown>): AssessmentResultRecord {
    return {
      id: String(row.id),
      submissionId: String(row.submission_id),
      userId: String(row.user_id),
      smeProfileId: row.sme_profile_id ? String(row.sme_profile_id) : null,
      audience: row.audience as WorkspaceMode,
      calculationVersion: String(row.calculation_version),
      answers: JSON.parse(String(row.answers_json)) as Record<string, unknown>,
      output: JSON.parse(String(row.output_json)) as AssessmentCalculationOutput,
      createdAt: String(row.created_at),
    };
  }

  listResultsForUser(userId: string, audience?: WorkspaceMode): AssessmentResultRecord[] {
    const sql = audience
      ? `SELECT ar.*, asub.answers_json FROM assessment_results ar
         JOIN assessment_submissions asub ON asub.id = ar.submission_id
         WHERE ar.user_id = ? AND ar.audience = ?
         ORDER BY ar.created_at DESC`
      : `SELECT ar.*, asub.answers_json FROM assessment_results ar
         JOIN assessment_submissions asub ON asub.id = ar.submission_id
         WHERE ar.user_id = ?
         ORDER BY ar.created_at DESC`;
    const rows = (audience
      ? this.db.prepare(sql).all(userId, audience)
      : this.db.prepare(sql).all(userId)) as Array<Record<string, unknown>>;
    return rows.map((r) => this.mapResultRow(r));
  }

  getResultById(resultId: string): AssessmentResultRecord | null {
    const row = this.db
      .prepare(
        `SELECT ar.*, asub.answers_json FROM assessment_results ar
         JOIN assessment_submissions asub ON asub.id = ar.submission_id
         WHERE ar.id = ?`
      )
      .get(resultId) as Record<string, unknown> | undefined;
    return row ? this.mapResultRow(row) : null;
  }
}

export class SqliteRecommendationRepository implements IRecommendationRepository {
  constructor(private readonly db: Database.Database) {}

  private mapRow(row: Record<string, unknown>): RecommendationRecord {
    return {
      id: String(row.id),
      userId: String(row.user_id),
      assessmentResultId: row.assessment_result_id ? String(row.assessment_result_id) : null,
      audience: row.audience as WorkspaceMode,
      promptVersion: String(row.prompt_version),
      modelName: String(row.model_name),
      question: row.question ? String(row.question) : null,
      structuredOutput: JSON.parse(String(row.structured_output_json)),
      sources: JSON.parse(String(row.sources_json)),
      safetyPassed: Number(row.safety_passed) === 1,
      safetyFlags: JSON.parse(String(row.safety_flags_json ?? '[]')),
      fallbackUsed: Number(row.fallback_used) === 1,
      fallbackReason: row.fallback_reason ? String(row.fallback_reason) : null,
      createdAt: String(row.created_at),
    };
  }

  create(record: Omit<RecommendationRecord, 'createdAt'>): RecommendationRecord {
    const now = new Date().toISOString();
    this.db
      .prepare(
        `INSERT INTO recommendations (id, user_id, assessment_result_id, audience, prompt_version, model_name, question, structured_output_json, sources_json, safety_passed, safety_flags_json, fallback_used, fallback_reason, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        record.id,
        record.userId,
        record.assessmentResultId,
        record.audience,
        record.promptVersion,
        record.modelName,
        record.question,
        JSON.stringify(record.structuredOutput),
        JSON.stringify(record.sources),
        record.safetyPassed ? 1 : 0,
        JSON.stringify(record.safetyFlags),
        record.fallbackUsed ? 1 : 0,
        record.fallbackReason,
        now
      );
    return this.getById(record.id)!;
  }

  listForUser(userId: string, audience?: WorkspaceMode): RecommendationRecord[] {
    const rows = (audience
      ? this.db
          .prepare('SELECT * FROM recommendations WHERE user_id = ? AND audience = ? ORDER BY created_at DESC')
          .all(userId, audience)
      : this.db
          .prepare('SELECT * FROM recommendations WHERE user_id = ? ORDER BY created_at DESC')
          .all(userId)) as Array<Record<string, unknown>>;
    return rows.map((r) => this.mapRow(r));
  }

  getById(id: string): RecommendationRecord | null {
    const row = this.db.prepare('SELECT * FROM recommendations WHERE id = ?').get(id) as
      | Record<string, unknown>
      | undefined;
    return row ? this.mapRow(row) : null;
  }
}

export class SqliteLearningRepository implements ILearningRepository {
  constructor(private readonly db: Database.Database) {}

  private mapRow(row: Record<string, unknown>): LearningContentItem {
    return {
      id: String(row.id),
      slug: String(row.slug),
      title: String(row.title),
      category: row.category as LearningContentItem['category'],
      audience: row.audience as LearningContentItem['audience'],
      durationMinutes: Number(row.duration_minutes),
      level: row.level as LearningContentItem['level'],
      summary: String(row.summary),
      bodyMarkdown: String(row.body_markdown),
      sourceRef: String(row.source_ref),
      completed: row.progress_status === 'completed',
      completedAt: row.completed_at ? String(row.completed_at) : null,
    };
  }

  listAllForUser(userId: string): LearningContentItem[] {
    const rows = this.db
      .prepare(
        `SELECT lc.*, lp.status AS progress_status, lp.completed_at
         FROM learning_contents lc
         LEFT JOIN learning_progress lp ON lp.content_id = lc.id AND lp.user_id = ?
         WHERE lc.is_published = 1
         ORDER BY lc.created_at ASC`
      )
      .all(userId) as Array<Record<string, unknown>>;
    return rows.map((r) => this.mapRow(r));
  }

  getById(contentId: string, userId: string): LearningContentItem | null {
    const row = this.db
      .prepare(
        `SELECT lc.*, lp.status AS progress_status, lp.completed_at
         FROM learning_contents lc
         LEFT JOIN learning_progress lp ON lp.content_id = lc.id AND lp.user_id = ?
         WHERE lc.id = ?`
      )
      .get(userId, contentId) as Record<string, unknown> | undefined;
    return row ? this.mapRow(row) : null;
  }

  markCompleted(userId: string, contentId: string, completed: boolean): void {
    const now = new Date().toISOString();
    const id = `lp_${userId}_${contentId}`;
    this.db
      .prepare(
        `INSERT INTO learning_progress (id, user_id, content_id, status, completed_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(user_id, content_id) DO UPDATE SET status = excluded.status, completed_at = excluded.completed_at`
      )
      .run(id, userId, contentId, completed ? 'completed' : 'started', completed ? now : null);
  }

  createContent(item: Omit<LearningContentItem, 'completed' | 'completedAt'>): LearningContentItem {
    const now = new Date().toISOString();
    this.db
      .prepare(
        `INSERT INTO learning_contents (id, slug, title, category, audience, duration_minutes, level, summary, body_markdown, source_ref, is_published, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`
      )
      .run(
        item.id,
        item.slug,
        item.title,
        item.category,
        item.audience,
        item.durationMinutes,
        item.level,
        item.summary,
        item.bodyMarkdown,
        item.sourceRef,
        now
      );
    return { ...item, completed: false, completedAt: null };
  }
}

export class SqliteReportRepository implements IReportRepository {
  constructor(private readonly db: Database.Database) {}

  private mapRow(row: Record<string, unknown>): ReportRecord {
    return {
      id: String(row.id),
      userId: String(row.user_id),
      assessmentResultId: String(row.assessment_result_id),
      reportType: row.report_type as ReportRecord['reportType'],
      title: String(row.title),
      snapshot: JSON.parse(String(row.snapshot_json)),
      createdAt: String(row.created_at),
    };
  }

  create(report: Omit<ReportRecord, 'createdAt'>): ReportRecord {
    const now = new Date().toISOString();
    this.db
      .prepare(
        `INSERT INTO reports (id, user_id, assessment_result_id, report_type, title, snapshot_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        report.id,
        report.userId,
        report.assessmentResultId,
        report.reportType,
        report.title,
        JSON.stringify(report.snapshot),
        now
      );
    return this.getById(report.id)!;
  }

  listForUser(userId: string): ReportRecord[] {
    const rows = this.db
      .prepare('SELECT * FROM reports WHERE user_id = ? ORDER BY created_at DESC')
      .all(userId) as Array<Record<string, unknown>>;
    return rows.map((r) => this.mapRow(r));
  }

  getById(reportId: string): ReportRecord | null {
    const row = this.db.prepare('SELECT * FROM reports WHERE id = ?').get(reportId) as
      | Record<string, unknown>
      | undefined;
    return row ? this.mapRow(row) : null;
  }
}

export class SqliteDatasetRepository implements IDatasetRepository {
  constructor(private readonly db: Database.Database) {}

  private mapBatch(row: Record<string, unknown>): DatasetBatch {
    return {
      id: String(row.id),
      name: String(row.name),
      datasetType: row.dataset_type as DatasetType,
      sourceFormat: row.source_format as DatasetBatch['sourceFormat'],
      version: String(row.version),
      status: row.status as DatasetStatus,
      autoTrained: false,
      uploadedBy: String(row.uploaded_by),
      reviewedBy: row.reviewed_by ? String(row.reviewed_by) : null,
      reviewNotes: row.review_notes ? String(row.review_notes) : null,
      qualityReport: JSON.parse(String(row.quality_report_json)) as DatasetQualityReport,
      totalRecords: Number(row.total_records),
      validRecords: Number(row.valid_records),
      duplicateCount: Number(row.duplicate_count),
      createdAt: String(row.created_at),
      reviewedAt: row.reviewed_at ? String(row.reviewed_at) : null,
    };
  }

  private mapRecord(row: Record<string, unknown>): DatasetRecordItem {
    return {
      id: String(row.id),
      batchId: String(row.batch_id),
      datasetType: row.dataset_type as DatasetType,
      externalId: String(row.external_id),
      audience: row.audience as DatasetRecordItem['audience'],
      title: String(row.title),
      content: String(row.content),
      metadata: JSON.parse(String(row.metadata_json)),
      split: row.split as DatasetSplit,
      contentHash: String(row.content_hash),
      validationStatus: row.validation_status as DatasetRecordItem['validationStatus'],
      validationErrors: JSON.parse(String(row.validation_errors_json)),
      isActiveInKb: Number(row.is_active_in_kb) === 1,
      createdAt: String(row.created_at),
    };
  }

  createBatchWithRecords(params: {
    batch: Omit<DatasetBatch, 'createdAt' | 'reviewedAt' | 'autoTrained'>;
    records: Array<Omit<DatasetRecordItem, 'createdAt'>>;
  }): DatasetBatch {
    const now = new Date().toISOString();
    const tx = this.db.transaction(() => {
      this.db
        .prepare(
          `INSERT INTO dataset_batches (id, name, dataset_type, source_format, version, status, uploaded_by, reviewed_by, review_notes, quality_report_json, total_records, valid_records, duplicate_count, created_at, reviewed_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          params.batch.id,
          params.batch.name,
          params.batch.datasetType,
          params.batch.sourceFormat,
          params.batch.version,
          params.batch.status,
          params.batch.uploadedBy,
          params.batch.reviewedBy,
          params.batch.reviewNotes,
          JSON.stringify(params.batch.qualityReport),
          params.batch.totalRecords,
          params.batch.validRecords,
          params.batch.duplicateCount,
          now,
          params.batch.status === 'approved' ? now : null
        );

      const stmt = this.db.prepare(
        `INSERT INTO dataset_records (id, batch_id, dataset_type, external_id, audience, title, content, metadata_json, split, content_hash, validation_status, validation_errors_json, is_active_in_kb, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );
      for (const rec of params.records) {
        stmt.run(
          rec.id,
          rec.batchId,
          rec.datasetType,
          rec.externalId,
          rec.audience,
          rec.title,
          rec.content,
          JSON.stringify(rec.metadata),
          rec.split,
          rec.contentHash,
          rec.validationStatus,
          JSON.stringify(rec.validationErrors),
          rec.isActiveInKb ? 1 : 0,
          now
        );
      }
    });
    tx();
    return this.getBatchById(params.batch.id)!;
  }

  listBatches(datasetType?: DatasetType): DatasetBatch[] {
    const rows = (datasetType
      ? this.db
          .prepare('SELECT * FROM dataset_batches WHERE dataset_type = ? ORDER BY created_at DESC')
          .all(datasetType)
      : this.db.prepare('SELECT * FROM dataset_batches ORDER BY created_at DESC').all()) as Array<
      Record<string, unknown>
    >;
    return rows.map((r) => this.mapBatch(r));
  }

  getBatchById(batchId: string): DatasetBatch | null {
    const row = this.db.prepare('SELECT * FROM dataset_batches WHERE id = ?').get(batchId) as
      | Record<string, unknown>
      | undefined;
    return row ? this.mapBatch(row) : null;
  }

  listRecordsForBatch(batchId: string): DatasetRecordItem[] {
    const rows = this.db
      .prepare('SELECT * FROM dataset_records WHERE batch_id = ? ORDER BY created_at ASC, id ASC')
      .all(batchId) as Array<Record<string, unknown>>;
    return rows.map((r) => this.mapRecord(r));
  }

  listExistingHashes(datasetType: DatasetType): Set<string> {
    const rows = this.db
      .prepare('SELECT DISTINCT content_hash FROM dataset_records WHERE dataset_type = ?')
      .all(datasetType) as Array<{ content_hash: string }>;
    return new Set(rows.map((r) => r.content_hash));
  }

  listApprovedKnowledgeRecords(audience: WorkspaceMode | 'all'): DatasetRecordItem[] {
    const rows = (audience === 'all'
      ? this.db
          .prepare(
            `SELECT dr.* FROM dataset_records dr
             JOIN dataset_batches db ON db.id = dr.batch_id
             WHERE dr.dataset_type = 'knowledge_base' AND db.status = 'approved' AND dr.is_active_in_kb = 1 AND dr.validation_status = 'valid'`
          )
          .all()
      : this.db
          .prepare(
            `SELECT dr.* FROM dataset_records dr
             JOIN dataset_batches db ON db.id = dr.batch_id
             WHERE dr.dataset_type = 'knowledge_base' AND db.status = 'approved' AND dr.is_active_in_kb = 1 AND dr.validation_status = 'valid'
               AND (dr.audience = ? OR dr.audience = 'all')`
          )
          .all(audience)) as Array<Record<string, unknown>>;
    return rows.map((r) => this.mapRecord(r));
  }

  listEvaluationRecords(
    statusFilter?: DatasetStatus
  ): Array<DatasetRecordItem & { batchStatus: DatasetStatus }> {
    const sql = statusFilter
      ? `SELECT dr.*, db.status AS batch_status FROM dataset_records dr
         JOIN dataset_batches db ON db.id = dr.batch_id
         WHERE dr.dataset_type = 'evaluation' AND db.status = ?
         ORDER BY dr.created_at DESC`
      : `SELECT dr.*, db.status AS batch_status FROM dataset_records dr
         JOIN dataset_batches db ON db.id = dr.batch_id
         WHERE dr.dataset_type = 'evaluation'
         ORDER BY dr.created_at DESC`;
    const rows = (statusFilter
      ? this.db.prepare(sql).all(statusFilter)
      : this.db.prepare(sql).all()) as Array<Record<string, unknown>>;
    return rows.map((r) => ({
      ...this.mapRecord(r),
      batchStatus: r.batch_status as DatasetStatus,
    }));
  }

  reviewBatch(params: {
    batchId: string;
    status: 'approved' | 'rejected';
    reviewedBy: string;
    reviewNotes: string;
  }): DatasetBatch | null {
    const batch = this.getBatchById(params.batchId);
    if (!batch) return null;
    const now = new Date().toISOString();

    const tx = this.db.transaction(() => {
      this.db
        .prepare(
          `UPDATE dataset_batches SET status = ?, reviewed_by = ?, review_notes = ?, reviewed_at = ? WHERE id = ?`
        )
        .run(params.status, params.reviewedBy, params.reviewNotes, now, params.batchId);

      const activateKb =
        params.status === 'approved' && batch.datasetType === 'knowledge_base' ? 1 : 0;
      this.db
        .prepare(
          `UPDATE dataset_records SET is_active_in_kb = CASE WHEN validation_status = 'valid' THEN ? ELSE 0 END WHERE batch_id = ?`
        )
        .run(activateKb, params.batchId);
    });
    tx();
    return this.getBatchById(params.batchId);
  }

  assignSplitForRecord(recordId: string, split: DatasetSplit): DatasetRecordItem | null {
    this.db.prepare('UPDATE dataset_records SET split = ? WHERE id = ?').run(split, recordId);
    const row = this.db.prepare('SELECT * FROM dataset_records WHERE id = ?').get(recordId) as
      | Record<string, unknown>
      | undefined;
    if (!row) return null;
    const rec = this.mapRecord(row);
    this.refreshBatchQualitySplitCounts(rec.batchId);
    return rec;
  }

  assignBatchSplits(
    batchId: string,
    ratios: { train: number; validation: number; test: number }
  ): DatasetQualityReport | null {
    const batch = this.getBatchById(batchId);
    if (!batch) return null;
    const records = this.listRecordsForBatch(batchId).filter((r) => r.validationStatus === 'valid');
    const total = records.length;
    if (total === 0) return batch.qualityReport;

    const trainCount = Math.round((ratios.train / 100) * total);
    const valCount = Math.round((ratios.validation / 100) * total);

    const tx = this.db.transaction(() => {
      const stmt = this.db.prepare('UPDATE dataset_records SET split = ? WHERE id = ?');
      records.forEach((rec, idx) => {
        const split: DatasetSplit =
          idx < trainCount ? 'train' : idx < trainCount + valCount ? 'validation' : 'test';
        stmt.run(split, rec.id);
      });
    });
    tx();
    return this.refreshBatchQualitySplitCounts(batchId);
  }

  private refreshBatchQualitySplitCounts(batchId: string): DatasetQualityReport | null {
    const batch = this.getBatchById(batchId);
    if (!batch) return null;
    const records = this.listRecordsForBatch(batchId);
    const splitBreakdown: Record<DatasetSplit, number> = {
      unassigned: 0,
      train: 0,
      validation: 0,
      test: 0,
    };
    for (const r of records) {
      splitBreakdown[r.split] = (splitBreakdown[r.split] ?? 0) + 1;
    }
    const updatedQuality: DatasetQualityReport = {
      ...batch.qualityReport,
      splitBreakdown,
    };
    this.db
      .prepare('UPDATE dataset_batches SET quality_report_json = ? WHERE id = ?')
      .run(JSON.stringify(updatedQuality), batchId);
    return updatedQuality;
  }
}

export class SqliteAuditRepository implements IAuditRepository {
  constructor(private readonly db: Database.Database) {}

  log(entry: {
    id: string;
    actorUserId: string | null;
    actorEmail: string | null;
    action: string;
    resourceType: string;
    resourceId: string | null;
    details: Record<string, unknown>;
  }): void {
    const now = new Date().toISOString();
    this.db
      .prepare(
        `INSERT INTO audit_logs (id, actor_user_id, actor_email, action, resource_type, resource_id, details_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        entry.id,
        entry.actorUserId,
        entry.actorEmail,
        entry.action,
        entry.resourceType,
        entry.resourceId,
        JSON.stringify(entry.details),
        now
      );
  }

  listRecent(limit = 50): AuditLogEntry[] {
    const rows = this.db
      .prepare('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ?')
      .all(limit) as Array<Record<string, unknown>>;
    return rows.map((r) => ({
      id: String(r.id),
      actorUserId: r.actor_user_id ? String(r.actor_user_id) : null,
      actorEmail: r.actor_email ? String(r.actor_email) : null,
      action: String(r.action),
      resourceType: String(r.resource_type),
      resourceId: r.resource_id ? String(r.resource_id) : null,
      details: JSON.parse(String(r.details_json)),
      createdAt: String(r.created_at),
    }));
  }

  getSystemCounts() {
    const count = (sql: string) => {
      const row = this.db.prepare(sql).get() as { c: number };
      return Number(row?.c ?? 0);
    };
    return {
      users: count('SELECT COUNT(*) AS c FROM users'),
      assessments: count('SELECT COUNT(*) AS c FROM assessment_results'),
      recommendations: count('SELECT COUNT(*) AS c FROM recommendations'),
      reports: count('SELECT COUNT(*) AS c FROM reports'),
      datasetBatches: count('SELECT COUNT(*) AS c FROM dataset_batches'),
      approvedKnowledgeRecords: count(
        `SELECT COUNT(*) AS c FROM dataset_records dr
         JOIN dataset_batches db ON db.id = dr.batch_id
         WHERE dr.dataset_type = 'knowledge_base' AND db.status = 'approved' AND dr.is_active_in_kb = 1`
      ),
    };
  }
}
