CREATE TABLE IF NOT EXISTS clubs (
  id TEXT PRIMARY KEY,
  landline TEXT NOT NULL DEFAULT '',
  mobile TEXT NOT NULL DEFAULT '',
  location_text TEXT NOT NULL DEFAULT '',
  maps_url TEXT NOT NULL DEFAULT '',
  bank_account_name TEXT NOT NULL DEFAULT '',
  bank_name TEXT NOT NULL DEFAULT '',
  bank_branch TEXT NOT NULL DEFAULT '',
  bank_account_number TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  role TEXT NOT NULL,
  avatar TEXT NOT NULL DEFAULT '',
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  is_full_time BOOLEAN,
  fixed_day_off SMALLINT,
  can_add_bonuses BOOLEAN,
  bank_name TEXT,
  bank_branch TEXT,
  account_number TEXT,
  has_form_101 BOOLEAN,
  form_101_data TEXT,
  form_101_file_name TEXT,
  quick_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (club_id, email),
  UNIQUE (club_id, quick_code)
);

CREATE TABLE IF NOT EXISTS user_certifications (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  certification TEXT NOT NULL,
  PRIMARY KEY (user_id, certification)
);

CREATE TABLE IF NOT EXISTS shifts (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  shift_date DATE NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT,
  teaching_hours NUMERIC(8,2) NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT '',
  is_closed BOOLEAN NOT NULL DEFAULT FALSE,
  has_travel BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shift_bonuses (
  id TEXT PRIMARY KEY,
  shift_id TEXT NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  item TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS active_shifts (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS confirmed_shifts (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  shift_date DATE NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lessons (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  lesson_type TEXT NOT NULL,
  path_type TEXT NOT NULL,
  lesson_number INTEGER NOT NULL,
  lesson_date DATE NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT,
  instructor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  voucher_number TEXT,
  has_voucher BOOLEAN,
  is_registered BOOLEAN,
  is_paid BOOLEAN,
  is_cancelled BOOLEAN,
  is_archived BOOLEAN,
  credit_card_number TEXT,
  credit_card_expiry TEXT,
  credit_card_cvv TEXT,
  credit_card_owner_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rentals (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  rental_date DATE NOT NULL,
  client_name TEXT NOT NULL,
  item TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  duration_minutes INTEGER NOT NULL DEFAULT 0,
  payment_type TEXT NOT NULL,
  start_time TEXT NOT NULL,
  is_returned BOOLEAN NOT NULL DEFAULT FALSE,
  extra_paid BOOLEAN NOT NULL DEFAULT FALSE,
  is_archived BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  task_type TEXT NOT NULL,
  client_name TEXT,
  client_phone TEXT,
  priority TEXT NOT NULL,
  status TEXT NOT NULL,
  created_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS task_assignees (
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  PRIMARY KEY (task_id, user_id)
);

CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  source TEXT NOT NULL,
  status TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS availability (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  available_date DATE NOT NULL,
  is_available BOOLEAN NOT NULL,
  is_all_day BOOLEAN NOT NULL,
  start_time TEXT,
  end_time TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (club_id, user_id, available_date)
);

CREATE TABLE IF NOT EXISTS sea_events (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  event_date DATE NOT NULL,
  google_form_link TEXT,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS event_boats (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES sea_events(id) ON DELETE CASCADE,
  operator_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  assistant_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS event_participants (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES sea_events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  equipment TEXT NOT NULL,
  status TEXT NOT NULL,
  has_arrived BOOLEAN NOT NULL DEFAULT FALSE,
  rescues INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  credit_card_number TEXT,
  credit_card_expiry TEXT,
  credit_card_cvv TEXT,
  credit_card_owner_id TEXT
);

CREATE TABLE IF NOT EXISTS whatsapp_templates (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS knowledge_files (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  size TEXT NOT NULL,
  file_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS club_rental_items (
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  item TEXT NOT NULL,
  PRIMARY KEY (club_id, item)
);

CREATE TABLE IF NOT EXISTS club_rental_statuses (
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  PRIMARY KEY (club_id, status)
);

CREATE INDEX IF NOT EXISTS idx_users_club ON users(club_id);
CREATE INDEX IF NOT EXISTS idx_shifts_club_date ON shifts(club_id, shift_date DESC);
CREATE INDEX IF NOT EXISTS idx_lessons_club_date ON lessons(club_id, lesson_date DESC);
CREATE INDEX IF NOT EXISTS idx_rentals_club_date ON rentals(club_id, rental_date DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_club_status ON tasks(club_id, status);
CREATE INDEX IF NOT EXISTS idx_availability_club_date ON availability(club_id, available_date);
CREATE INDEX IF NOT EXISTS idx_events_club_date ON sea_events(club_id, event_date DESC);
