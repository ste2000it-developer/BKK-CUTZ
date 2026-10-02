import { useEffect, useRef, useState } from "react";
import type { PosBranch } from "../../../shared/domain/pos-attendance";
import { normalizedTip, type Checkout, type PaymentMethod, type PosTransaction } from "../../../shared/domain/pos-payment";
import { calculatePosServiceTotal } from "../../../shared/domain/pos-services";
import { createPaymentAttempt } from "./submit-payment";
import { BackButton } from "../../../shared/components/BackButton";

export function PaymentPage({ branch, checkout, onCancel, onSuccess, onBusy, onScanChange }: {
  branch: PosBranch; checkout: Checkout; onCancel: () => void; onSuccess: (transaction: PosTransaction) => void; onBusy: (busy: boolean) => void; onScanChange: (scan: boolean) => void;
}) {
  const [scan, setScan] = useState(false);
  const [tipOpen, setTipOpen] = useState(false);
  const [tip, setTip] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [locked, setLocked] = useState(false);
  const live = useRef(true);
  const fileInput = useRef<HTMLInputElement>(null);
  const attempt = useRef<ReturnType<typeof createPaymentAttempt> | null>(null);
  const busy = useRef(false);
  useEffect(() => { live.current = true; return () => { live.current = false; }; }, []);
  useEffect(() => {
    if (!file) { setPreview(""); return; }
    const url = URL.createObjectURL(file); setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  const total = calculatePosServiceTotal(checkout.services);
  const money = (value: number) => `${value.toLocaleString("th-TH")} บาท`;
  async function pay(method: PaymentMethod) {
    if (busy.current) return;
    if (method === "scan" && !file) { setError("กรุณาถ่ายรูปสลิปก่อนยืนยันการชำระเงิน"); return; }
    busy.current = true; setPending(true); onBusy(true); setError(""); setLocked(true);
    attempt.current ??= createPaymentAttempt(branch, checkout);
    try {
      const transaction = await attempt.current(method, tip, file, () => live.current);
      if (live.current) onSuccess(transaction);
    } catch (issue) { if (live.current) setError(issue instanceof Error ? issue.message : "บันทึกรายการไม่สำเร็จ กรุณาลองอีกครั้ง"); }
    finally { busy.current = false; if (live.current) { setPending(false); onBusy(false); } }
  }
  const status = <>{error && <div className="error-box" role="alert">{error}{locked && <p>ลองบันทึกซ้ำด้วยรายการเดิม</p>}</div>}</>;
  if (!scan) return <div className="modal" id="paymentModal"><div className="modal-backdrop" /><section className="payment-modal-card" role="dialog" aria-modal="true" aria-labelledby="paymentTitle">
    <div className="payment-kicker">ชำระเงิน</div><h2 id="paymentTitle">เลือกวิธีชำระเงิน</h2><div className="modal-amount-label">ยอดชำระ</div><div className="modal-amount">{money(total)}</div>
    <button className="payment-choice" disabled={pending} onClick={() => void pay("cash")}><span className="payment-choice-icon material-symbols-outlined">payments</span><span>{pending ? "กำลังบันทึก..." : "เงินสด"}</span></button>
    <button className="payment-choice" disabled={pending || locked} onClick={() => { setScan(true); onScanChange(true); }}><span className="payment-choice-icon material-symbols-outlined">qr_code_scanner</span><span>สแกนจ่าย</span></button>
    {status}<button className="secondary-button" disabled={pending || locked} onClick={onCancel}>ยกเลิก</button>
  </section></div>;
  return <section id="qrPage" className="page"><div className="payment-page-card">
    <BackButton ariaLabel="กลับไปแก้ไขรายการ" disabled={pending || locked} onClick={() => { setScan(false); onScanChange(false); }} />
    <div className="page-kicker">ชำระเงิน</div><h1>สแกนจ่าย</h1><div className="qr-total">{money(total)}</div>
    <div className="qr-box"><div className="qr-placeholder"><svg viewBox="0 0 100 100" aria-hidden="true"><rect x="8" y="8" width="28" height="28" /><rect x="64" y="8" width="28" height="28" /><rect x="8" y="64" width="28" height="28" /><path d="M48 10h10v10H48zM46 28h12v12H46zM64 48h12v10H64zM48 50h10v12H48zM80 64h12v12H80zM48 72h12v20H48zM65 72h10v10H65z" /></svg><span>TrueMoney QR</span></div></div>
    <div className="payment-extras"><section className="payment-extra-block"><div className="payment-extra-head"><div><strong>ทิปช่าง</strong><small>กรอกเฉพาะกรณีลูกค้าโอนทิปเพิ่ม</small></div><button className="payment-extra-action" disabled={locked} onClick={() => setTipOpen(!tipOpen)}>{tipOpen ? "ปิดช่องทิป" : "+ เพิ่มทิป"}</button></div>
      {tipOpen && <div className="tip-entry"><div className="tip-quick-grid">{[20, 50, 100, 200].map((amount) => <button className={tip === amount ? "active" : ""} key={amount} disabled={locked} onClick={() => setTip(amount)}>{amount}</button>)}</div><label className="tip-input-shell"><span>฿</span><input aria-label="จำนวนทิป" type="number" min="0" step="1" value={tip || ""} disabled={locked} onChange={(event) => setTip(normalizedTip(event.target.value))} /></label></div>}
      <div className="payment-extra-summary"><span>ทิป</span><strong>{money(tip)}</strong></div><div className="payment-extra-summary grand"><span>ยอดรับรวม</span><strong>{money(total + tip)}</strong></div></section>
      <section className="payment-extra-block"><div className="payment-extra-head"><div><strong>รูปสลิป</strong><small>ถ่ายรูปสลิปเพื่อเก็บเป็นหลักฐาน</small></div></div>
        <input ref={fileInput} className="hidden" type="file" accept="image/*" capture="environment" disabled={pending} onChange={(event) => { const next = event.target.files?.[0]; if (!next) return; if (!next.type.startsWith("image/")) { setFile(null); setError("กรุณาเลือกไฟล์รูปภาพ"); return; } setFile(next); setError(""); }} />
        <button className="slip-capture-button" disabled={pending} onClick={() => fileInput.current?.click()}><span className="material-symbols-outlined">photo_camera</span>{file ? "ถ่ายใหม่" : "ถ่ายสลิป"}</button>
        {preview && <div className="slip-preview"><img src={preview} alt="ตัวอย่างสลิป" /><div className="slip-status">{pending ? "กำลังบันทึกรูปสลิป..." : "ถ่ายสลิปแล้ว • พร้อมบันทึก"}</div></div>}
      </section></div>
    <div className="check-card"><strong>ตรวจสอบก่อนยืนยัน</strong>{["ยอดเงินถูกต้อง", "ชื่อผู้รับถูกต้อง", "เวลาในสลิปถูกต้อง", "ถ่ายรูปสลิปแล้ว"].map((text) => <div key={text}><span>✓</span> {text}</div>)}</div>
    {status}<button className="primary-button" disabled={pending} onClick={() => void pay("scan")}>{pending ? "กำลังบันทึกรูปสลิป..." : "ตรวจสลิปแล้ว — ชำระแล้ว →"}</button>
  </div></section>;
}
