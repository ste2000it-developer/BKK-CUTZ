import { useEffect, useMemo, useState } from "react";
import { toDateKey } from "../../../shared/domain/payout";
import { listBranches, type BranchRecord } from "../../../shared/firebase/repositories/branches";
import {
  listTransactionsByDate,
  type TransactionHistoryRecord,
} from "../../../shared/firebase/repositories/transactions";

type TransactionService = {
  name?: string;
  detail?: string;
  price?: number;
};

function formatMoney(value: unknown): string {
  return Number(value || 0).toLocaleString("th-TH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function getCreatedDate(transaction: TransactionHistoryRecord): Date | null {
  if (!transaction.createdAt) return null;
  const date = new Date(transaction.createdAt);
  return Number.isFinite(date.getTime()) ? date : null;
}

function getServiceTotal(transaction: TransactionHistoryRecord): number {
  return Number(transaction.serviceTotal ?? transaction.total ?? 0);
}

function getTip(transaction: TransactionHistoryRecord): number {
  return Number(transaction.tipAmount || 0);
}

function getGrandTotal(transaction: TransactionHistoryRecord): number {
  return Number(transaction.grandTotal ?? getServiceTotal(transaction) + getTip(transaction));
}

function getPaymentText(transaction: TransactionHistoryRecord): string {
  return transaction.paymentMethod === "cash" ? "เงินสด" : "สแกนจ่าย";
}

function getServices(transaction: TransactionHistoryRecord): TransactionService[] {
  return Array.isArray(transaction.services) ? transaction.services as TransactionService[] : [];
}

function getServiceText(transaction: TransactionHistoryRecord): string {
  const services = getServices(transaction);
  if (services.length === 0) return "-";
  return services.map((service) => `${service.name || "รายการ"}${service.detail ? ` (${service.detail})` : ""}`).join(" · ");
}

function formatTime(transaction: TransactionHistoryRecord): string {
  const date = getCreatedDate(transaction);
  return date ? date.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }) : "-";
}

export function DailyHistoryPage() {
  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [transactions, setTransactions] = useState<TransactionHistoryRecord[]>([]);
  const [dateKey, setDateKey] = useState(toDateKey(new Date()));
  const [branchFilter, setBranchFilter] = useState("all");
  const [barberFilter, setBarberFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [selected, setSelected] = useState<TransactionHistoryRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

  async function load(date = dateKey) {
    setLoading(true);
    setError("");
    try {
      const [branchRecords, rows] = await Promise.all([
        branches.length > 0 ? Promise.resolve(branches) : listBranches(),
        listTransactionsByDate(date),
      ]);
      setBranches(branchRecords);
      setTransactions(rows);
      setLoaded(true);
    } catch (loadError) {
      console.error("Load daily history error:", loadError);
      setTransactions([]);
      setError(loadError instanceof Error ? loadError.message : "โหลดประวัติไม่สำเร็จ");
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const activate = () => void load();
    window.addEventListener("bkk:daily-history:activate", activate);
    return () => window.removeEventListener("bkk:daily-history:activate", activate);
  }, [dateKey, branches]);

  const branchNames = useMemo(() => {
    const names = new Map<string, string>();
    transactions.forEach((transaction) => {
      if (transaction.branchId) {
        const branch = branches.find((item) => item.id === transaction.branchId);
        names.set(transaction.branchId, transaction.branchName || branch?.name || transaction.branchId);
      }
    });
    return Array.from(names.entries()).sort((first, second) => first[1].localeCompare(second[1], "th"));
  }, [branches, transactions]);

  const barberNames = useMemo(() => {
    const names = new Map<string, string>();
    transactions.forEach((transaction) => {
      if (transaction.barberId) names.set(transaction.barberId, transaction.barberName || transaction.barberId);
    });
    return Array.from(names.entries()).sort((first, second) => first[1].localeCompare(second[1], "th"));
  }, [transactions]);

  const filtered = transactions.filter((transaction) =>
    (branchFilter === "all" || transaction.branchId === branchFilter) &&
    (barberFilter === "all" || transaction.barberId === barberFilter) &&
    (paymentFilter === "all" || transaction.paymentMethod === paymentFilter),
  );
  const totals = filtered.reduce((result, transaction) => ({
    service: result.service + getServiceTotal(transaction),
    tip: result.tip + getTip(transaction),
    grand: result.grand + getGrandTotal(transaction),
  }), { service: 0, tip: 0, grand: 0 });

  useEffect(() => {
    if (!selected) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    document.body.classList.add("daily-history-modal-open");
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      document.body.classList.remove("daily-history-modal-open");
    };
  }, [selected]);

  return (
    <div className="daily-history-react-page">
      <section className="daily-history-filter-card">
        <div className="daily-history-filter-head"><div><div className="section-kicker">DAILY TRANSACTIONS</div><h2>ประวัติรายการเข้าใช้บริการรายวัน</h2><p>ดูรายการขายของทุกสาขา แยกตามวัน สาขา ช่าง และวิธีชำระเงิน</p></div></div>
        <div className="daily-history-filters">
          <label className="daily-history-date-field"><span>วันที่</span><input type="date" value={dateKey} onChange={(event) => { setDateKey(event.target.value); void load(event.target.value); }} /></label>
          <label className="daily-history-select-field"><span>สาขา</span><select className="native-app-select" value={branchFilter} onChange={(event) => setBranchFilter(event.target.value)}><option value="all">ทุกสาขา</option>{branchNames.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
          <label className="daily-history-select-field"><span>ช่าง</span><select className="native-app-select" value={barberFilter} onChange={(event) => setBarberFilter(event.target.value)}><option value="all">ช่างทุกคน</option>{barberNames.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
          <label className="daily-history-select-field"><span>ชำระเงิน</span><select className="native-app-select" value={paymentFilter} onChange={(event) => setPaymentFilter(event.target.value)}><option value="all">ทุกช่องทาง</option><option value="cash">เงินสด</option><option value="scan">สแกนจ่าย</option></select></label>
          <button className="secondary-text-button daily-history-refresh-button" type="button" disabled={loading} onClick={() => void load()}><i className="fa-solid fa-rotate-right" aria-hidden="true" /> {loading ? "กำลังโหลด..." : "โหลดใหม่"}</button>
        </div>
      </section>
      {error && <section className="daily-history-empty-state"><strong>โหลดประวัติไม่สำเร็จ</strong><p>{error}</p></section>}
      {!error && loaded && filtered.length === 0 && <section className="daily-history-empty-state"><div className="daily-history-empty-icon"><i className="fa-solid fa-receipt" aria-hidden="true" /></div><strong>{loading ? "กำลังโหลดรายการ..." : "ยังไม่มีรายการในวันที่เลือก"}</strong><p>เมื่อ POS บันทึกรายการสำเร็จ ข้อมูลจะมาแสดงที่หน้านี้</p></section>}
      {!error && filtered.length > 0 && <section>
        <div className="daily-history-summary-grid"><article className="daily-history-summary-card"><span>จำนวนรายการ</span><strong>{formatMoney(filtered.length)}</strong><small>รายการ</small></article><article className="daily-history-summary-card"><span>ค่าบริการ</span><strong>{formatMoney(totals.service)}</strong><small>บาท</small></article><article className="daily-history-summary-card"><span>ทิปช่าง</span><strong>{formatMoney(totals.tip)}</strong><small>บาท</small></article><article className="daily-history-summary-card daily-history-summary-card-dark"><span>รับทั้งหมด</span><strong>{formatMoney(totals.grand)}</strong><small>บาท</small></article></div>
        <section className="daily-history-table-card"><div className="daily-history-table-head"><div>เวลา</div><div>สาขา</div><div>ช่าง</div><div>บริการ</div><div>ค่าบริการ</div><div>ทิป</div><div>รวม</div><div>ชำระ</div><div /></div>
          <div className="daily-history-list">{filtered.map((transaction) => {
            const branch = transaction.branchName || branches.find((item) => item.id === transaction.branchId)?.name || transaction.branchId || "-";
            return <button className="daily-history-table-row" type="button" key={transaction.id} onClick={() => setSelected(transaction)}><div className="daily-history-time-cell">{formatTime(transaction)}</div><div>{branch}</div><div className="daily-history-barber-cell">{transaction.barberName || transaction.barberId || "-"}</div><div className="daily-history-services-cell">{getServiceText(transaction)}</div><div>{formatMoney(getServiceTotal(transaction))}</div><div>{formatMoney(getTip(transaction))}</div><div className="daily-history-grand-cell">{formatMoney(getGrandTotal(transaction))}</div><div><span className="daily-history-payment-badge">{getPaymentText(transaction)}</span></div><div className="daily-history-chevron">›</div></button>;
          })}</div>
        </section>
      </section>}
      {selected && <div className="daily-history-detail-modal"><button className="daily-history-detail-backdrop" type="button" aria-label="ปิดรายละเอียด" onClick={() => setSelected(null)} /><section className="daily-history-detail-card" role="dialog" aria-modal="true" aria-labelledby="reactDailyHistoryTitle"><div className="daily-history-detail-header"><div><div className="section-kicker">TRANSACTION DETAIL</div><h2 id="reactDailyHistoryTitle">รายละเอียดรายการ</h2></div><button className="secondary-button daily-history-detail-close" type="button" aria-label="ปิด" onClick={() => setSelected(null)}>×</button></div><div className="daily-history-receipt"><div className="daily-history-receipt-row"><span>สาขา</span><strong>{selected.branchName || branches.find((item) => item.id === selected.branchId)?.name || selected.branchId || "-"}</strong></div><div className="daily-history-receipt-row"><span>ช่าง</span><strong>{selected.barberName || selected.barberId || "-"}</strong></div><div className="daily-history-detail-services">{getServices(selected).map((service, index) => <div className="daily-history-detail-service-row" key={`${service.name || "service"}-${index}`}><span>{service.name || "รายการ"}{service.detail ? ` (${service.detail})` : ""}</span><strong>{formatMoney(service.price)} บาท</strong></div>)}</div><div className="daily-history-receipt-row"><span>ค่าบริการ</span><strong>{formatMoney(getServiceTotal(selected))} บาท</strong></div>{getTip(selected) > 0 && <div className="daily-history-receipt-row"><span>ทิปช่าง</span><strong>{formatMoney(getTip(selected))} บาท</strong></div>}<div className="daily-history-receipt-row daily-history-receipt-total"><span>รับทั้งหมด</span><strong>{formatMoney(getGrandTotal(selected))} บาท</strong></div><div className="daily-history-receipt-row"><span>ชำระด้วย</span><strong>{getPaymentText(selected)}</strong></div><div className="daily-history-receipt-row"><span>วันที่ / เวลา</span><strong>{selected.createdAt ? new Date(selected.createdAt).toLocaleString("th-TH-u-ca-buddhist") : "-"}</strong></div><div className="daily-history-receipt-row"><span>เลขรายการ</span><strong>{selected.id}</strong></div></div></section></div>}
    </div>
  );
}