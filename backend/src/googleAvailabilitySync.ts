import type { AvailabilityEntry } from "./types.js";
import { getGoogleCalendarClient, getGoogleCalendarTimezone, resolveAvailabilityCalendarId } from "./googleCalendarService.js";
import {
  deleteAvailabilityEventMapping,
  getAvailabilityEventMapping,
  listAvailabilityEventMappingsByClub,
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

function addMinutes(timeHHMM: string, minutes: number): string {
  const [hh, mm] = timeHHMM.split(":").map((x) => Number(x));
  const total = hh * 60 + mm + minutes;
  const clamped = ((total % (24 * 60)) + (24 * 60)) % (24 * 60);
  const outH = Math.floor(clamped / 60);
  const outM = clamped % 60;
  return `${String(outH).padStart(2, "0")}:${String(outM).padStart(2, "0")}`;
}

function isPastDate(dateStr: string): boolean {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, "0");
  const d = String(today.getDate()).padStart(2, "0");
  const todayStr = `${y}-${m}-${d}`;
  return dateStr < todayStr;
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

function buildEventRequestBody({
  clubId,
  availabilityId,
  entry,
}: {
  clubId: string;
  availabilityId: string;
  entry: AvailabilityEntry;
}) {
  const timeZone = getGoogleCalendarTimezone();
  const date = String(entry.date || "").slice(0, 10);
  const isAllDay = Boolean(entry.isAllDay);
  const startTime = normalizeTime(entry.startTime);
  const endTime = normalizeTime(entry.endTime);

  const base = {
    summary: `${entry.userName || "עובד"}`,
    description: [
      entry.notes ? `הערות: ${entry.notes}` : "",
      `clubId=${clubId}`,
      `availabilityId=${availabilityId}`,
    ]
      .filter(Boolean)
      .join("\n"),
    extendedProperties: {
      private: {
        clubId,
        availabilityId,
      },
    },
  };

  if (isAllDay || (!startTime && !endTime)) {
    const endDate = new Date(`${date}T00:00:00Z`);
    endDate.setUTCDate(endDate.getUTCDate() + 1);
    const endDateStr = endDate.toISOString().slice(0, 10);
    return {
      ...base,
      start: { date },
      end: { date: endDateStr },
    };
  }

  const effectiveStart = startTime || "08:00";
  const effectiveEnd = endTime || addMinutes(effectiveStart, 60);

  return {
    ...base,
    start: { dateTime: `${date}T${effectiveStart}:00`, timeZone },
    end: { dateTime: `${date}T${effectiveEnd}:00`, timeZone },
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

async function upsertEventForAvailability({
  clubId,
  calendarId,
  availabilityId,
  entry,
}: {
  clubId: string;
  calendarId: string;
  availabilityId: string;
  entry: AvailabilityEntry;
}) {
  const calendar = getGoogleCalendarClient();
  const requestBody = buildEventRequestBody({ clubId, availabilityId, entry });

  const existing = await getAvailabilityEventMapping({ clubId, availabilityId });
  if (existing?.googleEventId) {
    try {
      const updated = await calendar.events.update({
        calendarId,
        eventId: existing.googleEventId,
        requestBody,
      });
      const id = updated.data.id || existing.googleEventId;
      await upsertAvailabilityEventMapping({
        clubId,
        availabilityId,
        calendarId,
        googleEventId: id,
        lastError: null,
      });
      return;
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
  await upsertAvailabilityEventMapping({
    clubId,
    availabilityId,
    calendarId,
    googleEventId: id,
    lastError: null,
  });
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
  const keys = new Set([...prevByKey.keys(), ...nextByKey.keys()]);

  const calendarId = await resolveAvailabilityCalendarId();

  let processed = 0;
  let createdOrUpdated = 0;
  let deleted = 0;
  let skippedPast = 0;

  for (const key of keys) {
    const beforeEntry = prevByKey.get(key);
    const afterEntry = nextByKey.get(key);
    const availabilityId = String(afterEntry?.id || beforeEntry?.id || "");
    if (!availabilityId) continue;

    if (!afterEntry) {
      // removed
      const mapping = await getAvailabilityEventMapping({ clubId, availabilityId });
      if (mapping?.googleEventId && mapping?.calendarId) {
        await safeDeleteEvent({
          calendarId: mapping.calendarId || calendarId,
          googleEventId: mapping.googleEventId,
        });
        deleted += 1;
      }
      await deleteAvailabilityEventMapping({ clubId, availabilityId });
      processed += 1;
      continue;
    }

    if (!availabilityChanged(beforeEntry, afterEntry)) continue;

    const dateStr = String(afterEntry.date || "").slice(0, 10);
    if (dateStr && isPastDate(dateStr)) {
      skippedPast += 1;
      continue;
    }

    processed += 1;

    if (!afterEntry.isAvailable) {
      const mapping = await getAvailabilityEventMapping({ clubId, availabilityId });
      if (mapping?.googleEventId && mapping?.calendarId) {
        await safeDeleteEvent({
          calendarId: mapping.calendarId || calendarId,
          googleEventId: mapping.googleEventId,
        });
        deleted += 1;
      }
      await deleteAvailabilityEventMapping({ clubId, availabilityId });
      continue;
    }

    try {
      await upsertEventForAvailability({
        clubId,
        calendarId,
        availabilityId,
        entry: afterEntry,
      });
      createdOrUpdated += 1;
    } catch (e: any) {
      const message = e instanceof Error ? e.message : String(e);
      await upsertAvailabilityEventMapping({
        clubId,
        availabilityId,
        calendarId,
        googleEventId: (await getAvailabilityEventMapping({ clubId, availabilityId }))?.googleEventId || "",
        lastError: message,
      });
      throw e;
    }
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

  const byId = new Map(entries.map((e) => [String(e.id), e]));
  const mappings = await listAvailabilityEventMappingsByClub({ clubId });

  let upserted = 0;
  let deleted = 0;
  let skippedPast = 0;

  // delete mappings that no longer should exist (missing or unavailable)
  for (const mapping of mappings) {
    const entry = byId.get(mapping.availabilityId);
    if (!entry || !entry.isAvailable) {
      if (mapping.googleEventId && mapping.calendarId) {
        await safeDeleteEvent({
          calendarId: mapping.calendarId || calendarId,
          googleEventId: mapping.googleEventId,
        });
        deleted += 1;
      }
      await deleteAvailabilityEventMapping({ clubId, availabilityId: mapping.availabilityId });
    }
  }

  for (const entry of entries) {
    if (!entry.isAvailable) continue;
    const dateStr = String(entry.date || "").slice(0, 10);
    if (dateStr && isPastDate(dateStr)) {
      skippedPast += 1;
      continue;
    }
    await upsertEventForAvailability({
      clubId,
      calendarId,
      availabilityId: String(entry.id),
      entry,
    });
    upserted += 1;
  }

  return { upserted, deleted, skippedPast };
}

