import cors from "cors";
import express from "express";
import { ZodError, z } from "zod";
import { readState, writeState } from "./stateRepository.js";
import { pool } from "./db.js";

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

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
const stateSchema = z.object({ state: z.record(z.string(), z.any()) });
const idParamSchema = z.object({ id: z.string().min(1) });
const settingsBodySchema = z.record(z.string(), z.any());
const closeShiftBodySchema = z.object({
  clubId: z.string().min(1, "clubId is required"),
  patch: z.record(z.string(), z.any()).optional(),
});
const archiveEventBodySchema = z.object({
  clubId: z.string().min(1, "clubId is required"),
});

function sendRouteError(res, error) {
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

app.get("/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/state/:clubId", async (req, res) => {
  try {
    const { clubId } = clubIdSchema.parse(req.params);
    const state = await readState(clubId);
    res.json(state);
  } catch (error) {
    sendRouteError(res, error);
  }
});

app.put("/state/:clubId", async (req, res) => {
  try {
    const { clubId } = clubIdSchema.parse(req.params);
    const parsed = stateSchema.parse(req.body);
    await writeState(clubId, parsed.state);
    const fresh = await readState(clubId);
    res.json(fresh);
  } catch (error) {
    sendRouteError(res, error);
  }
});

app.get("/clubs/:clubId/settings", async (req, res) => {
  try {
    const { clubId } = clubIdSchema.parse(req.params);
    const state = await readState(clubId);
    res.json(state.clubSettings);
  } catch (error) {
    sendRouteError(res, error);
  }
});

app.put("/clubs/:clubId/settings", async (req, res) => {
  try {
    const { clubId } = clubIdSchema.parse(req.params);
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

app.get("/api/:clubId/:resource", async (req, res) => {
  try {
    const { clubId } = clubIdSchema.parse(req.params);
    const state = await readState(clubId);
    const key = resourceMap[req.params.resource];
    if (!key) return res.status(404).json({ error: "resource not found" });
    res.json(state[key] || []);
  } catch (error) {
    sendRouteError(res, error);
  }
});

app.post("/api/:clubId/:resource", async (req, res) => {
  try {
    const { clubId } = clubIdSchema.parse(req.params);
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

app.put("/api/:clubId/:resource/:id", async (req, res) => {
  try {
    const { clubId } = clubIdSchema.parse(req.params);
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

app.delete("/api/:clubId/:resource/:id", async (req, res) => {
  try {
    const { clubId } = clubIdSchema.parse(req.params);
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

app.post("/shifts/:id/close", async (req, res) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const { clubId, patch } = closeShiftBodySchema.parse(req.body || {});
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

app.post("/events/:id/archive", async (req, res) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const { clubId } = archiveEventBodySchema.parse(req.body || {});
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
