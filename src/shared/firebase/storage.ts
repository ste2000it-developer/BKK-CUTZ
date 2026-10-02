import {
  getDownloadURL,
  ref as storageRef,
  uploadBytes,
} from "firebase/storage";
import { storage } from "./client";

type UploadPaymentSlipInput = {
  branchId: string;
  dateKey: string;
  transactionId: string;
  blob: Blob;
  metadata?: Record<string, string | number | boolean | null | undefined>;
};

function sanitizeStorageSegment(value: string, fallback: string): string {
  const cleaned = value.trim().replace(/[^a-zA-Z0-9_-]/g, "_");
  return cleaned || fallback;
}

export async function uploadPaymentSlip({
  branchId,
  dateKey,
  transactionId,
  blob,
  metadata = {},
}: UploadPaymentSlipInput): Promise<{ path: string; size: number }> {
  if (!blob) {
    throw new Error("ไม่พบไฟล์สลิปสำหรับอัปโหลด");
  }

  const fullPath = [
    "payment_slips",
    sanitizeStorageSegment(branchId, "branch"),
    sanitizeStorageSegment(dateKey, "date"),
    `${sanitizeStorageSegment(transactionId, "transaction")}.jpg`,
  ].join("/");

  const customMetadata = Object.fromEntries(
    Object.entries(metadata)
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([key, value]) => [key, String(value)]),
  );

  const result = await uploadBytes(storageRef(storage, fullPath), blob, {
    contentType: "image/jpeg",
    cacheControl: "private,max-age=0,no-transform",
    customMetadata,
  });

  return {
    path: result.metadata.fullPath,
    size: result.metadata.size,
  };
}

export async function loadPaymentSlipUrl(fullPath: string): Promise<string> {
  if (!fullPath) {
    throw new Error("ไม่พบตำแหน่งไฟล์สลิป");
  }

  return getDownloadURL(storageRef(storage, fullPath));
}