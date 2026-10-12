import { useEffect, useRef, useState, type FormEvent } from "react";
import { barberByPin, localDateKey, type Barber } from "../../../shared/domain/pos-attendance";
import { filterHistory, formatDateTime, formatMoney, historyAmounts, historyBarbers } from "../../../shared/domain/pos-history";
import { isVoidedTransaction } from "../../../shared/domain/transaction-status";
import { listPosTransactions, voidPosTransaction } from "../../../shared/firebase/repositories/pos-transactions";
import type { TransactionHistoryRecord } from "../../../shared/firebase/repositories/transactions";
import { TransactionSummary } from "./TransactionSummary";

export function HistoryModal({ branchId, barbers, onClose }: { branchId: string; barbers: readonly Barber[]; onClose: () => void }) {
  const [date, setDate] = useState(localDateKey);
  const [barberId, setBarberId] = useState("all");
  const [rows, setRows] = useState<TransactionHistoryRecord[]>([]);
  const [detail, setDetail] = useState<TransactionHistoryRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [selectOpen, setSelectOpen] = useState(false);
  const [voidTarget, setVoidTarget] = useState<TransactionHistoryRecord | null>(null);
  const [voidPin, setVoidPin] = useState("");
  const [voidReason, setVoidReason] = useState("");
  const [voidError, setVoidError] = useState("");
  const [voidPending, setVoidPending] = useState(false);
  const [notice, setNotice] = useState("");
  const select = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const outside = (event: MouseEvent) => { if (event.target instanceof Node && !select.current?.contains(event.target)) setSelectOpen(false); };
    document.addEventListener("click", outside);
    return () => document.removeEventListener("click", outside);
  }, []);

  useEffect(() => {
    let live = true;
    setLoading(true);
    setRows([]);
    setDetail(null);
    setError("");
    void listPosTransactions(branchId, date || localDateKey()).then((result) => {
      if (!live) return;
      setRows(result);
      setBarberId((previous) => result.some((row) => row.barberId === previous) ? previous : "all");
    }).catch((issue: unknown) => {
      if (live) setError(issue instanceof Error ? issue.message : "โหลดประวัติไม่สำเร็จ");
    }).finally(() => {
      if (live) setLoading(false);
    });
    return () => { live = false; };
  }, [branchId, date, refresh]);

  const barberOptions = historyBarbers(rows);
  const filtered = filterHistory(rows, barberId);

  function openVoid(transaction: TransactionHistoryRecord) {
    setVoidTarget(transaction);
    setVoidPin("");
    setVoidReason("");
    setVoidError("");
  }

  async function confirmVoid(event: FormEvent) {
    event.preventDefault();
    if (!voidTarget || voidPending) return;
    setVoidError("");

    if (isVoidedTransaction(voidTarget)) {
      setVoidError("รายการนี้ถูกยกเลิกไปแล้ว");
      return;
    }
    if (voidTarget.dateKey !== localDateKey()) {
      setVoidError("POS ยกเลิกได้เฉพาะรายการของวันนี้เท่านั้น");
      return;
    }
    if (!barbers.length) {
      setVoidError("ต้องมีช่างที่กำลังเข้างานอยู่เพื่อยืนยันการยกเลิกรายการ");
      return;
    }
    if (!/^\d{4}$/.test(voidPin)) {
      setVoidError("กรุณาใส่ PIN ของช่างให้ครบ 4 หลัก");
      return;
    }
    const reason = voidReason.trim();
    if (!reason) {
      setVoidError("กรุณาระบุเหตุผลที่ยกเลิกรายการ");
      return;
    }

    try {
      const actor = barberByPin(barbers, voidPin);
      setVoidPending(true);
      await voidPosTransaction(voidTarget.id, {
        barberId: actor.id,
        barberName: actor.name,
        reason,
      });
      setVoidTarget(null);
      setDetail(null);
      setVoidPin("");
      setVoidReason("");
      setNotice("ยกเลิกรายการเรียบร้อยแล้ว รายการยังถูกเก็บไว้เป็นประวัติ");
      setRefresh((value) => value + 1);
    } catch (issue) {
      setVoidError(issue instanceof Error ? issue.message : "ยกเลิกรายการไม่สำเร็จ");
    } finally {
      setVoidPending(false);
    }
  }

  return <section id="historyPage" className="history-modal" role="dialog" aria-modal="true" aria-labelledby="historyTitle">
    <div className="history-modal-backdrop" onClick={onClose} />
    <div className="history-modal-card">
      <div className="history-popup-head"><div><div className="page-kicker">ประวัติของสาขานี้</div><h2 id="historyTitle">ประวัติรายการ</h2><p>แตะรายการเพื่อดูรายละเอียดแบบหน้าสรุป</p></div><button className="modal-close" aria-label="ปิดประวัติ" onClick={onClose}>×</button></div>
      <div className="history-controls">
        <label className="history-control"><span>วันที่</span><input type="date" value={date} onChange={(event) => { setDate(event.target.value); setNotice(""); }} /></label>
        <div className="history-control"><span>ช่าง</span><div ref={select} className={`history-custom-select${selectOpen ? " open" : ""}`}><button className="history-custom-select-button" aria-haspopup="listbox" aria-expanded={selectOpen} onClick={() => setSelectOpen(!selectOpen)}>{barberOptions.find((barber) => barber.id === barberId)?.name || "ช่างทุกคน"}<span className="material-symbols-outlined">expand_more</span></button>
          {selectOpen && <div className="history-custom-select-menu" role="listbox" aria-label="ช่าง">{[{ id: "all", name: "ช่างทุกคน" }, ...barberOptions].map((barber) => <button type="button" role="option" aria-selected={barberId === barber.id} className={`history-custom-select-option${barberId === barber.id ? " selected" : ""}`} key={barber.id} onClick={() => { setBarberId(barber.id); setSelectOpen(false); }}>{barber.name}</button>)}</div>}
        </div></div>
        <button className="history-refresh-button" disabled={loading} onClick={() => setRefresh((value) => value + 1)}>รีเฟรช</button>
      </div>
      {notice && <div className="history-notice" role="status">{notice}</div>}
      <div className="history-list">{loading ? <div className="history-loading">กำลังโหลดประวัติ...</div> : error ? <div className="history-empty" role="alert"><strong>โหลดประวัติไม่สำเร็จ</strong><p>{error}</p></div> : !filtered.length ? <div className="history-empty"><strong>ยังไม่มีประวัติในวันที่เลือก</strong><p>รายการที่ชำระสำเร็จจะมาแสดงตรงนี้</p></div> : filtered.map((row) => {
        const voided = isVoidedTransaction(row);
        return <button key={row.id} className={`history-item history-item-compact${voided ? " is-voided" : ""}`} onClick={() => setDetail(row)}>
          <div className="history-compact-main"><div className="history-compact-time">{formatDateTime(row.createdAt)}</div><div className="history-compact-barber">{row.barberName || "-"}</div></div>
          <div className="history-compact-right"><div className="history-compact-total">{formatMoney(historyAmounts(row).grandTotal)} บาท</div><div className="history-compact-meta"><span>{row.paymentMethod === "cash" ? "เงินสด" : "สแกนจ่าย"}</span>{voided && <span className="history-voided-badge">ยกเลิก</span>}<span className="material-symbols-outlined">chevron_right</span></div></div>
        </button>;
      })}</div>
    </div>

    {detail && <div className="history-detail-modal"><div className="history-detail-backdrop" onClick={() => setDetail(null)} /><section className="history-detail-card" role="dialog" aria-modal="true" aria-label="รายละเอียดรายการ"><TransactionSummary transaction={detail} fromHistory onDone={() => setDetail(null)} onVoid={detail.dateKey === localDateKey() && !isVoidedTransaction(detail) ? () => openVoid(detail) : undefined} /></section></div>}

    {voidTarget && <div className="history-void-modal">
      <button className="history-void-backdrop" type="button" aria-label="ยกเลิก" disabled={voidPending} onClick={() => { if (!voidPending) setVoidTarget(null); }} />
      <section className="history-void-card" role="alertdialog" aria-modal="true" aria-labelledby="historyVoidTitle">
        <button className="modal-close" type="button" aria-label="ปิด" disabled={voidPending} onClick={() => setVoidTarget(null)}>×</button>
        <div className="page-kicker">VOID SALE</div>
        <h2 id="historyVoidTitle">ยกเลิกรายการขาย</h2>
        <p>รายการจะไม่ถูกลบ แต่จะถูกทำเครื่องหมาย “ยกเลิก” และไม่นำไปคิดยอดขายหรือค่ามือ</p>
        <div className="history-void-summary"><span>{voidTarget.barberName || "-"}</span><strong>{formatMoney(historyAmounts(voidTarget).grandTotal)} บาท</strong></div>
        <form className="history-void-form" onSubmit={(event) => void confirmVoid(event)}>
          <label><span>เหตุผลที่ยกเลิก</span><textarea autoFocus rows={3} maxLength={200} placeholder="เช่น กดบริการผิด / รับเงินผิด" value={voidReason} disabled={voidPending} onChange={(event) => setVoidReason(event.target.value)} /></label>
          <label><span>PIN ช่างที่กำลังเข้างาน</span><input type="password" inputMode="numeric" maxLength={4} placeholder="••••" value={voidPin} disabled={voidPending} onChange={(event) => setVoidPin(event.target.value.replace(/\D/g, "").slice(0, 4))} /></label>
          {voidError && <div className="history-void-error" role="alert">{voidError}</div>}
          <div className="history-void-actions"><button className="secondary-button" type="button" disabled={voidPending} onClick={() => setVoidTarget(null)}>กลับ</button><button className="history-void-confirm" type="submit" disabled={voidPending}>{voidPending ? "กำลังยกเลิก..." : "ยืนยันยกเลิกรายการ"}</button></div>
        </form>
      </section>
    </div>}
  </section>;
}
