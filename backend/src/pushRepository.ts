import { pool } from "./db.js";
import type { PushSubscriptionRow } from "./types.js";

export interface UpsertPushSubscriptionInput {
  clubId: string;
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent: string | null;
}

export async function upsertPushSubscription({
  clubId,
  userId,
  endpoint,
  p256dh,
  auth,
  userAgent,
}: UpsertPushSubscriptionInput): Promise<string | null> {
  const res = await pool.query<{ id: string }>(
    `
      INSERT INTO push_subscriptions (
        club_id, user_id, endpoint, p256dh, auth, user_agent
      )
      VALUES ($1,$2,$3,$4,$5,$6)
      ON CONFLICT (endpoint) DO UPDATE SET
        club_id = EXCLUDED.club_id,
        user_id = EXCLUDED.user_id,
        p256dh = EXCLUDED.p256dh,
        auth = EXCLUDED.auth,
        user_agent = EXCLUDED.user_agent,
        updated_at = NOW()
      RETURNING id
    `,
    [clubId, userId, endpoint, p256dh, auth, userAgent || null]
  );
  return res.rows[0]?.id ?? null;
}

export async function deletePushSubscriptionByEndpoint({
  clubId,
  endpoint,
}: {
  clubId: string;
  endpoint: string;
}): Promise<void> {
  await pool.query(
    `
      DELETE FROM push_subscriptions
      WHERE club_id = $1 AND endpoint = $2
    `,
    [clubId, endpoint]
  );
}

export async function hasPushSubscription({
  clubId,
  userId,
  endpoint,
}: {
  clubId: string;
  userId: string;
  endpoint: string;
}): Promise<boolean> {
  const res = await pool.query(
    `
      SELECT 1
      FROM push_subscriptions
      WHERE club_id = $1
        AND user_id = $2
        AND endpoint = $3
      LIMIT 1
    `,
    [clubId, userId, endpoint]
  );
  return (res.rowCount || 0) > 0;
}

export async function listPushSubscriptionsByClub({
  clubId,
}: {
  clubId: string;
}): Promise<PushSubscriptionRow[]> {
  const res = await pool.query<PushSubscriptionRow>(
    `
      SELECT
        id,
        club_id,
        user_id,
        endpoint,
        p256dh,
        auth,
        user_agent
      FROM push_subscriptions
      WHERE club_id = $1
    `,
    [clubId]
  );
  return res.rows;
}
