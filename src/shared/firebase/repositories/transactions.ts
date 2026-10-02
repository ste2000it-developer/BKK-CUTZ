import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../client";

export type TransactionHistoryRecord = {
  id: string;
  branchId?: string;
  branchName?: string;
  barberId?: string;
  barberName?: string;
  dateKey?: string;
  createdAt?: string;
  services?: unknown;
  serviceTotal?: number;
  total?: number;
  tipAmount?: number;
  grandTotal?: number;
  paymentMethod?: string;
  [field: string]: unknown;
};

export async function listTransactionsByDate(
  dateKey: string,
): Promise<TransactionHistoryRecord[]> {
  const result = await getDocs(
    query(collection(db, "transactions"), where("dateKey", "==", dateKey)),
  );

  const transactions = result.docs
    .map((snapshot) => ({
      id: snapshot.id,
      ...snapshot.data(),
    })) as TransactionHistoryRecord[];

  return transactions.sort((first, second) => {
      const firstDate = new Date(String(first.createdAt || "")).getTime() || 0;
      const secondDate = new Date(String(second.createdAt || "")).getTime() || 0;
      return secondDate - firstDate;
    });
}