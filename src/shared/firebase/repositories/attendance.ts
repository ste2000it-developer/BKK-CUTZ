import { collection, doc, getDocs, onSnapshot, query, runTransaction, serverTimestamp, setDoc, where } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { app, db } from "../client";
import { attendanceId, type Barber, type PosBranch, type Presence, type ReaderResult, type ReaderScan } from "../../domain/pos-attendance";
import { bangkokBusinessDate, cashDifference, type CashClosingInput } from "../../domain/cash-closing";
import { loadCashClosingSummary } from "./cash-closing";
export { loadCashClosingSummary } from "./cash-closing";

async function sendAdminAttendancePush(notificationId: string) {
  const pushFunctions = getFunctions(app, "asia-southeast1");
  const requestAdminAttendancePush = httpsCallable<{ notificationId: string }>(pushFunctions, "pushAdminAttendance");
  await requestAdminAttendancePush({ notificationId });
}

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
  const id = attendanceId(branch.id, barber.id, dateKey);
  const notificationId = await runTransaction(db, async (batch) => {
    const attendanceRef = doc(db, "barber_attendance", id);
    const previous = await batch.get(attendanceRef);
    const data = { barberId: barber.id, barberName: barber.name || "", branchId: branch.id, branchName: branch.name || "", dateKey,
      active: true, checkInAt: serverTimestamp(), updatedAt: serverTimestamp(), checkInMethod };
    batch.set(doc(db, "barber_presence", barber.id), data, { merge: true });
    batch.set(attendanceRef, { ...data, attended: true }, { merge: true });
    // Concurrent transactions retry; only the first attendance creates an event.
    if (!previous.exists()) {
      const createdNotificationId = `attendance-checkin_${id}`;
      batch.set(doc(db, "admin_notifications", createdNotificationId), {
        id: createdNotificationId, type: "attendance_checkin", attendanceId: id,
        barberId: data.barberId, barberName: data.barberName, branchId: data.branchId, branchName: data.branchName,
        eventAt: data.checkInAt, createdAt: serverTimestamp(), read: false, message: `${data.barberName} เข้างานแล้ว`,
      });
      return createdNotificationId;
    }
    return "";
  });

  // Firestore is in Bangkok (asia-southeast3), where Firestore Eventarc triggers
  // for Cloud Functions are not available yet. Call the authenticated HTTPS
  // function after the transaction commits instead.
  if (notificationId) {
    try {
      await sendAdminAttendancePush(notificationId);
    } catch (issue) {
      console.error("Admin attendance push failed:", issue);
    }
  }
}

export async function saveReaderResult(branchId: string, scan: ReaderScan, result: ReaderResult) {
  if (!scan.scanId.trim()) throw new Error("RFID scan ไม่มี scanId");
  await setDoc(doc(db, "reader_results", scan.scanId.trim()), {
    scanId: scan.scanId.trim(), branchId, resultStatus: result.status, barberId: result.barber?.id || "",
    barberName: result.barber?.name || "", message: result.message, createdAt: serverTimestamp(),
  });
}

export async function saveStoreClosing(branch: PosBranch, barbers: readonly Barber[], closer: Barber, dateKey: string, cash: CashClosingInput) {
  if (!branch.id || !closer.id || !closer.name || !barbers.some((barber) => barber.id === closer.id)) throw new Error("ไม่พบสาขาหรือช่างผู้ปิดร้าน");
  if (dateKey !== bangkokBusinessDate() || cash.summary.businessDate !== dateKey || cash.summary.branchId !== branch.id) {
    throw new Error("วันที่หรือสาขาเปลี่ยนแล้ว กรุณาย้อนกลับและเปิดสรุปใหม่");
  }
  const actualCash = cashDifference(cash.actualCash, 0);
  cashDifference(cash.actualCash, cash.summary.expectedCash);
  const fresh = await loadCashClosingSummary(branch.id, dateKey);
  if (fresh.cashSales !== cash.summary.cashSales || fresh.shopExpenses !== cash.summary.shopExpenses
    || fresh.cashTipWithdrawals !== cash.summary.cashTipWithdrawals || fresh.expectedCash !== cash.summary.expectedCash) {
    throw new Error("รายการเงินสดเปลี่ยนแล้ว กรุณาย้อนกลับและเปิดสรุปใหม่");
  }
  const difference = cashDifference(actualCash, fresh.expectedCash);
  const id = `${branch.id}_${dateKey}`;
  await runTransaction(db, async (batch) => {
    const closingRef = doc(db, "daily_closings", id);
    const existing = await batch.get(closingRef);
    if (existing.exists()) throw new Error("สาขานี้มีประวัติปิดร้านของวันนี้แล้ว ไม่สามารถบันทึกซ้ำได้");
    if (dateKey !== bangkokBusinessDate()) throw new Error("วันที่เปลี่ยนแล้ว กรุณาเปิดสรุปใหม่");
    // All writes commit together: a failed closing never checks anybody out.
    batch.set(closingRef, {
      id, ...fresh, actualCash, difference, cashClosingVersion: 1,
      branchName: branch.name || "", dateKey, closedByBarberId: closer.id,
      closedByBarberName: closer.name, closedAt: serverTimestamp(), closedBarberCount: barbers.length,
    });
    const notificationId = "store-closed_" + id;
    batch.set(doc(db, "admin_notifications", notificationId), {
      id: notificationId, type: "store_closed", closingId: id,
      barberId: closer.id, barberName: closer.name, branchId: branch.id, branchName: branch.name || "",
      eventAt: serverTimestamp(), createdAt: serverTimestamp(), read: false,
      message: closer.name + " ปิดร้านแล้ว",
    });
    for (const barber of barbers) {
      const checkout = { active: false, checkOutAt: serverTimestamp(), updatedAt: serverTimestamp(), checkOutReason: "store_closed" };
      batch.set(doc(db, "barber_presence", barber.id), checkout, { merge: true });
      batch.set(doc(db, "barber_attendance", attendanceId(branch.id, barber.id, dateKey)), {
        barberId: barber.id, barberName: barber.name || "", branchId: branch.id, branchName: branch.name || "", dateKey, attended: true, ...checkout,
      }, { merge: true });
    }
  });
}
