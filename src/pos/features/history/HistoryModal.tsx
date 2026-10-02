import { useEffect, useRef, useState } from "react";
import { localDateKey } from "../../../shared/domain/pos-attendance";
import { filterHistory, formatDateTime, formatMoney, historyAmounts, historyBarbers } from "../../../shared/domain/pos-history";
import { listPosTransactions } from "../../../shared/firebase/repositories/pos-transactions";
import type { TransactionHistoryRecord } from "../../../shared/firebase/repositories/transactions";
import { TransactionSummary } from "./TransactionSummary";

export function HistoryModal({ branchId, onClose }: { branchId: string; onClose: () => void }) {
  const [date, setDate] = useState(localDateKey);
  const [barberId, setBarberId] = useState("all");
  const [rows, setRows] = useState<TransactionHistoryRecord[]>([]);
  const [detail, setDetail] = useState<TransactionHistoryRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [selectOpen, setSelectOpen] = useState(false);
  const select = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const outside = (event: MouseEvent) => { if (event.target instanceof Node && !select.current?.contains(event.target)) setSelectOpen(false); };
    document.addEventListener("click", outside);
    return () => document.removeEventListener("click", outside);
  }, []);
  useEffect(() => {
    let live = true; setLoading(true); setRows([]); setDetail(null); setError("");
    void listPosTransactions(branchId, date || localDateKey()).then((result) => {
      if (!live) return;
      setRows(result); setBarberId((previous) => result.some((row) => row.barberId === previous) ? previous : "all");
    }).catch((issue: unknown) => { if (live) setError(issue instanceof Error ? issue.message : "โหลดประวัติไม่สำเร็จ"); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [branchId, date, refresh]);
  const barbers = historyBarbers(rows);
  const filtered = filterHistory(rows, barberId);
  return <section id="historyPage" className="history-modal" role="dialog" aria-modal="true" aria-labelledby="historyTitle"><div className="history-modal-backdrop" onClick={onClose} /><div className="history-modal-card">
    <div className="history-popup-head"><div><div className="page-kicker">ประวัติของสาขานี้</div><h2 id="historyTitle">ประวัติรายการ</h2><p>แตะรายการเพื่อดูรายละเอียดแบบหน้าสรุป</p></div><button className="modal-close" aria-label="ปิดประวัติ" onClick={onClose}>×</button></div>
    <div className="history-controls"><label className="history-control"><span>วันที่</span><input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
      <div className="history-control"><span>ช่าง</span><div ref={select} className={`history-custom-select${selectOpen ? " open" : ""}`}><button className="history-custom-select-button" aria-haspopup="listbox" aria-expanded={selectOpen} onClick={() => setSelectOpen(!selectOpen)}>{barbers.find((barber) => barber.id === barberId)?.name || "ช่างทุกคน"}<span className="material-symbols-outlined">expand_more</span></button>
        {selectOpen && <div className="history-custom-select-menu" role="listbox" aria-label="ช่าง">{[{ id: "all", name: "ช่างทุกคน" }, ...barbers].map((barber) => <button type="button" role="option" aria-selected={barberId === barber.id} className={`history-custom-select-option${barberId === barber.id ? " selected" : ""}`} key={barber.id} onClick={() => { setBarberId(barber.id); setSelectOpen(false); }}>{barber.name}</button>)}</div>}
      </div></div><button className="history-refresh-button" disabled={loading} onClick={() => setRefresh((value) => value + 1)}>รีเฟรช</button></div>
    <div className="history-list">{loading ? <div className="history-loading">กำลังโหลดประวัติ...</div> : error ? <div className="history-empty" role="alert"><strong>โหลดประวัติไม่สำเร็จ</strong><p>{error}</p></div> : !filtered.length ? <div className="history-empty"><strong>ยังไม่มีประวัติในวันที่เลือก</strong><p>รายการที่ชำระสำเร็จจะมาแสดงตรงนี้</p></div> : filtered.map((row) => <button key={row.id} className="history-item history-item-compact" onClick={() => setDetail(row)}><div className="history-compact-main"><div className="history-compact-time">{formatDateTime(row.createdAt)}</div><div className="history-compact-barber">{row.barberName || "-"}</div></div><div className="history-compact-right"><div className="history-compact-total">{formatMoney(historyAmounts(row).grandTotal)} บาท</div><div className="history-compact-meta"><span>{row.paymentMethod === "cash" ? "เงินสด" : "สแกนจ่าย"}</span><span className="material-symbols-outlined">chevron_right</span></div></div></button>)}</div>
  </div>{detail && <div className="history-detail-modal"><div className="history-detail-backdrop" onClick={() => setDetail(null)} /><section className="history-detail-card" role="dialog" aria-modal="true" aria-label="รายละเอียดรายการ"><TransactionSummary transaction={detail} fromHistory onDone={() => setDetail(null)} /></section></div>}</section>;
}
