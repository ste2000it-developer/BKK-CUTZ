import { getMessaging, isSupported, onMessage, onRegistered, register, unregister, type MessagePayload, type Messaging } from "firebase/messaging";
import { app } from "./client";
import { adminPushDeviceId, adminPushPreferenceEnabled, removeAdminPushDevice, saveAdminPushDevice, setAdminPushPreference } from "./repositories/admin-push";

export type AdminPushState = "unsupported" | "blocked" | "available" | "enabling" | "enabled" | "error";

let messagingPromise: Promise<Messaging | null> | null = null;

async function messagingInstance(): Promise<Messaging | null> {
  if (!messagingPromise) {
    messagingPromise = (async () => {
      if (!(await isSupported())) return null;
      return getMessaging(app);
    })();
  }
  return messagingPromise;
}

function serviceWorkerUrl() {
  const url = new URL(`${import.meta.env.BASE_URL}firebase-messaging-sw.js`, window.location.origin);
  const values: Record<string, string | undefined> = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  };
  for (const [key, value] of Object.entries(values)) if (value) url.searchParams.set(key, value);
  return url;
}

async function messagingWorker() {
  const registration = await navigator.serviceWorker.register(serviceWorkerUrl(), { scope: import.meta.env.BASE_URL });
  await navigator.serviceWorker.ready;
  return registration;
}

function waitForAdminRegistration(messaging: Messaging, uid: string) {
  let stop: () => void = () => {};
  const saved = new Promise<void>((resolve, reject) => {
    let settled = false;
    stop = onRegistered(messaging, (fid) => {
      void saveAdminPushDevice(uid, fid).then(() => {
        if (settled) return;
        settled = true;
        resolve();
      }).catch((issue: unknown) => {
        if (settled) return;
        settled = true;
        reject(issue);
      });
    });
  });

  const timeout = new Promise<never>((_, reject) => {
    window.setTimeout(() => reject(new Error("ลงทะเบียนเครื่องรับแจ้งเตือนไม่สำเร็จ กรุณาลองใหม่")), 15000);
  });

  return {
    wait: () => Promise.race([saved, timeout]),
    stop: () => stop(),
  };
}

export async function adminPushAvailability(): Promise<AdminPushState> {
  if (!window.isSecureContext || !("serviceWorker" in navigator) || !("Notification" in window)) return "unsupported";
  if (!(await isSupported())) return "unsupported";
  if (Notification.permission === "denied") return "blocked";
  if (adminPushPreferenceEnabled() && Notification.permission === "granted") return "enabled";
  return "available";
}

export async function enableAdminPush(uid: string): Promise<void> {
  if (!window.isSecureContext) throw new Error("ต้องเปิด Admin ผ่าน HTTPS เพื่อใช้แจ้งเตือนมือถือ");
  if (!("Notification" in window)) throw new Error("เบราว์เซอร์นี้ไม่รองรับ Push Notification");

  // iPhone/iPad requires the permission prompt to be triggered directly from
  // the user's tap. Do this before any async Firebase/service-worker work.
  if (Notification.permission === "denied") {
    throw new Error("การแจ้งเตือนถูกบล็อก กรุณาอนุญาต Notification ในการตั้งค่าของเครื่อง");
  }
  if (Notification.permission !== "granted") {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") throw new Error("ยังไม่ได้อนุญาตการแจ้งเตือนบนเครื่องนี้");
  }

  const messaging = await messagingInstance();
  if (!messaging) throw new Error("เบราว์เซอร์นี้ไม่รองรับ Push Notification");
  const sw = await messagingWorker();
  const registration = waitForAdminRegistration(messaging, uid);

  try {
    const vapidKey = String(import.meta.env.VITE_FIREBASE_VAPID_KEY || "").trim();
    await register(messaging, { serviceWorkerRegistration: sw, ...(vapidKey ? { vapidKey } : {}) });
    await registration.wait();
    setAdminPushPreference(true);
  } finally {
    registration.stop();
  }
}

export async function disableAdminPush(uid: string): Promise<void> {
  const messaging = await messagingInstance();
  try {
    if (messaging) await unregister(messaging);
  } finally {
    await removeAdminPushDevice(uid).catch(() => undefined);
    setAdminPushPreference(false);
  }
}

export async function refreshAdminPush(uid: string): Promise<void> {
  if (!adminPushPreferenceEnabled() || Notification.permission !== "granted") return;
  await enableAdminPush(uid);
}

export async function watchForegroundAdminPush(next: (payload: MessagePayload) => void): Promise<() => void> {
  const messaging = await messagingInstance();
  if (!messaging) return () => undefined;
  return onMessage(messaging, next);
}

export function showForegroundAdminPush(payload: MessagePayload) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const data = payload.data || {};
  const title = data.title || payload.notification?.title || "BKK-CUTZ";
  const body = data.body || payload.notification?.body || "มีการแจ้งเตือนใหม่";
  const options: NotificationOptions = {
    body,
    tag: data.tag || `bkk-admin-${adminPushDeviceId()}`,
    data: { url: new URL("admin.html", document.baseURI).href },
  };

  // Service-worker notifications are reliable on iOS Home Screen web apps.
  if ("serviceWorker" in navigator) {
    void navigator.serviceWorker.ready
      .then((registration) => registration.showNotification(title, options))
      .catch(() => undefined);
    return;
  }

  try {
    new Notification(title, options);
  } catch {
    // Some mobile browsers only allow service-worker notifications.
  }
}
