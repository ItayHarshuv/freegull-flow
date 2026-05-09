CREATE TABLE IF NOT EXISTS google_calendar_availability_events (
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  availability_id TEXT NOT NULL,
  calendar_id TEXT NOT NULL,
  google_event_id TEXT NOT NULL,
  last_synced_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (club_id, availability_id)
);

CREATE INDEX IF NOT EXISTS idx_gcal_availability_events_club
  ON google_calendar_availability_events(club_id);

