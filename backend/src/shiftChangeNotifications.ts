import type {
  AvailabilityEntry,
  ChangeRequestSnapshot,
  ConfirmedShift,
  ShiftChangeRequest,
} from "./types.js";

export interface ShiftChangePushNotification {
  title: string;
  body: string;
}

function formatShiftWindow(shift: ConfirmedShift): string {
  return `${shift.startTime}-${shift.endTime}`;
}

function formatShiftLine(shift: ConfirmedShift): string {
  return `${shift.userName} • ${shift.date} ${formatShiftWindow(shift)}`;
}

function isAvailabilitySnapshot(
  snapshot: ChangeRequestSnapshot | null
): snapshot is AvailabilityEntry {
  return Boolean(snapshot && "isAvailable" in snapshot);
}

function formatAvailabilityLine(entry: AvailabilityEntry): string {
  if (!entry.isAvailable) {
    return `${entry.userName} • ${entry.date} לא זמין`;
  }
  if (entry.isAllDay) {
    return `${entry.userName} • ${entry.date} זמין כל היום`;
  }
  return `${entry.userName} • ${entry.date} ${entry.startTime}-${entry.endTime}`;
}

export function buildNewRequestManagerNotification(
  request: ShiftChangeRequest
): ShiftChangePushNotification {
  if (request.requestType === "availability_change") {
    const original = isAvailabilitySnapshot(request.originalShift)
      ? request.originalShift
      : null;
    const proposed = isAvailabilitySnapshot(request.proposedShift)
      ? request.proposedShift
      : null;
    return {
      title: "בקשה חדשה לשינוי זמינות",
      body:
        original && proposed
          ? `${original.userName} • ${original.date} ${formatAvailabilityStatus(original)} -> ${formatAvailabilityStatus(proposed)}`
          : String(request.originalShift.date),
    };
  }
  const originalShift = request.originalShift as ConfirmedShift;
  if (request.requestType === "remove") {
    return {
      title: "בקשה חדשה להסרה ממשמרת",
      body: `${formatShiftLine(originalShift)} • מבקש הסרה`,
    };
  }
  const proposedShift = request.proposedShift as ConfirmedShift | null;
  return {
    title: "בקשה חדשה לשינוי שעות משמרת",
    body: proposedShift
      ? `${originalShift.userName} • ${originalShift.date} ${formatShiftWindow(originalShift)} -> ${formatShiftWindow(proposedShift)}`
      : formatShiftLine(originalShift),
  };
}

function formatAvailabilityStatus(entry: AvailabilityEntry): string {
  if (!entry.isAvailable) {
    return "לא זמין";
  }
  if (entry.isAllDay) {
    return "זמין כל היום";
  }
  return `${entry.startTime}-${entry.endTime}`;
}

export function buildWorkerDecisionNotification(
  request: ShiftChangeRequest,
  approved: boolean
): ShiftChangePushNotification {
  if (request.requestType === "availability_change") {
    const original = isAvailabilitySnapshot(request.originalShift)
      ? request.originalShift
      : null;
    const proposed = isAvailabilitySnapshot(request.proposedShift)
      ? request.proposedShift
      : null;
    if (approved) {
      return {
        title: "בקשת שינוי זמינות אושרה",
        body: proposed
          ? `${proposed.date}: ${formatAvailabilityLine(proposed)}`
          : `${original?.date || ""}: הבקשה אושרה`,
      };
    }
    return {
      title: "בקשת שינוי זמינות נדחתה",
      body: `${original?.date || ""}: הבקשה שלך לא אושרה${request.reviewNote ? ` — ${request.reviewNote}` : ""}`,
    };
  }
  const shift = request.originalShift as ConfirmedShift;
  const dateLabel = shift.date;
  if (approved) {
    const proposedShift = request.proposedShift as ConfirmedShift | null;
    const detail =
      request.requestType === "remove"
        ? "הוסרת מהמשמרת"
        : `המשמרת עודכנה ל-${proposedShift?.startTime}-${proposedShift?.endTime}`;
    return {
      title: "בקשת שינוי משמרת אושרה",
      body: `${dateLabel}: ${detail}`,
    };
  }
  return {
    title: "בקשת שינוי משמרת נדחתה",
    body: `${dateLabel}: הבקשה שלך לא אושרה${request.reviewNote ? ` — ${request.reviewNote}` : ""}`,
  };
}
