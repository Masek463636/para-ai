PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS reports (
 id TEXT PRIMARY KEY, anonymous_session_id TEXT NOT NULL, request_id TEXT NOT NULL,
 report_hash TEXT NOT NULL, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('pending','partial','complete','failed')),
 lease_until INTEGER NOT NULL DEFAULT 0, generation_id TEXT NOT NULL,
 content_cipher TEXT, premium_unlocked INTEGER NOT NULL DEFAULT 0 CHECK(premium_unlocked IN (0,1)),
 payment_id TEXT, coach_free_used INTEGER NOT NULL DEFAULT 0 CHECK(coach_free_used BETWEEN 0 AND 1),
 coach_paid_used INTEGER NOT NULL DEFAULT 0 CHECK(coach_paid_used BETWEEN 0 AND 8),
 UNIQUE(anonymous_session_id,request_id)
);
CREATE INDEX IF NOT EXISTS reports_expiry ON reports(expires_at);
CREATE TABLE IF NOT EXISTS payments (
 id TEXT PRIMARY KEY, provider TEXT NOT NULL, provider_payment_id TEXT UNIQUE, status TEXT NOT NULL,
 amount INTEGER NOT NULL, currency TEXT NOT NULL, price_id TEXT NOT NULL,
 report_id TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE, created_at INTEGER NOT NULL,
 checkout_url TEXT, expires_at INTEGER NOT NULL, payment_intent_id TEXT
);
CREATE TABLE IF NOT EXISTS webhook_events (
 id TEXT PRIMARY KEY, provider TEXT NOT NULL, created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS coach_usage (
 id TEXT PRIMARY KEY, report_id TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
 request_id TEXT NOT NULL, question_hash TEXT NOT NULL,
 type TEXT NOT NULL CHECK(type IN ('free','paid')), status TEXT NOT NULL CHECK(status IN ('pending','complete','failed')),
 created_at INTEGER NOT NULL, lease_until INTEGER NOT NULL, attempt_id TEXT NOT NULL, answer_cipher TEXT,
 UNIQUE(report_id,request_id), UNIQUE(report_id,question_hash)
);
CREATE INDEX IF NOT EXISTS coach_report ON coach_usage(report_id,status);
CREATE TABLE IF NOT EXISTS analytics_events (
 id TEXT PRIMARY KEY, anonymous_session_id TEXT NOT NULL, event_name TEXT NOT NULL,
 entity_id TEXT NOT NULL DEFAULT '', metadata TEXT NOT NULL DEFAULT '{}', created_at INTEGER NOT NULL,
 UNIQUE(anonymous_session_id,event_name,entity_id)
);
CREATE INDEX IF NOT EXISTS analytics_created ON analytics_events(created_at);
CREATE TABLE IF NOT EXISTS rate_limits (
 id TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at INTEGER NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS payments_active_report ON payments(report_id) WHERE status IN ('creating','pending','paid','refunded','disputed');
CREATE TABLE IF NOT EXISTS revoked_intents (id TEXT PRIMARY KEY, status TEXT NOT NULL, created_at INTEGER NOT NULL);
