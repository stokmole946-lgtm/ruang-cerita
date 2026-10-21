CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('STUDENT', 'ADMIN');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE report_status AS ENUM ('NEW', 'IN_PROGRESS', 'DONE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'STUDENT',
  email TEXT,
  whatsapp TEXT,
  must_change_password BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS monthly_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period DATE NOT NULL,
  complaint TEXT NOT NULL CHECK (char_length(complaint) BETWEEN 3 AND 3000),
  message TEXT NOT NULL CHECK (char_length(message) BETWEEN 3 AND 3000),
  impression TEXT NOT NULL CHECK (char_length(impression) BETWEEN 3 AND 3000),
  suggestion TEXT NOT NULL CHECK (char_length(suggestion) BETWEEN 3 AND 3000),
  recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  reveal_sender BOOLEAN NOT NULL DEFAULT TRUE,
  urgent BOOLEAN NOT NULL DEFAULT FALSE,
  status report_status NOT NULL DEFAULT 'NEW',
  complaint_reply TEXT,
  impression_reply TEXT,
  suggestion_reply TEXT,
  message_note TEXT,
  forwarded_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(student_id, period),
  CHECK (date_trunc('month', period)::date = period)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  subject_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS app_secrets (
  name TEXT PRIMARY KEY,
  secret TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO app_secrets (name, secret)
VALUES ('attendance_qr', encode(gen_random_bytes(32), 'hex'))
ON CONFLICT (name) DO NOTHING;

INSERT INTO app_secrets (name, secret)
VALUES 
  ('vapid_public_key', 'BFZyGD132dSUcuHEtsokzC2Za_2212Qi9ggfwW7M20utkqHtpJOeO9SoiSQXIkhz4ArN71ITbqBKZ6M7YRGvy4w'),
  ('vapid_private_key', 'r8mPZCPYhdilxVJXey9mvRDSNhVR7AOa_YujTmHwRpQ')
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx ON push_subscriptions(user_id);

CREATE TABLE IF NOT EXISTS ai_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL DEFAULT 'general'
    CHECK (category IN ('general', 'agenda', 'assignment', 'sija', 'class')),
  fact TEXT NOT NULL CHECK (char_length(fact) BETWEEN 3 AND 500),
  learned_from UUID REFERENCES users(id) ON DELETE SET NULL,
  learned_from_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_memories_visibility_idx
ON ai_memories(status, learned_from, created_at DESC);

CREATE INDEX IF NOT EXISTS reports_period_idx ON monthly_reports(period);
CREATE INDEX IF NOT EXISTS reports_status_idx ON monthly_reports(status);
CREATE INDEX IF NOT EXISTS reports_recipient_idx ON monthly_reports(recipient_id, forwarded_at);

CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_touch_updated_at ON users;
CREATE TRIGGER users_touch_updated_at BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS reports_touch_updated_at ON monthly_reports;
CREATE TRIGGER reports_touch_updated_at BEFORE UPDATE ON monthly_reports
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS ai_memories_touch_updated_at ON ai_memories;
CREATE TRIGGER ai_memories_touch_updated_at BEFORE UPDATE ON ai_memories
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TABLE IF NOT EXISTS class_posts (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 kind TEXT NOT NULL CHECK(kind IN ('event','announcement')),
 title TEXT NOT NULL CHECK(char_length(title) BETWEEN 3 AND 120),
 content TEXT NOT NULL CHECK(char_length(content) BETWEEN 3 AND 5000),
 category TEXT NOT NULL DEFAULT 'Kegiatan',
 starts_at TIMESTAMPTZ NOT NULL,
 ends_at TIMESTAMPTZ NOT NULL,
 created_by UUID NOT NULL REFERENCES users(id),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 CHECK(ends_at >= starts_at)
);
CREATE INDEX IF NOT EXISTS class_posts_dates ON class_posts(kind, starts_at, ends_at);
ALTER TABLE class_posts ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS student_curhats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 3 AND 5000),
  is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
  urgent BOOLEAN NOT NULL DEFAULT FALSE,
  status report_status NOT NULL DEFAULT 'NEW',
  reply TEXT,
  replied_by UUID REFERENCES users(id) ON DELETE SET NULL,
  replied_at TIMESTAMPTZ,
  admin_read_at TIMESTAMPTZ,
  student_read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS student_curhats_student_idx ON student_curhats(student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS student_curhats_status_idx ON student_curhats(status, urgent DESC, created_at DESC);

DROP TRIGGER IF EXISTS curhats_touch_updated_at ON student_curhats;
CREATE TRIGGER curhats_touch_updated_at BEFORE UPDATE ON student_curhats
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TABLE IF NOT EXISTS piket_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  piket_date DATE NOT NULL DEFAULT CURRENT_DATE,
  day_name TEXT NOT NULL,
  photo_url TEXT NOT NULL,
  note TEXT,
  uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS piket_logs_date_idx ON piket_logs(piket_date DESC);

CREATE TABLE IF NOT EXISTS attendance_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 3 AND 120),
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  late_after TIMESTAMPTZ NOT NULL,
  closed_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  token_version UUID NOT NULL DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (late_after >= starts_at),
  CHECK (closed_at IS NULL OR closed_at >= starts_at)
);

CREATE UNIQUE INDEX IF NOT EXISTS attendance_one_active_session_idx
ON attendance_sessions ((TRUE)) WHERE closed_at IS NULL;

CREATE INDEX IF NOT EXISTS attendance_sessions_started_idx
ON attendance_sessions(starts_at DESC);

CREATE TABLE IF NOT EXISTS attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('PRESENT', 'LATE', 'EXCUSED', 'SICK', 'ABSENT', 'NEUTRAL')),
  source TEXT NOT NULL CHECK (source IN ('QR', 'MANUAL', 'AUTO_NEUTRAL')),
  scanned_at TIMESTAMPTZ,
  recorded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  note TEXT CHECK (note IS NULL OR char_length(note) <= 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(session_id, student_id)
);

CREATE INDEX IF NOT EXISTS attendance_records_student_idx
ON attendance_records(student_id, created_at DESC);

CREATE INDEX IF NOT EXISTS attendance_records_session_idx
ON attendance_records(session_id, status, created_at);

ALTER TABLE attendance_records DROP CONSTRAINT IF EXISTS attendance_records_status_check;
ALTER TABLE attendance_records DROP CONSTRAINT IF EXISTS attendance_records_source_check;

UPDATE attendance_records
SET status = 'NEUTRAL',
    source = 'AUTO_NEUTRAL',
    note = 'Dinetralisasi dari status otomatis sebelumnya'
WHERE source = 'AUTO_ABSENT';

ALTER TABLE attendance_records ADD CONSTRAINT attendance_records_status_check
CHECK (status IN ('PRESENT', 'LATE', 'EXCUSED', 'SICK', 'ABSENT', 'NEUTRAL'));

ALTER TABLE attendance_records ADD CONSTRAINT attendance_records_source_check
CHECK (source IN ('QR', 'MANUAL', 'AUTO_NEUTRAL'));

DROP TRIGGER IF EXISTS attendance_records_touch_updated_at ON attendance_records;
CREATE TRIGGER attendance_records_touch_updated_at BEFORE UPDATE ON attendance_records
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
