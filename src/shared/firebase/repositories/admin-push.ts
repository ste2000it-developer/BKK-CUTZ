import { deleteDoc, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../client";

const DEVICE_KEY = "bkk_admin_push_device_id";
const ENABLED_KEY = "bkk_admin_push_enabled";

function randomDeviceId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
}

export function adminPushDeviceId(): string {
  const existing = window.localStorage.getItem(DEVICE_KEY)?.trim();
  if (existing) return existing;
  const created = randomDeviceId();
  window.localStorage.setItem(DEVICE_KEY, created);
  return created;
}

export function adminPushPreferenceEnabled(): boolean {
  return window.localStorage.getItem(ENABLED_KEY) === "1";
}

export function setAdminPushPreference(enabled: boolean) {
  if (enabled) window.localStorage.setItem(ENABLED_KEY, "1");
  else window.localStorage.removeItem(ENABLED_KEY);
}

function deviceDocumentId(uid: string, deviceId: string) {
  return `${uid}_${deviceId}`;
}

export async function saveAdminPushDevice(uid: string, fid: string) {
  const deviceId = adminPushDeviceId();
  const id = deviceDocumentId(uid, deviceId);
  await setDoc(doc(db, "admin_push_devices", id), {
    uid,
    deviceId,
    fid,
    active: true,
    platform: navigator.platform || "web",
    userAgent: navigator.userAgent,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function removeAdminPushDevice(uid: string) {
  const deviceId = adminPushDeviceId();
  await deleteDoc(doc(db, "admin_push_devices", deviceDocumentId(uid, deviceId)));
}
