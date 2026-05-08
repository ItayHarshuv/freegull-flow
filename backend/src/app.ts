import crypto from "crypto";
import cookieParser from "cookie-parser";
import compression from "compression";
import cors, { type CorsOptions } from "cors";
import express, {
  type CookieOptions,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import { ZodError, z } from "zod";
import {
  readState,
  readStateVersion,
  readStateWithVersion,
  StateValidationError,
  StateVersionConflictError,
  writeState,
} from "./stateRepository.js";
import { pool } from "./db.js";
import {
  deletePushSubscriptionByEndpoint,
  hasPushSubscription,
  listPushSubscriptionsByClub,
  upsertPushSubscription,
} from "./pushRepository.js";
import { getVapidPublicKey, isPushEnabled, sendWebPush } from "./pushService.js";
import { computeAvailabilityNotification } from "./availabilityNotifications.js";
import type { AuthContext } from "./express.js";
import type {
  AuthSessionRow,
  ClubState,
  PushSubscriptionRow,
  SeaEvent,
  Shift,
  UserRow,
} from "./types.js";

const app = express();

const AUTH_COOKIE_NAME = "freegull_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14;
const allowEmailLogin = process.env.ALLOW_EMAIL_LOGIN === "true";
const defaultFrontendOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
].join(",");

const allowedOrigins = (process.env.FRONTEND_ORIGIN || defaultFrontendOrigins)
  .split(",")
  .map((origin) => origin.trim())
  .filter((origin): origin is string => Boolean(origin));

const allowedOriginSet = new Set(
  allowedOrigins
    .map((origin) => {
      try {
        return new URL(origin).origin;
      } catch {
        return null;
      }
    })
    .filter((origin): origin is string => Boolean(origin))
);

const vercelPreviewPrefixes = allowedOrigins
  .map((origin) => {
    try {
      const url = new URL(origin);
      if (url.protocol !== "https:" || !url.hostname.endsWith(".vercel.app")) {
        return null;
      }

      return url.hostname.slice(0, -".vercel.app".length);
    } catch {
      return null;
    }
  })
  .filter((prefix): prefix is string => Boolean(prefix));

function isAllowedOrigin(origin: string): boolean {
  let url: URL;

  try {
    url = new URL(origin);
  } catch {
    return false;
  }

  if (allowedOriginSet.has(url.origin)) {
    return true;
  }

  if (url.protocol !== "https:" || !url.hostname.endsWith(".vercel.app")) {
    return false;
  }

  const candidatePrefix = url.hostname.slice(0, -".vercel.app".length);
  return vercelPreviewPrefixes.some(
    (prefix) =>
      candidatePrefix === prefix || candidatePrefix.startsWith(`${prefix}-`)
  );
}

const corsOptions: CorsOptions = {
  origin(origin, callback) {
    if (!origin || isAllowedOrigin(origin)) {
      callback(null, true);
      return;
    }

    callback(null, false);
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));
app.use(compression());

const resourceMap = {
  users: "users",
  shifts: "shifts",
  lessons: "lessons",
  rentals: "rentals",
  tasks: "tasks",
  leads: "leads",
  availability: "availability",
  events: "events",
  templates: "whatsappTemplates",
  "knowledge-files": "knowledgeFiles",
} as const satisfies Record<string, keyof ClubState>;

type ResourceParam = keyof typeof resourceMap;
type ResourceKey = (typeof resourceMap)[ResourceParam];

function isResourceParam(value: string): value is ResourceParam {
  return Object.prototype.hasOwnProperty.call(resourceMap, value);
}

const clubIdSchema = z.object({ clubId: z.string().min(1) });
const stateSchema = z.object({
  state: z.record(z.string(), z.any()),
  expectedVersion: z.number().int().nonnegative().optional(),
});
const idParamSchema = z.object({ id: z.string().min(1) });
const settingsBodySchema = z.record(z.string(), z.any());
const pushSubscriptionBodySchema = z.object({
  subscription: z.object({
    endpoint: z.string().min(1),
    keys: z.object({
      p256dh: z.string().min(1),
      auth: z.string().min(1),
    }),
  }),
});
const pushUnsubscribeBodySchema = z.object({
  endpoint: z.string().min(1),
});
const pushSubscriptionStatusQuerySchema = z.object({
  endpoint: z.string().min(1),
});
const closeShiftBodySchema = z.object({
  clubId: z.string().min(1, "clubId is required"),
  patch: z.record(z.string(), z.any()).optional(),
});
const archiveEventBodySchema = z.object({
  clubId: z.string().min(1, "clubId is required"),
});
const loginBodySchema = z.object({
  clubId: z.string().min(1, "clubId is required"),
  identifier: z.string().min(1, "identifier is required"),
});
const meQuerySchema = z.object({
  clubId: z.string().min(1).optional(),
});

interface MappedUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  avatar: string;
  certifications: string[];
  isArchived: boolean;
  isFullTime: boolean | null;
  fixedDayOff: number | string | null;
  canAddBonuses: boolean | null;
  bankName?: string | null;
  bankBranch?: string | null;
  accountNumber?: string | null;
  hasForm101?: boolean | null;
  form101Data?: unknown;
  form101FileName?: string | null;
}

function hashSessionToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function buildCookieOptions(): CookieOptions {
  const isProduction = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
    maxAge: SESSION_TTL_MS,
    path: "/",
  };
}

function mapUserRow(row: UserRow): MappedUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    role: row.role,
    avatar: row.avatar || "",
    certifications: Array.isArray(row.certifications)
      ? row.certifications.filter((cert): cert is string => Boolean(cert))
      : [],
    isArchived: row.is_archived,
    isFullTime: row.is_full_time,
    fixedDayOff: row.fixed_day_off,
    canAddBonuses: row.can_add_bonuses,
    bankName: row.bank_name ?? undefined,
    bankBranch: row.bank_branch ?? undefined,
    accountNumber: row.account_number ?? undefined,
    hasForm101: row.has_form_101 ?? undefined,
    form101Data: row.form_101_data ?? undefined,
    form101FileName: row.form_101_file_name ?? undefined,
  };
}

async function readUserByIdentifier(
  clubId: string,
  identifier: string
): Promise<UserRow | null> {
  const normalizedIdentifier = identifier.trim();
  const res = await pool.query<UserRow>(
    `
      SELECT
        u.*,
        ARRAY_REMOVE(ARRAY_AGG(uc.certification), NULL) AS certifications
      FROM users u
      LEFT JOIN user_certifications uc ON uc.user_id = u.id
      WHERE
        u.club_id = $1
        AND NOT u.is_archived
        AND (
          u.quick_code = $2
          OR ($3::boolean = true AND LOWER(u.email) = LOWER($2))
        )
      GROUP BY u.id
      LIMIT 1
    `,
    [clubId, normalizedIdentifier, allowEmailLogin]
  );
  return res.rows[0] || null;
}

async function readUserById(
  clubId: string,
  userId: string
): Promise<UserRow | null> {
  const res = await pool.query<UserRow>(
    `
      SELECT
        u.*,
        ARRAY_REMOVE(ARRAY_AGG(uc.certification), NULL) AS certifications
      FROM users u
      LEFT JOIN user_certifications uc ON uc.user_id = u.id
      WHERE
        u.club_id = $1
        AND u.id = $2
        AND NOT u.is_archived
      GROUP BY u.id
      LIMIT 1
    `,
    [clubId, userId]
  );
  return res.rows[0] || null;
}

async function createSession(
  clubId: string,
  userId: string,
  req: Request
): Promise<string> {
  const sessionToken = crypto.randomBytes(48).toString("base64url");
  const tokenHash = hashSessionToken(sessionToken);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  const userAgent = req.get("user-agent") || null;
  const forwarded = req.headers["x-forwarded-for"];
  const ipAddress = Array.isArray(forwarded)
    ? forwarded[0]
    : typeof forwarded === "string"
      ? forwarded.split(",")[0].trim()
      : req.ip || null;

  await pool.query(
    `
      INSERT INTO auth_sessions (
        token_hash, club_id, user_id, expires_at, user_agent, ip_address
      )
      VALUES ($1, $2, $3, $4, $5, $6)
    `,
    [tokenHash, clubId, userId, expiresAt, userAgent, ipAddress]
  );

  return sessionToken;
}

async function readSessionFromToken(
  sessionToken: string
): Promise<AuthSessionRow | null> {
  const tokenHash = hashSessionToken(sessionToken);
  const res = await pool.query<AuthSessionRow>(
    `
      SELECT token_hash, club_id, user_id, expires_at
      FROM auth_sessions
      WHERE token_hash = $1
        AND revoked_at IS NULL
        AND expires_at > NOW()
      LIMIT 1
    `,
    [tokenHash]
  );
  return res.rows[0] || null;
}

async function revokeSession(sessionToken: string): Promise<void> {
  const tokenHash = hashSessionToken(sessionToken);
  await pool.query(
    `
      UPDATE auth_sessions
      SET revoked_at = NOW()
      WHERE token_hash = $1
    `,
    [tokenHash]
  );
}

async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const sessionToken = req.cookies?.[AUTH_COOKIE_NAME] as string | undefined;
    if (!sessionToken) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const session = await readSessionFromToken(sessionToken);
    if (!session) {
      res.clearCookie(AUTH_COOKIE_NAME, buildCookieOptions());
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const auth: AuthContext = {
      clubId: session.club_id,
      userId: session.user_id,
      token: sessionToken,
    };
    req.auth = auth;
    await pool.query(
      `
        UPDATE auth_sessions
        SET last_seen_at = NOW()
        WHERE token_hash = $1
      `,
      [session.token_hash]
    );
    next();
  } catch (error: unknown) {
    res.status(401).json({
      error: "Unauthorized",
      details: error instanceof Error ? error.message : String(error),
    });
  }
}

function enforceClubAccess(
  req: Request,
  res: Response,
  clubId: string
): boolean {
  if (req.auth?.clubId !== clubId) {
    res.status(403).json({ error: "Forbidden: invalid club scope" });
    return false;
  }
  return true;
}

function sendRouteError(res: Response, error: unknown): Response {
  if (error instanceof StateVersionConflictError) {
    return res.status(409).json({ error: "State version conflict" });
  }

  if (error instanceof StateValidationError) {
    return res.status(400).json({
      error: "Validation failed",
      issues: [
        {
          path: error.path || "",
          message: error.message,
          code: "custom",
        },
      ],
    });
  }

  if (error instanceof ZodError) {
    return res.status(400).json({
      error: "Validation failed",
      issues: error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
        code: issue.code,
      })),
    });
  }

  const message = error instanceof Error ? error.message : String(error);
  return res.status(400).json({ error: message });
}

function isManagerRole(role: string | null | undefined): boolean {
  if (!role) return false;
  return (
    role === "Manager" ||
    role === "Shift Manager" ||
    role === "manager" ||
    role === "shift-manager"
  );
}

app.post("/auth/login", async (req: Request, res: Response) => {
  try {
    const { clubId, identifier } = loginBodySchema.parse(req.body || {});
    const user = await readUserByIdentifier(clubId, identifier);
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const sessionToken = await createSession(clubId, user.id, req);
    res.cookie(AUTH_COOKIE_NAME, sessionToken, buildCookieOptions());
    return res.json({ user: mapUserRow(user), clubId });
  } catch (error) {
    return sendRouteError(res, error);
  }
});

app.get("/auth/me", requireAuth, async (req: Request, res: Response) => {
  try {
    const query = meQuerySchema.parse(req.query || {});
    const auth = req.auth;
    if (!auth) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const clubId = query.clubId || auth.clubId;
    if (!enforceClubAccess(req, res, clubId)) return;
    const user = await readUserById(clubId, auth.userId);
    if (!user) {
      res.clearCookie(AUTH_COOKIE_NAME, buildCookieOptions());
      return res.status(401).json({ error: "Unauthorized" });
    }
    return res.json({ user: mapUserRow(user), clubId });
  } catch (error) {
    return sendRouteError(res, error);
  }
});

app.post("/auth/logout", requireAuth, async (req: Request, res: Response) => {
  try {
    const auth = req.auth;
    if (!auth) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    await revokeSession(auth.token);
    res.clearCookie(AUTH_COOKIE_NAME, buildCookieOptions());
    return res.status(204).send();
  } catch (error) {
    return sendRouteError(res, error);
  }
});

app.get("/health", async (_req: Request, res: Response) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

app.get(
  "/push/vapid-public-key",
  requireAuth,
  async (_req: Request, res: Response) => {
    res.json({ enabled: isPushEnabled(), publicKey: getVapidPublicKey() });
  }
);

app.post(
  "/push/:clubId/subscriptions",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const { clubId } = clubIdSchema.parse(req.params);
      if (!enforceClubAccess(req, res, clubId)) return;
      const auth = req.auth;
      if (!auth) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const user = await readUserById(clubId, auth.userId);
      if (!user || !isManagerRole(user.role)) {
        return res.status(403).json({ error: "Forbidden: managers only" });
      }

      const parsed = pushSubscriptionBodySchema.parse(req.body || {});
      const { endpoint, keys } = parsed.subscription;
      const id = await upsertPushSubscription({
        clubId,
        userId: auth.userId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent: req.get("user-agent") || null,
      });
      return res.status(201).json({ id });
    } catch (error) {
      return sendRouteError(res, error);
    }
  }
);

app.get(
  "/push/:clubId/subscriptions/status",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const { clubId } = clubIdSchema.parse(req.params);
      if (!enforceClubAccess(req, res, clubId)) return;
      const auth = req.auth;
      if (!auth) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const user = await readUserById(clubId, auth.userId);
      if (!user || !isManagerRole(user.role)) {
        return res.status(403).json({ error: "Forbidden: managers only" });
      }

      const { endpoint } = pushSubscriptionStatusQuerySchema.parse(
        req.query || {}
      );
      const subscribed = await hasPushSubscription({
        clubId,
        userId: auth.userId,
        endpoint,
      });
      return res.json({ subscribed });
    } catch (error) {
      return sendRouteError(res, error);
    }
  }
);

app.delete(
  "/push/:clubId/subscriptions",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const { clubId } = clubIdSchema.parse(req.params);
      if (!enforceClubAccess(req, res, clubId)) return;
      const auth = req.auth;
      if (!auth) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const user = await readUserById(clubId, auth.userId);
      if (!user || !isManagerRole(user.role)) {
        return res.status(403).json({ error: "Forbidden: managers only" });
      }

      const parsed = pushUnsubscribeBodySchema.parse(req.body || {});
      await deletePushSubscriptionByEndpoint({
        clubId,
        endpoint: parsed.endpoint,
      });
      return res.status(204).send();
    } catch (error) {
      return sendRouteError(res, error);
    }
  }
);

app.get("/state/:clubId", requireAuth, async (req: Request, res: Response) => {
  try {
    const { clubId } = clubIdSchema.parse(req.params);
    if (!enforceClubAccess(req, res, clubId)) return;
    const { state, version } = await readStateWithVersion(clubId);
    res.json({ ...state, serverVersion: version });
  } catch (error) {
    sendRouteError(res, error);
  }
});

app.get(
  "/state/:clubId/version",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const { clubId } = clubIdSchema.parse(req.params);
      if (!enforceClubAccess(req, res, clubId)) return;
      const version = await readStateVersion(clubId);
      res.json({ serverVersion: version });
    } catch (error) {
      sendRouteError(res, error);
    }
  }
);

app.put("/state/:clubId", requireAuth, async (req: Request, res: Response) => {
  try {
    const { clubId } = clubIdSchema.parse(req.params);
    if (!enforceClubAccess(req, res, clubId)) return;
    console.log("[STATE_PUT_REQUEST_BODY]", { clubId, body: req.body });
    const parsed = stateSchema.parse(req.body);
    const beforeState = await readState(clubId);
    await writeState(
      clubId,
      parsed.state as Partial<ClubState>,
      parsed.expectedVersion
    );
    const { state, version } = await readStateWithVersion(clubId);

    res.json({ ...state, serverVersion: version });

    try {
      if (!isPushEnabled()) return;
      const notification = computeAvailabilityNotification(
        beforeState?.availability,
        state?.availability
      );
      if (!notification) return;

      const subs: PushSubscriptionRow[] = await listPushSubscriptionsByClub({
        clubId,
      });
      const payload = {
        ...notification,
        url: "/availability",
      };

      await Promise.all(
        subs.map(async (sub) => {
          const result = await sendWebPush(
            {
              endpoint: sub.endpoint,
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
            payload
          );

          if (result.ok === false) {
            console.warn("[PUSH_DELIVERY_FAILED]", {
              clubId,
              endpoint: sub.endpoint,
              statusCode: result.statusCode,
              error: result.error,
            });
          }
        })
      );
    } catch (e) {
      console.warn(
        "[PUSH_NOTIFY_FAILED]",
        e instanceof Error ? e.message : String(e)
      );
    }
  } catch (error) {
    if (error instanceof StateVersionConflictError) {
      const { clubId } = clubIdSchema.parse(req.params);
      if (!enforceClubAccess(req, res, clubId)) return;
      const { state, version } = await readStateWithVersion(clubId);
      return res.status(409).json({
        error: "State version conflict",
        serverVersion: version,
        state,
      });
    }
    sendRouteError(res, error);
  }
});

app.get(
  "/clubs/:clubId/settings",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const { clubId } = clubIdSchema.parse(req.params);
      if (!enforceClubAccess(req, res, clubId)) return;
      const state = await readState(clubId);
      res.json(state.clubSettings);
    } catch (error) {
      sendRouteError(res, error);
    }
  }
);

app.put(
  "/clubs/:clubId/settings",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const { clubId } = clubIdSchema.parse(req.params);
      if (!enforceClubAccess(req, res, clubId)) return;
      const parsedSettings = settingsBodySchema.parse(req.body || {});
      const state = await readState(clubId);
      const nextState: ClubState = {
        ...state,
        clubSettings: {
          ...state.clubSettings!,
          ...parsedSettings,
        },
      };
      await writeState(clubId, nextState);
      res.json(nextState.clubSettings);
    } catch (error) {
      sendRouteError(res, error);
    }
  }
);

function getResourceItems(state: ClubState, key: ResourceKey): unknown[] {
  const value = state[key];
  return Array.isArray(value) ? (value as unknown[]) : [];
}

app.get(
  "/api/:clubId/:resource",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const { clubId } = clubIdSchema.parse(req.params);
      if (!enforceClubAccess(req, res, clubId)) return;
      const state = await readState(clubId);
      const resource = String(req.params.resource);
      if (!isResourceParam(resource)) {
        return res.status(404).json({ error: "resource not found" });
      }
      const key = resourceMap[resource];
      res.json(getResourceItems(state, key));
    } catch (error) {
      sendRouteError(res, error);
    }
  }
);

app.post(
  "/api/:clubId/:resource",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const { clubId } = clubIdSchema.parse(req.params);
      if (!enforceClubAccess(req, res, clubId)) return;
      const resource = String(req.params.resource);
      if (!isResourceParam(resource)) {
        return res.status(404).json({ error: "resource not found" });
      }
      const key = resourceMap[resource];

      const state = await readState(clubId);
      const item = (req.body ?? {}) as Record<string, unknown>;
      const nextState: ClubState = {
        ...state,
        [key]: [item, ...getResourceItems(state, key)],
      } as ClubState;

      await writeState(clubId, nextState);
      res.status(201).json(item);
    } catch (error) {
      sendRouteError(res, error);
    }
  }
);

interface IdentifiableItem {
  id?: string;
  [key: string]: unknown;
}

app.put(
  "/api/:clubId/:resource/:id",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const { clubId } = clubIdSchema.parse(req.params);
      if (!enforceClubAccess(req, res, clubId)) return;
      const { id } = idParamSchema.parse(req.params);
      const resource = String(req.params.resource);
      if (!isResourceParam(resource)) {
        return res.status(404).json({ error: "resource not found" });
      }
      const key = resourceMap[resource];

      const state = await readState(clubId);
      const items = getResourceItems(state, key) as IdentifiableItem[];
      const next = items.map((item) =>
        item.id === id
          ? { ...item, ...((req.body ?? {}) as Record<string, unknown>) }
          : item
      );
      const nextState: ClubState = {
        ...state,
        [key]: next,
      } as ClubState;

      await writeState(clubId, nextState);
      const updated = next.find((item) => item.id === id);
      res.json(updated || null);
    } catch (error) {
      sendRouteError(res, error);
    }
  }
);

app.delete(
  "/api/:clubId/:resource/:id",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const { clubId } = clubIdSchema.parse(req.params);
      if (!enforceClubAccess(req, res, clubId)) return;
      const { id } = idParamSchema.parse(req.params);
      const resource = String(req.params.resource);
      if (!isResourceParam(resource)) {
        return res.status(404).json({ error: "resource not found" });
      }
      const key = resourceMap[resource];

      const state = await readState(clubId);
      const items = getResourceItems(state, key) as IdentifiableItem[];
      const nextState: ClubState = {
        ...state,
        [key]: items.filter((item) => item.id !== id),
      } as ClubState;
      await writeState(clubId, nextState);
      res.status(204).send();
    } catch (error) {
      sendRouteError(res, error);
    }
  }
);

app.post(
  "/shifts/:id/close",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const { id } = idParamSchema.parse(req.params);
      const { clubId, patch } = closeShiftBodySchema.parse(req.body || {});
      if (!enforceClubAccess(req, res, clubId)) return;
      const state = await readState(clubId);
      const updatedShifts: Shift[] = state.shifts.map((shift) =>
        shift.id === id
          ? { ...shift, isClosed: true, ...(patch || {}) }
          : shift
      );
      const nextState: ClubState = { ...state, shifts: updatedShifts };
      await writeState(clubId, nextState);
      res.json(updatedShifts.find((s) => s.id === id) || null);
    } catch (error) {
      sendRouteError(res, error);
    }
  }
);

app.post(
  "/events/:id/archive",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const { id } = idParamSchema.parse(req.params);
      const { clubId } = archiveEventBodySchema.parse(req.body || {});
      if (!enforceClubAccess(req, res, clubId)) return;
      const state = await readState(clubId);
      const updatedEvents: SeaEvent[] = state.events.map((event) =>
        event.id === id ? { ...event, isArchived: true } : event
      );
      const nextState: ClubState = { ...state, events: updatedEvents };
      await writeState(clubId, nextState);
      res.json(updatedEvents.find((e) => e.id === id) || null);
    } catch (error) {
      sendRouteError(res, error);
    }
  }
);

export default app;
