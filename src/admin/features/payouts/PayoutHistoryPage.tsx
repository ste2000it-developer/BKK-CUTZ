import { useEffect, useMemo, useState } from "react";
import { fromDateKey } from "../../../shared/domain/payout";
import {
  listPayoutHistory,
  type PayoutRecord,
} from "../../../shared/firebase/repositories/payouts";

type PayoutHistoryDay = {
  dateKey?: string;
  branches?: string[];
  branchName?: string;
  branchId?: string;
  transactionCount?: number;
  commissionAmount?: number;
  guaranteeAmount?: number;
  tipAmount?: number;
  totalAmount?: number;
};

function formatMoney(value: unknown): string {
  return Number(value || 0).toLocaleString("th-TH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function formatThaiDate(value: unknown, style: "short" | "long"): string {
  const date = value instanceof Date ? value : fromDateKey(value);
  return new Intl.DateTimeFormat("th-TH-u-ca-buddhist", {
    day: "numeric",
    month: style === "short" ? "short" : "long",
    year: "numeric",
  }).format(date);
}

function getPaidDate(record: PayoutRecord): Date | null {
  const raw = record.paidAt;
  if (raw && typeof raw === "object" && "toDate" in raw && typeof raw.toDate === "function") {
    const date = raw.toDate();
    return date instanceof Date && Number.isFinite(date.getTime()) ? date : null;
  }
  if (raw instanceof Date && Number.isFinite(raw.getTime())) return raw;
  if (typeof raw === "string" || typeof raw === "number") {
    const date = new Date(raw);
    return Number.isFinite(date.getTime()) ? date : null;
  }
  return null;
}

function formatPaidAt(record: PayoutRecord): string {
  const date = getPaidDate(record);
  if (!date) return "-";
  return new Intl.DateTimeFormat("th-TH-u-ca-buddhist", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function getCycleId(record: PayoutRecord): string {
  return String(record.payoutCycleId || record.payoutDate || "").trim();
}

export function PayoutHistoryPage() {
  const [records, setRecords] = useState<PayoutRecord[]>([]);
  const [cycleFilter, setCycleFilter] = useState("all");
  const [barberFilter, setBarberFilter] = useState("all");
  const [selectedRecord, setSelectedRecord] = useState<PayoutRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

  async function reload() {
    setLoading(true);
    setError("");
    try {
      const result = await listPayoutHistory();
      const paidRecords = result
        .filter((record) => !record.status || record.status === "paid")
        .sort((first, second) => {
          const firstDate = getPaidDate(first)?.getTime() || 0;
          const secondDate = getPaidDate(second)?.getTime() || 0;
          if (firstDate || secondDate) return secondDate - firstDate;
          return getCycleId(second).localeCompare(getCycleId(first));
        });
      setRecords(paidRecords);
      setLoaded(true);
    } catch (loadError) {
      console.error("Load payout history error:", loadError);
      setError(loadError instanceof Error ? loadError.message : "โหลดประวัติการจ่ายไม่สำเร็จ");
      setRecords([]);
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const activate = () => void reload();
    window.addEventListener("bkk:payout-history:activate", activate);
    return () => window.removeEventListener("bkk:payout-history:activate", activate);
  }, []);

  useEffect(() => {
    if (!selectedRecord) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedRecord(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    document.body.classList.add("payout-history-modal-open");
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      document.body.classList.remove("payout-history-modal-open");
    };
  }, [selectedRecord]);

  const cycles = useMemo(() => Array.from(new Set(records.map(getCycleId).filter(Boolean))).sort((a, b) => b.localeCompare(a)), [records]);
  const barbers = useMemo(() => {
    const barberMap = new Map<string, string>();
    records.forEach((record) => {
      const id = String(record.barberId || "").trim();
      if (id) barberMap.set(id, String(record.barberName || id));
    });
    return Array.from(barberMap.entries()).sort((first, second) => first[1].localeCompare(second[1], "th"));
  }, [records]);

  const filteredRecords = records.filter((record) =>
    (cycleFilter === "all" || getCycleId(record) === cycleFilter) &&
    (barberFilter === "all" || String(record.barberId || "") === barberFilter),
  );
  const uniqueBarbers = new Set(filteredRecords.map((record) => record.barberId || record.barberName || record.id));
  const totalTips = filteredRecords.reduce((sum, record) => sum + Number(record.tipAmount || 0), 0);
  const totalPaid = filteredRecords.reduce((sum, record) => sum + Number(record.totalAmount || 0), 0);

  const dailyBreakdown: PayoutHistoryDay[] = Array.isArray(selectedRecord?.dailyBreakdown)
    ? selectedRecord.dailyBreakdown as PayoutHistoryDay[]
    : [];

  return (
    <div className="payout-react-page">
      <section className="payout-history-filter-card">
        <div className="payout-history-filter-head">
          <div><div className="section-kicker">PAYOUT HISTORY</div><h2>ประวัติการจ่ายเงินช่าง</h2><p>แสดงเฉพาะรายการที่ยืนยันจ่ายแล้ว</p></div>
          <button className="secondary-text-button" type="button" disabled={loading} onClick={() => void reload()}>
            <i className="fa-solid fa-rotate-right" aria-hidden="true" /> {loading ? "กำลังโหลด..." : "โหลดใหม่"}
          </button>
        </div>
        <div className="payout-history-filters">
          <label className="payout-history-select-field"><span>รอบจ่าย</span>
            <select className="native-app-select" value={cycleFilter} onChange={(event) => setCycleFilter(event.target.value)}>
              <option value="all">ทุกรอบจ่าย</option>
              {cycles.map((cycle) => <option key={cycle} value={cycle}>รอบจ่าย {formatThaiDate(cycle, "long")}</option>)}
            </select>
          </label>
          <label className="payout-history-select-field"><span>ช่าง</span>
            <select className="native-app-select" value={barberFilter} onChange={(event) => setBarberFilter(event.target.value)}>
              <option value="all">ช่างทุกคน</option>
              {barbers.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </select>
          </label>
        </div>
      </section>

      {error ? <section className="payout-history-empty-state"><strong>โหลดประวัติการจ่ายไม่สำเร็จ</strong><p>{error}</p></section> : null}
      {!error && loaded && filteredRecords.length === 0 ? (
        <section className="payout-history-empty-state"><div className="payout-history-empty-icon">฿</div><strong>ยังไม่มีประวัติการจ่ายเงินช่าง</strong><p>เมื่อกดยืนยันจ่ายในหน้าจ่ายเงินช่าง รายการจะมาแสดงที่นี่</p></section>
      ) : null}
      {!error && filteredRecords.length > 0 ? (
        <section>
          <div className="payout-history-summary-grid">
            <article className="payout-history-summary-card"><span>รายการจ่าย</span><strong>{formatMoney(filteredRecords.length)}</strong><small>รายการ</small></article>
            <article className="payout-history-summary-card"><span>ช่างที่จ่าย</span><strong>{formatMoney(uniqueBarbers.size)}</strong><small>คน</small></article>
            <article className="payout-history-summary-card"><span>ทิป</span><strong>{formatMoney(totalTips)}</strong><small>บาท</small></article>
            <article className="payout-history-summary-card payout-history-summary-card-dark"><span>จ่ายรวม</span><strong>{formatMoney(totalPaid)}</strong><small>บาท</small></article>
          </div>
          <section className="payout-history-table-card">
            <div className="payout-history-table-head"><div>รอบจ่าย</div><div>ช่าง</div><div>วันทำงาน</div><div>ค่ามือ + ประกัน</div><div>ทิป</div><div>รวมจ่าย</div><div>จ่ายเมื่อ</div><div>ผู้ยืนยัน</div><div></div></div>
            <div className="payout-history-list">
              {filteredRecords.map((record) => {
                const cycleId = getCycleId(record);
                return (
                  <button className="payout-history-table-row" type="button" key={record.id} onClick={() => setSelectedRecord(record)}>
                    <div><strong>{cycleId ? formatThaiDate(cycleId, "short") : "-"}</strong><small>{record.periodStart && record.periodEnd ? `${formatThaiDate(record.periodStart, "short")} – ${formatThaiDate(record.periodEnd, "short")}` : "-"}</small></div>
                    <div className="payout-history-barber-cell"><strong>{String(record.barberName || record.barberId || "-")}</strong><small>{String(record.barberId || "")}</small></div>
                    <div><strong>{formatMoney(record.workDays)}</strong><small>วัน</small></div>
                    <div>{formatMoney(Number(record.commissionAmount || 0) + Number(record.guaranteeAmount || 0))}</div>
                    <div>{formatMoney(record.tipAmount)}</div>
                    <div className="payout-history-total-cell">{formatMoney(record.totalAmount)}</div>
                    <div className="payout-history-paid-at">{formatPaidAt(record)}</div>
                    <div className="payout-history-paid-by">{String(record.paidByEmail || record.paidByUid || "-")}</div>
                    <div className="payout-history-chevron">›</div>
                  </button>
                );
              })}
            </div>
          </section>
        </section>
      ) : null}

      {selectedRecord ? (
        <div className="payout-history-detail-modal">
          <button className="payout-history-detail-backdrop" aria-label="ปิดรายละเอียด" type="button" onClick={() => setSelectedRecord(null)} />
          <section className="payout-history-detail-card" role="dialog" aria-modal="true" aria-labelledby="reactPayoutHistoryTitle">
            <div className="payout-history-detail-heading">
              <div><div className="section-kicker">PAID DETAIL</div><h2 id="reactPayoutHistoryTitle">{String(selectedRecord.barberName || selectedRecord.barberId || "รายละเอียดการจ่าย")}</h2><p>รอบจ่าย {getCycleId(selectedRecord) ? formatThaiDate(getCycleId(selectedRecord), "long") : "-"}</p></div>
              <button className="secondary-button payout-history-detail-close" type="button" aria-label="ปิด" onClick={() => setSelectedRecord(null)}>×</button>
            </div>
            <div className="payout-detail-summary">
              <div><span>ค่ามือ</span><strong>{formatMoney(selectedRecord.commissionAmount)} บาท</strong></div>
              <div><span>ประกันมือ</span><strong>{formatMoney(selectedRecord.guaranteeAmount)} บาท</strong></div>
              <div><span>ทิป</span><strong>{formatMoney(selectedRecord.tipAmount)} บาท</strong></div>
              <div className="grand"><span>รวมจ่าย</span><strong>{formatMoney(selectedRecord.totalAmount)} บาท</strong></div>
            </div>
            <div className="payout-history-paid-info"><div><span>จ่ายเมื่อ</span><strong>{formatPaidAt(selectedRecord)}</strong></div><div><span>ผู้ยืนยัน</span><strong>{String(selectedRecord.paidByEmail || selectedRecord.paidByUid || "-")}</strong></div></div>
            <div className="payout-daily-list">
              {dailyBreakdown.length > 0 ? <>
                <div className="payout-daily-head"><div>วันที่</div><div>สาขา</div><div>รายการ</div><div>ค่ามือ</div><div>ประกัน</div><div>ทิป</div><div>รวม</div></div>
                {dailyBreakdown.map((day, index) => {
                  const branches = Array.isArray(day.branches) ? day.branches.join(" · ") : day.branchName || day.branchId || "-";
                  return <div className="payout-daily-row" key={`${day.dateKey || "day"}-${index}`}><div>{day.dateKey ? formatThaiDate(day.dateKey, "short") : "-"}</div><div className="payout-daily-branch">{branches || "-"}</div><div>{formatMoney(day.transactionCount)}</div><div>{formatMoney(day.commissionAmount)}</div><div>{formatMoney(day.guaranteeAmount)}</div><div>{formatMoney(day.tipAmount)}</div><div className="payout-daily-total">{formatMoney(day.totalAmount)}</div></div>;
                })}
              </> : <div className="payout-history-detail-empty">ไม่มีรายละเอียดรายวันในรายการนี้</div>}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}