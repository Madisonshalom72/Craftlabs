import { http } from "@/lib/api";

function urlB64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i);
  return out;
}

export async function isPushSupported() {
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export async function getPermissionState() {
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission; // "default" | "granted" | "denied"
}

async function getRegistration() {
  const reg = await navigator.serviceWorker.ready;
  return reg;
}

export async function isSubscribed() {
  if (!(await isPushSupported())) return false;
  const reg = await getRegistration();
  const sub = await reg.pushManager.getSubscription();
  return !!sub;
}

export async function subscribeToPush() {
  if (!(await isPushSupported())) throw new Error("Push not supported on this device");
  const perm = await Notification.requestPermission();
  if (perm !== "granted") throw new Error("Notification permission denied");
  const { data } = await http.get("/push/vapid-public");
  if (!data?.public_key) throw new Error("No VAPID key available");
  const reg = await getRegistration();
  const existing = await reg.pushManager.getSubscription();
  if (existing) {
    await http.post("/push/subscribe", existing.toJSON());
    return existing;
  }
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlB64ToUint8Array(data.public_key),
  });
  await http.post("/push/subscribe", sub.toJSON());
  return sub;
}

export async function unsubscribeFromPush() {
  const reg = await getRegistration();
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;
  try { await http.post("/push/unsubscribe", sub.toJSON()); } catch (e) { console.error("push unsubscribe API failed", e); }
  await sub.unsubscribe();
}

export async function sendTestPush() {
  await http.post("/push/test");
}
