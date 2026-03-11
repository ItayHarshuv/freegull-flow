<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1xA6Y69-SEdwfjjeXD0neqtvD4UE6vnTp

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Start the frontend:
   `npm run dev`

## PostgreSQL Migration Runtime

This repo now includes a backend service in `backend/` for PostgreSQL persistence.

1. In a separate terminal:
   - `cd backend`
   - `npm install`
   - `cp .env.example .env`
   - set `DATABASE_URL` in `.env`
2. Run DB migrations:
   - `npm run migrate`
3. Optional one-time import from existing jsonblob:
   - `npm run import:blob`
4. Start backend:
   - `npm run dev`

Frontend reads/writes through `VITE_API_BASE_URL` (defaults to `http://localhost:4000`).

## Rebuild Workspace

This repo is being migrated to a shared web + Capacitor architecture:

- `apps/web`: new Vite + React shell
- `apps/api`: new Hono API
- `apps/mobile`: Capacitor wrapper
- `packages/contracts`, `packages/db`, `packages/ui`: shared packages

The current root Vite app remains as the legacy client during migration.

## Vercel Deployment

Vercel deployment is set up as two separate projects from the same repo:

- web: `apps/web`
- api: `apps/api`

See [docs/vercel-deploy.md](docs/vercel-deploy.md) for the exact settings.

## Docker (Frontend + Backend + Postgres)

Run all services locally with Docker Compose:

1. From project root:
   - `docker compose up --build`
2. Open:
   - Frontend: `http://localhost:3000`
   - Backend health: `http://localhost:4000/health`
   - Postgres: `localhost:5432` (`postgres` / `postgres`, db: `freegull_flow`)

Stop services:

- `docker compose down`

If you also want to remove database volume data:

- `docker compose down -v`

## TODO
[ ] random refrshes
[ ] lessons, creating event, creating a task - gives bad request
[ ] in rentals - it shows paid even when it is not
[ ] events doesnt show the people in primary operator.
[ ] make the tables in payrollopenable and closed
[ ] in knowledge page, it doesnt really upload anything
[ ] maintenance page necesery?
