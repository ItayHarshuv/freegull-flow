import type { AvailabilityEntry } from "./types.js";

interface DateParts {
  y: number;
  m: number;
  d: number;
}

interface NormalizedAvailability {
  isAvailable: boolean;
  isAllDay: boolean;
  startTime: string;
  endTime: string;
}

export interface AvailabilityNotification {
  title: string;
  body: string;
}

function parseDateParts(dateStr: unknown): DateParts | null {
  const [y, m, d] = String(dateStr || "").split("-");
  if (!y || !m || !d) return null;
  return { y: Number(y), m: Number(m), d: Number(d) };
}

function formatDayMonth(dateStr: unknown): string {
  const parts = parseDateParts(dateStr);
  if (!parts) return String(dateStr || "");
  return `${parts.d}.${parts.m}`;
}

function formatWeekday(dateStr: unknown): string {
  const parts = parseDateParts(dateStr);
  if (!parts) return "";
  const dt = new Date(Date.UTC(parts.y, parts.m - 1, parts.d));
  return dt.toLocaleDateString("he-IL", { weekday: "long", timeZone: "UTC" });
}

function formatTime(timeStr: unknown): string {
  const [hours, minutes] = String(timeStr || "").split(":");
  if (!hours || !minutes) return String(timeStr || "");
  return `${Number(hours)}:${minutes}`;
}

function formatWindow(a: AvailabilityEntry | undefined): string {
  if (!a?.isAvailable) return "לא זמין";
  if (a?.isAllDay) return "כל היום";
  const start = formatTime(a?.startTime);
  const end = formatTime(a?.endTime);
  if (start && end) return `${start}-${end}`;
  if (start) return `מ-${start}`;
  if (end) return `עד ${end}`;
  return "זמין";
}

function keyFor(a: Partial<AvailabilityEntry> | undefined): string {
  return `${a?.userId || ""}|${a?.date || ""}`;
}

function normalizeAvailabilityEntry(
  entry: Partial<AvailabilityEntry> | undefined
): NormalizedAvailability {
  return {
    isAvailable: Boolean(entry?.isAvailable),
    isAllDay: Boolean(entry?.isAllDay),
    startTime: entry?.startTime || "",
    endTime: entry?.endTime || "",
  };
}

function didAvailabilityChange(
  before: AvailabilityEntry | undefined,
  after: AvailabilityEntry | undefined
): boolean {
  if (!before || !after) {
    return Boolean(after);
  }

  const prev = normalizeAvailabilityEntry(before);
  const next = normalizeAvailabilityEntry(after);

  return (
    prev.isAvailable !== next.isAvailable ||
    prev.isAllDay !== next.isAllDay ||
    prev.startTime !== next.startTime ||
    prev.endTime !== next.endTime
  );
}

function buildChangeLine(entry: AvailabilityEntry, includeUserName = false): string {
  const prefix = includeUserName ? `${entry?.userName || "משתמש"}: ` : "";
  return `${prefix}${formatWeekday(entry?.date)} ${formatDayMonth(entry?.date)} - ${formatWindow(entry)}`;
}

export function computeAvailabilityNotification(
  prevAvailability: AvailabilityEntry[] | undefined,
  nextAvailability: AvailabilityEntry[] | undefined
): AvailabilityNotification | null {
  const prev = Array.isArray(prevAvailability) ? prevAvailability : [];
  const next = Array.isArray(nextAvailability) ? nextAvailability : [];

  const prevByKey = new Map(prev.map((a) => [keyFor(a), a]));
  const nextByKey = new Map(next.map((a) => [keyFor(a), a]));

  const keys = new Set([...prevByKey.keys(), ...nextByKey.keys()]);
  const changedEntries: AvailabilityEntry[] = [];

  for (const key of keys) {
    const before = prevByKey.get(key);
    const after = nextByKey.get(key);
    if (!after) continue;
    if (didAvailabilityChange(before, after)) {
      changedEntries.push(after);
    }
  }

  if (!changedEntries.length) {
    return null;
  }

  changedEntries.sort((a, b) =>
    String(a?.date || "").localeCompare(String(b?.date || ""))
  );

  const userNames = [
    ...new Set(changedEntries.map((entry) => entry?.userName).filter(Boolean)),
  ];
  const includeUserName = userNames.length > 1;
  const title =
    userNames.length === 1 ? `${userNames[0]} עדכנו אילוצים` : "עודכנו אילוצים";
  const body = changedEntries
    .map((entry) => buildChangeLine(entry, includeUserName))
    .join("\n");

  return { title, body };
}
