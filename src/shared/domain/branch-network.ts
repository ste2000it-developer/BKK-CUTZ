import { isVoidedTransaction } from "./transaction-status";
import type { TransactionHistoryRecord } from "../firebase/repositories/transactions";
export type NetworkBranch = { id: string; name?: string; serviceGroup?: string; active?: boolean };
export type NetworkPresence = { id: string; barberId: string; barberName?: string; branchId: string; dateKey: string; active: boolean; attended?: boolean; branchName?: string };
export type NetworkClosing = { id: string; branchId: string; branchName?: string; dateKey: string; closedByBarberName?: string; closedAt?: { toDate(): Date } };
export type NetworkData = { branches: NetworkBranch[]; transactions: TransactionHistoryRecord[]; presence: NetworkPresence[]; closings: NetworkClosing[] };
export type BranchNode = { id: string; name: string; status: "working" | "closed" | "idle" | "disabled" | "recorded" | "unknown"; sales: number; tips: number; bills: number; barbers: NetworkPresence[]; closing?: NetworkClosing };
export const branchStatus = { working: "มีช่างเข้างาน", closed: "ปิดร้านแล้ว", idle: "ยังไม่มีช่างเข้างาน", disabled: "สาขาปิดใช้งาน", recorded: "มีข้อมูลการทำงาน", unknown: "ไม่มีข้อมูลในวันที่เลือก" };
const money = (value: unknown) => { const n = Number(value ?? 0); return Number.isFinite(n) ? Math.round(n * 100) : 0; };
export function buildBranchNetwork(data: NetworkData, dateKey: string, historical = false): BranchNode[] {
  const nodes = new Map<string, BranchNode>();
  const ensure = (id: string, name?: string) => {
    if (!nodes.has(id)) nodes.set(id, { id, name: name || id || "ไม่ระบุสาขา", status: "idle", sales: 0, tips: 0, bills: 0, barbers: [] });
    return nodes.get(id)!;
  };
  for (const branch of data.branches) { const node = ensure(branch.id, branch.name); if (!historical && branch.active === false) node.status = "disabled"; }
  for (const tx of data.transactions) {
    if (tx.dateKey !== dateKey || isVoidedTransaction(tx)) continue;
    const node = ensure(tx.branchId || "", tx.branchName);
    // Match existing summary: service revenue plus tips; no voided bills.
    node.sales += money(tx.serviceTotal ?? tx.total) + money(tx.tipAmount);
    node.tips += money(tx.tipAmount); node.bills++;
  }
  for (const row of data.presence) {
    if (row.dateKey !== dateKey || (historical ? row.attended === false : !row.active)) continue;
    const node = ensure(row.branchId, row.branchName);
    if (!node.barbers.some((b) => b.barberId === row.barberId)) node.barbers.push(row);
  }
  for (const closing of data.closings) if (closing.dateKey === dateKey) ensure(closing.branchId, closing.branchName).closing = closing;
  for (const node of nodes.values()) {
    node.sales /= 100; node.tips /= 100;
    if (historical) node.status = node.closing ? "closed" : node.barbers.length || node.bills ? "recorded" : "unknown";
    else if (node.status !== "disabled") node.status = node.barbers.length ? "working" : node.closing ? "closed" : "idle";
    node.barbers.sort((a, b) => (a.barberName || a.barberId).localeCompare(b.barberName || b.barberId, "th"));
  }
  return [...nodes.values()].sort((a, b) => a.id.localeCompare(b.id, "th", { numeric: true }));
}

export function shiftNetworkDate(dateKey: string, days: number): string {
  const date = new Date(dateKey + "T12:00:00Z");
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
