import { collection, doc, getDocsFromServer, limit, onSnapshot, orderBy, query, updateDoc, where, writeBatch, type Timestamp } from "firebase/firestore";
import { db } from "../client";
export type AdminNotification = {
  id: string;
  barberId: string; barberName: string; branchId: string; branchName: string;
  eventAt: Timestamp | null; createdAt: Timestamp | null; read: boolean; message: string;
} & (
  { type: "attendance_checkin"; attendanceId: string }
  | { type: "store_closed"; closingId: string }
);
export function watchAdminNotifications(next: (rows: AdminNotification[]) => void, error: (issue: Error) => void) {
  return onSnapshot(query(collection(db, "admin_notifications"), orderBy("eventAt", "desc"), limit(50)),
    (snapshot) => next(snapshot.docs.map((row) => ({ ...row.data(), id: row.id }) as AdminNotification)), error);
}
// Counts unread beyond the latest 50, capped at 100+ to bound document reads.
export function watchAdminUnread(next: (count: number) => void, error: (issue: Error) => void) {
  return onSnapshot(query(collection(db, "admin_notifications"), where("read", "==", false), limit(101)),
    (snapshot) => next(snapshot.size), error);
}
export function markAdminNotificationRead(id: string) {
  return updateDoc(doc(db, "admin_notifications", id), { read: true });
}

/** Drain unread in bounded batches, including items outside the latest 50. */
export async function markAllAdminNotificationsRead() {
  const unread = query(collection(db, "admin_notifications"), where("read", "==", false), limit(100));
  while (true) {
    // Server reads avoid re-reading stale cached unread documents after a commit.
    const snapshot = await getDocsFromServer(unread);
    if (snapshot.empty) return;
    const batch = writeBatch(db);
    for (const row of snapshot.docs) batch.update(row.ref, { read: true });
    await batch.commit();
    if (snapshot.size < 100) return;
  }
}
