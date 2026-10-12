import { collection, getDocsFromServer, query, where } from "firebase/firestore";
import { db } from "../client";
import { calculateCashClosing } from "../../domain/cash-closing";
import type { TransactionHistoryRecord } from "./transactions";
import type { ShopExpenseRecord } from "./shop-expenses";
import type { BarberAdvanceRecord } from "./advances";

export async function loadCashClosingSummary(branchId: string, businessDate: string) {
  if (!branchId || !businessDate) throw new Error("ไม่พบสาขาหรือวันที่ปิดเงินสด");
  // Branch constraints are required by POS Firestore permissions. Server reads
  // fail closed offline instead of silently using an incomplete local cache.
  async function rows<T>(name: string): Promise<T[]> {
    const result = await getDocsFromServer(query(collection(db, name),
      where("branchId", "==", branchId), where("dateKey", "==", businessDate)));
    return result.docs.map((row) => ({ ...row.data(), id: row.id }) as T);
  }
  const [sales, expenses, tips] = await Promise.all([
    rows<TransactionHistoryRecord>("transactions"), rows<ShopExpenseRecord>("shop_expenses"),
    rows<BarberAdvanceRecord>("barber_advances"),
  ]);
  return calculateCashClosing(branchId, businessDate, sales, expenses, tips);
}
