# SmartGrowth AI — Production Readiness & Truehost (Laravel / MySQL) Migration Guide

> **Non-Destructive Notice:** No files on any existing Truehost website have been modified or deployed. This guide prepares an isolated migration path to Laravel + MySQL on cPanel.

---

## 1. Complete Source-Code Inventory

| File | Layer | Responsibility |
| :--- | :--- | :--- |
| `server.ts` | Node Runtime | Express bootstrap, SQLite initialization, Vite dev / static dist serving on port 3000 |
| `src/server/app.ts` | Backend API | REST endpoints, input validation, ownership checks, RBAC, audit logging |
| `src/server/db/database.ts` | Data Layer | SQLite WAL connection singleton |
| `src/server/db/migrations.ts` | Data Layer | 15-table relational DDL |
| `src/server/db/seed.ts` | Data Layer | Idempotent synthetic demo users, templates, KB/Eval/FT datasets, learning modules |
| `src/server/repositories/interfaces.ts` | Repository Contract | Backend-agnostic interfaces (`IUserRepository`, `IAssessmentRepository`, etc.) |
| `src/server/repositories/sqliteRepository.ts` | SQLite Adapter | Parameterized `better-sqlite3` implementations |
| `src/server/services/authService.ts` | Security | `scrypt` password hashing, HMAC-SHA256 bearer tokens, `requireAuth`, `requireRole` |
| `src/server/services/assessment/individualEngine.ts` | Domain Engine | Individual deterministic ratios (`ind-v1.2.0`) |
| `src/server/services/assessment/smeEngine.ts` | Domain Engine | SME deterministic cashflow & runway ratios (`sme-v1.2.0`) |
| `src/server/services/ai/knowledgeService.ts` | RAG Service | Approved KB retrieval with audience filtering |
| `src/server/services/ai/recommendationService.ts` | AI Service | Server-side `@google/genai` integration (`gemini-4-hydrogen`), safety checks, fallback |
| `src/server/services/datalab/datasetService.ts` | Data Lab | CSV/JSONL parser, schema validation, SHA-256 duplicate hashing, splits, export |
| `src/shared/types.ts` | Shared Types | Cross-boundary TypeScript contracts |
| `src/lib/api.ts` | Frontend API | Typed client storing bearer token in memory only + download helpers |
| `src/components/BrandMark.tsx`, `Charts.tsx` | UI Primitives | Brand SVG, BandIndicator, SyntheticBanner, RatioRingGauge, FactorBars, CashflowChart |
| `src/components/screens/*.tsx` | UI Screens | All 10 principal screens + Admin & Data Lab screen |
| `src/App.tsx` | Frontend Shell | Responsive sidebar + mobile bottom navigation + drawer |
| `tests/runAllTests.ts` | QA Suite | Automated unit & HTTP integration tests |

---

## 2. Environment-Variable Inventory

| Variable | Required in Prod | Purpose |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | Yes (for live AI) | Server-side Gemini API credential (never exposed to client bundle) |
| `SESSION_SECRET` | Yes | High-entropy >=32-char signing secret for session tokens |
| `APP_URL` | Yes | Public HTTPS origin (`https://app.yourdomain.com`) |
| `DATABASE_PATH` | Node only | SQLite path (replaced by `DB_*` MySQL credentials in Laravel) |
| `ENABLE_DEMO_ACCOUNTS` | Optional (`false` in prod) | Controls visibility of `/api/auth/demo-login` sandbox accounts |
| `PORT` | Node only | HTTP bind port (default `3000`) |

---

## 3. Node.js & Firebase Components Requiring Replacement for Laravel / MySQL

*Note: This codebase deliberately avoided Firebase SDKs and kept all persistence behind repository interfaces to streamline migration.*

| Current Component | Replacement in Laravel 11 + PHP 8.2+ / MySQL |
| :--- | :--- |
| `server.ts` + `express` (`src/server/app.ts`) | Laravel `routes/api.php` + FormRequest validators + Controllers |
| `better-sqlite3` (`sqliteRepository.ts`) | Laravel Eloquent Models + MySQL 8.0 / MariaDB (`DB_CONNECTION=mysql`) |
| `src/server/db/migrations.ts` | `database/migrations/*.php` using `Schema::create(...)` matching `/docs/DATABASE_SCHEMA.md` |
| `authService.ts` (`scrypt` + HMAC token) | Laravel Sanctum (`HasApiTokens`) + `Hash::make` (Argon2id/Bcrypt) + Laravel Policies/Gates |
| `individualEngine.ts` & `smeEngine.ts` | Port pure functions to `App\Services\Assessment\IndividualAssessmentEngine.php` & `SmeAssessmentEngine.php` |
| `recommendationService.ts` (`@google/genai`) | `App\Services\AI\GeminiEducationService.php` using `Illuminate\Support\Facades\Http` against Gemini REST API |
| `datasetService.ts` (`parseCsvText`, `hash`) | `App\Services\DataLab\DatasetImportService.php` using `fgetcsv`/`League\Csv` and `hash('sha256', ...)` |
| Vite SPA (`dist/`) | Build static assets with `npm run build` into Laravel `public/` or serve via Vite `@vite` helper |
| **Firebase Note** | **Zero Firebase dependencies exist in this repository.** No Firestore rules, Firebase Auth client tokens, or Firebase Admin SDK calls need removal. |

---

## 4. PHP 8.2+ Compatibility Checklist (Truehost cPanel)
- [ ] Select **PHP 8.2 or 8.3** in cPanel -> *MultiPHP Manager* for the target subdomain/domain.
- [ ] Enable required PHP extensions: `pdo_mysql`, `mbstring`, `openssl`, `json`, `curl`, `fileinfo`, `tokenizer`, `bcmath`, `ctype`, `xml`.
- [ ] Disable `display_errors = Off` in production `php.ini` (`APP_DEBUG=false`).
- [ ] Configure `upload_max_filesize = 10M` and `post_max_size = 12M` for CSV/JSONL Data Lab uploads.

---

## 5. cPanel Deployment Instructions (Fresh Subdomain or Directory — Do Not Overwrite Existing Site)
1. **Create Isolated Subdomain & Root**: In cPanel -> *Domains*, create e.g. `smartgrowth.yourdomain.com` pointing to `/home/<cpanel_user>/smartgrowth_app/public` (never `public_html` of an existing site).
2. **Provision MySQL Database**: In cPanel -> *MySQL Databases*, create database `cpaneluser_smartgrowth`, create dedicated DB user with least-privilege grants (`SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX`), and import DDL from `/docs/DATABASE_SCHEMA.md` (or run `php artisan migrate`).
3. **Upload Application**: Upload Laravel project + built frontend (`npm run build`) to `/home/<cpanel_user>/smartgrowth_app` outside `public_html`.
4. **Configure `.env`**: Set `APP_ENV=production`, `APP_DEBUG=false`, `ENABLE_DEMO_ACCOUNTS=false`, `DB_*`, `GEMINI_API_KEY`, and run `php artisan key:generate && php artisan config:cache && php artisan route:cache`.
5. **Storage Permissions**: Ensure `storage/` and `bootstrap/cache/` are writable (`0755`).

---

## 6. HTTPS Configuration Instructions
1. Open cPanel -> *SSL/TLS Status* -> click **Run AutoSSL** for `smartgrowth.yourdomain.com`.
2. In `public/.htaccess`, enforce HTTPS redirect only after AutoSSL certificate shows green:
   ```apache
   RewriteEngine On
   RewriteCond %{HTTPS} !=on
   RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
   ```
3. Set `SESSION_SECURE_COOKIE=true` and `APP_URL=https://smartgrowth.yourdomain.com`.

---

## 7. Backup and Restoration Instructions
- **Automated Daily Backup**: Configure a cPanel Cron Job running `mysqldump --single-transaction -u $DB_USER -p$DB_PASS $DB_NAME | gzip > /home/$USER/backups/sg_$(date +\%F).sql.gz` and retain 14 days.
- **Data Lab Exports**: Export approved `knowledge_base`, `evaluation`, and `fine_tuning` batches as JSONL before upgrades.
- **Restoration**: Stop incoming traffic (`php artisan down`), restore SQL dump (`gunzip < sg_YYYY-MM-DD.sql.gz | mysql ...`), verify row counts and `/api/health`, then run `php artisan up`.

---

## 8. Security Checklist
- [ ] `APP_DEBUG=false` and `ENABLE_DEMO_ACCOUNTS=false` in production `.env`.
- [ ] `.env` permissions set to `0600`, never committed to Git or placed inside `public/`.
- [ ] Admin accounts created via CLI seeder with strong passwords; public `/api/auth/register` never grants `admin` role.
- [ ] All SQL queries parameterized (Eloquent/PDO prepared bindings).
- [ ] Ownership Policies enforced on assessments, SME profiles, recommendations, and reports.
- [ ] `GEMINI_API_KEY` accessed strictly server-side; CORS restricted to exact `APP_URL`.

---

## 9. Rollback Procedure
1. Put maintenance page up (`php artisan down`).
2. Switch symlink / Git checkout back to previous tagged release directory.
3. If schema changed, run `php artisan migrate:rollback --step=1` or restore pre-release MySQL dump.
4. Clear caches (`php artisan config:clear && php artisan route:clear`) and verify `/api/health`.

---

## 10. Known Limitations
- **PDF Export**: Client uses browser print-to-PDF (`window.print()`) plus downloadable standalone HTML and JSON snapshots rather than server-side headless Chromium/Dompdf rendering.
- **Live Gemini AI**: Requires a valid `GEMINI_API_KEY` environment secret; when absent or unreachable, the server transparently activates the deterministic Knowledge-Base fallback and records `fallbackUsed: true`.
- **Single-Node SQLite**: The AI Studio preview uses SQLite in WAL mode; horizontal multi-server scaling requires migrating to MySQL 8.0 / PostgreSQL as mapped above.
