import { describe, expect, it } from "vitest";
import { bangkokBusinessDate, calculateCashClosing, cashDifference } from "./cash-closing";
import type { ShopExpenseRecord } from "../firebase/repositories/shop-expenses";
import type { BarberAdvanceRecord } from "../firebase/repositories/advances";

const scope = { branchId: "b", dateKey: "2026-10-09" };
const sale = { ...scope, id: "sale", paymentMethod: "cash", grandTotal: 8500 };
const expense: ShopExpenseRecord = { ...scope, id: "exp", branchName: "B", barberName: "A", amount: 700, reason: "ซื้อของ", createdAt: "", source: "pos" };
const tip: BarberAdvanceRecord = { ...scope, id: "tip", barberId: "a", barberName: "A", amount: 300, type: "tip", status: "active", source: "pos", createdAt: "" };
describe("daily cash closing", () => {
  it.each([[7500, 0], [7450, -50], [7550, 50]])("counts actual %s with difference %s", (actual, difference) => {
    const summary = calculateCashClosing("b", scope.dateKey, [sale], [expense], [tip]);
    expect(summary.expectedCash).toBe(7500);
    expect(cashDifference(actual, summary.expectedCash)).toBe(difference);
  });
  it("allows scan-only days with zero actual cash and does not deduct unwithdrawn transfer tips", () => {
    const summary = calculateCashClosing("b", scope.dateKey, [{ ...sale, paymentMethod: "scan", tipAmount: 300 }], [], []);
    expect(summary.expectedCash).toBe(0); expect(cashDifference(0, summary.expectedCash)).toBe(0);
  });
  it("filters all sources by branch and date", () => {
    const variants = [{ branchId: "other" }, { dateKey: "2026-10-08" }];
    const summary = calculateCashClosing("b", scope.dateKey,
      [sale, ...variants.map((extra) => ({ ...sale, ...extra }))],
      [expense, ...variants.map((extra) => ({ ...expense, ...extra }))],
      [tip, ...variants.map((extra) => ({ ...tip, ...extra }))]);
    expect(summary).toMatchObject({ cashSales: 8500, shopExpenses: 700, cashTipWithdrawals: 300, expectedCash: 7500 });
  });
  it("excludes cancelled tips, non-POS tips and owner advances, but includes cash already deducted in payout", () => {
    const summary = calculateCashClosing("b", scope.dateKey, [], [], [
      { ...tip, status: "cancelled" }, { ...tip, source: "admin" }, { ...tip, type: "advance" }, { ...tip, status: "deducted" },
    ]);
    expect(summary.cashTipWithdrawals).toBe(300);
  });
  it("shows negative expected cash when expenses exist without sales", () => {
    expect(calculateCashClosing("b", scope.dateKey, [], [expense], [tip]).expectedCash).toBe(-1000);
  });
  it("calculates in cents without floating-point residue", () => {
    const summary = calculateCashClosing("b", scope.dateKey, [{ ...sale, grandTotal: 0.3 }], [{ ...expense, amount: 0.1 }], []);
    expect(summary.expectedCash).toBe(0.2); expect(cashDifference(50.2, summary.expectedCash)).toBe(50);
  });
  it("uses Thailand midnight even when the host timezone differs", () => {
    expect(bangkokBusinessDate(new Date("2026-10-08T16:59:59Z"))).toBe("2026-10-08");
    expect(bangkokBusinessDate(new Date("2026-10-08T17:00:00Z"))).toBe("2026-10-09");
  });
  it("fails on malformed monetary data instead of reporting a false zero", () => {
    expect(() => calculateCashClosing("b", scope.dateKey, [{ ...sale, grandTotal: NaN }], [], [])).toThrow();
    expect(() => calculateCashClosing("", scope.dateKey, [], [], [])).toThrow();
    expect(() => calculateCashClosing("b", "2026-02-30", [], [], [])).toThrow();
  });
});
