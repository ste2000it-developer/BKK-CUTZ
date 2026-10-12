import { collection, doc, getDocs, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../client";
import { normalizeRfidUid } from "../../domain/rfid";

export type BarberRecord = {
  id: string;
  name: string;
  pin: string | number;
  rfidUid?: string;
  active: boolean;
  [field: string]: unknown;
};

export type BarberWrite = {
  name: string;
  pin: string;
  rfidUid?: string;
  active: boolean;
};

function toBarberRecord(id: string, data: Record<string, unknown>): BarberRecord {
  return {
    ...data,
    id,
    name: String(data.name || "").trim(),
    pin: typeof data.pin === "number" ? data.pin : String(data.pin || "").trim(),
    rfidUid: normalizeRfidUid(data.rfidUid),
    active: data.active === true,
  };
}

export async function listBarbers(): Promise<BarberRecord[]> {
  const snapshot = await getDocs(collection(db, "barbers"));
  return snapshot.docs
    .map((row) => toBarberRecord(row.id, row.data()))
    .sort((a, b) => {
      if (a.active !== b.active) return a.active ? -1 : 1;
      return a.name.localeCompare(b.name, "th");
    });
}

export async function saveBarber(barberId: string | null, input: BarberWrite): Promise<string> {
  const name = input.name.trim();
  const pin = input.pin.trim();
  const rfidUid = normalizeRfidUid(input.rfidUid);

  if (!name) throw new Error("กรุณาใส่ชื่อช่าง");
  if (!/^\d{4}$/.test(pin)) throw new Error("PIN ต้องเป็นตัวเลข 4 หลัก");

  const ref = barberId ? doc(db, "barbers", barberId) : doc(collection(db, "barbers"));
  const data: Record<string, unknown> = {
    name,
    pin,
    active: input.active,
    updatedAt: serverTimestamp(),
  };

  if (rfidUid) data.rfidUid = rfidUid;
  else data.rfidUid = "";
  if (!barberId) data.createdAt = serverTimestamp();

  await setDoc(ref, data, { merge: true });
  return ref.id;
}

export async function setBarberActive(barberId: string, active: boolean): Promise<void> {
  await setDoc(doc(db, "barbers", barberId), {
    active,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}
