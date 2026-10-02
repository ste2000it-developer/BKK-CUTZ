import { collection, getDocs } from "firebase/firestore";
import { db } from "../client";

export type BranchRecord = {
  id: string;
  name?: string;
  serviceGroup?: string;
  [field: string]: unknown;
};

export async function listBranches(): Promise<BranchRecord[]> {
  const snapshot = await getDocs(collection(db, "branches"));

  return snapshot.docs
    .map((branch) => ({
      id: branch.id,
      ...branch.data(),
    }))
    .sort((first, second) => first.id.localeCompare(second.id)) as BranchRecord[];
}