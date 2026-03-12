import crypto from 'node:crypto';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { z } from 'zod';

const AUTH_COOKIE_NAME = 'freegull_session';
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14;
const allowEmailLogin = process.env.ALLOW_EMAIL_LOGIN === 'true';
const defaultFrontendOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
  'https://freegull-flow-web-itayharshuv-itay-har-shuvs-projects.vercel.app',
].join(',');
const allowedOrigins = (process.env.FRONTEND_ORIGIN || defaultFrontendOrigins)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
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
      if (url.protocol !== 'https:' || !url.hostname.endsWith('.vercel.app')) {
        return null;
      }

      return url.hostname.slice(0, -'.vercel.app'.length);
    } catch {
      return null;
    }
  })
  .filter((prefix): prefix is string => Boolean(prefix));

function isAllowedOrigin(origin: string) {
  let url: URL;

  try {
    url = new URL(origin);
  } catch {
    return false;
  }

  if (allowedOriginSet.has(url.origin)) {
    return true;
  }

  if (url.protocol !== 'https:' || !url.hostname.endsWith('.vercel.app')) {
    return false;
  }

  const candidatePrefix = url.hostname.slice(0, -'.vercel.app'.length);
  return vercelPreviewPrefixes.some(
    (prefix) => candidatePrefix === prefix || candidatePrefix.startsWith(`${prefix}-`)
  );
}

const clubIdSchema = z.object({ clubId: z.string().min(1) });
const stateSchema = z.object({
  state: z.record(z.string(), z.any()),
  expectedVersion: z.number().int().nonnegative().optional(),
});
const loginBodySchema = z.object({
  clubId: z.string().min(1),
  identifier: z.string().min(1),
});
const meQuerySchema = z.object({
  clubId: z.string().min(1).optional(),
});
const demoDashboardSummarySchema = z.object({
  activeUsers: z.number().int().nonnegative(),
  scheduledLessons: z.number().int().nonnegative(),
  openTasks: z.number().int().nonnegative(),
  openLeads: z.number().int().nonnegative(),
});
const demoUserProfileSchema = z.object({
  id: z.string().min(1),
  clubId: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
  role: z.string().min(1),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});
const demoListParamsSchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.number().int().positive().max(100).optional(),
  sort: z.string().min(1).optional(),
});
const demoLessonListItemSchema = z.object({
  id: z.string().min(1),
  clientName: z.string().min(1),
  date: z.string().min(1),
  time: z.string().min(1),
  instructorName: z.string().min(1),
  status: z.string().min(1),
});

type AuthContext = {
  clubId: string;
  userId: string;
  token: string;
};

type LegacyDbModule = typeof import('../../../backend/src/db.js');
type LegacyStateRepositoryModule = typeof import('../../../backend/src/stateRepository.js');

const app = new Hono<{ Variables: { auth: AuthContext } }>();

app.onError((error, c) => {
  console.error(error);
  return c.json({ error: 'Internal Server Error' }, 500);
});

app.use(
  '*',
  cors({
    origin: (origin) => {
      if (!origin) return '';
      return isAllowedOrigin(origin) ? origin : '';
    },
    credentials: true,
  })
);

app.get('/health', (c) => c.json({ ok: true }));

let legacyDbModulePromise: Promise<LegacyDbModule> | null = null;
let legacyStateRepositoryPromise: Promise<LegacyStateRepositoryModule> | null = null;

function getLegacyDbModule() {
  if (!legacyDbModulePromise) {
    legacyDbModulePromise = import('../../../backend/src/db.js');
  }

  return legacyDbModulePromise;
}

function getLegacyStateRepositoryModule() {
  if (!legacyStateRepositoryPromise) {
    legacyStateRepositoryPromise = import('../../../backend/src/stateRepository.js');
  }

  return legacyStateRepositoryPromise;
}

async function getPool() {
  const module = await getLegacyDbModule();
  return module.pool;
}

function hashSessionToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function buildCookieOptions() {
  const isProduction = process.env.NODE_ENV === 'production';
  const isCrossSite = isProduction || process.env.AUTH_COOKIE_CROSS_SITE === 'true';

  return {
    httpOnly: true,
    sameSite: isCrossSite ? ('None' as const) : ('Lax' as const),
    secure: isCrossSite,
    maxAge: SESSION_TTL_MS / 1000,
    path: '/',
  };
}

function mapUserRow(row: Record<string, any>) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    role: row.role,
    avatar: row.avatar || '',
    certifications: Array.isArray(row.certifications) ? row.certifications.filter(Boolean) : [],
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

async function readUserByIdentifier(clubId: string, identifier: string) {
  const normalizedIdentifier = identifier.trim();
  const pool = await getPool();
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

async function readUserById(clubId: string, userId: string) {
  const pool = await getPool();
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

async function createSession(clubId: string, userId: string, userAgent: string | null, ipAddress: string | null) {
  const sessionToken = crypto.randomBytes(48).toString('base64url');
  const tokenHash = hashSessionToken(sessionToken);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  const pool = await getPool();

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

async function readSessionFromToken(sessionToken: string) {
  const tokenHash = hashSessionToken(sessionToken);
  const pool = await getPool();
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

async function revokeSession(sessionToken: string) {
  const tokenHash = hashSessionToken(sessionToken);
  const pool = await getPool();

  await pool.query(
    `
      UPDATE auth_sessions
      SET revoked_at = NOW()
      WHERE token_hash = $1
    `,
    [tokenHash]
  );
}

async function requireAuth(c: any, next: any) {
  const sessionToken = getCookie(c, AUTH_COOKIE_NAME);
  if (!sessionToken) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const session = await readSessionFromToken(sessionToken);
  if (!session) {
    deleteCookie(c, AUTH_COOKIE_NAME, buildCookieOptions());
    return c.json({ error: 'Unauthorized' }, 401);
  }

  c.set('auth', {
    clubId: session.club_id,
    userId: session.user_id,
    token: sessionToken,
  } satisfies AuthContext);

  const pool = await getPool();
  await pool.query(
    `
      UPDATE auth_sessions
      SET last_seen_at = NOW()
      WHERE token_hash = $1
    `,
    [session.token_hash]
  );

  return next();
}

function enforceClubAccess(c: any, clubId: string) {
  const auth = c.get('auth');
  if (auth?.clubId !== clubId) {
    return c.json({ error: 'Forbidden: invalid club scope' }, 403);
  }

  return null;
}

app.post('/auth/login', async (c) => {
  const { clubId, identifier } = loginBodySchema.parse(await c.req.json());
  const user = await readUserByIdentifier(clubId, identifier);

  if (!user) {
    return c.json({ error: 'Invalid credentials' }, 401);
  }

  const sessionToken = await createSession(
    clubId,
    user.id,
    c.req.header('user-agent') || null,
    c.req.header('x-forwarded-for') || null
  );

  setCookie(c, AUTH_COOKIE_NAME, sessionToken, buildCookieOptions());
  return c.json({ user: mapUserRow(user), clubId });
});

app.get('/auth/me', requireAuth, async (c) => {
  const query = meQuerySchema.parse(c.req.query());
  const auth = c.get('auth') as AuthContext;
  const clubId = query.clubId || auth.clubId;
  const denied = enforceClubAccess(c, clubId);
  if (denied) return denied;

  const user = await readUserById(clubId, auth.userId);
  if (!user) {
    deleteCookie(c, AUTH_COOKIE_NAME, buildCookieOptions());
    return c.json({ error: 'Unauthorized' }, 401);
  }

  return c.json({ user: mapUserRow(user), clubId });
});

app.post('/auth/logout', requireAuth, async (c) => {
  const auth = c.get('auth') as AuthContext;
  await revokeSession(auth.token);
  deleteCookie(c, AUTH_COOKIE_NAME, buildCookieOptions());
  return c.body(null, 204);
});

app.get('/state/:clubId', requireAuth, async (c) => {
  const { clubId } = clubIdSchema.parse(c.req.param());
  const denied = enforceClubAccess(c, clubId);
  if (denied) return denied;

  const { readStateWithVersion } = await getLegacyStateRepositoryModule();
  const { state, version } = await readStateWithVersion(clubId);
  return c.json({ ...state, serverVersion: version });
});

app.get('/state/:clubId/version', requireAuth, async (c) => {
  const { clubId } = clubIdSchema.parse(c.req.param());
  const denied = enforceClubAccess(c, clubId);
  if (denied) return denied;

  const { readStateVersion } = await getLegacyStateRepositoryModule();
  const version = await readStateVersion(clubId);
  return c.json({ serverVersion: version });
});

app.put('/state/:clubId', requireAuth, async (c) => {
  const { clubId } = clubIdSchema.parse(c.req.param());
  const denied = enforceClubAccess(c, clubId);
  if (denied) return denied;

  const parsed = stateSchema.parse(await c.req.json());
  const { StateVersionConflictError, readStateWithVersion, writeState } = await getLegacyStateRepositoryModule();

  try {
    await writeState(clubId, parsed.state, parsed.expectedVersion);
    const { state, version } = await readStateWithVersion(clubId);
    return c.json({ ...state, serverVersion: version });
  } catch (error) {
    if (error instanceof StateVersionConflictError) {
      const { state, version } = await readStateWithVersion(clubId);
      return c.json(
        {
          error: 'State version conflict',
          serverVersion: version,
          state,
        },
        409
      );
    }

    throw error;
  }
});

app.get('/api/v1/clubs/:clubId/dashboard', (c) => {
  const payload = demoDashboardSummarySchema.parse({
    activeUsers: 18,
    scheduledLessons: 24,
    openTasks: 6,
    openLeads: 11,
  });

  return c.json(payload);
});

app.get('/api/v1/clubs/:clubId/users', (c) => {
  const users = [
    demoUserProfileSchema.parse({
      id: 'user_1',
      clubId: c.req.param('clubId'),
      name: 'שחר',
      email: 'shahar@example.com',
      role: 'manager',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
  ];

  return c.json({ items: users, nextCursor: null });
});

app.get('/api/v1/clubs/:clubId/lessons', (c) => {
  const query = demoListParamsSchema.parse({
    cursor: c.req.query('cursor') ?? undefined,
    limit: c.req.query('limit') ? Number(c.req.query('limit')) : undefined,
    sort: c.req.query('sort') ?? undefined,
  });

  const items = [
    demoLessonListItemSchema.parse({
      id: 'lesson_1',
      clientName: 'עומר ישראלי',
      date: '2026-03-09',
      time: '10:00',
      instructorName: 'שחר',
      status: 'scheduled',
    }),
  ];

  return c.json({ items: items.slice(0, query.limit ?? 50), nextCursor: null });
});

export default app;
