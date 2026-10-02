import { useEffect, useRef, useState, type FormEvent } from "react";
import type { useAttendance } from "./useAttendance";

export function AttendanceModal({ attendance, onClose }: { attendance: ReturnType<typeof useAttendance>; onClose: () => void }) {
  const [closing, setClosing] = useState(false);
  const [pin, setPin] = useState("");
  const [status, setStatus] = useState("");
  const [failed, setFailed] = useState(false);
  const [pending, setPending] = useState(false);
  const live = useRef(true);
  const busy = useRef(false);
  useEffect(() => { live.current = true; return () => { live.current = false; }; }, []);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy.current) return;
    if (!/^\d{4}$/.test(pin)) { setStatus("กรุณาใส่ PIN ให้ครบ 4 หลัก"); setFailed(true); return; }
    busy.current = true; setPending(true); setFailed(false);
    try {
      const message = closing
        ? `ปิดร้านเรียบร้อย โดย ${(await attendance.closeStore(pin)).name}`
        : await attendance.checkInPin(pin).then((result) => `${result.barber.name} ${result.alreadyActive ? "เข้างานอยู่แล้ว" : "เข้างานเรียบร้อย"}`);
      if (live.current) { setStatus(message); setPin(""); setClosing(false); }
    } catch (error) {
      if (live.current) { setStatus(error instanceof Error ? error.message : "ไม่สามารถเข้างานได้"); setFailed(true); }
    } finally { busy.current = false; if (live.current) setPending(false); }
  }
  return <div className="modal" id="shiftModal"><div className="modal-backdrop" onClick={() => { if (!pending) onClose(); }} /><section className={closing ? "close-store-modal-card" : "shift-modal-card"} role="dialog" aria-modal="true" aria-labelledby="shiftTitle">
    <button className="modal-close" aria-label="ปิด" disabled={pending} onClick={onClose}>×</button>
    <h2 id="shiftTitle">{closing ? "ยืนยันปิดร้าน" : "จัดการช่างวันนี้"}</h2>
    <p>{closing ? "ใส่ PIN ของช่างที่กำลังเข้างานอยู่ เพื่อปิดงานของช่างทุกคนในสาขานี้" : "แตะบัตร RFID หรือใส่ PIN เพื่อเข้างาน"}</p>
    <form className="shift-checkin" onSubmit={(event) => void submit(event)}>
      <input autoFocus className="shift-pin-input" aria-label="PIN 4 หลัก" type="password" inputMode="numeric" maxLength={4} value={pin} disabled={pending} onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 4))} />
      <button className={closing ? "close-store-confirm-button" : "primary-button"} disabled={pending || !attendance.ready}>{pending ? "กำลังตรวจสอบ..." : closing ? "ยืนยันปิดร้าน" : "ยืนยันเข้างาน"}</button>
    </form>
    {status && <div role="status" className={`shift-status ${failed ? "is-error" : "is-success"}`}>{status}</div>}
    <div className="shift-divider" /><button className={closing ? "secondary-button" : "close-store-button"} disabled={pending} onClick={() => { setClosing(!closing); setPin(""); setStatus(""); }}>{closing ? "กลับ" : "ปิดร้าน"}</button>
  </section></div>;
}
