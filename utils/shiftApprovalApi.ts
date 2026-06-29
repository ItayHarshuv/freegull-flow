import type {
  Availability,
  ShiftChangeRequest,
  ShiftChangeRequestStatus,
  ShiftChangeRequestType,
  UserNotification,
} from '../types';

const API_BASE_URL = ((import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:4000').replace(/\/+$/, '');

export async function fetchMyShiftChangeRequests(clubId: string): Promise<ShiftChangeRequest[]> {
  const res = await fetch(`${API_BASE_URL}/shift-change-requests/${clubId}/mine`, {
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to load shift change requests');
  const payload = await res.json();
  return payload.requests || [];
}

export async function fetchManagerShiftChangeRequests(
  clubId: string,
  status?: ShiftChangeRequestStatus
): Promise<ShiftChangeRequest[]> {
  const query = status ? `?status=${status}` : '';
  const res = await fetch(`${API_BASE_URL}/shift-change-requests/${clubId}${query}`, {
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to load approvals');
  const payload = await res.json();
  return payload.requests || [];
}

export async function fetchPendingShiftChangeRequests(clubId: string): Promise<ShiftChangeRequest[]> {
  const res = await fetch(`${API_BASE_URL}/shift-change-requests/${clubId}/pending`, {
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to load pending approvals');
  const payload = await res.json();
  return payload.requests || [];
}

export async function submitShiftChangeRequest(input: {
  clubId: string;
  shiftId: string;
  requestType: ShiftChangeRequestType;
  proposedStartTime?: string;
  proposedEndTime?: string;
}): Promise<{ applied: boolean; request: ShiftChangeRequest | null; state?: Record<string, unknown>; serverVersion?: number }> {
  const res = await fetch(`${API_BASE_URL}/shift-change-requests/${input.clubId}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      shiftId: input.shiftId,
      requestType: input.requestType,
      proposedStartTime: input.proposedStartTime,
      proposedEndTime: input.proposedEndTime,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to submit request');
  }
  return res.json();
}

export async function submitAvailabilityChangeRequest(input: {
  clubId: string;
  availability: Availability;
}): Promise<{ applied: boolean; request: ShiftChangeRequest | null; state?: Record<string, unknown>; serverVersion?: number }> {
  const res = await fetch(`${API_BASE_URL}/availability-change-requests/${input.clubId}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      availability: input.availability,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to submit availability change request');
  }
  return res.json();
}

export async function approveShiftChangeRequest(input: {
  clubId: string;
  requestId: string;
  reviewNote?: string;
}): Promise<{ request: ShiftChangeRequest; state?: Record<string, unknown>; serverVersion?: number }> {
  const res = await fetch(
    `${API_BASE_URL}/shift-change-requests/${input.clubId}/${input.requestId}/approve`,
    {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviewNote: input.reviewNote }),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to approve request');
  }
  return res.json();
}

export async function rejectShiftChangeRequest(input: {
  clubId: string;
  requestId: string;
  reviewNote?: string;
}): Promise<{ request: ShiftChangeRequest }> {
  const res = await fetch(
    `${API_BASE_URL}/shift-change-requests/${input.clubId}/${input.requestId}/reject`,
    {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviewNote: input.reviewNote }),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to reject request');
  }
  return res.json();
}

export async function fetchMyNotifications(clubId: string): Promise<UserNotification[]> {
  const res = await fetch(`${API_BASE_URL}/notifications/${clubId}/mine`, {
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to load notifications');
  const payload = await res.json();
  return payload.notifications || [];
}

export async function markNotificationRead(clubId: string, notificationId: string): Promise<UserNotification> {
  const res = await fetch(`${API_BASE_URL}/notifications/${clubId}/${notificationId}/read`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to mark notification read');
  const payload = await res.json();
  return payload.notification;
}
