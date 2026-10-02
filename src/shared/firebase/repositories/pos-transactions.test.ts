import { expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ getDocs: vi.fn(), setDoc: vi.fn() }));
vi.mock("../client", () => ({ db: {} }));
vi.mock("firebase/firestore", () => ({
  collection: (_db: unknown, name: string) => name, doc: (_db: unknown, ...path: string[]) => path.join("/"),
  where: (...args: unknown[]) => args, query: (...args: unknown[]) => args,
  getDocs: mock.getDocs, setDoc: mock.setDoc, serverTimestamp: () => "SERVER_TIME",
}));
import { listPosTransactions, savePosTransaction } from "./pos-transactions";
import { makeTransaction } from "../../domain/pos-payment";
it("queries history by BOTH branchId/dateKey and sorts newest first", async () => {
  mock.getDocs.mockResolvedValue({ docs: [
    { id: "old", data: () => ({ createdAt: "2026-10-02T01:00:00Z" }) },
    { id: "new", data: () => ({ createdAt: "2026-10-02T02:00:00Z" }) },
  ] });
  expect((await listPosTransactions("b", "2026-10-02")).map((row) => row.id)).toEqual(["new", "old"]);
  expect(mock.getDocs).toHaveBeenCalledWith(["transactions", ["branchId", "==", "b"], ["dateKey", "==", "2026-10-02"]]);
});
it("writes transactions/{id} with server timestamp and unchanged snapshot fields", async () => {
  const tx = makeTransaction({ id: "b", name: "Branch", serviceGroup: "g" }, { barber: { id: "a", name: "Barber" }, services: [{ id: "s", name: "Cut", serviceCode: "haircut", type: "fixed", price: 200, basePrice: 200 }] }, "cash", 0, "tx");
  await savePosTransaction(tx);
  expect(mock.setDoc).toHaveBeenCalledWith("transactions/tx", { ...tx, createdAtServer: "SERVER_TIME" });
});
