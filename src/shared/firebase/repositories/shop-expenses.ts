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

export type ShopExpenseRecord = {
  id: string;
  branchId: string;
  branchName: string;
  barberId?: string;
  barberName: string;
  amount: number;
  reason: string;
  note?: string;
  dateKey: string;
  createdAt: string;
  source: "pos" | "admin";
};

export type SaveShopExpenseInput = {
  id?: string;
  branchId: string;
  branchName: string;
  barberId?: string;
  barberName: string;
  amount: number;
  reason: string;
  note?: string;
  dateKey?: string;
  createdAt?: string;
  source?: "pos" | "admin";
};

export function createShopExpenseId(): string {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? `exp_${crypto.randomUUID()}`
    : `exp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

export async function saveShopExpense(input: SaveShopExpenseInput): Promise<ShopExpenseRecord> {
  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("กรุณาระบุจำนวนเงินให้ถูกต้อง (ต้องมากกว่า 0 บาท)");
  }
  if (!input.reason.trim()) {
    throw new Error("กรุณาระบุรายการที่ซื้อหรือเหตุผลการเบิก");
  }
  if (!input.barberName.trim()) {
    throw new Error("กรุณาระบุชื่อผู้เบิก");
  }

  const id = input.id || createShopExpenseId();
  const dateKey = input.dateKey || localDateKey(new Date());
  const createdAt = input.createdAt || new Date().toISOString();

  const record: ShopExpenseRecord = {
    id,
    branchId: input.branchId,
    branchName: input.branchName || input.branchId,
    barberId: input.barberId || "",
    barberName: input.barberName.trim(),
    amount: Math.round(amount * 100) / 100,
    reason: input.reason.trim(),
    note: (input.note || "").trim(),
    dateKey,
    createdAt,
    source: input.source || "pos",
  };

  await setDoc(doc(db, "shop_expenses", id), record);
  return record;
}

export async function listShopExpensesByBranchAndDate(
  branchId: string,
  dateKey: string,
): Promise<ShopExpenseRecord[]> {
  const q = query(
    collection(db, "shop_expenses"),
    where("branchId", "==", branchId),
    where("dateKey", "==", dateKey),
  );
  const snap = await getDocs(q);
  return snap.docs
    .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as ShopExpenseRecord))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function listShopExpensesByDate(dateKey: string): Promise<ShopExpenseRecord[]> {
  const q = query(collection(db, "shop_expenses"), where("dateKey", "==", dateKey));
  const snap = await getDocs(q);
  return snap.docs
    .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as ShopExpenseRecord))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function listShopExpensesByDateRange(
  startDateKey: string,
  endDateKey: string,
): Promise<ShopExpenseRecord[]> {
  const q = query(
    collection(db, "shop_expenses"),
    where("dateKey", ">=", startDateKey),
    where("dateKey", "<=", endDateKey),
  );
  const snap = await getDocs(q);
  return snap.docs
    .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as ShopExpenseRecord))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function listAllShopExpenses(): Promise<ShopExpenseRecord[]> {
  const snap = await getDocs(collection(db, "shop_expenses"));
  return snap.docs
    .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as ShopExpenseRecord))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function deleteShopExpense(id: string): Promise<void> {
  await deleteDoc(doc(db, "shop_expenses", id));
}
