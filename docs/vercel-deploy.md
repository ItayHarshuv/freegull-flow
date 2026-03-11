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

### Routing

`apps/web/vercel.json` already includes the SPA rewrite required for direct deep links.

## Project 2: API

- Root Directory: `apps/api`
- Framework Preset: `Other`
- Install Command: leave auto-detected, or set `corepack pnpm install --frozen-lockfile`
- Build Command: leave empty unless you want `corepack pnpm build`
- Output Directory: leave empty
- Node.js Version: `20.x`

### Environment Variables

- `DATABASE_URL=...`
- Add any future auth/session secrets before enabling login flows in production.

### Hono Entrypoint

`apps/api/src/index.ts` exports the Hono app as the default export so Vercel can deploy it directly.

## Recommended Deployment Order

1. Deploy `freegull-api`
2. Copy the API production URL
3. Set `VITE_API_BASE_URL` on `freegull-web`
4. Deploy `freegull-web`

## CLI Option

If you prefer the CLI, link and deploy each project from its app directory after signing into Vercel:

- `cd apps/api && vercel`
- `cd apps/web && vercel`

For repeated CI-style deploys, Vercel also supports `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID`.
