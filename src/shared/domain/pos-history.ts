import type { TransactionHistoryRecord } from "../firebase/repositories/transactions";

export function historyAmounts(transaction: TransactionHistoryRecord) {
  const serviceTotal = Number(transaction.serviceTotal ?? transaction.total ?? 0);
  const tipAmount = Number(transaction.tipAmount || 0);
  return { serviceTotal, tipAmount, grandTotal: Number(transaction.grandTotal ?? serviceTotal + tipAmount) };
}
export function historyServices(transaction: TransactionHistoryRecord): { name: string; detail: string; price: number }[] {
  if (!Array.isArray(transaction.services)) return [];
  return transaction.services.filter((row): row is Record<string, unknown> => typeof row === "object" && row !== null)
    .map((row) => ({ name: String(row.name || "รายการ"), detail: String(row.detail || ""), price: Number(row.price || 0) }));
}
export function historyBarbers(rows: readonly TransactionHistoryRecord[]) {
  const barbers = new Map<string, string>();
  for (const row of rows) if (row.barberId) barbers.set(row.barberId, row.barberName || row.barberId);
  return Array.from(barbers, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, "th"));
}
export function filterHistory(rows: readonly TransactionHistoryRecord[], barberId: string) {
  return barberId === "all" ? [...rows] : rows.filter((row) => row.barberId === barberId);
}
export const formatMoney = (value: number) => Number(value || 0).toLocaleString("th-TH", { maximumFractionDigits: 2 });
export function formatDateTime(value?: string) {
  const date = new Date(value || "");
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString("th-TH", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });
}
