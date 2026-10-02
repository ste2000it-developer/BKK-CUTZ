import { describe, expect, it, vi } from "vitest";
vi.mock("../../../shared/firebase/storage", () => ({ uploadPaymentSlip: vi.fn() }));
vi.mock("../../../shared/firebase/repositories/pos-transactions", () => ({ savePosTransaction: vi.fn() }));
import { createPaymentAttempt } from "./submit-payment";
import { makeTransaction, normalizedTip } from "../../../shared/domain/pos-payment";
const branch = { id: "b", name: "Branch", serviceGroup: "g" };
const checkout = { barber: { id: "a", name: "Barber" }, services: [
  { id: "s", name: "Cut", serviceCode: "haircut", type: "fixed", price: 200, basePrice: 200 },
  { id: "d", name: "Discount", serviceCode: null, type: "half_cut", price: -100, basePrice: 0, discountAmount: 100, targetServiceCode: "haircut", discountPercent: 50 },
] };
function fixture() {
  const deps = { compress: vi.fn(async () => new Blob(["image"])), upload: vi.fn(async () => ({ path: "payment_slips/b/date/id.jpg", size: 5 })), save: vi.fn(async () => {}) };
  return { deps, attempt: createPaymentAttempt(branch, checkout, deps), file: new File(["file"], "slip.png", { type: "image/png" }) };
}
describe("payment contract", () => {
  it("keeps transaction fields, totals, discounts, snapshots, local date and ISO time", () => {
    const now = new Date(2026, 9, 2, 12);
    expect(makeTransaction(branch, checkout, "scan", 20.6, "id", now)).toEqual({
      id: "id", branchId: "b", branchName: "Branch", serviceGroup: "g", barberId: "a", barberName: "Barber", services: checkout.services,
      serviceTotal: 100, total: 100, tipAmount: 21, grandTotal: 121, paymentMethod: "scan", slipStoragePath: null,
      dateKey: "2026-10-02", createdAt: now.toISOString(), source: "pos",
    });
    expect(makeTransaction(branch, checkout, "cash", 80, "id", now).tipAmount).toBe(0);
    expect([-1, NaN, Infinity, "bad"].map(normalizedTip)).toEqual([0, 0, 0, 0]);
  });
  it("cash never uploads or includes tip", async () => {
    const f = fixture(); const result = await f.attempt("cash", 90, f.file, () => true);
    expect(result.grandTotal).toBe(100); expect(result.slipStoragePath).toBeNull();
    expect(f.deps.upload).not.toHaveBeenCalled(); expect(f.deps.save).toHaveBeenCalledOnce();
  });
  it("requires a slip and does not save after compression/upload failure", async () => {
    const f = fixture();
    await expect(f.attempt("scan", 0, null, () => true)).rejects.toThrow("กรุณาถ่ายรูปสลิป");
    f.deps.upload.mockRejectedValueOnce(new Error("upload failed"));
    await expect(f.attempt("scan", 20, f.file, () => true)).rejects.toThrow("upload failed");
    expect(f.deps.save).not.toHaveBeenCalled();
  });
  it("uploads matching metadata and retries writes with the same ID and uploaded slip", async () => {
    const f = fixture(); f.deps.save.mockRejectedValueOnce(new Error("write failed"));
    await expect(f.attempt("scan", 20, f.file, () => true)).rejects.toThrow("write failed");
    const result = await f.attempt("scan", 999, f.file, () => true);
    expect(result.tipAmount).toBe(20); expect(f.deps.upload).toHaveBeenCalledOnce();
    expect(f.deps.save.mock.calls[0]).toEqual(f.deps.save.mock.calls[1]);
    expect(f.deps.upload).toHaveBeenCalledWith(expect.objectContaining({ branchId: "b", dateKey: result.dateKey, transactionId: result.id,
      metadata: { transactionId: result.id, branchId: "b", barberId: "a", barberName: "Barber", serviceTotal: 100, tipAmount: 20, grandTotal: 120, paymentMethod: "scan", createdAt: result.createdAt } }));
    await f.attempt("scan", 20, f.file, () => true); expect(f.deps.save).toHaveBeenCalledTimes(2);
  });
  it("does not upload or write after unmount during compression and guards concurrent submits", async () => {
    const f = fixture(); let live = true; let finish!: (blob: Blob) => void;
    f.deps.compress.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    const task = f.attempt("scan", 0, f.file, () => live);
    await expect(f.attempt("scan", 0, f.file, () => live)).rejects.toThrow("กำลังบันทึก");
    live = false; finish(new Blob()); await expect(task).rejects.toThrow("session ended");
    expect(f.deps.upload).not.toHaveBeenCalled(); expect(f.deps.save).not.toHaveBeenCalled();
  });
});
