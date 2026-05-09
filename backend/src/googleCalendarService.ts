import { google } from "googleapis";
import type { calendar_v3 } from "googleapis";

let calendarClient: calendar_v3.Calendar | null = null;
let cachedAvailabilityCalendarId: string | null = null;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export function getGoogleCalendarTimezone(): string {
  return process.env.GOOGLE_CALENDAR_TIMEZONE || "Asia/Jerusalem";
}

export function getGoogleCalendarClient(): calendar_v3.Calendar {
  if (calendarClient) return calendarClient;

  const clientId = requireEnv("GOOGLE_OAUTH_CLIENT_ID");
  const clientSecret = requireEnv("GOOGLE_OAUTH_CLIENT_SECRET");
  const redirectUri = requireEnv("GOOGLE_OAUTH_REDIRECT_URI");
  const refreshToken = requireEnv("GOOGLE_OAUTH_REFRESH_TOKEN");

  const oauth2 = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  oauth2.setCredentials({ refresh_token: refreshToken });

  calendarClient = google.calendar({ version: "v3", auth: oauth2 });
  return calendarClient;
}

export async function resolveAvailabilityCalendarId(): Promise<string> {
  if (cachedAvailabilityCalendarId) return cachedAvailabilityCalendarId;

  const explicitId = (process.env.GOOGLE_AVAILABILITY_CALENDAR_ID || "").trim();
  if (explicitId) {
    cachedAvailabilityCalendarId = explicitId;
    return explicitId;
  }

  const calendarName =
    (process.env.GOOGLE_AVAILABILITY_CALENDAR_NAME || "").trim() ||
    "זמינות עובדים";

  const calendar = getGoogleCalendarClient();

  let pageToken: string | undefined = undefined;
  while (true) {
    const res = (await calendar.calendarList.list({
      maxResults: 250,
      pageToken,
    })) as unknown as { data: calendar_v3.Schema$CalendarList };
    const items: calendar_v3.Schema$CalendarListEntry[] = res.data.items || [];
    const match = items.find(
      (c: calendar_v3.Schema$CalendarListEntry) =>
        (c.summary || "").trim() === calendarName
    );
    if (match?.id) {
      cachedAvailabilityCalendarId = match.id;
      return match.id;
    }
    pageToken = res.data.nextPageToken || undefined;
    if (!pageToken) break;
  }

  const created = await calendar.calendars.insert({
    requestBody: {
      summary: calendarName,
      timeZone: getGoogleCalendarTimezone(),
    },
  });

  const id = created.data.id;
  if (!id) {
    throw new Error("Failed to create availability calendar (missing id)");
  }

  cachedAvailabilityCalendarId = id;
  return id;
}

