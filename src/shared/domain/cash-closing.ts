import type { TransactionHistoryRecord } from "../firebase/repositories/transactions";
import type { ShopExpenseRecord } from "../firebase/repositories/shop-expenses";
import type { BarberAdvanceRecord } from "../firebase/repositories/advances";

export type CashClosingSummary = {
  branchId: string; businessDate: string; cashSales: number; shopExpenses: number;
  cashTipWithdrawals: number; expectedCash: number;
};
export type CashClosingInput = { summary: CashClosingSummary; actualCash: number };

export function bangkokBusinessDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) => parts.find((item) => item.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function cents(value: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error("ข้อมูลจำนวนเงินไม่ถูกต้อง กรุณาตรวจสอบรายการ");
  const result = Math.round((value + Number.EPSILON) * 100);
  if (!Number.isSafeInteger(result)) throw new Error("จำนวนเงินเกินขอบเขตที่รองรับ");
  return result;
}

export function cashDifference(actual: number, expected: number): number {
  if (actual < 0) throw new Error("เงินสดที่นับจริงต้องไม่ติดลบ");
  return (cents(actual) - cents(expected)) / 100;
}

export function calculateCashClosing(branchId: string, businessDate: string,
  transactions: readonly TransactionHistoryRecord[], expenses: readonly ShopExpenseRecord[],
  withdrawals: readonly BarberAdvanceRecord[]): CashClosingSummary {
  if (!branchId.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(businessDate)
    || new Date(`${businessDate}T00:00:00Z`).toISOString().slice(0, 10) !== businessDate) {
    throw new Error("สาขาหรือวันที่ปิดเงินสดไม่ถูกต้อง");
  }
  const matches = (row: { branchId?: string; dateKey?: string }) => row.branchId === branchId && row.dateKey === businessDate;
  const sum = (values: number[]) => values.reduce((total, value) => {
    if (value < 0) throw new Error("พบรายการจำนวนเงินติดลบ กรุณาตรวจสอบ");
    const next = total + cents(value);
    if (!Number.isSafeInteger(next)) throw new Error("ยอดรวมเกินขอบเขตที่รองรับ");
    return next;
  }, 0);
  const sales = sum(transactions.filter((row) => matches(row) && row.paymentMethod === "cash")
    .map((row) => row.grandTotal ?? row.total ?? row.serviceTotal!));
  // The existing shop-expense flow always withdraws cash from the till.
  const shop = sum(expenses.filter(matches).map((row) => row.amount));
  // Only POS tip withdrawals represent cash handed out. Transfer tips on sales
  // and owner-funded salary advances are not till withdrawals.
  const tips = sum(withdrawals.filter((row) => matches(row) && row.type === "tip"
    && row.source === "pos" && ["active", "approved", "deducted"].includes(row.status)).map((row) => row.amount));
  return { branchId, businessDate, cashSales: sales / 100, shopExpenses: shop / 100,
    cashTipWithdrawals: tips / 100, expectedCash: (sales - shop - tips) / 100 };
}
