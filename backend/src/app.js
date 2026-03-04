import crypto from "crypto";
import cookieParser from "cookie-parser";
import compression from "compression";
import cors from "cors";
import express from "express";
import { ZodError, z } from "zod";
import {
  readState,
  readStateVersion,
  readStateWithVersion,
  StateVersionConflictError,
  writeState,
} from "./stateRepository.js";
import { pool } from "./db.js";

const app = express();

const AUTH_COOKIE_NAME = "freegull_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14;
const allowEmailLogin = process.env.ALLOW_EMAIL_LOGIN === "true";
const allowedOrigins = (process.env.FRONTEND_ORIGIN || "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);
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
};

const clubIdSchema = z.object({ clubId: z.string().min(1) });
const stateSchema = z.object({
  state: z.record(z.string(), z.any()),
  expectedVersion: z.number().int().nonnegative().optional(),
});
const idParamSchema = z.object({ id: z.string().min(1) });
const settingsBodySchema = z.record(z.string(), z.any());
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

function hashSessionToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function buildCookieOptions() {
  const isProduction = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
    maxAge: SESSION_TTL_MS,
    path: "/",
  };
}

function mapUserRow(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    role: row.role,
    avatar: row.avatar || "",
    certifications: Array.isArray(row.certifications)
      ? row.certifications.filter(Boolean)
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

async function readUserByIdentifier(clubId, identifier) {
  const normalizedIdentifier = identifier.trim();
  const res = await pool.query(
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

async function readUserById(clubId, userId) {
  const res = await pool.query(
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

async function createSession(clubId, userId, req) {
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

async function readSessionFromToken(sessionToken) {
  const tokenHash = hashSessionToken(sessionToken);
  const res = await pool.query(
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

async function revokeSession(sessionToken) {
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

async function requireAuth(req, res, next) {
  try {
    const sessionToken = req.cookies?.[AUTH_COOKIE_NAME];
    if (!sessionToken) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const session = await readSessionFromToken(sessionToken);
    if (!session) {
      res.clearCookie(AUTH_COOKIE_NAME, buildCookieOptions());
      return res.status(401).json({ error: "Unauthorized" });
    }
    req.auth = {
      clubId: session.club_id,
      userId: session.user_id,
      token: sessionToken,
    };
    await pool.query(
      `
        UPDATE auth_sessions
        SET last_seen_at = NOW()
        WHERE token_hash = $1
      `,
      [session.token_hash]
    );
    return next();
  } catch (error) {
    return res.status(401).json({ error: "Unauthorized", details: error.message });
  }
}

function enforceClubAccess(req, res, clubId) {
  if (req.auth?.clubId !== clubId) {
    res.status(403).json({ error: "Forbidden: invalid club scope" });
    return false;
  }
  return true;
}

function sendRouteError(res, error) {
  if (error instanceof StateVersionConflictError) {
    return res.status(409).json({ error: "State version conflict" });
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

  return res.status(400).json({ error: error.message });
}

app.post("/auth/login", async (req, res) => {
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

app.get("/auth/me", requireAuth, async (req, res) => {
  try {
    const query = meQuerySchema.parse(req.query || {});
    const clubId = query.clubId || req.auth.clubId;
    if (!enforceClubAccess(req, res, clubId)) return;
    const user = await readUserById(clubId, req.auth.userId);
    if (!user) {
      res.clearCookie(AUTH_COOKIE_NAME, buildCookieOptions());
      return res.status(401).json({ error: "Unauthorized" });
    }
    return res.json({ user: mapUserRow(user), clubId });
  } catch (error) {
    return sendRouteError(res, error);
  }
});

app.post("/auth/logout", requireAuth, async (req, res) => {
  try {
    await revokeSession(req.auth.token);
    res.clearCookie(AUTH_COOKIE_NAME, buildCookieOptions());
    return res.status(204).send();
  } catch (error) {
    return sendRouteError(res, error);
  }
});

app.get("/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/state/:clubId", requireAuth, async (req, res) => {
  try {
    const { clubId } = clubIdSchema.parse(req.params);
    if (!enforceClubAccess(req, res, clubId)) return;
    const { state, version } = await readStateWithVersion(clubId);
    res.json({ ...state, serverVersion: version });
  } catch (error) {
    sendRouteError(res, error);
  }
});

app.get("/state/:clubId/version", requireAuth, async (req, res) => {
  try {
    const { clubId } = clubIdSchema.parse(req.params);
    if (!enforceClubAccess(req, res, clubId)) return;
    const version = await readStateVersion(clubId);
    res.json({ serverVersion: version });
  } catch (error) {
    sendRouteError(res, error);
  }
});

app.put("/state/:clubId", requireAuth, async (req, res) => {
  try {
    const { clubId } = clubIdSchema.parse(req.params);
    if (!enforceClubAccess(req, res, clubId)) return;
    const parsed = stateSchema.parse(req.body);
    await writeState(clubId, parsed.state, parsed.expectedVersion);
    const { state, version } = await readStateWithVersion(clubId);
    res.json({ ...state, serverVersion: version });
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

app.get("/clubs/:clubId/settings", requireAuth, async (req, res) => {
  try {
    const { clubId } = clubIdSchema.parse(req.params);
    if (!enforceClubAccess(req, res, clubId)) return;
    const state = await readState(clubId);
    res.json(state.clubSettings);
  } catch (error) {
    sendRouteError(res, error);
  }
});

app.put("/clubs/:clubId/settings", requireAuth, async (req, res) => {
  try {
    const { clubId } = clubIdSchema.parse(req.params);
    if (!enforceClubAccess(req, res, clubId)) return;
    const parsedSettings = settingsBodySchema.parse(req.body || {});
    const state = await readState(clubId);
    const nextState = {
      ...state,
      clubSettings: {
        ...state.clubSettings,
        ...parsedSettings,
      },
    };
    await writeState(clubId, nextState);
    res.json(nextState.clubSettings);
  } catch (error) {
    sendRouteError(res, error);
  }
});

app.get("/api/:clubId/:resource", requireAuth, async (req, res) => {
  try {
    const { clubId } = clubIdSchema.parse(req.params);
    if (!enforceClubAccess(req, res, clubId)) return;
    const state = await readState(clubId);
    const key = resourceMap[req.params.resource];
    if (!key) return res.status(404).json({ error: "resource not found" });
    res.json(state[key] || []);
  } catch (error) {
    sendRouteError(res, error);
  }
});

app.post("/api/:clubId/:resource", requireAuth, async (req, res) => {
  try {
    const { clubId } = clubIdSchema.parse(req.params);
    if (!enforceClubAccess(req, res, clubId)) return;
    const key = resourceMap[req.params.resource];
    if (!key) return res.status(404).json({ error: "resource not found" });

    const state = await readState(clubId);
    const item = req.body || {};
    const nextState = { ...state, [key]: [item, ...(state[key] || [])] };

    await writeState(clubId, nextState);
    res.status(201).json(item);
  } catch (error) {
    sendRouteError(res, error);
  }
});

app.put("/api/:clubId/:resource/:id", requireAuth, async (req, res) => {
  try {
    const { clubId } = clubIdSchema.parse(req.params);
    if (!enforceClubAccess(req, res, clubId)) return;
    const { id } = idParamSchema.parse(req.params);
    const key = resourceMap[req.params.resource];
    if (!key) return res.status(404).json({ error: "resource not found" });

    const state = await readState(clubId);
    const next = (state[key] || []).map((item) =>
      item.id === id ? { ...item, ...(req.body || {}) } : item
    );
    const nextState = { ...state, [key]: next };

    await writeState(clubId, nextState);
    const updated = next.find((item) => item.id === id);
    res.json(updated || null);
  } catch (error) {
    sendRouteError(res, error);
  }
});

app.delete("/api/:clubId/:resource/:id", requireAuth, async (req, res) => {
  try {
    const { clubId } = clubIdSchema.parse(req.params);
    if (!enforceClubAccess(req, res, clubId)) return;
    const { id } = idParamSchema.parse(req.params);
    const key = resourceMap[req.params.resource];
    if (!key) return res.status(404).json({ error: "resource not found" });

    const state = await readState(clubId);
    const nextState = {
      ...state,
      [key]: (state[key] || []).filter((item) => item.id !== id),
    };
    await writeState(clubId, nextState);
    res.status(204).send();
  } catch (error) {
    sendRouteError(res, error);
  }
});

app.post("/shifts/:id/close", requireAuth, async (req, res) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const { clubId, patch } = closeShiftBodySchema.parse(req.body || {});
    if (!enforceClubAccess(req, res, clubId)) return;
    const state = await readState(clubId);
    const updatedShifts = state.shifts.map((shift) =>
      shift.id === id
        ? { ...shift, isClosed: true, ...(patch || {}) }
        : shift
    );
    const nextState = { ...state, shifts: updatedShifts };
    await writeState(clubId, nextState);
    res.json(updatedShifts.find((s) => s.id === id) || null);
  } catch (error) {
    sendRouteError(res, error);
  }
});

app.post("/events/:id/archive", requireAuth, async (req, res) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const { clubId } = archiveEventBodySchema.parse(req.body || {});
    if (!enforceClubAccess(req, res, clubId)) return;
    const state = await readState(clubId);
    const updatedEvents = state.events.map((event) =>
      event.id === id ? { ...event, isArchived: true } : event
    );
    const nextState = { ...state, events: updatedEvents };
    await writeState(clubId, nextState);
    res.json(updatedEvents.find((e) => e.id === id) || null);
  } catch (error) {
    sendRouteError(res, error);
  }
});

export default app;
