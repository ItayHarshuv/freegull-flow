# Backend (PostgreSQL API)

## Prerequisites

- PostgreSQL running locally or remotely
- Node.js 20+

## Setup

1. Copy `.env.example` to `.env` and update values.
2. Install dependencies:
   - `npm install`
3. Run migrations:
   - `npm run migrate`
4. Import existing JSON blob data (one-time):
   - `npm run import:blob`
5. Start backend:
   - `npm run dev`

## Docker Compose

From repo root, run:

- `docker compose up --build`

This starts Postgres, runs backend migrations, starts backend on `:4000`, and frontend on `:3000`.

## API

- `GET /health`
- `GET /state/:clubId`
- `PUT /state/:clubId`
- `GET/PUT /clubs/:clubId/settings`
- CRUD:
  - `/api/:clubId/users`
  - `/api/:clubId/shifts`
  - `/api/:clubId/lessons`
  - `/api/:clubId/rentals`
  - `/api/:clubId/tasks`
  - `/api/:clubId/leads`
  - `/api/:clubId/availability`
  - `/api/:clubId/events`
  - `/api/:clubId/templates`
  - `/api/:clubId/knowledge-files`
- Specialized actions:
  - `POST /shifts/:id/close`
  - `POST /events/:id/archive`
