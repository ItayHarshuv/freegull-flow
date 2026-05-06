import { pool } from "./db.js";

export async function upsertPushSubscription({
  clubId,
  userId,
  endpoint,
  p256dh,
  auth,
  userAgent,
}) {
  const res = await pool.query(
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

export async function deletePushSubscriptionByEndpoint({ clubId, endpoint }) {
  await pool.query(
    `
      DELETE FROM push_subscriptions
      WHERE club_id = $1 AND endpoint = $2
    `,
    [clubId, endpoint]
  );
}

export async function hasPushSubscription({ clubId, userId, endpoint }) {
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

export async function listPushSubscriptionsByClub({ clubId }) {
  const res = await pool.query(
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

