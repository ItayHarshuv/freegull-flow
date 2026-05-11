import type { AvailabilityEntry } from "./types.js";
import { getGoogleCalendarClient, resolveAvailabilityCalendarId } from "./googleCalendarService.js";
import {
  deleteAvailabilityEventMapping,
  listAvailabilityEventMappingsByClub,
  setAvailabilityEventMappingError,
  upsertAvailabilityEventMapping,
} from "./googleAvailabilitySyncRepository.js";

function keyFor(a: Partial<AvailabilityEntry> | undefined): string {
  return `${a?.userId || ""}|${a?.date || ""}`;
}

function normalizeTime(value: unknown): string {
  const t = String(value || "").trim();
  if (!t) return "";
  const [hh, mm] = t.split(":");
  if (!hh || !mm) return "";
  return `${hh.padStart(2, "0")}:${mm.padStart(2, "0")}`;
}

function isPastDate(dateStr: string): boolean {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, "0");
  const d = String(today.getDate()).padStart(2, "0");
  const todayStr = `${y}-${m}-${d}`;
  return dateStr < todayStr;
}

function compareTimes(left: string, right: string): number {
  return normalizeTime(left).localeCompare(normalizeTime(right));
}

function isAtOrBefore(timeHHMM: string, thresholdHHMM: string): boolean {
  return compareTimes(timeHHMM, thresholdHHMM) <= 0;
}

function isAtOrAfter(timeHHMM: string, thresholdHHMM: string): boolean {
  return compareTimes(timeHHMM, thresholdHHMM) >= 0;
}

function availabilityChanged(before: AvailabilityEntry | undefined, after: AvailabilityEntry | undefined): boolean {
  if (!before || !after) return Boolean(after);
  return (
    Boolean(before.isAvailable) !== Boolean(after.isAvailable) ||
    Boolean(before.isAllDay) !== Boolean(after.isAllDay) ||
    normalizeTime(before.startTime) !== normalizeTime(after.startTime) ||
    normalizeTime(before.endTime) !== normalizeTime(after.endTime) ||
    String(before.notes || "") !== String(after.notes || "") ||
    String(before.userName || "") !== String(after.userName || "")
  );
}

function groupEntriesByDate(entries: AvailabilityEntry[]): Map<string, AvailabilityEntry[]> {
  const byDate = new Map<string, AvailabilityEntry[]>();
  for (const entry of entries) {
    const date = String(entry.date || "").slice(0, 10);
    if (!date) continue;
    const existing = byDate.get(date);
    if (existing) {
      existing.push(entry);
      continue;
    }
    byDate.set(date, [entry]);
  }
  return byDate;
}

function formatAvailabilityLine(entry: AvailabilityEntry): string {
  const name = String(entry.userName || "עובד").trim() || "עובד";
  const startTime = normalizeTime(entry.startTime);
  const endTime = normalizeTime(entry.endTime);

  if (entry.isAllDay || (!startTime && !endTime)) {
    return name;
  }

  if (startTime && endTime && isAtOrBefore(startTime, "08:00") && isAtOrAfter(endTime, "20:00")) {
    return name;
  }

  if (!startTime && endTime) {
    return `${name}: עד ${endTime}`;
  }

  if (startTime && !endTime) {
    return `${name}: מ${startTime}`;
  }

  if (startTime && endTime && isAtOrBefore(startTime, "08:00")) {
    return `${name}: עד ${endTime}`;
  }

  if (startTime && endTime && isAtOrAfter(endTime, "20:00")) {
    return `${name}: מ${startTime}`;
  }

  return `${name}: ${startTime}-${endTime}`;
}

function buildEventRequestBody({
  clubId,
  date,
  entries,
}: {
  clubId: string;
  date: string;
  entries: AvailabilityEntry[];
}) {
  const sortedEntries = [...entries].sort((left, right) => {
    if (Boolean(left.isAllDay) !== Boolean(right.isAllDay)) {
      return left.isAllDay ? -1 : 1;
    }

    const leftStart = normalizeTime(left.startTime) || "00:00";
    const rightStart = normalizeTime(right.startTime) || "00:00";
    const byStart = compareTimes(leftStart, rightStart);
    if (byStart !== 0) return byStart;

    return String(left.userName || "").localeCompare(String(right.userName || ""), "he");
  });

  const description = sortedEntries.map(formatAvailabilityLine).join("\n");

  const base = {
    summary: "זמינות",
    description,
    extendedProperties: {
      private: {
        clubId,
        availabilityDate: date,
      },
    },
  };

  const endDate = new Date(`${date}T00:00:00Z`);
  endDate.setUTCDate(endDate.getUTCDate() + 1);
  const endDateStr = endDate.toISOString().slice(0, 10);

  return {
    ...base,
    start: { date },
    end: { date: endDateStr },
  };
}

async function safeDeleteEvent({
  calendarId,
  googleEventId,
}: {
  calendarId: string;
  googleEventId: string;
}) {
  const calendar = getGoogleCalendarClient();
  try {
    await calendar.events.delete({ calendarId, eventId: googleEventId });
  } catch (e: any) {
    const status = Number(e?.code || e?.response?.status || 0);
    if (status === 404) return;
    throw e;
  }
}

async function upsertEventForDate({
  clubId,
  calendarId,
  date,
  entries,
  existingGoogleEventId,
}: {
  clubId: string;
  calendarId: string;
  date: string;
  entries: AvailabilityEntry[];
  existingGoogleEventId: string | null;
}): Promise<string> {
  const calendar = getGoogleCalendarClient();
  const requestBody = buildEventRequestBody({ clubId, date, entries });

  if (existingGoogleEventId) {
    try {
      const updated = await calendar.events.update({
        calendarId,
        eventId: existingGoogleEventId,
        requestBody,
      });
      return updated.data.id || existingGoogleEventId;
    } catch (e: any) {
      const status = Number(e?.code || e?.response?.status || 0);
      if (status !== 404) throw e;
      // fall through to insert
    }
  }

  const inserted = await calendar.events.insert({
    calendarId,
    requestBody,
  });
  const id = inserted.data.id;
  if (!id) {
    throw new Error("Google Calendar insert succeeded but returned no event id");
  }
  return id;
}

async function deleteEventsById({
  calendarId,
  googleEventIds,
}: {
  calendarId: string;
  googleEventIds: Iterable<string>;
}): Promise<number> {
  let deleted = 0;
  const uniqueIds = [...new Set([...googleEventIds].filter(Boolean))];

  for (const googleEventId of uniqueIds) {
    await safeDeleteEvent({ calendarId, googleEventId });
    deleted += 1;
  }

  return deleted;
}

async function syncEventForDate({
  clubId,
  calendarId,
  date,
  entriesForDate,
  mappedAvailabilityIds,
  existingGoogleEventIds,
}: {
  clubId: string;
  calendarId: string;
  date: string;
  entriesForDate: AvailabilityEntry[];
  mappedAvailabilityIds: string[];
  existingGoogleEventIds: string[];
}): Promise<{ createdOrUpdated: number; deleted: number }> {
  const currentAvailabilityIds = new Set(entriesForDate.map((entry) => String(entry.id)));
  const uniqueExistingGoogleEventIds = [...new Set(existingGoogleEventIds.filter(Boolean))];

  if (entriesForDate.length === 0) {
    const deleted = await deleteEventsById({
      calendarId,
      googleEventIds: uniqueExistingGoogleEventIds,
    });

    for (const availabilityId of new Set(mappedAvailabilityIds)) {
      await deleteAvailabilityEventMapping({ clubId, availabilityId });
    }

    return { createdOrUpdated: 0, deleted };
  }

  try {
    const googleEventId = await upsertEventForDate({
      clubId,
      calendarId,
      date,
      entries: entriesForDate,
      existingGoogleEventId: uniqueExistingGoogleEventIds[0] || null,
    });

    for (const entry of entriesForDate) {
      await upsertAvailabilityEventMapping({
        clubId,
        availabilityId: String(entry.id),
        calendarId,
        googleEventId,
        lastError: null,
      });
    }

    for (const availabilityId of new Set(mappedAvailabilityIds)) {
      if (currentAvailabilityIds.has(availabilityId)) continue;
      await deleteAvailabilityEventMapping({ clubId, availabilityId });
    }

    const deleted = await deleteEventsById({
      calendarId,
      googleEventIds: uniqueExistingGoogleEventIds.filter((id) => id !== googleEventId),
    });

    return { createdOrUpdated: 1, deleted };
  } catch (e: any) {
    const message = e instanceof Error ? e.message : String(e);
    for (const entry of entriesForDate) {
      await setAvailabilityEventMappingError({
        clubId,
        availabilityId: String(entry.id),
        error: message,
      });
    }
    throw e;
  }
}

export async function syncAvailabilityDelta({
  clubId,
  before,
  after,
}: {
  clubId: string;
  before: AvailabilityEntry[] | undefined;
  after: AvailabilityEntry[] | undefined;
}): Promise<{ processed: number; createdOrUpdated: number; deleted: number; skippedPast: number }> {
  const prev = Array.isArray(before) ? before : [];
  const next = Array.isArray(after) ? after : [];
  const prevByKey = new Map(prev.map((a) => [keyFor(a), a]));
  const nextByKey = new Map(next.map((a) => [keyFor(a), a]));
  const prevByDate = groupEntriesByDate(prev.filter((entry) => entry && entry.id));
  const nextByDate = groupEntriesByDate(next.filter((entry) => entry && entry.id));
  const keys = new Set([...prevByKey.keys(), ...nextByKey.keys()]);

  const calendarId = await resolveAvailabilityCalendarId();
  const mappings = await listAvailabilityEventMappingsByClub({ clubId });
  const mappingsByAvailabilityId = new Map(mappings.map((mapping) => [mapping.availabilityId, mapping]));

  let processed = 0;
  let createdOrUpdated = 0;
  let deleted = 0;
  let skippedPast = 0;
  const affectedDates = new Set<string>();

  for (const key of keys) {
    const beforeEntry = prevByKey.get(key);
    const afterEntry = nextByKey.get(key);

    if (!afterEntry) {
      processed += 1;
      const beforeDate = String(beforeEntry?.date || "").slice(0, 10);
      if (beforeDate) affectedDates.add(beforeDate);
      continue;
    }

    if (!availabilityChanged(beforeEntry, afterEntry)) continue;

    const dateStr = String(afterEntry.date || "").slice(0, 10);
    if (dateStr && isPastDate(dateStr)) {
      skippedPast += 1;
      continue;
    }

    processed += 1;
    const beforeDate = String(beforeEntry?.date || "").slice(0, 10);
    const afterDate = String(afterEntry?.date || "").slice(0, 10);
    if (beforeDate) affectedDates.add(beforeDate);
    if (afterDate) affectedDates.add(afterDate);
  }

  for (const date of affectedDates) {
    if (!date || isPastDate(date)) continue;

    const currentEntries = (nextByDate.get(date) || []).filter((entry) => entry.isAvailable);
    const availabilityIdsForDate = new Set([
      ...(prevByDate.get(date) || []).map((entry) => String(entry.id)),
      ...(nextByDate.get(date) || []).map((entry) => String(entry.id)),
    ]);

    const mappedAvailabilityIds = [...availabilityIdsForDate].filter((availabilityId) =>
      mappingsByAvailabilityId.has(availabilityId)
    );

    const existingGoogleEventIds = mappedAvailabilityIds
      .map((availabilityId) => mappingsByAvailabilityId.get(availabilityId)?.googleEventId || "")
      .filter(Boolean);

    const result = await syncEventForDate({
      clubId,
      calendarId,
      date,
      entriesForDate: currentEntries,
      mappedAvailabilityIds,
      existingGoogleEventIds,
    });
    createdOrUpdated += result.createdOrUpdated;
    deleted += result.deleted;
  }

  return { processed, createdOrUpdated, deleted, skippedPast };
}

export async function fullResyncAvailabilityToGoogle({
  clubId,
  availability,
}: {
  clubId: string;
  availability: AvailabilityEntry[] | undefined;
}): Promise<{ upserted: number; deleted: number; skippedPast: number }> {
  const entries = (Array.isArray(availability) ? availability : []).filter((a) => a && a.id);
  const calendarId = await resolveAvailabilityCalendarId();
  const entriesByDate = groupEntriesByDate(entries);
  const availableEntriesByDate = groupEntriesByDate(entries.filter((entry) => entry.isAvailable));

  const byId = new Map(entries.map((e) => [String(e.id), e]));
  const mappings = await listAvailabilityEventMappingsByClub({ clubId });
  const mappingsByAvailabilityId = new Map(mappings.map((mapping) => [mapping.availabilityId, mapping]));

  let upserted = 0;
  let deleted = 0;
  let skippedPast = 0;

  const preservedGoogleEventIds = new Set<string>();
  const syncedAvailabilityIds = new Set<string>();

  for (const date of entriesByDate.keys()) {
    const dateEntries = entriesByDate.get(date) || [];
    if (date && isPastDate(date)) {
      skippedPast += dateEntries.filter((entry) => entry.isAvailable).length;
      continue;
    }

    const availableEntries = availableEntriesByDate.get(date) || [];
    const mappedAvailabilityIds = dateEntries
      .map((entry) => String(entry.id))
      .filter((availabilityId) => mappingsByAvailabilityId.has(availabilityId));

    const existingGoogleEventIds = mappedAvailabilityIds
      .map((availabilityId) => mappingsByAvailabilityId.get(availabilityId)?.googleEventId || "")
      .filter(Boolean);

    const result = await syncEventForDate({
      clubId,
      calendarId,
      date,
      entriesForDate: availableEntries,
      mappedAvailabilityIds,
      existingGoogleEventIds,
    });
    upserted += result.createdOrUpdated;
    deleted += result.deleted;

    for (const entry of availableEntries) {
      syncedAvailabilityIds.add(String(entry.id));
    }
    for (const googleEventId of existingGoogleEventIds) {
      if (availableEntries.length > 0) preservedGoogleEventIds.add(googleEventId);
    }
  }

  const deletedGoogleEventIds = new Set<string>();

  for (const mapping of mappings) {
    if (syncedAvailabilityIds.has(mapping.availabilityId)) continue;

    const entry = byId.get(mapping.availabilityId);
    const googleEventId = mapping.googleEventId || "";

    if (googleEventId && !preservedGoogleEventIds.has(googleEventId) && !deletedGoogleEventIds.has(googleEventId)) {
      await safeDeleteEvent({
        calendarId: mapping.calendarId || calendarId,
        googleEventId,
      });
      deletedGoogleEventIds.add(googleEventId);
      deleted += 1;
    }

    if (!entry || !entry.isAvailable) {
      await deleteAvailabilityEventMapping({ clubId, availabilityId: mapping.availabilityId });
    }
  }

  return { upserted, deleted, skippedPast };
}

