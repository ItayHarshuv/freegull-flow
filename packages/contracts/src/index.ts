import { z } from 'zod';

export const sortDirectionSchema = z.enum(['asc', 'desc']);

export const listParamsSchema = z.object({
  cursor: z.string().optional(),
  limit: z.number().int().positive().max(100).default(50),
  sort: sortDirectionSchema.default('desc'),
});

export const cursorPageSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    nextCursor: z.string().nullable(),
  });

export const userRoleSchema = z.enum(['manager', 'shift-manager', 'instructor', 'warehouse', 'shop']);

export const userProfileSchema = z.object({
  id: z.string(),
  clubId: z.string(),
  name: z.string().min(1),
  email: z.string().email(),
  role: userRoleSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  archivedAt: z.string().datetime().nullable().optional(),
});

export const dashboardSummarySchema = z.object({
  activeUsers: z.number().int().nonnegative(),
  scheduledLessons: z.number().int().nonnegative(),
  openTasks: z.number().int().nonnegative(),
  openLeads: z.number().int().nonnegative(),
});

export const lessonStatusSchema = z.enum(['scheduled', 'completed', 'cancelled']);

export const lessonListItemSchema = z.object({
  id: z.string(),
  clientName: z.string().min(1),
  date: z.string(),
  time: z.string(),
  instructorName: z.string().min(1),
  status: lessonStatusSchema,
});

export const loginSchema = z.object({
  identifier: z.string().email(),
  pin: z.string().min(4).max(12),
});

export type UserProfile = z.infer<typeof userProfileSchema>;
export type DashboardSummary = z.infer<typeof dashboardSummarySchema>;
export type LessonListItem = z.infer<typeof lessonListItemSchema>;
export type ListParams = z.infer<typeof listParamsSchema>;
