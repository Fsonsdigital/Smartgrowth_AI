import crypto from 'node:crypto';
import express, { type Express, type Response } from 'express';
import type Database from 'better-sqlite3';
import {
  SqliteAssessmentRepository,
  SqliteAuditRepository,
  SqliteDatasetRepository,
  SqliteLearningRepository,
  SqliteProfileRepository,
  SqliteRecommendationRepository,
  SqliteReportRepository,
  SqliteUserRepository,
} from './repositories/sqliteRepository.js';
import {
  type AuthenticatedRequest,
  createAuthMiddleware,
  hashPassword,
  requireRole,
  signSessionToken,
  verifyPassword,
} from './services/authService.js';
import { calculateIndividualAssessment } from './services/assessment/individualEngine.js';
import { calculateSmeAssessment } from './services/assessment/smeEngine.js';
import { KnowledgeRetrievalService } from './services/ai/knowledgeService.js';
import { RecommendationService } from './services/ai/recommendationService.js';
import { DatasetService } from './services/datalab/datasetService.js';
import type {
  DatasetFormat,
  DatasetSplit,
  DatasetType,
  WorkspaceMode,
} from '../shared/types.js';

function isDemoLoginEnabled(): boolean {
  return process.env.NODE_ENV !== 'production' || process.env.ENABLE_DEMO_ACCOUNTS === 'true';
}

export function createApiApp(db: Database.Database): Express {
  const app = express();
  app.disable('x-powered-by');
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });
  app.use(express.json({ limit: '2mb' }));

  const userRepo = new SqliteUserRepository(db);
  const profileRepo = new SqliteProfileRepository(db);
  const assessmentRepo = new SqliteAssessmentRepository(db);
  const recommendationRepo = new SqliteRecommendationRepository(db);
  const learningRepo = new SqliteLearningRepository(db);
  const reportRepo = new SqliteReportRepository(db);
  const datasetRepo = new SqliteDatasetRepository(db);
  const auditRepo = new SqliteAuditRepository(db);

  const knowledgeService = new KnowledgeRetrievalService(datasetRepo);
  const recommendationService = new RecommendationService(knowledgeService, recommendationRepo);
  const datasetService = new DatasetService(datasetRepo);

  const requireAuth = createAuthMiddleware(userRepo);

  // Health endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'smartgrowth-ai-api',
      demoAccountsEnabled: isDemoLoginEnabled(),
      geminiConfigured:
        Boolean(process.env.GEMINI_API_KEY?.trim()) &&
        process.env.GEMINI_API_KEY?.trim() !== 'MY_GEMINI_API_KEY',
      timestamp: new Date().toISOString(),
    });
  });

  // Public list of synthetic demonstration accounts (never exposes password hashes)
  app.get('/api/auth/demo-accounts', (_req, res) => {
    if (!isDemoLoginEnabled()) {
      res.json({ enabled: false, accounts: [] });
      return;
    }
    res.json({ enabled: true, accounts: userRepo.listDemoUsers() });
  });

  // Registration (public: only individual or sme roles allowed; admin cannot be self-registered)
  app.post('/api/auth/register', (req, res) => {
    try {
      const { email, phone, fullName, password, role, businessName, sector } = req.body ?? {};
      if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        res.status(400).json({ error: 'Please provide a valid email address.' });
        return;
      }
      if (typeof fullName !== 'string' || fullName.trim().length < 2) {
        res.status(400).json({ error: 'Full name must be at least 2 characters.' });
        return;
      }
      if (typeof password !== 'string' || password.length < 8) {
        res.status(400).json({ error: 'Password must be at least 8 characters.' });
        return;
      }
      const assignedRole: 'individual' | 'sme' = role === 'sme' ? 'sme' : 'individual';
      if (userRepo.findByEmail(email)) {
        res.status(409).json({ error: 'An account with this email already exists.' });
        return;
      }

      const userId = `usr_${crypto.randomUUID()}`;
      const user = userRepo.create({
        id: userId,
        email,
        phone: typeof phone === 'string' && phone.trim() ? phone.trim() : null,
        fullName,
        passwordHash: hashPassword(password),
        role: assignedRole,
        activeMode: assignedRole,
        isSyntheticDemo: false,
      });

      profileRepo.upsertIndividualProfile({
        id: `ind_${crypto.randomUUID()}`,
        userId: user.id,
        occupation: '',
        city: '',
        currency: 'NGN',
        monthlyIncomeGoal: 0,
        emergencyFundTargetMonths: 3,
      });

      if (assignedRole === 'sme') {
        const sme = profileRepo.createSmeProfile({
          id: `sme_${crypto.randomUUID()}`,
          ownerUserId: user.id,
          businessName:
            typeof businessName === 'string' && businessName.trim()
              ? businessName.trim()
              : `${user.fullName}'s Enterprise`,
          sector: typeof sector === 'string' && sector.trim() ? sector.trim() : 'General Commerce',
          registrationStatus: 'in_progress',
          staffCount: 1,
          currency: 'NGN',
        });
        profileRepo.addBusinessMembership({
          id: `bm_${crypto.randomUUID()}`,
          smeProfileId: sme.id,
          userId: user.id,
          memberRole: 'owner',
          status: 'active',
        });
      }

      auditRepo.log({
        id: `aud_${crypto.randomUUID()}`,
        actorUserId: user.id,
        actorEmail: user.email,
        action: 'USER_REGISTERED',
        resourceType: 'user',
        resourceId: user.id,
        details: { role: assignedRole },
      });

      const token = signSessionToken(user);
      res.status(201).json({ token, user });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Registration failed.' });
    }
  });

  // Standard Login
  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body ?? {};
    if (typeof email !== 'string' || typeof password !== 'string') {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }
    const found = userRepo.findByEmail(email);
    if (!found || !verifyPassword(password, found.passwordHash)) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }
    const { passwordHash: _ignored, ...publicUser } = found;
    const token = signSessionToken(publicUser);
    auditRepo.log({
      id: `aud_${crypto.randomUUID()}`,
      actorUserId: publicUser.id,
      actorEmail: publicUser.email,
      action: 'USER_LOGIN',
      resourceType: 'user',
      resourceId: publicUser.id,
      details: { role: publicUser.role },
    });
    res.json({ token, user: publicUser });
  });

  // Synthetic Demo Sandbox Login (restricted strictly to flagged isSyntheticDemo accounts when enabled)
  app.post('/api/auth/demo-login', (req, res) => {
    if (!isDemoLoginEnabled()) {
      res.status(403).json({ error: 'Demo account sign-in is disabled in this environment.' });
      return;
    }
    const { userId } = req.body ?? {};
    if (typeof userId !== 'string') {
      res.status(400).json({ error: 'userId is required.' });
      return;
    }
    const user = userRepo.findById(userId);
    if (!user || !user.isSyntheticDemo) {
      res.status(404).json({ error: 'Synthetic demonstration account not found.' });
      return;
    }
    const token = signSessionToken(user);
    auditRepo.log({
      id: `aud_${crypto.randomUUID()}`,
      actorUserId: user.id,
      actorEmail: user.email,
      action: 'DEMO_SESSION_STARTED',
      resourceType: 'user',
      resourceId: user.id,
      details: { role: user.role },
    });
    res.json({ token, user });
  });

  // Current Authenticated User & Workspace Mode
  app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res) => {
    res.json({ user: req.authUser });
  });

  app.patch('/api/auth/mode', requireAuth, (req: AuthenticatedRequest, res) => {
    const mode = req.body?.mode;
    if (mode !== 'individual' && mode !== 'sme') {
      res.status(400).json({ error: 'Mode must be "individual" or "sme".' });
      return;
    }
    const updated = userRepo.updateActiveMode(req.authUser!.id, mode);
    res.json({ user: updated });
  });

  // Individual & SME Profiles + Business Membership
  app.get('/api/profiles', requireAuth, (req: AuthenticatedRequest, res) => {
    const userId = req.authUser!.id;
    const individual = profileRepo.getIndividualProfile(userId);
    const smes = profileRepo.listSmeProfilesForUser(userId);
    const memberships = smes.flatMap((s) => profileRepo.listBusinessMemberships(s.id));
    res.json({ individual, smes, memberships });
  });

  app.put('/api/profiles/individual', requireAuth, (req: AuthenticatedRequest, res) => {
    const userId = req.authUser!.id;
    const { occupation, city, currency, monthlyIncomeGoal, emergencyFundTargetMonths } =
      req.body ?? {};
    const current = profileRepo.getIndividualProfile(userId);
    const updated = profileRepo.upsertIndividualProfile({
      id: current?.id ?? `ind_${crypto.randomUUID()}`,
      userId,
      occupation: typeof occupation === 'string' ? occupation.trim().slice(0, 80) : current?.occupation ?? '',
      city: typeof city === 'string' ? city.trim().slice(0, 80) : current?.city ?? '',
      currency: typeof currency === 'string' && currency.trim() ? currency.trim().slice(0, 6) : 'NGN',
      monthlyIncomeGoal: Math.max(0, Number(monthlyIncomeGoal ?? current?.monthlyIncomeGoal ?? 0) || 0),
      emergencyFundTargetMonths: Math.max(
        1,
        Math.min(24, Math.floor(Number(emergencyFundTargetMonths ?? current?.emergencyFundTargetMonths ?? 3) || 3))
      ),
    });
    res.json({ profile: updated });
  });

  app.post('/api/profiles/sme', requireAuth, (req: AuthenticatedRequest, res) => {
    const userId = req.authUser!.id;
    const { businessName, sector, registrationStatus, staffCount, currency } = req.body ?? {};
    if (typeof businessName !== 'string' || businessName.trim().length < 2) {
      res.status(400).json({ error: 'Business name must be at least 2 characters.' });
      return;
    }
    const regStatus =
      registrationStatus === 'registered' || registrationStatus === 'informal'
        ? registrationStatus
        : 'in_progress';
    const created = profileRepo.createSmeProfile({
      id: `sme_${crypto.randomUUID()}`,
      ownerUserId: userId,
      businessName: businessName.trim(),
      sector: typeof sector === 'string' && sector.trim() ? sector.trim() : 'General Commerce',
      registrationStatus: regStatus,
      staffCount: Math.max(1, Math.floor(Number(staffCount ?? 1) || 1)),
      currency: typeof currency === 'string' && currency.trim() ? currency.trim().slice(0, 6) : 'NGN',
    });
    profileRepo.addBusinessMembership({
      id: `bm_${crypto.randomUUID()}`,
      smeProfileId: created.id,
      userId,
      memberRole: 'owner',
      status: 'active',
    });
    auditRepo.log({
      id: `aud_${crypto.randomUUID()}`,
      actorUserId: userId,
      actorEmail: req.authUser!.email,
      action: 'SME_PROFILE_CREATED',
      resourceType: 'sme_profile',
      resourceId: created.id,
      details: { businessName: created.businessName },
    });
    res.status(201).json({ sme: created });
  });

  app.put('/api/profiles/sme/:smeId', requireAuth, (req: AuthenticatedRequest, res) => {
    const smeId = req.params.smeId;
    const userId = req.authUser!.id;
    const existing = profileRepo.getSmeProfileById(smeId);
    if (!existing) {
      res.status(404).json({ error: 'SME profile not found.' });
      return;
    }
    if (!profileRepo.hasSmeMembership(smeId, userId)) {
      res.status(403).json({ error: 'Forbidden: you do not belong to this SME profile.' });
      return;
    }
    const { businessName, sector, registrationStatus, staffCount, currency } = req.body ?? {};
    const updated = profileRepo.updateSmeProfile(smeId, {
      businessName: typeof businessName === 'string' && businessName.trim() ? businessName.trim() : undefined,
      sector: typeof sector === 'string' && sector.trim() ? sector.trim() : undefined,
      registrationStatus:
        registrationStatus === 'registered' ||
        registrationStatus === 'informal' ||
        registrationStatus === 'in_progress'
          ? registrationStatus
          : undefined,
      staffCount: staffCount !== undefined ? Math.max(1, Math.floor(Number(staffCount) || 1)) : undefined,
      currency: typeof currency === 'string' && currency.trim() ? currency.trim().slice(0, 6) : undefined,
    });
    res.json({ sme: updated });
  });

  app.post('/api/profiles/sme/:smeId/members', requireAuth, (req: AuthenticatedRequest, res) => {
    const smeId = req.params.smeId;
    const userId = req.authUser!.id;
    const existing = profileRepo.getSmeProfileById(smeId);
    if (!existing) {
      res.status(404).json({ error: 'SME profile not found.' });
      return;
    }
    if (existing.ownerUserId !== userId) {
      res.status(403).json({ error: 'Forbidden: only the SME owner can add members.' });
      return;
    }
    const { email, memberRole } = req.body ?? {};
    if (typeof email !== 'string') {
      res.status(400).json({ error: 'Member email is required.' });
      return;
    }
    const targetUser = userRepo.findByEmail(email);
    if (!targetUser) {
      res.status(404).json({ error: 'No registered user found with that email.' });
      return;
    }
    const safeRole =
      memberRole === 'finance_manager' || memberRole === 'analyst' ? memberRole : 'analyst';
    const membership = profileRepo.addBusinessMembership({
      id: `bm_${crypto.randomUUID()}`,
      smeProfileId: smeId,
      userId: targetUser.id,
      memberRole: safeRole,
      status: 'active',
    });
    res.status(201).json({ membership });
  });

  // Assessment Templates & Submissions (Ownership enforced)
  app.get('/api/assessments/templates/:audience', requireAuth, (req, res) => {
    const audience = req.params.audience === 'sme' ? 'sme' : 'individual';
    const template = assessmentRepo.getTemplateByAudience(audience);
    if (!template) {
      res.status(404).json({ error: 'Assessment template not found.' });
      return;
    }
    res.json({ template });
  });

  app.get('/api/assessments', requireAuth, (req: AuthenticatedRequest, res) => {
    const audienceParam = req.query.audience;
    const audience: WorkspaceMode | undefined =
      audienceParam === 'individual' || audienceParam === 'sme' ? audienceParam : undefined;
    const results = assessmentRepo.listResultsForUser(req.authUser!.id, audience);
    res.json({ results });
  });

  app.get('/api/assessments/:id', requireAuth, (req: AuthenticatedRequest, res) => {
    const result = assessmentRepo.getResultById(req.params.id);
    if (!result) {
      res.status(404).json({ error: 'Assessment result not found.' });
      return;
    }
    if (result.userId !== req.authUser!.id) {
      res.status(403).json({ error: 'Forbidden: you cannot access another customer assessment.' });
      return;
    }
    res.json({ result });
  });

  app.post('/api/assessments', requireAuth, (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.authUser!.id;
      const { audience, answers, smeProfileId } = req.body ?? {};
      const safeAudience: WorkspaceMode = audience === 'sme' ? 'sme' : 'individual';
      if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
        res.status(400).json({ error: 'Assessment answers object is required.' });
        return;
      }

      const template = assessmentRepo.getTemplateByAudience(safeAudience);
      if (!template) {
        res.status(404).json({ error: 'Active assessment template not found.' });
        return;
      }

      let resolvedSmeId: string | null = null;
      let currency = 'NGN';
      if (safeAudience === 'sme') {
        if (typeof smeProfileId === 'string' && smeProfileId.trim()) {
          if (!profileRepo.hasSmeMembership(smeProfileId, userId)) {
            res.status(403).json({ error: 'Forbidden: you do not have access to this SME profile.' });
            return;
          }
          resolvedSmeId = smeProfileId;
          currency = profileRepo.getSmeProfileById(smeProfileId)?.currency ?? 'NGN';
        } else {
          const userSmes = profileRepo.listSmeProfilesForUser(userId);
          if (userSmes.length > 0) {
            resolvedSmeId = userSmes[0].id;
            currency = userSmes[0].currency;
          }
        }
      } else {
        currency = profileRepo.getIndividualProfile(userId)?.currency ?? 'NGN';
      }

      const output =
        safeAudience === 'sme'
          ? calculateSmeAssessment(answers as Record<string, unknown>, currency)
          : calculateIndividualAssessment(answers as Record<string, unknown>, currency);

      const saved = assessmentRepo.saveAssessment({
        submissionId: `sub_${crypto.randomUUID()}`,
        resultId: `res_${crypto.randomUUID()}`,
        userId,
        smeProfileId: resolvedSmeId,
        templateId: template.id,
        audience: safeAudience,
        answers: answers as Record<string, unknown>,
        output,
      });

      auditRepo.log({
        id: `aud_${crypto.randomUUID()}`,
        actorUserId: userId,
        actorEmail: req.authUser!.email,
        action: 'ASSESSMENT_CALCULATED',
        resourceType: 'assessment_result',
        resourceId: saved.id,
        details: {
          audience: safeAudience,
          calculationVersion: output.calculationVersion,
          readinessTier: output.readinessTier,
        },
      });

      res.status(201).json({ result: saved });
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : 'Failed to calculate assessment.',
      });
    }
  });

  // AI Recommendations & Grounded Assistant (Ownership enforced)
  app.get('/api/recommendations', requireAuth, (req: AuthenticatedRequest, res) => {
    const audienceParam = req.query.audience;
    const audience: WorkspaceMode | undefined =
      audienceParam === 'individual' || audienceParam === 'sme' ? audienceParam : undefined;
    const items = recommendationRepo.listForUser(req.authUser!.id, audience);
    res.json({ recommendations: items });
  });

  app.post('/api/recommendations/generate', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.authUser!.id;
      const { assessmentResultId, question } = req.body ?? {};
      if (typeof assessmentResultId !== 'string' || !assessmentResultId.trim()) {
        res.status(400).json({ error: 'assessmentResultId is required.' });
        return;
      }
      const assessment = assessmentRepo.getResultById(assessmentResultId);
      if (!assessment) {
        res.status(404).json({ error: 'Assessment result not found.' });
        return;
      }
      if (assessment.userId !== userId) {
        res.status(403).json({ error: 'Forbidden: cannot generate guidance for another user assessment.' });
        return;
      }

      const recommendation = await recommendationService.generateForAssessment({
        userId,
        assessment,
        question: typeof question === 'string' ? question : null,
      });

      auditRepo.log({
        id: `aud_${crypto.randomUUID()}`,
        actorUserId: userId,
        actorEmail: req.authUser!.email,
        action: 'AI_RECOMMENDATION_GENERATED',
        resourceType: 'recommendation',
        resourceId: recommendation.id,
        details: {
          promptVersion: recommendation.promptVersion,
          fallbackUsed: recommendation.fallbackUsed,
          safetyPassed: recommendation.safetyPassed,
        },
      });

      res.status(201).json({ recommendation });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Failed to generate AI recommendation.',
      });
    }
  });

  // Approved Knowledge Base lookup (read-only for authenticated users)
  app.get('/api/knowledge', requireAuth, (req, res) => {
    const audienceParam = req.query.audience;
    const audience =
      audienceParam === 'individual' || audienceParam === 'sme' ? audienceParam : 'all';
    const records = datasetRepo.listApprovedKnowledgeRecords(audience);
    res.json({ records });
  });

  // Learning Centre
  app.get('/api/learning', requireAuth, (req: AuthenticatedRequest, res) => {
    const items = learningRepo.listAllForUser(req.authUser!.id);
    res.json({ items });
  });

  app.post('/api/learning/:id/progress', requireAuth, (req: AuthenticatedRequest, res) => {
    const item = learningRepo.getById(req.params.id, req.authUser!.id);
    if (!item) {
      res.status(404).json({ error: 'Learning content not found.' });
      return;
    }
    const completed = Boolean(req.body?.completed ?? true);
    learningRepo.markCompleted(req.authUser!.id, item.id, completed);
    res.json({ item: learningRepo.getById(item.id, req.authUser!.id) });
  });

  // Reports (Ownership enforced)
  app.get('/api/reports', requireAuth, (req: AuthenticatedRequest, res) => {
    const reports = reportRepo.listForUser(req.authUser!.id);
    res.json({ reports });
  });

  app.get('/api/reports/:id', requireAuth, (req: AuthenticatedRequest, res) => {
    const report = reportRepo.getById(req.params.id);
    if (!report) {
      res.status(404).json({ error: 'Report not found.' });
      return;
    }
    if (report.userId !== req.authUser!.id) {
      res.status(403).json({ error: 'Forbidden: you cannot access another customer report.' });
      return;
    }
    res.json({ report });
  });

  app.post('/api/reports', requireAuth, (req: AuthenticatedRequest, res) => {
    const userId = req.authUser!.id;
    const { assessmentResultId, reportType } = req.body ?? {};
    if (typeof assessmentResultId !== 'string') {
      res.status(400).json({ error: 'assessmentResultId is required.' });
      return;
    }
    const assessment = assessmentRepo.getResultById(assessmentResultId);
    if (!assessment) {
      res.status(404).json({ error: 'Assessment result not found.' });
      return;
    }
    if (assessment.userId !== userId) {
      res.status(403).json({ error: 'Forbidden: cannot create a report for another customer.' });
      return;
    }

    const safeType = reportType === 'credit_readiness' ? 'credit_readiness' : 'financial_health';
    const latestRec = recommendationRepo
      .listForUser(userId, assessment.audience)
      .find((r) => r.assessmentResultId === assessment.id);

    const ownerName =
      assessment.audience === 'sme' && assessment.smeProfileId
        ? profileRepo.getSmeProfileById(assessment.smeProfileId)?.businessName ?? req.authUser!.fullName
        : req.authUser!.fullName;

    const currency =
      assessment.audience === 'sme' && assessment.smeProfileId
        ? profileRepo.getSmeProfileById(assessment.smeProfileId)?.currency ?? 'NGN'
        : profileRepo.getIndividualProfile(userId)?.currency ?? 'NGN';

    const report = reportRepo.create({
      id: `rep_${crypto.randomUUID()}`,
      userId,
      assessmentResultId: assessment.id,
      reportType: safeType,
      title:
        safeType === 'credit_readiness'
          ? `${assessment.audience.toUpperCase()} Credit Readiness Indicators Report`
          : `${assessment.audience.toUpperCase()} Financial Health Report`,
      snapshot: {
        generatedAt: new Date().toISOString(),
        isSyntheticDemo: req.authUser!.isSyntheticDemo,
        ownerName,
        currency,
        audience: assessment.audience,
        calculationVersion: assessment.calculationVersion,
        readinessTier: assessment.output.readinessTier,
        formulas: assessment.output.formulas,
        dataQualityFlags: assessment.output.dataQualityFlags,
        latestRecommendationSummary: latestRec?.structuredOutput.summary ?? null,
        disclaimer: req.authUser!.isSyntheticDemo
          ? 'Synthetic demonstration report. Calculations are deterministic and educational; not a formal credit approval or product offer.'
          : 'Deterministic financial assessment report for educational and planning use only; not a loan approval.',
      },
    });

    auditRepo.log({
      id: `aud_${crypto.randomUUID()}`,
      actorUserId: userId,
      actorEmail: req.authUser!.email,
      action: 'REPORT_GENERATED',
      resourceType: 'report',
      resourceId: report.id,
      details: { reportType: safeType },
    });

    res.status(201).json({ report });
  });

  // Administration & SmartGrowth AI Data Lab (Admin role strictly enforced)
  app.get(
    '/api/admin/overview',
    requireAuth,
    requireRole('admin'),
    (_req: AuthenticatedRequest, res) => {
      res.json({
        counts: auditRepo.getSystemCounts(),
        users: userRepo.listAllUsers(),
        auditLogs: auditRepo.listRecent(40),
      });
    }
  );

  app.get(
    '/api/admin/datasets',
    requireAuth,
    requireRole('admin'),
    (req: AuthenticatedRequest, res) => {
      const typeParam = req.query.type;
      const datasetType: DatasetType | undefined =
        typeParam === 'knowledge_base' ||
        typeParam === 'evaluation' ||
        typeParam === 'fine_tuning'
          ? typeParam
          : undefined;
      res.json({ batches: datasetRepo.listBatches(datasetType) });
    }
  );

  app.get(
    '/api/admin/datasets/:batchId',
    requireAuth,
    requireRole('admin'),
    (req: AuthenticatedRequest, res) => {
      const batch = datasetRepo.getBatchById(req.params.batchId);
      if (!batch) {
        res.status(404).json({ error: 'Dataset batch not found.' });
        return;
      }
      const records = datasetRepo.listRecordsForBatch(batch.id);
      res.json({ batch, records });
    }
  );

  app.post(
    '/api/admin/datasets/preview',
    requireAuth,
    requireRole('admin'),
    (req: AuthenticatedRequest, res) => {
      try {
        const { datasetType, format, rawText } = req.body ?? {};
        if (
          datasetType !== 'knowledge_base' &&
          datasetType !== 'evaluation' &&
          datasetType !== 'fine_tuning'
        ) {
          res.status(400).json({ error: 'Invalid datasetType.' });
          return;
        }
        const safeFormat: DatasetFormat = format === 'csv' ? 'csv' : 'jsonl';
        if (typeof rawText !== 'string' || !rawText.trim()) {
          res.status(400).json({ error: 'rawText payload is required.' });
          return;
        }
        const preview = datasetService.parseAndValidate({
          datasetType,
          format: safeFormat,
          rawText,
        });
        res.json(preview);
      } catch (err) {
        res.status(400).json({
          error: err instanceof Error ? err.message : 'Failed to parse dataset preview.',
        });
      }
    }
  );

  app.post(
    '/api/admin/datasets/import',
    requireAuth,
    requireRole('admin'),
    (req: AuthenticatedRequest, res) => {
      try {
        const { name, datasetType, format, version, rawText } = req.body ?? {};
        if (typeof name !== 'string' || name.trim().length < 3) {
          res.status(400).json({ error: 'Batch name must be at least 3 characters.' });
          return;
        }
        if (
          datasetType !== 'knowledge_base' &&
          datasetType !== 'evaluation' &&
          datasetType !== 'fine_tuning'
        ) {
          res.status(400).json({ error: 'Invalid datasetType.' });
          return;
        }
        const safeFormat: DatasetFormat = format === 'csv' ? 'csv' : 'jsonl';
        if (typeof rawText !== 'string' || !rawText.trim()) {
          res.status(400).json({ error: 'Dataset content is required.' });
          return;
        }

        const imported = datasetService.importBatch({
          name,
          datasetType,
          format: safeFormat,
          version: typeof version === 'string' && version.trim() ? version.trim() : '1.0.0',
          rawText,
          uploadedBy: req.authUser!.id,
        });

        auditRepo.log({
          id: `aud_${crypto.randomUUID()}`,
          actorUserId: req.authUser!.id,
          actorEmail: req.authUser!.email,
          action: 'DATASET_BATCH_IMPORTED',
          resourceType: 'dataset_batch',
          resourceId: imported.batch.id,
          details: {
            datasetType,
            format: safeFormat,
            totalRecords: imported.batch.totalRecords,
            validRecords: imported.batch.validRecords,
            duplicateCount: imported.batch.duplicateCount,
            autoTrained: false,
          },
        });

        res.status(201).json(imported);
      } catch (err) {
        res.status(400).json({
          error: err instanceof Error ? err.message : 'Dataset import failed.',
        });
      }
    }
  );

  app.post(
    '/api/admin/datasets/:batchId/review',
    requireAuth,
    requireRole('admin'),
    (req: AuthenticatedRequest, res) => {
      const { decision, reviewNotes } = req.body ?? {};
      if (decision !== 'approved' && decision !== 'rejected') {
        res.status(400).json({ error: 'decision must be "approved" or "rejected".' });
        return;
      }
      const updated = datasetRepo.reviewBatch({
        batchId: req.params.batchId,
        status: decision,
        reviewedBy: req.authUser!.id,
        reviewNotes: typeof reviewNotes === 'string' ? reviewNotes.trim() : '',
      });
      if (!updated) {
        res.status(404).json({ error: 'Dataset batch not found.' });
        return;
      }

      auditRepo.log({
        id: `aud_${crypto.randomUUID()}`,
        actorUserId: req.authUser!.id,
        actorEmail: req.authUser!.email,
        action: decision === 'approved' ? 'DATASET_BATCH_APPROVED' : 'DATASET_BATCH_REJECTED',
        resourceType: 'dataset_batch',
        resourceId: updated.id,
        details: { datasetType: updated.datasetType, version: updated.version },
      });

      res.json({ batch: updated, records: datasetRepo.listRecordsForBatch(updated.id) });
    }
  );

  app.patch(
    '/api/admin/datasets/records/:recordId/split',
    requireAuth,
    requireRole('admin'),
    (req: AuthenticatedRequest, res) => {
      const split = req.body?.split as DatasetSplit;
      if (
        split !== 'unassigned' &&
        split !== 'train' &&
        split !== 'validation' &&
        split !== 'test'
      ) {
        res.status(400).json({ error: 'Invalid split assignment.' });
        return;
      }
      const updated = datasetRepo.assignSplitForRecord(req.params.recordId, split);
      if (!updated) {
        res.status(404).json({ error: 'Dataset record not found.' });
        return;
      }
      res.json({ record: updated });
    }
  );

  app.post(
    '/api/admin/datasets/:batchId/assign-splits',
    requireAuth,
    requireRole('admin'),
    (req: AuthenticatedRequest, res) => {
      const train = Number(req.body?.train ?? 70);
      const validation = Number(req.body?.validation ?? 15);
      const test = Number(req.body?.test ?? 15);
      if (train < 0 || validation < 0 || test < 0 || Math.round(train + validation + test) !== 100) {
        res.status(400).json({ error: 'Train, validation, and test percentages must sum to 100.' });
        return;
      }
      const qualityReport = datasetRepo.assignBatchSplits(req.params.batchId, {
        train,
        validation,
        test,
      });
      if (!qualityReport) {
        res.status(404).json({ error: 'Dataset batch not found.' });
        return;
      }
      res.json({
        batch: datasetRepo.getBatchById(req.params.batchId),
        records: datasetRepo.listRecordsForBatch(req.params.batchId),
      });
    }
  );

  app.get(
    '/api/admin/datasets/:batchId/export',
    requireAuth,
    requireRole('admin'),
    (req: AuthenticatedRequest, res: Response) => {
      try {
        const format: DatasetFormat = req.query.format === 'csv' ? 'csv' : 'jsonl';
        const exported = datasetService.exportBatch(req.params.batchId, format);
        res.setHeader('Content-Type', exported.mimeType);
        res.setHeader('Content-Disposition', `attachment; filename="${exported.filename}"`);
        res.send(exported.content);
      } catch (err) {
        res.status(404).json({ error: err instanceof Error ? err.message : 'Export failed.' });
      }
    }
  );

  app.get(
    '/api/admin/evaluations',
    requireAuth,
    requireRole('admin'),
    (_req: AuthenticatedRequest, res) => {
      res.json({ evaluations: datasetRepo.listEvaluationRecords() });
    }
  );

  return app;
}
