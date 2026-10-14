import { collection, doc, getDocs, runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "../client";

export type BranchRecord = {
  id: string;
  name?: string;
  serviceGroup?: string;
  active?: boolean;
  [field: string]: unknown;
};

export async function listBranches(): Promise<BranchRecord[]> {
  const snapshot = await getDocs(collection(db, "branches"));

  return snapshot.docs
    .map((branch) => ({
      ...branch.data(),
      id: branch.id,
    }))
    .sort((first, second) => first.id.localeCompare(second.id, "th", { numeric: true })) as BranchRecord[];
}
export type BranchInput = { id: string; name: string; serviceGroup: string; active: boolean };

export async function saveBranch(input: BranchInput, mode: "create" | "update"): Promise<string> {
  const id = input.id.trim();
  const name = input.name.trim();
  const serviceGroup = input.serviceGroup.trim();
  if (!id || id === "." || id === ".." || /[\/\\\x00-\x1f]/.test(id) || /^__.*__$/.test(id) || new TextEncoder().encode(id).length > 1500) throw new Error("รหัสสาขาไม่ถูกต้อง ห้ามใช้ / หรือ \\ ในรหัส");
  if (!name) throw new Error("กรุณาระบุชื่อสาขา");
  if (!serviceGroup) throw new Error("กรุณาเลือกกลุ่มราคา");
  if (typeof input.active !== "boolean") throw new Error("กรุณาระบุสถานะสาขา");
  const ref = doc(db, "branches", id);
  await runTransaction(db, async (transaction) => {
    const existing = await transaction.get(ref);
    if (mode === "create" && existing.exists()) throw new Error("รหัสสาขานี้มีอยู่แล้ว กรุณาใช้รหัสอื่น");
    if (mode === "update" && !existing.exists()) throw new Error("ไม่พบสาขาที่ต้องการแก้ไข กรุณาโหลดข้อมูลใหม่");
    const data = { name, serviceGroup, active: input.active, updatedAt: serverTimestamp() };
    if (mode === "create") transaction.set(ref, { ...data, createdAt: serverTimestamp() });
    else transaction.update(ref, data);
  });
  return id;
}
