const API_BASE_URL = ((import.meta as any).env?.VITE_API_BASE_URL || "http://localhost:4000").replace(
  /\/+$/,
  ""
);

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export function isWebPushSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return null;
  return navigator.serviceWorker.register("/sw.js");
}

async function isSubscriptionSavedOnServer({
  clubId,
  endpoint,
}: {
  clubId: string;
  endpoint: string;
}) {
  const params = new URLSearchParams({ endpoint });
  const res = await fetch(
    `${API_BASE_URL}/push/${encodeURIComponent(clubId)}/subscriptions/status?${params.toString()}`,
    { credentials: "include" }
  );
  if (!res.ok) return false;
  const payload = await res.json();
  return Boolean(payload?.subscribed);
}

export async function getPushStatus({ clubId }: { clubId?: string } = {}) {
  if (!isWebPushSupported()) {
    return { supported: false, permission: "default" as NotificationPermission, subscribed: false };
  }
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = reg ? await reg.pushManager.getSubscription() : null;
  if (!sub) {
    return { supported: true, permission: Notification.permission, subscribed: false };
  }

  const subscribed = clubId
    ? await isSubscriptionSavedOnServer({ clubId, endpoint: sub.endpoint })
    : true;
  return { supported: true, permission: Notification.permission, subscribed };
}

export async function enableManagerPush({ clubId }: { clubId: string }) {
  if (!isWebPushSupported()) throw new Error("Web Push not supported");

  const reg = (await navigator.serviceWorker.getRegistration()) || (await registerServiceWorker());
  if (!reg) throw new Error("Service worker registration failed");

  const vapidRes = await fetch(`${API_BASE_URL}/push/vapid-public-key`, { credentials: "include" });
  if (!vapidRes.ok) throw new Error("Failed to load VAPID public key");
  const vapidPayload = await vapidRes.json();
  if (!vapidPayload?.enabled || !vapidPayload?.publicKey) {
    throw new Error("Push is not enabled on server");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Notification permission not granted");

  const sub =
    (await reg.pushManager.getSubscription()) ||
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPayload.publicKey),
    }));

  const saveRes = await fetch(`${API_BASE_URL}/push/${encodeURIComponent(clubId)}/subscriptions`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subscription: sub.toJSON() }),
  });
  if (!saveRes.ok) {
    throw new Error(`Failed to save subscription (${saveRes.status})`);
  }
}

export async function disableManagerPush({ clubId }: { clubId: string }) {
  if (!isWebPushSupported()) return;
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = reg ? await reg.pushManager.getSubscription() : null;
  if (!sub) return;

  await fetch(`${API_BASE_URL}/push/${encodeURIComponent(clubId)}/subscriptions`, {
    method: "DELETE",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint: sub.endpoint }),
  }).catch(() => {});

  await sub.unsubscribe();
}

