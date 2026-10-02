import { collection, doc, getDocs, onSnapshot, query, serverTimestamp, setDoc, where, writeBatch } from "firebase/firestore";
import { db } from "../client";
import { attendanceId, type Barber, type PosBranch, type Presence, type ReaderResult, type ReaderScan } from "../../domain/pos-attendance";

export async function listActiveBarbers(): Promise<Barber[]> {
  const result = await getDocs(query(collection(db, "barbers"), where("active", "==", true)));
  return result.docs.map((row) => ({ ...row.data(), id: row.id }) as Barber)
    .sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "th"));
}

export function watchPresence(branchId: string, next: (rows: Presence[]) => void, error: (error: Error) => void) {
  return onSnapshot(query(collection(db, "barber_presence"), where("branchId", "==", branchId)),
    (snapshot) => next(snapshot.docs.map((row) => row.data() as Presence)), error);
}

export function watchReaderScans(branchId: string, next: (rows: ReaderScan[], changes: { scan: ReaderScan; type: string }[]) => void, error: (error: Error) => void) {
  return onSnapshot(query(collection(db, "reader_scans"), where("branchId", "==", branchId)), (snapshot) => {
    const read = (row: { id: string; data: () => Record<string, unknown> }): ReaderScan => {
      const data = row.data();
      return { id: row.id, scanId: String(data.scanId || "").trim(), cardUid: String(data.cardUid || "") };
    };
    next(snapshot.docs.map(read), snapshot.docChanges().map((change) => ({ type: change.type, scan: read(change.doc) })));
  }, error);
}

export async function saveCheckIn(branch: PosBranch, barber: Barber, checkInMethod: "pin" | "rfid", dateKey: string) {
  const batch = writeBatch(db);
  const data = { barberId: barber.id, barberName: barber.name || "", branchId: branch.id, branchName: branch.name || "", dateKey,
    active: true, checkInAt: serverTimestamp(), updatedAt: serverTimestamp(), checkInMethod };
  batch.set(doc(db, "barber_presence", barber.id), data, { merge: true });
  batch.set(doc(db, "barber_attendance", attendanceId(branch.id, barber.id, dateKey)), { ...data, attended: true }, { merge: true });
  await batch.commit();
}

export async function saveReaderResult(branchId: string, scan: ReaderScan, result: ReaderResult) {
  if (!scan.scanId.trim()) throw new Error("RFID scan ไม่มี scanId");
  await setDoc(doc(db, "reader_results", scan.scanId.trim()), {
    scanId: scan.scanId.trim(), branchId, resultStatus: result.status, barberId: result.barber?.id || "",
    barberName: result.barber?.name || "", message: result.message, createdAt: serverTimestamp(),
  });
}

export async function saveStoreClosing(branch: PosBranch, barbers: readonly Barber[], closer: Barber, dateKey: string) {
  const batch = writeBatch(db);
  for (const barber of barbers) {
    const checkout = { active: false, checkOutAt: serverTimestamp(), updatedAt: serverTimestamp(), checkOutReason: "store_closed" };
    batch.set(doc(db, "barber_presence", barber.id), checkout, { merge: true });
    batch.set(doc(db, "barber_attendance", attendanceId(branch.id, barber.id, dateKey)), {
      barberId: barber.id, barberName: barber.name || "", branchId: branch.id, branchName: branch.name || "", dateKey, attended: true, ...checkout,
    }, { merge: true });
  }
  batch.set(doc(db, "daily_closings", `${branch.id}_${dateKey}`), {
    branchId: branch.id, branchName: branch.name || "", dateKey, closedByBarberId: closer.id,
    closedByBarberName: closer.name || "", closedAt: serverTimestamp(), closedBarberCount: barbers.length,
  }, { merge: true });
  await batch.commit();
}
