import { beforeEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ read: vi.fn() }));
vi.mock("../client", () => ({ db: {} }));
vi.mock("firebase/firestore", () => ({
  collection: (_db: unknown, name: string) => name,
  where: (...args: unknown[]) => args,
  query: (...args: unknown[]) => args,
  getDocsFromServer: mock.read,
}));
import { loadCashClosingSummary } from "./cash-closing";
beforeEach(() => { vi.clearAllMocks(); mock.read.mockResolvedValue({ docs: [] }); });
it("requests server data with branch and date constraints for every source", async () => {
  expect((await loadCashClosingSummary("b", "2026-10-09")).expectedCash).toBe(0);
  expect(mock.read.mock.calls.map(([query]) => query)).toEqual([
    ["transactions", ["branchId", "==", "b"], ["dateKey", "==", "2026-10-09"]],
    ["shop_expenses", ["branchId", "==", "b"], ["dateKey", "==", "2026-10-09"]],
    ["barber_advances", ["branchId", "==", "b"], ["dateKey", "==", "2026-10-09"]],
  ]);
});
it("does not return an incomplete calculation when any source fails", async () => {
  mock.read.mockRejectedValueOnce(new Error("permission denied"));
  await expect(loadCashClosingSummary("b", "2026-10-09")).rejects.toThrow("permission denied");
});
