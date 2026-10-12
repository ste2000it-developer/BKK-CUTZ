import { beforeEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ set: vi.fn(), get: vi.fn(async () => ({ exists: (): boolean => false })), commit: vi.fn(async () => {}), setDoc: vi.fn(async () => {}), loadCash: vi.fn() }));
vi.mock("../client", () => ({ db: {} }));
vi.mock("./cash-closing", () => ({ loadCashClosingSummary: mock.loadCash }));
vi.mock("firebase/firestore", () => ({
  collection: vi.fn(), getDocs: vi.fn(), onSnapshot: vi.fn(), query: vi.fn(), where: vi.fn(),
  doc: (_db: unknown, ...path: string[]) => path.join("/"), serverTimestamp: () => "SERVER_TIME",
  writeBatch: () => mock, setDoc: mock.setDoc,
  runTransaction: async (_db: unknown, callback: (tx: typeof mock) => Promise<void>) => { await callback(mock); await mock.commit(); },
}));
import { saveCheckIn, saveReaderResult, saveStoreClosing } from "./attendance";
import { bangkokBusinessDate, type CashClosingInput } from "../../domain/cash-closing";
const branch = { id: "b", name: "สาขา", serviceGroup: "g" };
const barber = { id: "a", name: "ช่าง" };
const date = bangkokBusinessDate();
const cash: CashClosingInput = { summary: { branchId: "b", businessDate: date, cashSales: 8500, shopExpenses: 700, cashTipWithdrawals: 300, expectedCash: 7500 }, actualCash: 7450 };
beforeEach(() => { vi.clearAllMocks(); mock.loadCash.mockResolvedValue(cash.summary); });
it.each(["pin", "rfid"] as const)("batch writes both check-in documents (%s)", async (method) => {
  await saveCheckIn(branch, barber, method, "2026-10-02");
  const fields = { barberId: "a", barberName: "ช่าง", branchId: "b", branchName: "สาขา", dateKey: "2026-10-02", active: true,
    checkInAt: "SERVER_TIME", updatedAt: "SERVER_TIME", checkInMethod: method };
  expect(mock.set.mock.calls).toEqual([
    ["barber_presence/a", fields, { merge: true }],
    ["barber_attendance/2026-10-02_b_a", { ...fields, attended: true }, { merge: true }],
  ]); expect(mock.commit).toHaveBeenCalledOnce();
});
it("closes presence and attendance without erasing check-in; records daily closing", async () => {
  await saveStoreClosing(branch, [barber], barber, date, cash);
  expect(mock.set).toHaveBeenCalledWith("barber_presence/a", { active: false, checkOutAt: "SERVER_TIME", updatedAt: "SERVER_TIME", checkOutReason: "store_closed" }, { merge: true });
  expect(mock.set).toHaveBeenCalledWith(`barber_attendance/${date}_b_a`, expect.objectContaining({ attended: true, active: false, checkOutReason: "store_closed" }), { merge: true });
  expect(mock.set).toHaveBeenCalledWith(`daily_closings/b_${date}`, { id: `b_${date}`, ...cash.summary, actualCash: 7450, difference: -50, cashClosingVersion: 1, branchName: "สาขา", dateKey: date, closedByBarberId: "a", closedByBarberName: "ช่าง", closedAt: "SERVER_TIME", closedBarberCount: 1 });
  expect(mock.commit).toHaveBeenCalledOnce();
});
it("refuses existing closings before writing presence or replacing history", async () => {
  mock.get.mockResolvedValueOnce({ exists: () => true });
  await expect(saveStoreClosing(branch, [barber], barber, date, cash)).rejects.toThrow("ประวัติปิดร้าน");
  expect(mock.set).not.toHaveBeenCalled(); expect(mock.commit).not.toHaveBeenCalled();
});
it("refuses stale summaries and incomplete reads without checkout writes", async () => {
  mock.loadCash.mockResolvedValueOnce({ ...cash.summary, cashSales: 9000, expectedCash: 8000 });
  await expect(saveStoreClosing(branch, [barber], barber, date, cash)).rejects.toThrow("รายการเงินสดเปลี่ยน");
  mock.loadCash.mockRejectedValueOnce(new Error("offline"));
  await expect(saveStoreClosing(branch, [barber], barber, date, cash)).rejects.toThrow("offline");
  expect(mock.set).not.toHaveBeenCalled();
});
it.each([NaN, Infinity, -1])("rejects invalid actual cash %s", async (actualCash) => {
  await expect(saveStoreClosing(branch, [barber], barber, date, { ...cash, actualCash })).rejects.toThrow();
  expect(mock.set).not.toHaveBeenCalled();
});
it("rejects another day or branch", async () => {
  await expect(saveStoreClosing(branch, [barber], barber, "2020-01-01", cash)).rejects.toThrow("วันที่หรือสาขา");
  await expect(saveStoreClosing(branch, [barber], barber, date, { ...cash, summary: { ...cash.summary, branchId: "other" } })).rejects.toThrow("วันที่หรือสาขา");
  expect(mock.set).not.toHaveBeenCalled();
});
it("propagates an atomic commit failure so the caller cannot report a successful close", async () => {
  mock.commit.mockRejectedValueOnce(new Error("commit failed"));
  await expect(saveStoreClosing(branch, [barber], barber, date, cash)).rejects.toThrow("commit failed");
  expect(mock.commit).toHaveBeenCalledOnce();
});
it("keeps ESP32 reader result document and field names", async () => {
  await saveReaderResult("b", { id: "reader", scanId: " scan ", cardUid: "AA" }, { status: "success", barber, message: "ช่าง เข้างานแล้ว" });
  expect(mock.setDoc).toHaveBeenCalledWith("reader_results/scan", { scanId: "scan", branchId: "b", resultStatus: "success", barberId: "a", barberName: "ช่าง", message: "ช่าง เข้างานแล้ว", createdAt: "SERVER_TIME" });
});
