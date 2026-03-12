# Deploying on Vercel

This repo should be deployed to Vercel as two separate projects from the same repository:

- `freegull-web` for `apps/web`
- `freegull-api` for `apps/api`

The Capacitor mobile shell is not deployed to Vercel. Vercel hosts the shared web app and API; iOS/Android builds consume the same web codebase separately.

## Important Monorepo Setting

Because `apps/web` and `apps/api` import shared code from `packages/*`, enable:

- `Include source files outside of the Root Directory in the Build Step`

Vercel documents this requirement for monorepos with shared packages.

## Project 1: Web

- Root Directory: `apps/web`
- Framework Preset: `Vite`
- Install Command: leave auto-detected, or set `corepack pnpm install --frozen-lockfile`
- Build Command: `corepack pnpm build`
- Output Directory: `dist`
- Node.js Version: `20.x`

### Environment Variables

- `VITE_API_BASE_URL=https://<your-api-project>.vercel.app`
- For Preview deploys, this can point at the API preview URL or a stable staging API URL.

### Routing

`apps/web/vercel.json` already includes the SPA rewrite required for direct deep links.

## Project 2: API

- Root Directory: `apps/api`
- Framework Preset: `Hono` if shown, otherwise `Other` with auto-detection enabled
- Install Command: leave auto-detected, or set `corepack pnpm install --frozen-lockfile`
- Build Command: leave empty
- Output Directory: leave empty
- Node.js Version: `20.x`

### Environment Variables

- `DATABASE_URL=...`
- `FRONTEND_ORIGIN=https://<your-web-project>.vercel.app`
- `ALLOW_EMAIL_LOGIN=true` if email login should be enabled
- `AUTH_COOKIE_CROSS_SITE=true` if you need cross-site auth cookies outside normal production detection
- Add any future auth/session secrets before enabling login flows in production.

If `FRONTEND_ORIGIN` is set to a Vercel web URL such as `https://freegull-flow-web.vercel.app`, the API also accepts preview deploy URLs for that same web project automatically.

### Hono Entrypoint

This API is deployed with Hono's normal Vercel entrypoint:

- `apps/api/src/index.ts`

Vercel should serve the Hono app directly from the project root, so routes like `/auth/me`, `/state/:clubId`, and `/health` are handled without an extra `api/` wrapper or rewrite.

### Required Vercel Project Setting

Because this API imports files outside `apps/api`:

- enable `Include source files outside of the Root Directory in the Build Step`

## Recommended Deployment Order

1. Deploy `freegull-api`
2. Copy the API production URL
3. Set `VITE_API_BASE_URL` on `freegull-web`
4. Deploy `freegull-web`

## Quick Verification

After deploying the API project, check these before connecting the web app:

- `https://<api-domain>/health` returns JSON
- `https://<api-domain>/auth/me?clubId=FREEGULL_MAIN` returns a JSON `401` when called without a session

If either URL returns a Vercel `NOT_FOUND` page, the project is not serving the Hono app yet. In that case, confirm the API project root directory is `apps/api` and redeploy.

## CLI Option

If you prefer the CLI, link and deploy each project from its app directory after signing into Vercel:

- `cd apps/api && vercel`
- `cd apps/web && vercel`

For repeated CI-style deploys, Vercel also supports `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID`.
