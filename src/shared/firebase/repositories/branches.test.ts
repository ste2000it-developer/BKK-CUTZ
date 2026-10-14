import { beforeEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ get: vi.fn(), set: vi.fn(), update: vi.fn(), getDocs: vi.fn() }));
vi.mock("../client", () => ({ db: {} }));
vi.mock("firebase/firestore", () => ({
  collection: (_db: unknown, name: string) => name,
  doc: (_db: unknown, name: string, id: string) => name + "/" + id,
  serverTimestamp: () => "server-time",
  getDocs: mock.getDocs,
  runTransaction: async (_db: unknown, action: (transaction: unknown) => Promise<void>) => action(mock),
}));
import { listBranches, saveBranch } from "./branches";
const input = { id: "BKK-05", name: "สาขาใหม่", serviceGroup: "A", active: true };
beforeEach(() => { vi.clearAllMocks(); mock.get.mockResolvedValue({ exists: () => false }); });
it("creates a new branch with trimmed data and timestamps", async () => {
  expect(await saveBranch({ ...input, id: " BKK-05 ", name: " สาขาใหม่ " }, "create")).toBe("BKK-05");
  expect(mock.set).toHaveBeenCalledWith("branches/BKK-05", { name: "สาขาใหม่", serviceGroup: "A", active: true, createdAt: "server-time", updatedAt: "server-time" });
});
it("rejects duplicate codes without overwriting the existing branch", async () => {
  mock.get.mockResolvedValue({ exists: () => true });
  await expect(saveBranch(input, "create")).rejects.toThrow("มีอยู่แล้ว");
  expect(mock.set).not.toHaveBeenCalled(); expect(mock.update).not.toHaveBeenCalled();
});
it("updates only editable branch fields, preserving unrelated settings and history", async () => {
  mock.get.mockResolvedValue({ exists: () => true });
  await saveBranch({ ...input, active: false, serviceGroup: "B" }, "update");
  expect(mock.update).toHaveBeenCalledWith("branches/BKK-05", { name: "สาขาใหม่", serviceGroup: "B", active: false, updatedAt: "server-time" });
  expect(mock.set).not.toHaveBeenCalled();
  await saveBranch(input, "update");
  expect(mock.update).toHaveBeenLastCalledWith("branches/BKK-05", expect.objectContaining({ active: true }));
});
it("does not recreate a removed branch when saving edits", async () => {
  await expect(saveBranch(input, "update")).rejects.toThrow("ไม่พบสาขา");
  expect(mock.set).not.toHaveBeenCalled(); expect(mock.update).not.toHaveBeenCalled();
});
it.each(["", "a/b", "a\\b", ".", "..", "__reserved__"])("rejects invalid branch code %s before any writes", async id => {
  await expect(saveBranch({ ...input, id }, "create")).rejects.toThrow("รหัสสาขา");
  expect(mock.get).not.toHaveBeenCalled();
});
it.each([{ name: " " }, { serviceGroup: " " }])("requires a name and price group", async fields => {
  await expect(saveBranch({ ...input, ...fields }, "create")).rejects.toThrow();
  expect(mock.get).not.toHaveBeenCalled();
});
it("surfaces save failures for the editor to retry", async () => {
  mock.get.mockRejectedValueOnce(new Error("permission-denied"));
  await expect(saveBranch(input, "create")).rejects.toThrow("permission-denied");
});
it("uses document IDs and numeric code ordering in branch lists", async () => {
  mock.getDocs.mockResolvedValue({ docs: [ { id: "B10", data: () => ({ id: "wrong", name: "A" }) }, { id: "B2", data: () => ({ name: "Z" }) } ] });
  expect((await listBranches()).map(b => b.id)).toEqual(["B2", "B10"]);
});
