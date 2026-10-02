import { makeTransaction, createTransactionId, type Checkout, type PaymentMethod, type PosTransaction } from "../../../shared/domain/pos-payment";
import type { PosBranch } from "../../../shared/domain/pos-attendance";
import { uploadPaymentSlip } from "../../../shared/firebase/storage";
import { savePosTransaction } from "../../../shared/firebase/repositories/pos-transactions";
import { compressSlipImage } from "./compress-slip";

type Dependencies = { compress: typeof compressSlipImage; upload: typeof uploadPaymentSlip; save: typeof savePosTransaction };
const dependencies: Dependencies = { compress: compressSlipImage, upload: uploadPaymentSlip, save: savePosTransaction };

/** Keeps one ID for retries; all persistence belongs to the branch captured at checkout. */
export function createPaymentAttempt(branch: PosBranch, checkout: Checkout, deps = dependencies) {
  let transaction: PosTransaction | null = null;
  let pending = false;
  let completed = false;
  return async (method: PaymentMethod, tip: unknown, file: File | null, isLive: () => boolean): Promise<PosTransaction> => {
    if (pending) throw new Error("กำลังบันทึกรายการ");
    const assertLive = () => { if (!isLive()) throw new Error("POS session ended"); };
    assertLive();
    if (completed && transaction) return transaction;
    if (method === "scan" && !file && !transaction?.slipStoragePath) throw new Error("กรุณาถ่ายรูปสลิปก่อนยืนยันการชำระเงิน");
    pending = true;
    try {
      // Freeze fields on the first attempt; retrying a failed write must not create a second sale.
      transaction ??= makeTransaction(branch, checkout, method, tip, createTransactionId());
      if (transaction.paymentMethod === "scan" && !transaction.slipStoragePath) {
        if (!file) throw new Error("กรุณาถ่ายรูปสลิปก่อนยืนยันการชำระเงิน");
        const blob = await deps.compress(file);
        assertLive();
        const { id, branchId, dateKey, barberId, barberName, serviceTotal, tipAmount, grandTotal, paymentMethod, createdAt } = transaction;
        const result = await deps.upload({ branchId, dateKey, transactionId: id, blob,
          metadata: { transactionId: id, branchId, barberId, barberName, serviceTotal, tipAmount, grandTotal, paymentMethod, createdAt } });
        transaction.slipStoragePath = result.path;
        assertLive();
      }
      assertLive();
      await deps.save(transaction);
      completed = true;
      assertLive();
      return transaction;
    } finally { pending = false; }
  };
}
