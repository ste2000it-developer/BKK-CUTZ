import { expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ upload: vi.fn(async () => ({ metadata: { fullPath: "path", size: 42 } })), url: vi.fn(async () => "download-url") }));
vi.mock("./client", () => ({ storage: {} }));
vi.mock("firebase/storage", () => ({ ref: (_storage: unknown, path: string) => path, uploadBytes: mock.upload, getDownloadURL: mock.url }));
import { uploadPaymentSlip, loadPaymentSlipUrl } from "./storage";
it("keeps payment_slips path, JPEG metadata and stringifies metadata", async () => {
  const blob = new Blob(["jpeg"]);
  await uploadPaymentSlip({ branchId: "b/1", dateKey: "2026-10-02", transactionId: "tx", blob, metadata: { total: 100, empty: null } });
  expect(mock.upload).toHaveBeenCalledWith("payment_slips/b_1/2026-10-02/tx.jpg", blob, { contentType: "image/jpeg", cacheControl: "private,max-age=0,no-transform", customMetadata: { total: "100" } });
  expect(await loadPaymentSlipUrl("payment_slips/b/date/tx.jpg")).toBe("download-url");
  expect(mock.url).toHaveBeenCalledWith("payment_slips/b/date/tx.jpg");
});
