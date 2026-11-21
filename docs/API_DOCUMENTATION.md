# SmartGrowth AI — REST API Documentation

Base URL (Development / Preview): `http://localhost:3000/api`  
Authentication: Bearer token in `Authorization: Bearer <token>` header (HMAC-SHA256 signed server-side; held in browser memory only).

---

## 1. Health & Sandbox Authentication

| Method | Path | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Public | Returns service status, demo mode flag, and whether `GEMINI_API_KEY` is configured. |
| `GET` | `/api/auth/demo-accounts` | Public | Lists flagged synthetic demonstration accounts when `ENABLE_DEMO_ACCOUNTS=true` or non-production. |
| `POST` | `/api/auth/register` | Public | Registers a new `individual` or `sme` user (`admin` self-registration is blocked). Returns `{ token, user }`. |
| `POST` | `/api/auth/login` | Public | Verifies email + scrypt password hash. Returns `{ token, user }`. |
| `POST` | `/api/auth/demo-login` | Public | Issues token strictly for seeded `isSyntheticDemo = true` accounts when enabled. |
| `GET` | `/api/auth/me` | Bearer | Returns the authenticated user profile. |
| `PATCH` | `/api/auth/mode` | Bearer | Switches active workspace mode between `"individual"` and `"sme"`. |

---

## 2. Profiles & SME Business Membership

| Method | Path | Auth | Ownership / Access Control |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/profiles` | Bearer | Returns caller's `individual_profile`, `sme_profiles`, and `business_memberships`. |
| `PUT` | `/api/profiles/individual` | Bearer | Upserts caller's own individual profile (`occupation`, `city`, `currency`, `monthlyIncomeGoal`, `emergencyFundTargetMonths`). |
| `POST` | `/api/profiles/sme` | Bearer | Creates a new SME profile and assigns caller as `owner` in `business_memberships`. |
| `PUT` | `/api/profiles/sme/:smeId` | Bearer | Updates SME profile. Returns `403` if caller is not an active member. |
| `POST` | `/api/profiles/sme/:smeId/members` | Bearer | Adds an existing registered user to SME membership. Returns `403` unless caller is SME `owner`. |

---

## 3. Financial Assessments (Deterministic Engines)

| Method | Path | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/assessments/templates/:audience` | Bearer | Returns active `individual` (`ind-v1.2.0`) or `sme` (`sme-v1.2.0`) template and ordered 5-step questions. |
| `GET` | `/api/assessments` | Bearer | Lists assessment results owned by `req.authUser.id` (optional `?audience=individual\|sme`). |
| `GET` | `/api/assessments/:id` | Bearer | Retrieves one assessment result. Returns `403` if owned by another user. |
| `POST` | `/api/assessments` | Bearer | Validates inputs, executes deterministic Individual or SME engine, saves submission + result, logs audit event. |

### `POST /api/assessments` Example Payload (Individual)
```json
{
  "audience": "individual",
  "answers": {
    "monthlyIncome": 250000,
    "incomeStability": "steady",
    "monthlyExpenses": 175000,
    "dependentsCount": 1,
    "monthlySavings": 45000,
    "totalLiquidSavings": 360000,
    "monthlyDebtRepayment": 20000,
    "totalDebt": 80000
  }
}
```

---

## 4. Grounded AI Recommendations & Approved Knowledge

| Method | Path | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/recommendations` | Bearer | Lists caller's saved AI explanations (optional `?audience=individual\|sme`). |
| `POST` | `/api/recommendations/generate` | Bearer | Generates structured educational explanation for caller's `assessmentResultId` using Gemini `gemini-4-hydrogen` grounded in approved KB records. Enforces ownership (`403`), restricted-request refusal, safety regex check, and deterministic KB fallback. |
| `GET` | `/api/knowledge` | Bearer | Returns administrator-approved active knowledge-base records filtered by `?audience=individual\|sme\|all`. |

---

## 5. Learning Centre & Reports

| Method | Path | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/learning` | Bearer | Lists published learning modules with caller's completion status. |
| `POST` | `/api/learning/:id/progress` | Bearer | Updates completion state (`{ "completed": true }`) for caller. |
| `GET` | `/api/reports` | Bearer | Lists caller's saved financial health and credit readiness indicator reports. |
| `GET` | `/api/reports/:id` | Bearer | Retrieves one saved report. Returns `403` if owned by another customer. |
| `POST` | `/api/reports` | Bearer | Creates an auditable snapshot report from caller's `assessmentResultId`. |

---

## 6. Administration & SmartGrowth AI Data Lab (`role === 'admin'` only)

All `/api/admin/*` routes enforce `requireAuth` + `requireRole('admin')`, returning `403 Forbidden` to `individual` or `sme` users.

| Method | Path | Description |
| :--- | :--- | :--- |
| `GET` | `/api/admin/overview` | Returns system record counts, user list (no password hashes), and recent audit logs. |
| `GET` | `/api/admin/datasets` | Lists dataset batches (optional `?type=knowledge_base\|evaluation\|fine_tuning`). |
| `GET` | `/api/admin/datasets/:batchId` | Returns batch metadata, quality report, and child records. |
| `POST` | `/api/admin/datasets/preview` | Parses CSV/JSONL payload, runs schema validation & SHA-256 duplicate detection without saving. |
| `POST` | `/api/admin/datasets/import` | Imports validated batch in `pending_review` state (`autoTrained: false`). |
| `POST` | `/api/admin/datasets/:batchId/review` | Approves or rejects a batch (`decision: "approved" \| "rejected"`). Only approved `knowledge_base` batches activate records for RAG. |
| `PATCH` | `/api/admin/datasets/records/:recordId/split` | Assigns a single record to `unassigned`, `train`, `validation`, or `test`. |
| `POST` | `/api/admin/datasets/:batchId/assign-splits` | Assigns `train` / `validation` / `test` percentages (must sum to 100) across valid records. |
| `GET` | `/api/admin/datasets/:batchId/export` | Exports batch records as downloadable CSV or JSONL (`?format=csv\|jsonl`). |
| `GET` | `/api/admin/evaluations` | Lists evaluation dataset records and parent batch approval statuses. |
