import { collection, doc, getDocs, query, serverTimestamp, setDoc, updateDoc, where } from "firebase/firestore";
import { auth, db } from "../client";
import type { PosTransaction } from "../../domain/pos-payment";
import type { TransactionHistoryRecord } from "./transactions";

export async function savePosTransaction(transaction: PosTransaction): Promise<void> {
  await setDoc(doc(db, "transactions", transaction.id), { ...transaction, createdAtServer: serverTimestamp() });
}


export type VoidPosTransactionInput = {
  barberId: string;
  barberName: string;
  reason: string;
};

export async function voidPosTransaction(
  transactionId: string,
  input: VoidPosTransactionInput,
): Promise<void> {
  const id = String(transactionId || "").trim();
  const reason = String(input.reason || "").trim();
  if (!id) throw new Error("ไม่พบเลขรายการที่ต้องการยกเลิก");
  if (!reason) throw new Error("กรุณาระบุเหตุผลที่ยกเลิกรายการ");

  const user = auth.currentUser;
  if (!user) throw new Error("กรุณาเข้าสู่ระบบใหม่ก่อนยกเลิกรายการ");

  await updateDoc(doc(db, "transactions", id), {
    status: "voided",
    voidReason: reason,
    voidedAt: serverTimestamp(),
    voidedByUid: user.uid,
    voidedByEmail: user.email || "",
    voidedByBarberId: input.barberId,
    voidedByBarberName: input.barberName,
  });
}

export async function listPosTransactions(branchId: string, dateKey: string): Promise<TransactionHistoryRecord[]> {
  const snapshot = await getDocs(query(collection(db, "transactions"), where("branchId", "==", branchId), where("dateKey", "==", dateKey)));
  return snapshot.docs.map((row) => ({ ...row.data(), id: row.id }) as TransactionHistoryRecord)
    .sort((a, b) => (new Date(b.createdAt || 0).getTime() || 0) - (new Date(a.createdAt || 0).getTime() || 0));
}
