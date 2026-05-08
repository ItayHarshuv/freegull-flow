import webpush from "web-push";

interface VapidConfig {
  enabled: boolean;
  publicKey: string;
  privateKey: string;
  subject: string;
}

export interface PushKeys {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export type PushPayload = Record<string, unknown>;

export type WebPushResult =
  | { ok: true; statusCode: number }
  | { ok: false; statusCode: number | null; error: string };

let vapidConfigured = false;
let vapidEnabled = false;

function readVapidConfig(): VapidConfig {
  const publicKey = process.env.VAPID_PUBLIC_KEY || "";
  const privateKey = process.env.VAPID_PRIVATE_KEY || "";
  const subject = process.env.VAPID_SUBJECT || "";
  const enabled = Boolean(publicKey && privateKey && subject);
  return { enabled, publicKey, privateKey, subject };
}

function ensureVapidConfigured(): void {
  if (vapidConfigured) return;
  vapidConfigured = true;
  const cfg = readVapidConfig();
  vapidEnabled = cfg.enabled;
  if (!cfg.enabled) return;
  webpush.setVapidDetails(cfg.subject, cfg.publicKey, cfg.privateKey);
}

export function isPushEnabled(): boolean {
  ensureVapidConfigured();
  return vapidEnabled;
}

export function getVapidPublicKey(): string {
  ensureVapidConfigured();
  const cfg = readVapidConfig();
  return cfg.publicKey || "";
}

export async function sendWebPush(
  { endpoint, p256dh, auth }: PushKeys,
  payload: PushPayload
): Promise<WebPushResult> {
  ensureVapidConfigured();
  if (!vapidEnabled) {
    return { ok: false, statusCode: null, error: "push_disabled" };
  }

  try {
    await webpush.sendNotification(
      {
        endpoint,
        keys: { p256dh, auth },
      },
      JSON.stringify(payload)
    );
    return { ok: true, statusCode: 201 };
  } catch (error: unknown) {
    const errorWithStatus = error as { statusCode?: unknown; message?: unknown };
    const statusCode =
      typeof errorWithStatus?.statusCode === "number"
        ? errorWithStatus.statusCode
        : null;
    const message =
      typeof errorWithStatus?.message === "string"
        ? errorWithStatus.message
        : String(error);
    return { ok: false, statusCode, error: message };
  }
}
