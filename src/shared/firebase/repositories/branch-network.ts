import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../client";
import type { NetworkData } from "../../domain/branch-network";
export function watchBranchNetwork(dateKey: string, next: (data: NetworkData, cached: boolean) => void, error: (issue: Error) => void) {
  const data: NetworkData = { branches: [], transactions: [], presence: [], closings: [] };
  const ready = new Set<string>(); const cached = new Set<string>();
  let live = true;
  const sources = [
    ["branches", "branches"], ["transactions", "transactions"],
    ["presence", "barber_presence"], ["closings", "daily_closings"],
  ] as const;
  const stops = sources.map(([key, name]) => {
    const ref = collection(db, name);
    return onSnapshot(key === "branches" ? query(ref) : query(ref, where("dateKey", "==", dateKey)),
      { includeMetadataChanges: true }, (snapshot) => {
        if (!live) return;
        const rows = snapshot.docs.map((row) => ({ ...row.data(), id: row.id }));
        Object.assign(data, { [key]: rows });
        ready.add(key);
        if (snapshot.metadata.fromCache) cached.add(key); else cached.delete(key);
        if (ready.size === sources.length) next({ ...data }, cached.size > 0);
      }, (issue) => { if (live) error(issue); });
  });
  return () => { live = false; for (const stop of stops) stop(); };
}
