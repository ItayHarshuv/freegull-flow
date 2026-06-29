CREATE TABLE IF NOT EXISTS shift_change_requests (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  shift_id TEXT NOT NULL,
  worker_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  requested_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL CHECK (request_type IN ('remove', 'time_change')),
  original_shift JSONB NOT NULL,
  proposed_shift JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  review_note TEXT,
  reviewed_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS shift_change_requests_club_status_idx
  ON shift_change_requests (club_id, status);

CREATE INDEX IF NOT EXISTS shift_change_requests_worker_idx
  ON shift_change_requests (club_id, worker_id);

CREATE INDEX IF NOT EXISTS shift_change_requests_shift_idx
  ON shift_change_requests (club_id, shift_id);

CREATE TABLE IF NOT EXISTS user_notifications (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  url TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_notifications_user_idx
  ON user_notifications (club_id, user_id, is_read);
