import { doc, getDoc } from "firebase/firestore";
import { db } from "../client";

export type UserProfile = {
  id: string;
  [field: string]: unknown;
};

export type Branch = {
  id: string;
  [field: string]: unknown;
};

export async function getUserProfile(uid: string): Promise<UserProfile> {
  const snapshot = await getDoc(doc(db, "users", uid));

  if (!snapshot.exists()) {
    throw new Error("ไม่พบข้อมูลบัญชีนี้ใน Firestore");
  }

  return {
    id: snapshot.id,
    ...snapshot.data(),
  };
}

export async function getBranch(branchId: string): Promise<Branch> {
  const snapshot = await getDoc(doc(db, "branches", branchId));

  if (!snapshot.exists()) {
    throw new Error("ไม่พบข้อมูลสาขา");
  }

  return {
    id: snapshot.id,
    ...snapshot.data(),
  };
}