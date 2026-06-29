import crypto from "crypto";
import { pool } from "./db.js";
import type {
  ChangeRequestSnapshot,
  ShiftChangeRequest,
  ShiftChangeRequestRow,
  ShiftChangeRequestStatus,
  ShiftChangeRequestType,
  UserNotification,
  UserNotificationRow,
} from "./types.js";

function mapRequestRow(row: ShiftChangeRequestRow): ShiftChangeRequest {
  return {
    id: row.id,
    clubId: row.club_id,
    shiftId: row.shift_id,
    workerId: row.worker_id,
    requestedBy: row.requested_by,
    requestType: row.request_type,
    originalShift: row.original_shift,
    proposedShift: row.proposed_shift,
    status: row.status,
    reviewNote: row.review_note,
    reviewedBy: row.reviewed_by,
    createdAt: row.created_at.toISOString(),
    reviewedAt: row.reviewed_at?.toISOString() ?? null,
  };
}

function mapNotificationRow(row: UserNotificationRow): UserNotification {
  return {
    id: row.id,
    clubId: row.club_id,
    userId: row.user_id,
    title: row.title,
    body: row.body,
    url: row.url,
    isRead: row.is_read,
    createdAt: row.created_at.toISOString(),
  };
}

export function newId(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(8).toString("hex")}`;
}

export async function createShiftChangeRequest(input: {
  clubId: string;
  shiftId: string;
  workerId: string;
  requestedBy: string;
  requestType: ShiftChangeRequestType;
  originalShift: ChangeRequestSnapshot;
  proposedShift: ChangeRequestSnapshot | null;
}): Promise<ShiftChangeRequest> {
  const id = newId("scr");
  const res = await pool.query<ShiftChangeRequestRow>(
    `
      INSERT INTO shift_change_requests (
        id, club_id, shift_id, worker_id, requested_by,
        request_type, original_shift, proposed_shift, status
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,'pending')
      RETURNING *
    `,
    [
      id,
      input.clubId,
      input.shiftId,
      input.workerId,
      input.requestedBy,
      input.requestType,
      JSON.stringify(input.originalShift),
      input.proposedShift ? JSON.stringify(input.proposedShift) : null,
    ]
  );
  return mapRequestRow(res.rows[0]);
}

export async function getShiftChangeRequestById(
  clubId: string,
  requestId: string
): Promise<ShiftChangeRequest | null> {
  const res = await pool.query<ShiftChangeRequestRow>(
    `
      SELECT * FROM shift_change_requests
      WHERE club_id = $1 AND id = $2
      LIMIT 1
    `,
    [clubId, requestId]
  );
  return res.rows[0] ? mapRequestRow(res.rows[0]) : null;
}

export async function listShiftChangeRequestsByWorker(
  clubId: string,
  workerId: string
): Promise<ShiftChangeRequest[]> {
  const res = await pool.query<ShiftChangeRequestRow>(
    `
      SELECT * FROM shift_change_requests
      WHERE club_id = $1 AND worker_id = $2
      ORDER BY created_at DESC
    `,
    [clubId, workerId]
  );
  return res.rows.map(mapRequestRow);
}

export async function listPendingShiftChangeRequests(
  clubId: string
): Promise<ShiftChangeRequest[]> {
  const res = await pool.query<ShiftChangeRequestRow>(
    `
      SELECT * FROM shift_change_requests
      WHERE club_id = $1 AND status = 'pending'
      ORDER BY created_at ASC
    `,
    [clubId]
  );
  return res.rows.map(mapRequestRow);
}

export async function listShiftChangeRequestsForManager(
  clubId: string,
  status?: ShiftChangeRequestStatus
): Promise<ShiftChangeRequest[]> {
  const res = status
    ? await pool.query<ShiftChangeRequestRow>(
        `
          SELECT * FROM shift_change_requests
          WHERE club_id = $1 AND status = $2
          ORDER BY created_at DESC
        `,
        [clubId, status]
      )
    : await pool.query<ShiftChangeRequestRow>(
        `
          SELECT * FROM shift_change_requests
          WHERE club_id = $1
          ORDER BY created_at DESC
        `,
        [clubId]
      );
  return res.rows.map(mapRequestRow);
}

export async function hasPendingRequestForShift(
  clubId: string,
  shiftId: string
): Promise<boolean> {
  const res = await pool.query(
    `
      SELECT 1 FROM shift_change_requests
      WHERE club_id = $1 AND shift_id = $2 AND status = 'pending'
      LIMIT 1
    `,
    [clubId, shiftId]
  );
  return (res.rowCount || 0) > 0;
}

export async function updateShiftChangeRequestStatus(input: {
  clubId: string;
  requestId: string;
  status: ShiftChangeRequestStatus;
  reviewedBy: string;
  reviewNote?: string | null;
}): Promise<ShiftChangeRequest | null> {
  const res = await pool.query<ShiftChangeRequestRow>(
    `
      UPDATE shift_change_requests
      SET
        status = $3,
        reviewed_by = $4,
        review_note = $5,
        reviewed_at = NOW()
      WHERE club_id = $1 AND id = $2
      RETURNING *
    `,
    [
      input.clubId,
      input.requestId,
      input.status,
      input.reviewedBy,
      input.reviewNote ?? null,
    ]
  );
  return res.rows[0] ? mapRequestRow(res.rows[0]) : null;
}

export async function createUserNotification(input: {
  clubId: string;
  userId: string;
  title: string;
  body: string;
  url?: string | null;
}): Promise<UserNotification> {
  const id = newId("notif");
  const res = await pool.query<UserNotificationRow>(
    `
      INSERT INTO user_notifications (id, club_id, user_id, title, body, url)
      VALUES ($1,$2,$3,$4,$5,$6)
      RETURNING *
    `,
    [id, input.clubId, input.userId, input.title, input.body, input.url ?? null]
  );
  return mapNotificationRow(res.rows[0]);
}

export async function listUserNotifications(
  clubId: string,
  userId: string
): Promise<UserNotification[]> {
  const res = await pool.query<UserNotificationRow>(
    `
      SELECT * FROM user_notifications
      WHERE club_id = $1 AND user_id = $2
      ORDER BY created_at DESC
      LIMIT 50
    `,
    [clubId, userId]
  );
  return res.rows.map(mapNotificationRow);
}

export async function markNotificationRead(
  clubId: string,
  userId: string,
  notificationId: string
): Promise<UserNotification | null> {
  const res = await pool.query<UserNotificationRow>(
    `
      UPDATE user_notifications
      SET is_read = TRUE
      WHERE club_id = $1 AND user_id = $2 AND id = $3
      RETURNING *
    `,
    [clubId, userId, notificationId]
  );
  return res.rows[0] ? mapNotificationRow(res.rows[0]) : null;
}

export async function listManagerPushSubscriptions(clubId: string) {
  const res = await pool.query<{
    endpoint: string;
    p256dh: string;
    auth: string;
  }>(
    `
      SELECT ps.endpoint, ps.p256dh, ps.auth
      FROM push_subscriptions ps
      INNER JOIN users u ON u.id = ps.user_id AND u.club_id = ps.club_id
      WHERE ps.club_id = $1
        AND u.role IN ('Manager', 'manager')
        AND NOT u.is_archived
    `,
    [clubId]
  );
  return res.rows;
}

export async function listManagerUserIds(clubId: string): Promise<string[]> {
  const res = await pool.query<{ id: string }>(
    `
      SELECT u.id
      FROM users u
      WHERE u.club_id = $1
        AND u.role IN ('Manager', 'manager')
        AND NOT u.is_archived
    `,
    [clubId]
  );
  return res.rows.map((row) => row.id);
}
