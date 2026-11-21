import type Database from 'better-sqlite3';

export const INITIAL_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  full_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('individual', 'sme', 'admin')),
  active_mode TEXT NOT NULL CHECK (active_mode IN ('individual', 'sme')),
  is_synthetic_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS individual_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  occupation TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  currency TEXT NOT NULL DEFAULT 'NGN',
  monthly_income_goal REAL NOT NULL DEFAULT 0,
  emergency_fund_target_months INTEGER NOT NULL DEFAULT 3,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sme_profiles (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT NOT NULL,
  business_name TEXT NOT NULL,
  sector TEXT NOT NULL,
  registration_status TEXT NOT NULL CHECK (registration_status IN ('registered', 'informal', 'in_progress')),
  staff_count INTEGER NOT NULL DEFAULT 1,
  currency TEXT NOT NULL DEFAULT 'NGN',
  updated_at TEXT NOT NULL,
  FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS business_memberships (
  id TEXT PRIMARY KEY,
  sme_profile_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  member_role TEXT NOT NULL CHECK (member_role IN ('owner', 'finance_manager', 'analyst')),
  status TEXT NOT NULL CHECK (status IN ('active', 'invited')),
  created_at TEXT NOT NULL,
  UNIQUE (sme_profile_id, user_id),
  FOREIGN KEY (sme_profile_id) REFERENCES sme_profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS assessment_templates (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  audience TEXT NOT NULL CHECK (audience IN ('individual', 'sme')),
  title TEXT NOT NULL,
  version TEXT NOT NULL,
  description TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS assessment_questions (
  id TEXT PRIMARY KEY,
  template_id TEXT NOT NULL,
  field_key TEXT NOT NULL,
  step_number INTEGER NOT NULL,
  label TEXT NOT NULL,
  help_text TEXT NOT NULL,
  input_type TEXT NOT NULL CHECK (input_type IN ('currency', 'number', 'select')),
  unit TEXT NOT NULL,
  is_required INTEGER NOT NULL DEFAULT 1,
  min_value REAL NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL,
  options_json TEXT,
  FOREIGN KEY (template_id) REFERENCES assessment_templates(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS assessment_submissions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  sme_profile_id TEXT,
  template_id TEXT NOT NULL,
  audience TEXT NOT NULL CHECK (audience IN ('individual', 'sme')),
  answers_json TEXT NOT NULL,
  calculation_version TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'calculated',
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (sme_profile_id) REFERENCES sme_profiles(id) ON DELETE SET NULL,
  FOREIGN KEY (template_id) REFERENCES assessment_templates(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS assessment_results (
  id TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL,
  sme_profile_id TEXT,
  audience TEXT NOT NULL CHECK (audience IN ('individual', 'sme')),
  calculation_version TEXT NOT NULL,
  output_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (submission_id) REFERENCES assessment_submissions(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (sme_profile_id) REFERENCES sme_profiles(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS recommendations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  assessment_result_id TEXT,
  audience TEXT NOT NULL CHECK (audience IN ('individual', 'sme')),
  prompt_version TEXT NOT NULL,
  model_name TEXT NOT NULL,
  question TEXT,
  structured_output_json TEXT NOT NULL,
  sources_json TEXT NOT NULL,
  safety_passed INTEGER NOT NULL DEFAULT 1,
  safety_flags_json TEXT NOT NULL DEFAULT '[]',
  fallback_used INTEGER NOT NULL DEFAULT 0,
  fallback_reason TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (assessment_result_id) REFERENCES assessment_results(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS learning_contents (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('courses', 'articles', 'videos')),
  audience TEXT NOT NULL CHECK (audience IN ('individual', 'sme', 'all')),
  duration_minutes INTEGER NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('Beginner', 'Intermediate', 'Applied')),
  summary TEXT NOT NULL,
  body_markdown TEXT NOT NULL,
  source_ref TEXT NOT NULL,
  is_published INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS learning_progress (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  content_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('started', 'completed')),
  completed_at TEXT,
  UNIQUE (user_id, content_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (content_id) REFERENCES learning_contents(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  assessment_result_id TEXT NOT NULL,
  report_type TEXT NOT NULL CHECK (report_type IN ('financial_health', 'credit_readiness')),
  title TEXT NOT NULL,
  snapshot_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (assessment_result_id) REFERENCES assessment_results(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS dataset_batches (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  dataset_type TEXT NOT NULL CHECK (dataset_type IN ('knowledge_base', 'evaluation', 'fine_tuning')),
  source_format TEXT NOT NULL CHECK (source_format IN ('csv', 'jsonl')),
  version TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending_review', 'approved', 'rejected')),
  uploaded_by TEXT NOT NULL,
  reviewed_by TEXT,
  review_notes TEXT,
  quality_report_json TEXT NOT NULL,
  total_records INTEGER NOT NULL,
  valid_records INTEGER NOT NULL,
  duplicate_count INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  reviewed_at TEXT,
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS dataset_records (
  id TEXT PRIMARY KEY,
  batch_id TEXT NOT NULL,
  dataset_type TEXT NOT NULL CHECK (dataset_type IN ('knowledge_base', 'evaluation', 'fine_tuning')),
  external_id TEXT NOT NULL,
  audience TEXT NOT NULL CHECK (audience IN ('individual', 'sme', 'all')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata_json TEXT NOT NULL,
  split TEXT NOT NULL CHECK (split IN ('unassigned', 'train', 'validation', 'test')),
  content_hash TEXT NOT NULL,
  validation_status TEXT NOT NULL CHECK (validation_status IN ('valid', 'invalid', 'duplicate')),
  validation_errors_json TEXT NOT NULL,
  is_active_in_kb INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (batch_id) REFERENCES dataset_batches(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  actor_user_id TEXT,
  actor_email TEXT,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  details_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_assessment_results_user ON assessment_results(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recommendations_user ON recommendations(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_user ON reports(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dataset_records_kb ON dataset_records(dataset_type, is_active_in_kb, audience);
CREATE INDEX IF NOT EXISTS idx_dataset_records_hash ON dataset_records(content_hash);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
`;

export function runMigrations(db: Database.Database): void {
  db.exec(INITIAL_SCHEMA_SQL);
  const existing = db
    .prepare('SELECT version FROM schema_migrations WHERE version = ?')
    .get('001_initial_schema');
  if (!existing) {
    db.prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)').run(
      '001_initial_schema',
      new Date().toISOString()
    );
  }
}
