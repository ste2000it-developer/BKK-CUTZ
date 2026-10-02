import { describe, expect, it, vi } from "vitest";
vi.mock("../../../shared/firebase/repositories/attendance", () => ({}));
import { createAttendanceSession, type AttendanceDependencies } from "./session";
import { attendanceId, barberByPin, type Presence, type ReaderScan } from "../../../shared/domain/pos-attendance";

const branch = { id: "b1", name: "Branch", serviceGroup: "g1" };
const barber = { id: "a", name: "ช่าง", pin: "1234", rfidUid: "AABB" };
function fixture() {
  let presence!: (rows: Presence[]) => void;
  let scans!: Parameters<AttendanceDependencies["watchReaderScans"]>[1];
  const stopPresence = vi.fn(); const stopReader = vi.fn();
  const repo: AttendanceDependencies = {
    listActiveBarbers: vi.fn(async () => [barber]),
    watchPresence: vi.fn((_branch, next) => { presence = next; next([]); return stopPresence; }),
    watchReaderScans: vi.fn((_branch, next) => { scans = next; return stopReader; }),
    saveCheckIn: vi.fn(async () => {}), saveReaderResult: vi.fn(async () => {}), saveStoreClosing: vi.fn(async () => {}),
  };
  const update = vi.fn(); const error = vi.fn();
  const session = createAttendanceSession(branch, update, error, repo);
  const scan = (scanId: string, cardUid = "AA:BB"): ReaderScan => ({ id: "reader", scanId, cardUid });
  return { session, repo, update, error, scan, presence: (rows: Presence[]) => presence(rows),
    emit: (rows: ReaderScan[], type = "added") => scans(rows, rows.map((scan) => ({ scan, type }))), stopPresence, stopReader };
}
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
describe("attendance session contract", () => {
  it("seeds initial scans, deduplicates modifications, writes success/already_active/error messages", async () => {
    const f = fixture(); await f.session.ready;
    f.emit([f.scan("old")]); f.emit([f.scan("old")], "modified");
    expect(f.repo.saveCheckIn).not.toHaveBeenCalled();
    f.emit([f.scan("new")]); f.emit([f.scan("new")], "modified");
    f.emit([f.scan("second")]); f.emit([f.scan("bad", "CCDD")]);
    f.emit([f.scan("removed")], "removed"); f.emit([f.scan("")]);
    await flush();
    expect(f.repo.saveCheckIn).toHaveBeenCalledTimes(1);
    expect(f.repo.saveCheckIn).toHaveBeenCalledWith(branch, barber, "rfid", expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/));
    expect(vi.mocked(f.repo.saveReaderResult).mock.calls.map((call) => call[2])).toEqual([
      { status: "success", barber, message: "ช่าง เข้างานแล้ว" },
      { status: "already_active", barber, message: "ช่าง เข้างานอยู่แล้ว" },
      { status: "error", barber: null, message: "ไม่พบบัตรนี้ในระบบ" },
    ]);
    f.session.dispose();
  });
  it("supports PIN and permits closing only an active barber, serializing closing with scans", async () => {
    const f = fixture(); await f.session.ready;
    await expect(f.session.closeStore("1234")).rejects.toThrow("PIN นี้ไม่ใช่ช่าง");
    await expect(f.session.checkInPin("9999")).rejects.toThrow("ไม่พบช่าง");
    expect((await f.session.checkInPin("1234")).alreadyActive).toBe(false);
    expect((await f.session.checkInPin("1234")).alreadyActive).toBe(true);
    await f.session.closeStore("1234");
    expect(f.repo.saveCheckIn).toHaveBeenCalledWith(branch, barber, "pin", expect.any(String));
    expect(f.repo.saveStoreClosing).toHaveBeenCalledWith(branch, [barber], barber, expect.any(String));
    expect(f.update).toHaveBeenLastCalledWith([]);
    f.session.dispose();
  });
  it("unsubscribes and suppresses stale scan results, queued writes and UI updates", async () => {
    const f = fixture(); await f.session.ready; f.emit([]);
    let finish!: () => void;
    vi.mocked(f.repo.saveCheckIn).mockImplementationOnce(() => new Promise<void>((resolve) => { finish = resolve; }));
    f.emit([f.scan("one"), f.scan("two")]); await flush();
    f.session.dispose(); f.update.mockClear(); finish(); await flush();
    f.emit([f.scan("late")]); f.presence([]); await flush();
    expect(f.stopPresence).toHaveBeenCalledOnce(); expect(f.stopReader).toHaveBeenCalledOnce();
    expect(f.repo.saveCheckIn).toHaveBeenCalledOnce(); expect(f.repo.saveReaderResult).not.toHaveBeenCalled();
    expect(f.update).not.toHaveBeenCalled();
  });
  it("cannot attach listeners after disposal during loading", async () => {
    const f = fixture(); f.session.dispose(); await expect(f.session.ready).rejects.toThrow("session ended");
    expect(f.repo.watchPresence).not.toHaveBeenCalled();
  });
  it("keeps attendance IDs and duplicate PIN errors", () => {
    expect(attendanceId("branch", "barber", "2026-10-02")).toBe("2026-10-02_branch_barber");
    expect(() => barberByPin([barber, { ...barber, id: "b" }], "1234")).toThrow("PIN นี้ซ้ำกับช่างมากกว่า 1 คน กรุณาแก้ PIN ในระบบ");
  });
});
