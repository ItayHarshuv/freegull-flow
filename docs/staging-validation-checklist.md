# Staging Validation Checklist

## Environment

- Backend `.env` configured with staging `DATABASE_URL`.
- Migrations run successfully (`backend npm run migrate`).
- One-time data import completed (`backend npm run import:blob`) when needed.
- Frontend has `VITE_API_BASE_URL` pointed to staging backend.

## Critical Flows

- Login by email and quick code works.
- Add/update/archive user persists after refresh.
- Start shift and end shift persists after refresh.
- Add lesson, edit lesson, delete lesson persists.
- Add rental, update rental return status persists.
- Add task, assign users, move status between columns persists.
- Add lead, update lead, delete lead persists.
- Save availability in bulk and verify no duplicate day per user.
- Create event, manage participants/boats, archive event.
- Update WhatsApp templates and knowledge files.
- Edit club settings and verify header data updates after refresh.

## Safety Checks

- Verify failed backend response sets UI sync status to error.
- Verify backend health endpoint (`/health`) returns `{ ok: true }`.
- Verify a DB backup exists before production cutover.
- Verify rollback path: switch frontend back to old sync endpoint if needed.
