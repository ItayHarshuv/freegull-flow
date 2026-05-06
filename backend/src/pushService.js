import webpush from "web-push";

let vapidConfigured = false;
let vapidEnabled = false;

function readVapidConfig() {
  const publicKey = process.env.VAPID_PUBLIC_KEY || "";
  const privateKey = process.env.VAPID_PRIVATE_KEY || "";
  const subject = process.env.VAPID_SUBJECT || "";
  const enabled = Boolean(publicKey && privateKey && subject);
  return { enabled, publicKey, privateKey, subject };
}

function ensureVapidConfigured() {
  if (vapidConfigured) return;
  vapidConfigured = true;
  const cfg = readVapidConfig();
  vapidEnabled = cfg.enabled;
  if (!cfg.enabled) return;
  webpush.setVapidDetails(cfg.subject, cfg.publicKey, cfg.privateKey);
}

export function isPushEnabled() {
  ensureVapidConfigured();
  return vapidEnabled;
}

export function getVapidPublicKey() {
  ensureVapidConfigured();
  const cfg = readVapidConfig();
  return cfg.publicKey || "";
}

export async function sendWebPush({ endpoint, p256dh, auth }, payload) {
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
  } catch (error) {
    const statusCode =
      typeof error?.statusCode === "number" ? error.statusCode : null;
    return { ok: false, statusCode, error: error?.message || String(error) };
  }
}

