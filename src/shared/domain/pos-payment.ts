import { calculatePosServiceTotal, type SelectedService } from "./pos-services";
import { localDateKey, type Barber, type PosBranch } from "./pos-attendance";

export type PaymentMethod = "cash" | "scan";
export type Checkout = { barber: Barber; services: SelectedService[] };
export type PosTransaction = {
  id: string; branchId: string; branchName: string; serviceGroup: string; barberId: string; barberName: string;
  services: SelectedService[]; serviceTotal: number; total: number; tipAmount: number; grandTotal: number;
  paymentMethod: PaymentMethod; slipStoragePath: string | null; dateKey: string; createdAt: string; source: "pos";
};
export function normalizedTip(value: unknown): number {
  const amount = Number(value || 0);
  return Number.isFinite(amount) && amount >= 0 ? Math.round(amount) : 0;
}
export function createTransactionId(): string {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID() : `tx_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
export function makeTransaction(branch: PosBranch, checkout: Checkout, method: PaymentMethod, tip: unknown, id: string, now = new Date()): PosTransaction {
  if (!checkout.services.length) throw new Error("กรุณาเลือกบริการ");
  const services = checkout.services.map((row) => ({ ...row }));
  const serviceTotal = calculatePosServiceTotal(services);
  const tipAmount = method === "scan" ? normalizedTip(tip) : 0;
  return { id, branchId: branch.id, branchName: branch.name || branch.id, serviceGroup: branch.serviceGroup,
    barberId: checkout.barber.id, barberName: checkout.barber.name || checkout.barber.id, services,
    serviceTotal, total: serviceTotal, tipAmount, grandTotal: serviceTotal + tipAmount, paymentMethod: method,
    slipStoragePath: null, dateKey: localDateKey(now), createdAt: now.toISOString(), source: "pos" };
}
