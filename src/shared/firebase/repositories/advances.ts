import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { db } from "../client";
import { localDateKey } from "../../domain/pos-attendance";

export type BarberAdvanceType = "advance" | "tip";

export type BarberAdvanceRecord = {
  id: string;
  barberId: string;
  barberName: string;
  branchId?: string;
  branchName?: string;
  type?: BarberAdvanceType;
  amount: number;
  reason?: string;
  note?: string;
  dateKey: string;
  createdAt: string;
  createdByUid?: string;
  createdByEmail?: string;
  status: "active" | "deducted" | "cancelled" | "approved";
  source?: "pos" | "admin";
};

export type SaveBarberAdvanceInput = {
  id?: string;
  barberId: string;
  barberName: string;
  branchId?: string;
  branchName?: string;
  type?: BarberAdvanceType;
  amount: number;
  reason?: string;
  note?: string;
  dateKey?: string;
  createdAt?: string;
  createdByUid?: string;
  createdByEmail?: string;
  status?: "active" | "deducted" | "cancelled" | "approved";
  source?: "pos" | "admin";
};

export function createAdvanceId(): string {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? `adv_${crypto.randomUUID()}`
    : `adv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

export async function saveBarberAdvance(input: SaveBarberAdvanceInput): Promise<BarberAdvanceRecord> {
  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("กรุณาระบุจำนวนเงินเบิกล่วงหน้าให้ถูกต้อง (ต้องมากกว่า 0 บาท)");
  }
  if (!input.barberId.trim() || !input.barberName.trim()) {
    throw new Error("กรุณาเลือกช่างที่ต้องการเบิกล่วงหน้า");
  }

  const id = input.id || createAdvanceId();
  const dateKey = input.dateKey || localDateKey(new Date());
  const createdAt = input.createdAt || new Date().toISOString();

  const record: BarberAdvanceRecord = {
    id,
    barberId: input.barberId.trim(),
    barberName: input.barberName.trim(),
    branchId: input.branchId || "",
    branchName: input.branchName || "",
    type: input.type || "advance",
    amount: Math.round(amount * 100) / 100,
    reason: (input.reason || "").trim(),
    note: (input.note || "").trim(),
    dateKey,
    createdAt,
    createdByUid: input.createdByUid || "",
    createdByEmail: input.createdByEmail || "",
    status: input.status || "active",
    source: input.source || "admin",
  };

  await setDoc(doc(db, "barber_advances", id), record);
  return record;
}

export async function listBarberAdvances(
  startDateKey?: string,
  endDateKey?: string,
): Promise<BarberAdvanceRecord[]> {
  let q;
  if (startDateKey && endDateKey) {
    q = query(
      collection(db, "barber_advances"),
      where("dateKey", ">=", startDateKey),
      where("dateKey", "<=", endDateKey),
    );
  } else if (startDateKey) {
    q = query(collection(db, "barber_advances"), where("dateKey", "==", startDateKey));
  } else {
    q = collection(db, "barber_advances");
  }

  const snap = await getDocs(q);
  return snap.docs
    .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as BarberAdvanceRecord))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function listBarberAdvancesByBarber(barberId: string): Promise<BarberAdvanceRecord[]> {
  const q = query(collection(db, "barber_advances"), where("barberId", "==", barberId));
  const snap = await getDocs(q);
  return snap.docs
    .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as BarberAdvanceRecord))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function deleteBarberAdvance(id: string): Promise<void> {
  await deleteDoc(doc(db, "barber_advances", id));
}
