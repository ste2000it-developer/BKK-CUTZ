import { barberByPin, createScanGate, localDateKey, type Barber, type PosBranch } from "../../../shared/domain/pos-attendance";
import { findBarberByRfid } from "../../../shared/domain/rfid";
import * as repository from "../../../shared/firebase/repositories/attendance";

export type AttendanceDependencies = typeof repository;

/** One branch session owns all listeners and queued work. Already submitted writes cannot be revoked. */
export function createAttendanceSession(branch: PosBranch, update: (barbers: Barber[]) => void, onError: (error: Error) => void, repo: AttendanceDependencies = repository) {
  let disposed = false;
  let barbers: Barber[] = [];
  let active: Barber[] = [];
  let stopPresence = () => {};
  let stopReader = () => {};
  let queue: Promise<unknown> = Promise.resolve();
  let cancelReady = () => {};
  const assertLive = () => { if (disposed) throw new Error("POS session ended"); };
  const report = (error: unknown) => { if (!disposed) onError(error instanceof Error ? error : new Error(String(error))); };
  function enqueue<T>(task: () => Promise<T>): Promise<T> {
    const result = queue.then(() => { assertLive(); return task(); });
    queue = result.catch(() => {});
    return result;
  }
  async function checkIn(barber: Barber, method: "pin" | "rfid") {
    assertLive();
    const alreadyActive = active.some((row) => row.id === barber.id);
    if (!alreadyActive) {
      await repo.saveCheckIn(branch, barber, method, localDateKey());
      assertLive();
      // Do not wait for the presence snapshot before processing the next queued scan/PIN.
      if (!active.some((row) => row.id === barber.id)) active = [...active, barber];
      update(active);
    }
    return { barber, alreadyActive };
  }
  const ready = (async () => {
    barbers = await repo.listActiveBarbers();
    assertLive();
    await new Promise<void>((resolve, reject) => {
      cancelReady = () => reject(new Error("POS session ended"));
      const today = localDateKey();
      stopPresence = repo.watchPresence(branch.id, (rows) => {
        if (disposed) return;
        const ids = new Set(rows.filter((row) => row.active === true && row.dateKey === today).map((row) => row.barberId));
        active = barbers.filter((row) => ids.has(row.id));
        update(active);
        resolve();
      }, (error) => { report(error); reject(error); });
    });
    assertLive();
    const gate = createScanGate();
    let initial = true;
    stopReader = repo.watchReaderScans(branch.id, (rows, changes) => {
      if (disposed) return;
      if (initial) { gate.seed(rows); initial = false; return; }
      for (const { scan, type } of changes) {
        if (!gate.accept(scan, type)) continue;
        void enqueue(async () => {
          try {
            const match = findBarberByRfid(barbers, scan.cardUid);
            if (!match.barber) throw new Error(match.error || "ไม่พบ UID ของบัตร");
            const result = await checkIn(match.barber, "rfid");
            assertLive();
            await repo.saveReaderResult(branch.id, scan, {
              status: result.alreadyActive ? "already_active" : "success", barber: result.barber,
              message: result.alreadyActive ? `${result.barber.name} เข้างานอยู่แล้ว` : `${result.barber.name} เข้างานแล้ว`,
            });
          } catch (error) {
            assertLive();
            await repo.saveReaderResult(branch.id, scan, { status: "error", barber: null,
              message: error instanceof Error ? error.message : "ไม่สามารถเข้างานด้วยบัตร RFID ได้" });
          }
        }).catch(report);
      }
    }, report);
  })();
  return {
    ready,
    checkInPin: (pin: string) => enqueue(() => checkIn(barberByPin(barbers, pin), "pin")),
    closeStore: (pin: string) => enqueue(async () => {
      const closer = barberByPin(barbers, pin);
      if (!active.some((row) => row.id === closer.id)) throw new Error("PIN นี้ไม่ใช่ช่างที่กำลังเข้างานอยู่ในสาขานี้");
      await repo.saveStoreClosing(branch, active, closer, localDateKey());
      assertLive();
      active = [];
      update(active);
      return closer;
    }),
    dispose() { disposed = true; stopPresence(); stopReader(); cancelReady(); },
  };
}
