import { beforeEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ set: vi.fn(), commit: vi.fn(async () => {}), setDoc: vi.fn(async () => {}) }));
vi.mock("../client", () => ({ db: {} }));
vi.mock("firebase/firestore", () => ({
  collection: vi.fn(), getDocs: vi.fn(), onSnapshot: vi.fn(), query: vi.fn(), where: vi.fn(),
  doc: (_db: unknown, ...path: string[]) => path.join("/"), serverTimestamp: () => "SERVER_TIME",
  writeBatch: () => mock, setDoc: mock.setDoc,
}));
import { saveCheckIn, saveReaderResult, saveStoreClosing } from "./attendance";
const branch = { id: "b", name: "สาขา", serviceGroup: "g" };
const barber = { id: "a", name: "ช่าง" };
beforeEach(() => vi.clearAllMocks());
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
  await saveStoreClosing(branch, [barber], barber, "2026-10-02");
  expect(mock.set).toHaveBeenCalledWith("barber_presence/a", { active: false, checkOutAt: "SERVER_TIME", updatedAt: "SERVER_TIME", checkOutReason: "store_closed" }, { merge: true });
  expect(mock.set).toHaveBeenCalledWith("barber_attendance/2026-10-02_b_a", expect.objectContaining({ attended: true, active: false, checkOutReason: "store_closed" }), { merge: true });
  expect(mock.set).toHaveBeenCalledWith("daily_closings/b_2026-10-02", { branchId: "b", branchName: "สาขา", dateKey: "2026-10-02", closedByBarberId: "a", closedByBarberName: "ช่าง", closedAt: "SERVER_TIME", closedBarberCount: 1 }, { merge: true });
  expect(mock.commit).toHaveBeenCalledOnce();
});
it("keeps ESP32 reader result document and field names", async () => {
  await saveReaderResult("b", { id: "reader", scanId: " scan ", cardUid: "AA" }, { status: "success", barber, message: "ช่าง เข้างานแล้ว" });
  expect(mock.setDoc).toHaveBeenCalledWith("reader_results/scan", { scanId: "scan", branchId: "b", resultStatus: "success", barberId: "a", barberName: "ช่าง", message: "ช่าง เข้างานแล้ว", createdAt: "SERVER_TIME" });
});
