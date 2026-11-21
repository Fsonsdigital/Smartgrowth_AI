# SmartGrowth AI — Database Schema & MySQL 8.0 Export

The application currently persists to SQLite (`data/smartgrowth.db`) via parameterized queries behind repository interfaces (`src/server/repositories/interfaces.ts`). Below is the portable **MySQL 8.0 / InnoDB DDL** ready for Laravel migration and Truehost cPanel import.

## Entity Overview (15 Tables)
1. `users` — Accounts, scrypt/Argon2 password hashes, roles (`individual`, `sme`, `admin`), active workspace mode, `is_synthetic_demo`.
2. `individual_profiles` — Personal occupation, city, currency, income goals, emergency fund target months.
3. `sme_profiles` — Business name, sector, registration status, staff count, currency.
4. `business_memberships` — Many-to-many access control linking users to SME profiles (`owner`, `finance_manager`, `analyst`).
5. `assessment_templates` — Versioned Individual and SME questionnaire templates.
6. `assessment_questions` — Ordered 5-step questions with validation bounds and units.
7. `assessment_submissions` — Raw user answers and calculation version snapshot.
8. `assessment_results` — Deterministic JSON metrics, formula breakdowns, readiness tier, and data quality flags.
9. `recommendations` — Prompt-versioned Gemini outputs, cited knowledge sources, safety check flags, fallback metadata.
10. `learning_contents` — Courses, articles, and video lessons.
11. `learning_progress` — Per-user completion state.
12. `reports` — Immutable report snapshots for HTML/JSON/Print PDF export.
13. `dataset_batches` — Data Lab uploaded batches (`knowledge_base`, `evaluation`, `fine_tuning`), version, review status, quality metrics.
14. `dataset_records` — Individual rows with SHA-256 `content_hash`, validation errors, `split` (`unassigned`, `train`, `validation`, `test`), and `is_active_in_kb`.
15. `audit_logs` — Immutable trail of auth, assessment, AI, report, and Data Lab governance events.

---

## MySQL 8.0 / MariaDB 10.6+ Export DDL

```sql
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE users (
  id VARCHAR(64) PRIMARY KEY,
  email VARCHAR(191) NOT NULL UNIQUE,
  phone VARCHAR(40) NULL,
  full_name VARCHAR(191) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('individual', 'sme', 'admin') NOT NULL DEFAULT 'individual',
  active_mode ENUM('individual', 'sme') NOT NULL DEFAULT 'individual',
  is_synthetic_demo TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE individual_profiles (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL UNIQUE,
  occupation VARCHAR(120) NOT NULL DEFAULT '',
  city VARCHAR(120) NOT NULL DEFAULT '',
  currency VARCHAR(10) NOT NULL DEFAULT 'NGN',
  monthly_income_goal DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  emergency_fund_target_months INT NOT NULL DEFAULT 3,
  updated_at DATETIME(3) NOT NULL,
  CONSTRAINT fk_ind_prof_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE sme_profiles (
  id VARCHAR(64) PRIMARY KEY,
  owner_user_id VARCHAR(64) NOT NULL,
  business_name VARCHAR(191) NOT NULL,
  sector VARCHAR(120) NOT NULL,
  registration_status ENUM('registered', 'informal', 'in_progress') NOT NULL DEFAULT 'in_progress',
  staff_count INT NOT NULL DEFAULT 1,
  currency VARCHAR(10) NOT NULL DEFAULT 'NGN',
  updated_at DATETIME(3) NOT NULL,
  CONSTRAINT fk_sme_owner FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE business_memberships (
  id VARCHAR(64) PRIMARY KEY,
  sme_profile_id VARCHAR(64) NOT NULL,
  user_id VARCHAR(64) NOT NULL,
  member_role ENUM('owner', 'finance_manager', 'analyst') NOT NULL,
  status ENUM('active', 'invited') NOT NULL DEFAULT 'active',
  created_at DATETIME(3) NOT NULL,
  UNIQUE KEY uq_sme_user (sme_profile_id, user_id),
  CONSTRAINT fk_bm_sme FOREIGN KEY (sme_profile_id) REFERENCES sme_profiles(id) ON DELETE CASCADE,
  CONSTRAINT fk_bm_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE assessment_templates (
  id VARCHAR(64) PRIMARY KEY,
  slug VARCHAR(120) NOT NULL UNIQUE,
  audience ENUM('individual', 'sme') NOT NULL,
  title VARCHAR(191) NOT NULL,
  version VARCHAR(40) NOT NULL,
  description TEXT NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE assessment_questions (
  id VARCHAR(64) PRIMARY KEY,
  template_id VARCHAR(64) NOT NULL,
  field_key VARCHAR(80) NOT NULL,
  step_number INT NOT NULL,
  label VARCHAR(191) NOT NULL,
  help_text TEXT NOT NULL,
  input_type ENUM('currency', 'number', 'select') NOT NULL,
  unit VARCHAR(32) NOT NULL,
  is_required TINYINT(1) NOT NULL DEFAULT 1,
  min_value DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  sort_order INT NOT NULL,
  options_json JSON NULL,
  CONSTRAINT fk_aq_tpl FOREIGN KEY (template_id) REFERENCES assessment_templates(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE assessment_submissions (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  sme_profile_id VARCHAR(64) NULL,
  template_id VARCHAR(64) NOT NULL,
  audience ENUM('individual', 'sme') NOT NULL,
  answers_json JSON NOT NULL,
  calculation_version VARCHAR(40) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'calculated',
  created_at DATETIME(3) NOT NULL,
  CONSTRAINT fk_asub_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_asub_sme FOREIGN KEY (sme_profile_id) REFERENCES sme_profiles(id) ON DELETE SET NULL,
  CONSTRAINT fk_asub_tpl FOREIGN KEY (template_id) REFERENCES assessment_templates(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE assessment_results (
  id VARCHAR(64) PRIMARY KEY,
  submission_id VARCHAR(64) NOT NULL UNIQUE,
  user_id VARCHAR(64) NOT NULL,
  sme_profile_id VARCHAR(64) NULL,
  audience ENUM('individual', 'sme') NOT NULL,
  calculation_version VARCHAR(40) NOT NULL,
  output_json JSON NOT NULL,
  created_at DATETIME(3) NOT NULL,
  INDEX idx_ar_user_created (user_id, created_at),
  CONSTRAINT fk_ar_sub FOREIGN KEY (submission_id) REFERENCES assessment_submissions(id) ON DELETE CASCADE,
  CONSTRAINT fk_ar_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_ar_sme FOREIGN KEY (sme_profile_id) REFERENCES sme_profiles(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE recommendations (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  assessment_result_id VARCHAR(64) NULL,
  audience ENUM('individual', 'sme') NOT NULL,
  prompt_version VARCHAR(40) NOT NULL,
  model_name VARCHAR(80) NOT NULL,
  question TEXT NULL,
  structured_output_json JSON NOT NULL,
  sources_json JSON NOT NULL,
  safety_passed TINYINT(1) NOT NULL DEFAULT 1,
  safety_flags_json JSON NOT NULL,
  fallback_used TINYINT(1) NOT NULL DEFAULT 0,
  fallback_reason TEXT NULL,
  created_at DATETIME(3) NOT NULL,
  INDEX idx_rec_user_created (user_id, created_at),
  CONSTRAINT fk_rec_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_rec_ar FOREIGN KEY (assessment_result_id) REFERENCES assessment_results(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE learning_contents (
  id VARCHAR(64) PRIMARY KEY,
  slug VARCHAR(120) NOT NULL UNIQUE,
  title VARCHAR(191) NOT NULL,
  category ENUM('courses', 'articles', 'videos') NOT NULL,
  audience ENUM('individual', 'sme', 'all') NOT NULL,
  duration_minutes INT NOT NULL,
  level ENUM('Beginner', 'Intermediate', 'Applied') NOT NULL,
  summary TEXT NOT NULL,
  body_markdown MEDIUMTEXT NOT NULL,
  source_ref VARCHAR(191) NOT NULL,
  is_published TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE learning_progress (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  content_id VARCHAR(64) NOT NULL,
  status ENUM('started', 'completed') NOT NULL,
  completed_at DATETIME(3) NULL,
  UNIQUE KEY uq_lp_user_content (user_id, content_id),
  CONSTRAINT fk_lp_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_lp_content FOREIGN KEY (content_id) REFERENCES learning_contents(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE reports (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  assessment_result_id VARCHAR(64) NOT NULL,
  report_type ENUM('financial_health', 'credit_readiness') NOT NULL,
  title VARCHAR(191) NOT NULL,
  snapshot_json JSON NOT NULL,
  created_at DATETIME(3) NOT NULL,
  INDEX idx_rep_user_created (user_id, created_at),
  CONSTRAINT fk_rep_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_rep_ar FOREIGN KEY (assessment_result_id) REFERENCES assessment_results(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE dataset_batches (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(191) NOT NULL,
  dataset_type ENUM('knowledge_base', 'evaluation', 'fine_tuning') NOT NULL,
  source_format ENUM('csv', 'jsonl') NOT NULL,
  version VARCHAR(40) NOT NULL,
  status ENUM('pending_review', 'approved', 'rejected') NOT NULL DEFAULT 'pending_review',
  uploaded_by VARCHAR(64) NOT NULL,
  reviewed_by VARCHAR(64) NULL,
  review_notes TEXT NULL,
  quality_report_json JSON NOT NULL,
  total_records INT NOT NULL,
  valid_records INT NOT NULL,
  duplicate_count INT NOT NULL,
  created_at DATETIME(3) NOT NULL,
  reviewed_at DATETIME(3) NULL,
  CONSTRAINT fk_db_up FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_db_rev FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE dataset_records (
  id VARCHAR(64) PRIMARY KEY,
  batch_id VARCHAR(64) NOT NULL,
  dataset_type ENUM('knowledge_base', 'evaluation', 'fine_tuning') NOT NULL,
  external_id VARCHAR(120) NOT NULL,
  audience ENUM('individual', 'sme', 'all') NOT NULL,
  title VARCHAR(255) NOT NULL,
  content MEDIUMTEXT NOT NULL,
  metadata_json JSON NOT NULL,
  split ENUM('unassigned', 'train', 'validation', 'test') NOT NULL DEFAULT 'unassigned',
  content_hash CHAR(64) NOT NULL,
  validation_status ENUM('valid', 'invalid', 'duplicate') NOT NULL,
  validation_errors_json JSON NOT NULL,
  is_active_in_kb TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL,
  INDEX idx_dr_kb (dataset_type, is_active_in_kb, audience),
  INDEX idx_dr_hash (content_hash),
  CONSTRAINT fk_dr_batch FOREIGN KEY (batch_id) REFERENCES dataset_batches(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE audit_logs (
  id VARCHAR(64) PRIMARY KEY,
  actor_user_id VARCHAR(64) NULL,
  actor_email VARCHAR(191) NULL,
  action VARCHAR(120) NOT NULL,
  resource_type VARCHAR(80) NOT NULL,
  resource_id VARCHAR(64) NULL,
  details_json JSON NOT NULL,
  created_at DATETIME(3) NOT NULL,
  INDEX idx_aud_created (created_at),
  CONSTRAINT fk_aud_user FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
```
