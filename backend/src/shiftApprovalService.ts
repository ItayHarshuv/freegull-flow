import {
  readState,
  readStateWithVersion,
  writeState,
} from "./stateRepository.js";
import { syncAvailabilityDelta } from "./googleAvailabilitySync.js";
import {
  createShiftChangeRequest,
  createUserNotification,
  getShiftChangeRequestById,
  hasPendingRequestForShift,
  listManagerPushSubscriptions,
  listManagerUserIds,
  updateShiftChangeRequestStatus,
} from "./shiftApprovalRepository.js";
import {
  isStrictManagerRole,
  requiresAvailabilityChangeApproval,
  requiresShiftChangeApproval,
} from "./shiftApprovalRules.js";
import {
  buildNewRequestManagerNotification,
  buildWorkerDecisionNotification,
} from "./shiftChangeNotifications.js";
import { isGoogleCalendarConfigured } from "./googleCalendarService.js";
import { listPushSubscriptionsByUser } from "./pushRepository.js";
import { isPushEnabled, sendWebPush } from "./pushService.js";
import type {
  AvailabilityEntry,
  ChangeRequestSnapshot,
  ConfirmedShift,
  ShiftChangeRequest,
  ShiftChangeRequestType,
} from "./types.js";

export function findConfirmedShift(
  shifts: ConfirmedShift[],
  shiftId: string
): ConfirmedShift | undefined {
  return shifts.find((s) => s.id === shiftId);
}

export function findAvailabilityEntry(
  availability: AvailabilityEntry[],
  userId: string,
  date: string
): AvailabilityEntry | undefined {
  return availability.find((entry) => entry.userId === userId && entry.date === date);
}

function isAvailabilitySnapshot(
  snapshot: ChangeRequestSnapshot | null
): snapshot is AvailabilityEntry {
  return Boolean(snapshot && "isAvailable" in snapshot);
}

function normalizeAvailabilityEntry(
  entry: AvailabilityEntry,
  fallbackId?: string
): AvailabilityEntry {
  return {
    ...entry,
    id: entry.id || fallbackId || `${entry.userId}-${entry.date}`,
  };
}

function applyImmediateChange(
  shifts: ConfirmedShift[],
  requestType: ShiftChangeRequestType,
  original: ConfirmedShift,
  proposed: ConfirmedShift | null
): ConfirmedShift[] {
  if (requestType === "remove") {
    return shifts.filter((s) => s.id !== original.id);
  }
  if (!proposed) return shifts;
  return shifts.map((s) => (s.id === original.id ? proposed : s));
}

export async function applyConfirmedShiftChange(input: {
  clubId: string;
  requestType: ShiftChangeRequestType;
  original: ConfirmedShift;
  proposed: ConfirmedShift | null;
}): Promise<void> {
  const state = await readState(input.clubId);
  const nextShifts = applyImmediateChange(
    state.confirmedShifts || [],
    input.requestType,
    input.original,
    input.proposed
  );
  await writeState(input.clubId, { ...state, confirmedShifts: nextShifts });
}

export async function applyAvailabilityChange(input: {
  clubId: string;
  original: AvailabilityEntry;
  proposed: AvailabilityEntry;
}): Promise<void> {
  const state = await readState(input.clubId);
  const before = state.availability || [];
  const originalKey = `${input.original.userId}-${input.original.date}`;
  const nextEntry = normalizeAvailabilityEntry(
    input.proposed,
    input.original.id || originalKey
  );
  const nextAvailability = before.some(
    (entry) => entry.userId === input.original.userId && entry.date === input.original.date
  )
    ? before.map((entry) =>
        entry.userId === input.original.userId && entry.date === input.original.date
          ? nextEntry
          : entry
      )
    : [...before, nextEntry];
  await writeState(input.clubId, { ...state, availability: nextAvailability });
  try {
    if (!isGoogleCalendarConfigured()) return;
    await syncAvailabilityDelta({
      clubId: input.clubId,
      before,
      after: nextAvailability,
    });
  } catch (error) {
    console.warn(
      "[GCAL_AVAIL_SYNC_FAILED]",
      error instanceof Error ? error.message : String(error)
    );
  }
}

async function notifyManagers(clubId: string, request: ShiftChangeRequest) {
  const notification = buildNewRequestManagerNotification(request);
  const payload = { ...notification, url: "/approvals" };

  const managerUserIds = await listManagerUserIds(clubId);
  await Promise.all(
    managerUserIds.map((userId) =>
      createUserNotification({
        clubId,
        userId,
        title: notification.title,
        body: notification.body,
        url: payload.url,
      })
    )
  );

  if (!isPushEnabled()) return;

  const subs = await listManagerPushSubscriptions(clubId);
  await Promise.all(
    subs.map(async (sub) => {
      const result = await sendWebPush(
        { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
        payload
      );
      if (result.ok === false) {
        console.warn("[SHIFT_APPROVAL_PUSH_FAILED]", {
          clubId,
          endpoint: sub.endpoint,
          error: result.error,
        });
      }
    })
  );
}

async function notifyWorker(
  clubId: string,
  request: ShiftChangeRequest,
  approved: boolean
) {
  const notification = buildWorkerDecisionNotification(request, approved);
  await createUserNotification({
    clubId,
    userId: request.workerId,
    title: notification.title,
    body: notification.body,
    url: "/availability",
  });

  if (!isPushEnabled()) return;

  const payload = { ...notification, url: "/availability" };
  const subs = await listPushSubscriptionsByUser({
    clubId,
    userId: request.workerId,
  });
  await Promise.all(
    subs.map(async (sub) => {
      const result = await sendWebPush(
        { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
        payload
      );
      if (result.ok === false) {
        console.warn("[SHIFT_WORKER_PUSH_FAILED]", {
          clubId,
          userId: request.workerId,
          endpoint: sub.endpoint,
          error: result.error,
        });
      }
    })
  );
}

export async function submitShiftChangeRequest(input: {
  clubId: string;
  userId: string;
  userRole: string;
  shiftId: string;
  requestType: ShiftChangeRequestType;
  proposedStartTime?: string;
  proposedEndTime?: string;
}): Promise<{ applied: boolean; request: ShiftChangeRequest | null }> {
  const state = await readState(input.clubId);
  const shift = findConfirmedShift(state.confirmedShifts || [], input.shiftId);
  if (!shift) {
    throw new Error("Shift not found");
  }
  if (shift.userId !== input.userId && !isStrictManagerRole(input.userRole)) {
    throw new Error("Forbidden: can only change your own shifts");
  }

  const workerId = shift.userId;
  const needsApproval =
    !isStrictManagerRole(input.userRole) &&
    requiresShiftChangeApproval(shift.date);

  let proposed: ConfirmedShift | null = null;
  if (input.requestType === "time_change") {
    if (!input.proposedStartTime || !input.proposedEndTime) {
      throw new Error("Proposed start and end times are required");
    }
    proposed = {
      ...shift,
      startTime: input.proposedStartTime,
      endTime: input.proposedEndTime,
    };
  }

  if (await hasPendingRequestForShift(input.clubId, shift.id)) {
    throw new Error("A pending request already exists for this shift");
  }

  if (!needsApproval) {
    await applyConfirmedShiftChange({
      clubId: input.clubId,
      requestType: input.requestType,
      original: shift,
      proposed,
    });
    return { applied: true, request: null };
  }

  const request = await createShiftChangeRequest({
    clubId: input.clubId,
    shiftId: shift.id,
    workerId,
    requestedBy: input.userId,
    requestType: input.requestType,
    originalShift: shift,
    proposedShift: proposed,
  });

  await notifyManagers(input.clubId, request);
  return { applied: false, request };
}

export async function submitAvailabilityChangeRequest(input: {
  clubId: string;
  userId: string;
  userRole: string;
  proposedAvailability: AvailabilityEntry;
}): Promise<{ applied: boolean; request: ShiftChangeRequest | null }> {
  const normalizedProposed = normalizeAvailabilityEntry(input.proposedAvailability);
  if (
    normalizedProposed.userId !== input.userId &&
    !isStrictManagerRole(input.userRole)
  ) {
    throw new Error("Forbidden: can only change your own availability");
  }

  const state = await readState(input.clubId);
  const existing = findAvailabilityEntry(
    state.availability || [],
    normalizedProposed.userId,
    normalizedProposed.date
  );

  if (!existing) {
    const nextState = {
      ...state,
      availability: [...(state.availability || []), normalizedProposed],
    };
    await writeState(input.clubId, nextState);
    return { applied: true, request: null };
  }

  const normalizedExisting = normalizeAvailabilityEntry(
    existing,
    `${existing.userId}-${existing.date}`
  );
  if (!availabilityChanged(normalizedExisting, normalizedProposed)) {
    return { applied: true, request: null };
  }

  const needsApproval =
    !isStrictManagerRole(input.userRole) &&
    requiresAvailabilityChangeApproval(normalizedExisting, normalizedProposed);

  if (await hasPendingRequestForShift(input.clubId, normalizedExisting.id)) {
    throw new Error("A pending request already exists for this availability");
  }

  if (!needsApproval) {
    await applyAvailabilityChange({
      clubId: input.clubId,
      original: normalizedExisting,
      proposed: normalizedProposed,
    });
    return { applied: true, request: null };
  }

  const request = await createShiftChangeRequest({
    clubId: input.clubId,
    shiftId: normalizedExisting.id,
    workerId: normalizedExisting.userId,
    requestedBy: input.userId,
    requestType: "availability_change",
    originalShift: normalizedExisting,
    proposedShift: normalizedProposed,
  });

  await notifyManagers(input.clubId, request);
  return { applied: false, request };
}

export async function approveShiftChangeRequest(input: {
  clubId: string;
  requestId: string;
  reviewerId: string;
  reviewNote?: string | null;
}): Promise<ShiftChangeRequest> {
  const existing = await getShiftChangeRequestById(input.clubId, input.requestId);
  if (!existing) {
    throw new Error("Request not found");
  }
  if (existing.status !== "pending") {
    throw new Error("Request is no longer pending");
  }

  if (existing.requestType === "availability_change") {
    if (
      !isAvailabilitySnapshot(existing.originalShift) ||
      !isAvailabilitySnapshot(existing.proposedShift)
    ) {
      throw new Error("Invalid availability change request");
    }
    await applyAvailabilityChange({
      clubId: input.clubId,
      original: existing.originalShift,
      proposed: existing.proposedShift,
    });
  } else {
    if (isAvailabilitySnapshot(existing.originalShift)) {
      throw new Error("Invalid shift change request");
    }
    await applyConfirmedShiftChange({
      clubId: input.clubId,
      requestType: existing.requestType,
      original: existing.originalShift,
      proposed: existing.proposedShift as ConfirmedShift | null,
    });
  }

  const updated = await updateShiftChangeRequestStatus({
    clubId: input.clubId,
    requestId: input.requestId,
    status: "approved",
    reviewedBy: input.reviewerId,
    reviewNote: input.reviewNote,
  });
  if (!updated) {
    throw new Error("Failed to update request");
  }

  await notifyWorker(input.clubId, updated, true);
  return updated;
}

export async function rejectShiftChangeRequest(input: {
  clubId: string;
  requestId: string;
  reviewerId: string;
  reviewNote?: string | null;
}): Promise<ShiftChangeRequest> {
  const existing = await getShiftChangeRequestById(input.clubId, input.requestId);
  if (!existing) {
    throw new Error("Request not found");
  }
  if (existing.status !== "pending") {
    throw new Error("Request is no longer pending");
  }

  const updated = await updateShiftChangeRequestStatus({
    clubId: input.clubId,
    requestId: input.requestId,
    status: "rejected",
    reviewedBy: input.reviewerId,
    reviewNote: input.reviewNote,
  });
  if (!updated) {
    throw new Error("Failed to update request");
  }

  await notifyWorker(input.clubId, updated, false);
  return updated;
}

function confirmedShiftChanged(before: ConfirmedShift, after: ConfirmedShift): boolean {
  return (
    before.startTime !== after.startTime ||
    before.endTime !== after.endTime ||
    before.userId !== after.userId ||
    before.date !== after.date
  );
}

function availabilityChanged(
  before: AvailabilityEntry,
  after: AvailabilityEntry
): boolean {
  return (
    before.isAvailable !== after.isAvailable ||
    before.isAllDay !== after.isAllDay ||
    (before.startTime || "") !== (after.startTime || "") ||
    (before.endTime || "") !== (after.endTime || "") ||
    (before.notes || "") !== (after.notes || "")
  );
}

/**
 * Strip unauthorized confirmedShifts mutations from a state payload.
 * Workers cannot directly mutate protected shifts during the approval window.
 */
export function sanitizeConfirmedShiftsWrite(input: {
  before: ConfirmedShift[];
  after: ConfirmedShift[];
  userId: string;
  userRole: string;
}): ConfirmedShift[] {
  if (isStrictManagerRole(input.userRole)) {
    return input.after;
  }

  const beforeById = new Map(input.before.map((s) => [s.id, s]));
  const afterById = new Map(input.after.map((s) => [s.id, s]));

  for (const [id, beforeShift] of beforeById) {
    const afterShift = afterById.get(id);
    if (!afterShift) {
      if (
        beforeShift.userId === input.userId &&
        requiresShiftChangeApproval(beforeShift.date)
      ) {
        throw new Error(
          "Shift removal requires manager approval after Saturday 18:00"
        );
      }
      continue;
    }
    if (
      beforeShift.userId === input.userId &&
      confirmedShiftChanged(beforeShift, afterShift) &&
      requiresShiftChangeApproval(beforeShift.date)
    ) {
      throw new Error(
        "Shift changes require manager approval after Saturday 18:00"
      );
    }
  }

  for (const afterShift of input.after) {
    const beforeShift = beforeById.get(afterShift.id);
    if (!beforeShift && afterShift.userId === input.userId) {
      if (requiresShiftChangeApproval(afterShift.date)) {
        throw new Error(
          "Adding shifts during the approval window requires manager approval"
        );
      }
    }
  }

  return input.after;
}

/**
 * Strip unauthorized availability mutations from a state payload.
 * Workers cannot directly mutate submitted availability during the approval window.
 */
export function sanitizeAvailabilityWrite(input: {
  before: AvailabilityEntry[];
  after: AvailabilityEntry[];
  userId: string;
  userRole: string;
}): AvailabilityEntry[] {
  if (isStrictManagerRole(input.userRole)) {
    return input.after;
  }

  const beforeByKey = new Map(
    input.before.map((entry) => [`${entry.userId}-${entry.date}`, entry])
  );
  const afterByKey = new Map(
    input.after.map((entry) => [`${entry.userId}-${entry.date}`, entry])
  );

  for (const [key, beforeEntry] of beforeByKey) {
    if (beforeEntry.userId !== input.userId) continue;
    const afterEntry = afterByKey.get(key);
    if (!afterEntry) {
      if (requiresAvailabilityChangeApproval(beforeEntry, {
        ...beforeEntry,
        isAvailable: false,
        isAllDay: beforeEntry.isAllDay,
        startTime: beforeEntry.startTime,
        endTime: beforeEntry.endTime,
      })) {
        throw new Error(
          "Availability changes require manager approval after Saturday 18:00"
        );
      }
      continue;
    }
    if (
      availabilityChanged(
        normalizeAvailabilityEntry(beforeEntry, key),
        normalizeAvailabilityEntry(afterEntry, key)
      ) &&
      requiresAvailabilityChangeApproval(
        normalizeAvailabilityEntry(beforeEntry, key),
        normalizeAvailabilityEntry(afterEntry, key)
      )
    ) {
      throw new Error(
        "Availability changes require manager approval after Saturday 18:00"
      );
    }
  }

  return input.after;
}

export async function getStateAfterApprovalChange(clubId: string) {
  return readStateWithVersion(clubId);
}
