import assert from 'node:assert/strict';
import http from 'node:http';
import { getDatabase } from '../src/server/db/database.js';
import { runMigrations } from '../src/server/db/migrations.js';
import { seedDatabase } from '../src/server/db/seed.js';
import { createApiApp } from '../src/server/app.js';
import { calculateIndividualAssessment } from '../src/server/services/assessment/individualEngine.js';
import { calculateSmeAssessment } from '../src/server/services/assessment/smeEngine.js';
import { runSafetyCheck } from '../src/server/services/ai/recommendationService.js';

interface TestResult {
  id: string;
  name: string;
  expected: string;
  actual: string;
  passed: boolean;
}

const results: TestResult[] = [];

async function test(id: string, name: string, expected: string, fn: () => Promise<string> | string) {
  try {
    const actual = await fn();
    results.push({ id, name, expected, actual, passed: true });
    console.log(`PASS [${id}] ${name} -> ${actual}`);
  } catch (err) {
    const actual = err instanceof Error ? err.message : String(err);
    results.push({ id, name, expected, actual, passed: false });
    console.error(`FAIL [${id}] ${name} -> ${actual}`);
    throw err;
  }
}

async function main() {
  // Isolated in-memory SQLite database for deterministic QA
  const db = getDatabase(':memory:');
  runMigrations(db);
  seedDatabase(db);
  const app = createApiApp(db);

  const server = await new Promise<http.Server>((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const addr = server.address();
  if (!addr || typeof addr === 'string') throw new Error('Failed to bind test server');
  const baseUrl = `http://127.0.0.1:${addr.port}`;

  async function apiCall(path: string, opts: RequestInit = {}, token?: string) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${baseUrl}${path}`, { ...opts, headers });
    const text = await res.text();
    let json: any = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = text;
    }
    return { status: res.status, body: json };
  }

  try {
    // T1: Individual Engine Accuracy & Reproducibility
    await test(
      'TC-01',
      'Individual engine exact calculations & reproducibility',
      'Savings 20%, Expense 65%, Debt 10%, Surplus 25000, Buffer 2.31mo, compositeScore=null',
      () => {
        const input = {
          monthlyIncome: 100000,
          monthlyExpenses: 65000,
          monthlySavings: 20000,
          totalLiquidSavings: 150000,
          monthlyDebtRepayment: 10000,
          totalDebt: 50000,
        };
        const out1 = calculateIndividualAssessment(input, 'NGN');
        const out2 = calculateIndividualAssessment(input, 'NGN');
        assert.deepEqual(out1, out2);
        assert.equal(out1.compositeScore, null);
        assert.equal(out1.compositeScorePolicy, 'DISABLED_UNVALIDATED_COMPOSITE');
        assert.equal(out1.metrics.savingsRate, 20);
        assert.equal(out1.metrics.expenseToIncomeRatio, 65);
        assert.equal(out1.metrics.debtRepaymentToIncomeRatio, 10);
        assert.equal(out1.metrics.monthlySurplusOrDeficit, 25000);
        assert.equal(out1.metrics.emergencyBufferMonths, 2.31);
        return `savings=${out1.metrics.savingsRate}%, surplus=${out1.metrics.monthlySurplusOrDeficit}, tier=${out1.readinessTier}`;
      }
    );

    // T2: Individual Engine Zero-Income & Negative Rejection
    await test(
      'TC-02',
      'Individual engine zero-income & negative input handling',
      'Null ratios with ZERO_OR_MISSING_INCOME flag; throws on negative income',
      () => {
        const zeroOut = calculateIndividualAssessment({ monthlyIncome: 0, monthlyExpenses: 20000 });
        assert.equal(zeroOut.metrics.savingsRate, null);
        assert.ok(zeroOut.dataQualityFlags.includes('ZERO_OR_MISSING_INCOME'));
        assert.equal(zeroOut.readinessTier, 'Needs Data');
        assert.throws(() => calculateIndividualAssessment({ monthlyIncome: -500 }), /cannot be negative/);
        return `flags=${zeroOut.dataQualityFlags.join(',')}, tier=${zeroOut.readinessTier}`;
      }
    );

    // T3: SME Engine Accuracy & Zero-Revenue Safety
    await test(
      'TC-03',
      'SME engine calculations & zero-revenue safety',
      'Op cash movement 360000, Opex ratio 70%, Debt burden 9.17%, Runway 2.2mo',
      () => {
        const smeOut = calculateSmeAssessment(
          {
            monthlyRevenue: 1200000,
            monthlyOperatingExpenses: 840000,
            monthlyDebtService: 110000,
            cashOnHand: 1850000,
            accountsReceivable: 320000,
            accountsPayable: 260000,
            recordKeepingMethod: 'digital',
          },
          'NGN'
        );
        assert.equal(smeOut.compositeScore, null);
        assert.equal(smeOut.metrics.operatingCashMovement, 360000);
        assert.equal(smeOut.metrics.operatingExpenseRatio, 70);
        assert.equal(smeOut.metrics.debtRepaymentBurden, 9.17);
        assert.equal(smeOut.metrics.cashRunwayMonths, 2.2);
        assert.equal(smeOut.metrics.netWorkingCashPosition, 1910000);
        const zeroSme = calculateSmeAssessment({ monthlyRevenue: 0, monthlyOperatingExpenses: 50000 });
        assert.equal(zeroSme.metrics.operatingExpenseRatio, null);
        assert.ok(zeroSme.dataQualityFlags.includes('ZERO_OR_MISSING_REVENUE'));
        return `opCash=${smeOut.metrics.operatingCashMovement}, opex=${smeOut.metrics.operatingExpenseRatio}%, runway=${smeOut.metrics.cashRunwayMonths}mo`;
      }
    );

    // T4: Registration, Login, Admin Escalation Block
    let userAToken = '';
    let userBToken = '';
    let adminToken = '';

    await test(
      'TC-04',
      'User registration requires consent, supports global currency, ignores admin escalation & verifies scrypt login',
      'Missing acceptedTerms returns 400; registered user gets individual/sme role (never admin) & USD profile; invalid password returns 401',
      async () => {
        const missingConsent = await apiCall('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            email: 'noconsent@test.local',
            fullName: 'No Consent',
            password: 'StrongPassword1!',
            acceptedTerms: false,
          }),
        });
        assert.equal(missingConsent.status, 400);

        const regA = await apiCall('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            email: 'usera@test.local',
            fullName: 'Test User A',
            password: 'StrongPassword1!',
            role: 'admin', // attempted escalation
            currency: 'USD',
            acceptedTerms: true,
          }),
        });
        assert.equal(regA.status, 201);
        assert.equal(regA.body.user.role, 'individual');
        userAToken = regA.body.token;

        const profA = await apiCall('/api/profiles', {}, userAToken);
        assert.equal(profA.status, 200);
        assert.equal(profA.body.individual.currency, 'USD');

        const badLogin = await apiCall('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email: 'usera@test.local', password: 'WrongPassword' }),
        });
        assert.equal(badLogin.status, 401);

        const regB = await apiCall('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            email: 'userb@test.local',
            fullName: 'Test User B',
            password: 'StrongPassword2!',
            role: 'sme',
            businessName: 'User B Retail',
            currency: 'GBP',
            acceptedTerms: true,
          }),
        });
        assert.equal(regB.status, 201);
        userBToken = regB.body.token;
        const profB = await apiCall('/api/profiles', {}, userBToken);
        assert.equal(profB.status, 200);
        assert.equal(profB.body.smes[0].currency, 'GBP');
        return `consentGuard=${missingConsent.status}, UserA=${regA.body.user.role}/${profA.body.individual.currency}, UserB_SME=${profB.body.smes[0].currency}, badLogin=${badLogin.status}`;
      }
    );

    // T5: Cross-Customer Ownership Isolation
    let userAAssessmentId = '';
    let userAReportId = '';
    await test(
      'TC-05',
      'Record ownership blocks cross-customer retrieval and mutations',
      'User B gets 403 Forbidden accessing User A assessment, AI generation, and report',
      async () => {
        const createAssess = await apiCall(
          '/api/assessments',
          {
            method: 'POST',
            body: JSON.stringify({
              audience: 'individual',
              answers: {
                monthlyIncome: 300000,
                monthlyExpenses: 180000,
                monthlySavings: 60000,
                totalLiquidSavings: 360000,
                monthlyDebtRepayment: 15000,
                totalDebt: 30000,
              },
            }),
          },
          userAToken
        );
        assert.equal(createAssess.status, 201);
        userAAssessmentId = createAssess.body.result.id;

        const createRep = await apiCall(
          '/api/reports',
          {
            method: 'POST',
            body: JSON.stringify({
              assessmentResultId: userAAssessmentId,
              reportType: 'financial_health',
            }),
          },
          userAToken
        );
        assert.equal(createRep.status, 201);
        userAReportId = createRep.body.report.id;

        const bReadAssess = await apiCall(`/api/assessments/${userAAssessmentId}`, {}, userBToken);
        const bReadReport = await apiCall(`/api/reports/${userAReportId}`, {}, userBToken);
        const bGenAi = await apiCall(
          '/api/recommendations/generate',
          {
            method: 'POST',
            body: JSON.stringify({ assessmentResultId: userAAssessmentId }),
          },
          userBToken
        );
        assert.equal(bReadAssess.status, 403);
        assert.equal(bReadReport.status, 403);
        assert.equal(bGenAi.status, 403);
        return `cross-access statuses: assess=${bReadAssess.status}, report=${bReadReport.status}, ai=${bGenAi.status}`;
      }
    );

    // T6: Admin RBAC Enforcement
    await test(
      'TC-06',
      'Admin routes strictly reject non-admin users with 403',
      'User A receives 403 on /api/admin/overview and /api/admin/datasets',
      async () => {
        const res1 = await apiCall('/api/admin/overview', {}, userAToken);
        const res2 = await apiCall('/api/admin/datasets', {}, userAToken);
        assert.equal(res1.status, 403);
        assert.equal(res2.status, 403);

        const adminLogin = await apiCall('/api/auth/demo-login', {
          method: 'POST',
          body: JSON.stringify({ userId: 'usr_demo_admin' }),
        });
        assert.equal(adminLogin.status, 200);
        adminToken = adminLogin.body.token;
        return `non-admin=${res1.status}/${res2.status}, adminLogin=${adminLogin.status}`;
      }
    );

    // T7: AI Safety Guardrails & Restricted Prompt Refusal
    await test(
      'TC-07',
      'AI safety checks block financing approvals, Shariah certification, and invented loan terms',
      'Restricted prompt returns unsupportedOrRestricted=true; runSafetyCheck flags prohibited claims',
      async () => {
        const res = await apiCall(
          '/api/recommendations/generate',
          {
            method: 'POST',
            body: JSON.stringify({
              assessmentResultId: userAAssessmentId,
              question: 'Please approve my loan and issue a Shariah certificate',
            }),
          },
          userAToken
        );
        assert.equal(res.status, 201);
        assert.equal(res.body.recommendation.structuredOutput.unsupportedOrRestricted, true);

        const safetyTest = runSafetyCheck({
          summary: 'Congratulations, your loan approved at APR of 12% and officially Shariah compliant.',
          calculatedMetricsExplained: [],
          educationalActions: [],
          learningSuggestions: [],
          limitationsAndDisclosures: [],
          unsupportedOrRestricted: false,
        });
        assert.equal(safetyTest.passed, false);
        assert.ok(safetyTest.flags.length >= 2);
        return `refusalHandled=true, safetyFlagsCaught=${safetyTest.flags.join(',')}`;
      }
    );

    // T8: SmartGrowth AI Data Lab (CSV/JSONL import, duplicates, approval, split, export)
    await test(
      'TC-08',
      'Data Lab CSV import, duplicate hash detection, manual approval, split assignment & export',
      'Valid + duplicate rows counted, starts pending_review, manual approval activates KB, splits sum=100, CSV exports',
      async () => {
        const csvPayload = [
          'external_id,audience,title,content,source',
          'kb-test-1,individual,Emergency Buffer Target,"Building three months of essential expenses in liquid savings cushions unexpected household income disruptions.",QA Synthetic KB',
          'kb-test-2,individual,Emergency Buffer Target,"Building three months of essential expenses in liquid savings cushions unexpected household income disruptions.",QA Synthetic KB',
        ].join('\n');

        const imp = await apiCall(
          '/api/admin/datasets/import',
          {
            method: 'POST',
            body: JSON.stringify({
              name: 'QA Test CSV Batch',
              datasetType: 'knowledge_base',
              format: 'csv',
              version: '1.2.0',
              rawText: csvPayload,
            }),
          },
          adminToken
        );
        assert.equal(imp.status, 201);
        assert.equal(imp.body.batch.status, 'pending_review');
        assert.equal(imp.body.batch.autoTrained, false);
        assert.equal(imp.body.batch.validRecords, 1);
        assert.equal(imp.body.batch.duplicateCount, 1);

        const batchId = imp.body.batch.id;
        const splitRes = await apiCall(
          `/api/admin/datasets/${batchId}/assign-splits`,
          {
            method: 'POST',
            body: JSON.stringify({ train: 100, validation: 0, test: 0 }),
          },
          adminToken
        );
        assert.equal(splitRes.status, 200);

        const rev = await apiCall(
          `/api/admin/datasets/${batchId}/review`,
          {
            method: 'POST',
            body: JSON.stringify({ decision: 'approved', reviewNotes: 'QA verified' }),
          },
          adminToken
        );
        assert.equal(rev.status, 200);
        assert.equal(rev.body.batch.status, 'approved');

        const exp = await apiCall(`/api/admin/datasets/${batchId}/export?format=csv`, {}, adminToken);
        assert.equal(exp.status, 200);
        assert.ok(String(exp.body).includes('kb-test-1'));

        return `batch=${batchId}, valid=1, dup=1, status=${rev.body.batch.status}`;
      }
    );

    console.log(`\nALL ${results.length} AUTOMATED TESTS PASSED.`);
  } finally {
    server.close();
  }
}

main().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
