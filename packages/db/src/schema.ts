import { integer, pgEnum, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

export const roleEnum = pgEnum('role', ['manager', 'shift-manager', 'instructor', 'warehouse', 'shop']);
export const lessonStatusEnum = pgEnum('lesson_status', ['scheduled', 'completed', 'cancelled']);

export const clubs = pgTable('clubs_new', {
  id: uuid('id').primaryKey(),
  name: varchar('name', { length: 120 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const users = pgTable('users_new', {
  id: uuid('id').primaryKey(),
  clubId: uuid('club_id').notNull(),
  name: varchar('name', { length: 120 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  role: roleEnum('role').notNull(),
  pinHash: text('pin_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const lessons = pgTable('lessons_new', {
  id: uuid('id').primaryKey(),
  clubId: uuid('club_id').notNull(),
  clientName: varchar('client_name', { length: 120 }).notNull(),
  date: varchar('date', { length: 20 }).notNull(),
  time: varchar('time', { length: 20 }).notNull(),
  instructorName: varchar('instructor_name', { length: 120 }).notNull(),
  status: lessonStatusEnum('status').default('scheduled').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const authSessions = pgTable('auth_sessions_new', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id').notNull(),
  clubId: uuid('club_id').notNull(),
  refreshTokenHash: text('refresh_token_hash').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
});

export const dashboardCounters = pgTable('dashboard_counters_new', {
  clubId: uuid('club_id').primaryKey(),
  activeUsers: integer('active_users').default(0).notNull(),
  scheduledLessons: integer('scheduled_lessons').default(0).notNull(),
  openTasks: integer('open_tasks').default(0).notNull(),
  openLeads: integer('open_leads').default(0).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
