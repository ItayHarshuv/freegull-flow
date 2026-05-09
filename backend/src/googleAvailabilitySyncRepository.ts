import { pool } from "./db.js";

export interface GoogleAvailabilityEventMapping {
  clubId: string;
  availabilityId: string;
  calendarId: string;
  googleEventId: string;
  lastSyncedAt: string | null;
  lastError: string | null;
}

export async function getAvailabilityEventMapping({
  clubId,
  availabilityId,
}: {
  clubId: string;
  availabilityId: string;
}): Promise<GoogleAvailabilityEventMapping | null> {
  const res = await pool.query<{
    club_id: string;
    availability_id: string;
    calendar_id: string;
    google_event_id: string;
    last_synced_at: Date | null;
    last_error: string | null;
  }>(
    `
      SELECT
        club_id,
        availability_id,
        calendar_id,
        google_event_id,
        last_synced_at,
        last_error
      FROM google_calendar_availability_events
      WHERE club_id = $1 AND availability_id = $2
      LIMIT 1
    `,
    [clubId, availabilityId]
  );

  const row = res.rows[0];
  if (!row) return null;
  return {
    clubId: row.club_id,
    availabilityId: row.availability_id,
    calendarId: row.calendar_id,
    googleEventId: row.google_event_id,
    lastSyncedAt: row.last_synced_at ? row.last_synced_at.toISOString() : null,
    lastError: row.last_error,
  };
}

export async function upsertAvailabilityEventMapping({
  clubId,
  availabilityId,
  calendarId,
  googleEventId,
  lastError,
}: {
  clubId: string;
  availabilityId: string;
  calendarId: string;
  googleEventId: string;
  lastError?: string | null;
}): Promise<void> {
  await pool.query(
    `
      INSERT INTO google_calendar_availability_events (
        club_id, availability_id, calendar_id, google_event_id, last_synced_at, last_error, updated_at
      )
      VALUES ($1,$2,$3,$4,NOW(),$5,NOW())
      ON CONFLICT (club_id, availability_id) DO UPDATE SET
        calendar_id = EXCLUDED.calendar_id,
        google_event_id = EXCLUDED.google_event_id,
        last_synced_at = EXCLUDED.last_synced_at,
        last_error = EXCLUDED.last_error,
        updated_at = NOW()
    `,
    [clubId, availabilityId, calendarId, googleEventId, lastError ?? null]
  );
}

export async function setAvailabilityEventMappingError({
  clubId,
  availabilityId,
  error,
}: {
  clubId: string;
  availabilityId: string;
  error: string;
}): Promise<void> {
  await pool.query(
    `
      INSERT INTO google_calendar_availability_events (
        club_id, availability_id, calendar_id, google_event_id, last_error, updated_at
      )
      VALUES ($1,$2,'','',$3,NOW())
      ON CONFLICT (club_id, availability_id) DO UPDATE SET
        last_error = EXCLUDED.last_error,
        updated_at = NOW()
    `,
    [clubId, availabilityId, error]
  );
}

export async function deleteAvailabilityEventMapping({
  clubId,
  availabilityId,
}: {
  clubId: string;
  availabilityId: string;
}): Promise<void> {
  await pool.query(
    `
      DELETE FROM google_calendar_availability_events
      WHERE club_id = $1 AND availability_id = $2
    `,
    [clubId, availabilityId]
  );
}

export async function listAvailabilityEventMappingsByClub({
  clubId,
}: {
  clubId: string;
}): Promise<GoogleAvailabilityEventMapping[]> {
  const res = await pool.query<{
    club_id: string;
    availability_id: string;
    calendar_id: string;
    google_event_id: string;
    last_synced_at: Date | null;
    last_error: string | null;
  }>(
    `
      SELECT
        club_id,
        availability_id,
        calendar_id,
        google_event_id,
        last_synced_at,
        last_error
      FROM google_calendar_availability_events
      WHERE club_id = $1
    `,
    [clubId]
  );

  return res.rows.map((row) => ({
    clubId: row.club_id,
    availabilityId: row.availability_id,
    calendarId: row.calendar_id,
    googleEventId: row.google_event_id,
    lastSyncedAt: row.last_synced_at ? row.last_synced_at.toISOString() : null,
    lastError: row.last_error,
  }));
}

