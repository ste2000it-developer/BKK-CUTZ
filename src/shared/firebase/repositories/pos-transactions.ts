import { collection, doc, getDocs, query, serverTimestamp, setDoc, where } from "firebase/firestore";
import { db } from "../client";
import type { PosTransaction } from "../../domain/pos-payment";
import type { TransactionHistoryRecord } from "./transactions";

export async function savePosTransaction(transaction: PosTransaction): Promise<void> {
  await setDoc(doc(db, "transactions", transaction.id), { ...transaction, createdAtServer: serverTimestamp() });
}

export async function listPosTransactions(branchId: string, dateKey: string): Promise<TransactionHistoryRecord[]> {
  const snapshot = await getDocs(query(collection(db, "transactions"), where("branchId", "==", branchId), where("dateKey", "==", dateKey)));
  return snapshot.docs.map((row) => ({ ...row.data(), id: row.id }) as TransactionHistoryRecord)
    .sort((a, b) => (new Date(b.createdAt || 0).getTime() || 0) - (new Date(a.createdAt || 0).getTime() || 0));
}
