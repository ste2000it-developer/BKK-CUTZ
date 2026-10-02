import { logout, watchAuth } from "../shared/firebase/auth";
import { getBranch, getUserProfile } from "../shared/firebase/repositories/identity";
import type { PosBranch } from "../shared/domain/pos-attendance";
import type { User } from "firebase/auth";

const dependencies = { logout, watchAuth: (next: (user: User | null) => void) => watchAuth(next), getBranch, getUserProfile };
export function watchPosSession(update: (branch: PosBranch | null, initializing: boolean) => void, error: (message: string) => void, deps = dependencies) {
  let generation = 0;
  const stop = deps.watchAuth(async (user) => {
    const current = ++generation;
    const live = () => current === generation;
    update(null, Boolean(user));
    if (!user) return;
    try {
      const profile = await deps.getUserProfile(user.uid);
      if (!live()) return;
      if (profile.active !== true) throw new Error("บัญชีถูกปิดใช้งาน");
      if (profile.role !== "branch") throw new Error("บัญชีนี้ไม่ใช่บัญชีสาขา");
      const branchId = String(profile.branchId || "").trim();
      if (!branchId) throw new Error("บัญชีนี้ยังไม่ได้กำหนดสาขา");
      const branch = await deps.getBranch(branchId);
      if (!live()) return;
      if (branch.active !== true) throw new Error("สาขานี้ถูกปิดใช้งาน");
      if (!branch.serviceGroup) throw new Error("สาขานี้ยังไม่ได้กำหนดกลุ่มราคา");
      error("");
      update({ id: branch.id, name: String(branch.name || ""), serviceGroup: String(branch.serviceGroup) }, false);
    } catch (issue) {
      if (!live()) return;
      error(issue instanceof Error ? issue.message : "ตรวจสอบบัญชีไม่สำเร็จ");
      update(null, false);
      await deps.logout().catch(() => {});
    }
  });
  return () => { generation++; stop(); };
}
