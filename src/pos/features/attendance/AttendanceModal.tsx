import { useEffect, useRef, useState, type FormEvent } from "react";
import type { useAttendance } from "./useAttendance";
import { cashDifference } from "../../../shared/domain/cash-closing";
import { CashClosingForm } from "./CashClosingForm";

export function AttendanceModal({ attendance, onClose }: { attendance: ReturnType<typeof useAttendance>; onClose: () => void }) {
  const [closing, setClosing] = useState(false);
  const [pin, setPin] = useState("");
  const [status, setStatus] = useState("");
  const [failed, setFailed] = useState(false);
  const [pending, setPending] = useState(false);
  const [cashReview, setCashReview] = useState<Awaited<ReturnType<typeof attendance.prepareClosing>> | null>(null);
  const [actualCash, setActualCash] = useState("");
  const [success, setSuccess] = useState<{ title: string; detail: string } | null>(null);
  const live = useRef(true);
  const busy = useRef(false);
  useEffect(() => { live.current = true; return () => { live.current = false; }; }, []);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy.current) return;
    if (!/^\d{4}$/.test(pin)) { setStatus("กรุณาใส่ PIN ให้ครบ 4 หลัก"); setFailed(true); return; }
    busy.current = true; setPending(true); setFailed(false);
    try {
      if (closing && !cashReview) {
        const review = await attendance.prepareClosing(pin);
        if (live.current) { setCashReview(review); setActualCash(""); setStatus(""); }
        return;
      }
      if (closing) {
        if (!actualCash.trim() || !/^\d+(\.\d{1,2})?$/.test(actualCash)) throw new Error("กรุณากรอกเงินสดที่นับจริงเป็นตัวเลข ทศนิยมไม่เกิน 2 ตำแหน่ง");
        cashDifference(Number(actualCash), cashReview!.summary.expectedCash);
      }
      const result = closing
        ? { title: "ปิดร้านเรียบร้อยแล้ว", detail: `ปิดร้านโดย ${(await attendance.closeStore(pin, { summary: cashReview!.summary, actualCash: Number(actualCash) })).name}` }
        : await attendance.checkInPin(pin).then((result) => ({
          title: result.barber.name,
          detail: result.alreadyActive ? "เข้างานอยู่แล้ว" : "เข้างานเรียบร้อยแล้ว",
        }));
      if (live.current) { setSuccess(result); setStatus(""); setPin(""); }
    } catch (error) {
      if (live.current) { setStatus(error instanceof Error ? error.message : "ไม่สามารถเข้างานได้"); setFailed(true); }
    } finally { busy.current = false; if (live.current) setPending(false); }
  }
  if (success) return <div className="modal" id="shiftModal">
    <div className="modal-backdrop" onClick={onClose} />
    <section className="shift-modal-card shift-success-card" role="dialog" aria-modal="true" aria-labelledby="shiftSuccessTitle" aria-describedby="shiftSuccessDetail">
      <button className="modal-close" type="button" aria-label="ปิด" onClick={onClose}>×</button>
      <h2 id="shiftSuccessTitle">{success.title}</h2>
      <p id="shiftSuccessDetail">{success.detail}</p>
      <button className="primary-button" type="button" autoFocus onClick={onClose}>ตกลง</button>
    </section>
  </div>;
  return <div className="modal" id="shiftModal"><div className="modal-backdrop" onClick={() => { if (!pending) onClose(); }} /><section className={closing ? "close-store-modal-card" : "shift-modal-card"} role="dialog" aria-modal="true" aria-labelledby="shiftTitle">
    <button className="modal-close" aria-label="ปิด" disabled={pending} onClick={onClose}>×</button>
    <h2 id="shiftTitle">{cashReview ? "สรุปเงินสดวันนี้" : closing ? "ยืนยันปิดร้าน" : "จัดการช่างวันนี้"}</h2>
    {cashReview ? <CashClosingForm review={cashReview} actualCash={actualCash} onChange={setActualCash} pending={pending}
      onSubmit={(event) => void submit(event)} onBack={() => { setCashReview(null); setActualCash(""); setStatus(""); setPin(""); }} /> : <>
    <p>{closing ? "ใส่ PIN ของช่างที่กำลังเข้างานอยู่ เพื่อดูสรุปเงินสดก่อนปิดร้าน" : "แตะบัตร RFID หรือใส่ PIN เพื่อเข้างาน"}</p>
    <form className="shift-checkin" onSubmit={(event) => void submit(event)}>
      <input autoFocus className="shift-pin-input" aria-label="PIN 4 หลัก" type="password" inputMode="numeric" maxLength={4} value={pin} disabled={pending} onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 4))} />
      <button className={closing ? "close-store-confirm-button" : "primary-button"} disabled={pending || !attendance.ready}>{pending ? "กำลังตรวจสอบ..." : closing ? "ดูสรุปเงินสด" : "ยืนยันเข้างาน"}</button>
    </form>
    </>}
    {status && <div role="status" className={`shift-status ${failed ? "is-error" : "is-success"}`}>{status}</div>}
    {!cashReview && <><div className="shift-divider" />
    {closing ? (
      <button className="close-store-back-button" type="button" disabled={pending} onClick={() => { setClosing(false); setPin(""); setStatus(""); }}>กลับไปจัดการช่าง</button>
    ) : (
      <div className="close-store-section">
        <div><strong>เสร็จงานวันนี้แล้ว?</strong><p>ปิดการเข้างานของช่างทุกคนในสาขานี้</p></div>
        <button className="close-store-button" type="button" disabled={pending} onClick={() => { setClosing(true); setPin(""); setStatus(""); }}>ปิดร้าน</button>
      </div>
    )}</>}
  </section></div>;
}
