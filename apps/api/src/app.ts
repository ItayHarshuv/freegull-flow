import { Hono } from 'hono';
import { dashboardSummarySchema, lessonListItemSchema, listParamsSchema, userProfileSchema } from '@freegull-flow/contracts';

const app = new Hono();

app.get('/health', (c) => c.json({ ok: true }));

app.get('/api/v1/clubs/:clubId/dashboard', (c) => {
  const payload = dashboardSummarySchema.parse({
    activeUsers: 18,
    scheduledLessons: 24,
    openTasks: 6,
    openLeads: 11,
  });

  return c.json(payload);
});

app.get('/api/v1/clubs/:clubId/users', (c) => {
  const users = [
    userProfileSchema.parse({
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
  const query = listParamsSchema.parse({
    cursor: c.req.query('cursor') ?? undefined,
    limit: c.req.query('limit') ? Number(c.req.query('limit')) : undefined,
    sort: c.req.query('sort') ?? undefined,
  });

  const items = [
    lessonListItemSchema.parse({
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
