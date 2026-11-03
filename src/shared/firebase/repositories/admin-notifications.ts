import { collection, doc, getDocsFromServer, limit, onSnapshot, orderBy, query, startAfter, updateDoc, writeBatch, type Timestamp } from "firebase/firestore";
import { db } from "../client";

export type AdminNotification = {
  id: string;
  barberId: string; barberName: string; branchId: string; branchName: string;
  eventAt: Timestamp | null; createdAt: Timestamp | null; read: boolean; message: string;
  readBy?: Record<string, boolean>;
} & (
  { type: "attendance_checkin"; attendanceId: string }
  | { type: "store_closed"; closingId: string }
);

function userHasRead(data: Pick<AdminNotification, "read" | "readBy">, uid: string): boolean {
  // Preserve legacy global read receipts without adding more global updates.
  return data.read === true || data.readBy?.[uid] === true;
}

export function watchAdminNotifications(uid: string, next: (rows: AdminNotification[]) => void, error: (issue: Error) => void) {
  return onSnapshot(query(collection(db, "admin_notifications"), orderBy("eventAt", "desc"), limit(50)),
    (snapshot) => next(snapshot.docs.map((row) => {
      const data = row.data() as AdminNotification;
      return { ...data, id: row.id, read: userHasRead(data, uid) };
    })), error);
}

// Bounded count of recent events; 100+ is shown if all of the latest 101 are unread.
export function watchAdminUnread(uid: string, next: (count: number) => void, error: (issue: Error) => void) {
  return onSnapshot(query(collection(db, "admin_notifications"), orderBy("eventAt", "desc"), limit(101)),
    (snapshot) => next(snapshot.docs.filter((row) => !userHasRead(row.data() as AdminNotification, uid)).length), error);
}

export function markAdminNotificationRead(uid: string, id: string) {
  return updateDoc(doc(db, "admin_notifications", id), { [`readBy.${uid}`]: true });
}

/** Explicitly mark all unread events for this admin only, in bounded write batches. */
export async function markAllAdminNotificationsRead(uid: string) {
  const collectionRef = collection(db, "admin_notifications");
  let previous: unknown = null;
  while (true) {
    const page = previous
      ? query(collectionRef, orderBy("eventAt", "desc"), startAfter(previous), limit(100))
      : query(collectionRef, orderBy("eventAt", "desc"), limit(100));
    const snapshot = await getDocsFromServer(page);
    if (snapshot.empty) return;
    const unread = snapshot.docs.filter((row) => !userHasRead(row.data() as AdminNotification, uid));
    if (unread.length) {
      const batch = writeBatch(db);
      unread.forEach((row) => batch.update(row.ref, { [`readBy.${uid}`]: true }));
      await batch.commit();
    }
    if (snapshot.size < 100) return;
    previous = snapshot.docs[snapshot.docs.length - 1];
  }
}
