import { useEffect, useMemo, useRef, useState } from "react";
import { AppSelect } from "../../components/AppSelect";
import { AdminDateNavigator, adminDateLabel } from "../../components/AdminDateNavigator";
import { bangkokBusinessDate } from "../../../shared/domain/cash-closing";
import { historyAmounts, historyServices } from "../../../shared/domain/pos-history";
import { isVoidedTransaction } from "../../../shared/domain/transaction-status";
import { listBranches, type BranchRecord } from "../../../shared/firebase/repositories/branches";
import { listTransactionsByDate, type TransactionHistoryRecord } from "../../../shared/firebase/repositories/transactions";
import "./sales-history.css";

type BillFilter = "all" | "active" | "voided";

const money = (value: number) => "฿" + Number(value || 0).toLocaleString("th-TH", {
  minimumFractionDigits: 2, maximumFractionDigits: 2,
});
const branchName = (row: TransactionHistoryRecord, names: Map<string, string>) =>
  row.branchName || names.get(row.branchId || "") || row.branchId || "ไม่ระบุสาขา";
const paymentName = (value: unknown) => value === "cash" ? "เงินสด"
  : value === "scan" ? "สแกนจ่าย" : "ไม่ระบุช่องทาง";
const dateTime = (input: unknown) => {
  const parsed = new Date(String(input || ""));
  if (Number.isNaN(parsed.getTime())) return "ไม่ระบุเวลา";
  return new Intl.DateTimeFormat("th-TH-u-ca-buddhist", {
    timeZone: "Asia/Bangkok",
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(parsed);
};
const time = (input: unknown) => {
  const parsed = new Date(String(input || ""));
  if (Number.isNaN(parsed.getTime())) return "—";
  return new Intl.DateTimeFormat("th-TH", {
    timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(parsed) + " น.";
};
// Exactly the same definition of recorded sales as the existing dashboard:
// service revenue + tips; voided transactions never count.
const saleAmount = (row: TransactionHistoryRecord) => {
  const amounts = historyAmounts(row);
  const value = amounts.serviceTotal + amounts.tipAmount;
  return Number.isFinite(value) ? value : 0;
};
const shortId = (id: string) => id.length <= 20 ? id : id.slice(0, 8) + "…" + id.slice(-6);

export function SalesHistoryPage() {
  const [today, setToday] = useState(() => bangkokBusinessDate());
  const [dateKey, setDateKey] = useState(() => bangkokBusinessDate());
  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [transactions, setTransactions] = useState<TransactionHistoryRecord[]>([]);
  const [loadedDate, setLoadedDate] = useState("");
  const [branchFilter, setBranchFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<BillFilter>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const update = () => setToday(bangkokBusinessDate());
    window.addEventListener("focus", update);
    const interval = window.setInterval(update, 60_000);
    return () => { window.removeEventListener("focus", update); window.clearInterval(interval); };
  }, []);

  useEffect(() => {
    let live = true;
    setLoading(true);
    setError("");
    setSelectedId(null);
    void Promise.all([listTransactionsByDate(dateKey), listBranches()])
      .then(([rows, branchRows]) => {
        if (!live) return;
        setTransactions(rows);
        setBranches(branchRows);
        setLoadedDate(dateKey);
      })
      .catch((issue: unknown) => {
        if (!live) return;
        console.error("Admin sales history failed:", issue);
        setError("โหลดประวัติการขายไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
        setLoadedDate("");
      })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [dateKey, refresh]);

  const current = !error && loadedDate === dateKey ? transactions : [];
  const branchesById = useMemo(() => {
    const names = new Map<string, string>();
    for (const branch of branches) names.set(branch.id, branch.name || branch.id);
    for (const row of current) {
      if (row.branchId && !names.has(row.branchId)) names.set(row.branchId, row.branchName || row.branchId);
    }
    return names;
  }, [branches, current]);

  const branchTransactions = useMemo(
    () => current.filter((row) => branchFilter === "all" || row.branchId === branchFilter),
    [current, branchFilter],
  );
  const active = branchTransactions.filter((row) => !isVoidedTransaction(row));
  const cancelled = branchTransactions.length - active.length;
  const totalSales = active.reduce((sum, row) => sum + saleAmount(row), 0);

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("th");
    return branchTransactions.filter((row) => {
      if (statusFilter === "active" && isVoidedTransaction(row)) return false;
      if (statusFilter === "voided" && !isVoidedTransaction(row)) return false;
      if (!term) return true;
      return [row.id, row.barberId || "", row.barberName || "", branchName(row, branchesById)]
        .some((value) => value.toLocaleLowerCase("th").includes(term));
    });
  }, [branchTransactions, statusFilter, search, branchesById]);

  const selectedIndex = filtered.findIndex((row) => row.id === selectedId);
  const selected = selectedIndex >= 0 ? filtered[selectedIndex] : null;
  const selectedVoided = selected ? isVoidedTransaction(selected) : false;

  useEffect(() => {
    const modal = dialog.current;
    if (!modal) return;
    if (!selected) {
      if (modal.open) modal.close();
      return;
    }
    if (!modal.open) modal.showModal();
    const before = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      if (modal.open) modal.close();
      document.documentElement.style.overflow = before;
    };
  }, [Boolean(selected)]);

  useEffect(() => {
    if (!selected) return;
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft" && selectedIndex > 0) {
        event.preventDefault();
        setSelectedId(filtered[selectedIndex - 1].id);
      } else if (event.key === "ArrowRight" && selectedIndex < filtered.length - 1) {
        event.preventDefault();
        setSelectedId(filtered[selectedIndex + 1].id);
      }
    };
    window.addEventListener("keydown", keyboard);
    return () => window.removeEventListener("keydown", keyboard);
  }, [selectedIndex, selected, filtered]);

  const setDay = (value: string) => {
    setSelectedId(null);
    setDateKey(value);
  };
  const setBranch = (value: string) => { setSelectedId(null); setBranchFilter(value); };
  const setStatus = (value: BillFilter) => { setSelectedId(null); setStatusFilter(value); };

  return (
    <section className="sales-page ui-page" aria-label="ประวัติการขาย">
      <header className="sales-header ui-page-header">
        <div>
          <h2>ประวัติการขาย</h2>
          <p>ตรวจสอบรายการบิลจาก POS ทุกสาขาได้ในหน้าเดียว</p>
        </div>
        <button type="button" className="sales-refresh ui-icon-button" disabled={loading}
          onClick={() => setRefresh((value) => value + 1)}
          aria-label="โหลดข้อมูลการขายใหม่" title="โหลดใหม่">
          <i className="fa-solid fa-rotate-right" aria-hidden="true" />
        </button>
      </header>

      <section className="sales-filters ui-filter-panel" aria-label="กรองข้อมูลการขาย">
        <div className="sales-filters-main">
          <AdminDateNavigator value={dateKey} maxDate={today} onChange={setDay} label="เลือกวันที่ขาย" />
          {dateKey !== today && <button className="sales-today" type="button" onClick={() => setDay(today)}>วันนี้</button>}
          <AppSelect className="sales-branch" aria-label="เลือกสาขา"
            value={branchFilter} onChange={setBranch}>
            <option value="all">ทุกสาขา</option>
            {[...branchesById].sort((a, b) => a[1].localeCompare(b[1], "th")).map(([id, name]) =>
              <option key={id} value={id}>{name}</option>)}
          </AppSelect>
        </div>
        <p className="sales-filter-hint">ข้อมูลวันที่ {adminDateLabel(dateKey)} · ยอดไม่รวมบิลยกเลิก</p>
      </section>

      <section className="sales-overview" aria-label="สรุปยอดขายวันที่เลือก">
        <div className="sales-revenue">
          <div className="sales-revenue-title"><span>ยอดขายรวม</span><i className="fa-solid fa-chart-line" aria-hidden="true" /></div>
          <strong>{!loading && loadedDate === dateKey && !error ? money(totalSales) : "—"}</strong>
          <p>ค่าบริการและทิป · ไม่รวมรายการยกเลิก</p>
        </div>
        <div className="sales-metric">
          <span>บิลที่นับยอด</span>
          <strong>{!loading && loadedDate === dateKey && !error ? active.length.toLocaleString("th-TH") : "—"}</strong>
          <small>รายการขายสำเร็จ</small>
        </div>
        <div className="sales-metric">
          <span>บิลยกเลิก</span>
          <strong>{!loading && loadedDate === dateKey && !error ? cancelled.toLocaleString("th-TH") : "—"}</strong>
          <small>ไม่นำมารวมยอดขาย</small>
        </div>
      </section>

      <section className="sales-history ui-section" aria-labelledby="sales-history-title">
        <div className="sales-history-head ui-section-header">
          <div>
            <h3 id="sales-history-title">รายการบิล</h3>
            <p>{loading ? "กำลังโหลด..." : "แสดง " + filtered.length.toLocaleString("th-TH") + " จาก " + branchTransactions.length.toLocaleString("th-TH") + " บิล"}</p>
          </div>
          <label className="sales-search ui-search">
            <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
            <input type="search" aria-label="ค้นหาบิลหรือชื่อช่าง" placeholder="เลขบิล หรือชื่อช่าง..."
              value={search} onChange={(event) => { setSearch(event.target.value); setSelectedId(null); }} />
          </label>
        </div>
        <div className="sales-tabs ui-filter-group" role="group" aria-label="สถานะบิล">
          {([
            ["all", "ทั้งหมด", branchTransactions.length],
            ["active", "บิลสำเร็จ", active.length],
            ["voided", "บิลยกเลิก", cancelled],
          ] as const).map(([key, label, count]) =>
            <button key={key} type="button" aria-pressed={statusFilter === key}
              className={"ui-filter-tab" + (statusFilter === key ? " is-active" : "")}
              onClick={() => setStatus(key)}>
              {label} <span>{count.toLocaleString("th-TH")}</span>
            </button>)}
        </div>

        {error && <div className="sales-error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => setRefresh((value) => value + 1)}>ลองใหม่</button>
        </div>}
        {!error && loading && <div className="sales-loading" role="status">
          <i className="fa-solid fa-spinner fa-spin" aria-hidden="true" /> กำลังโหลดประวัติการขาย...
        </div>}
        {!error && !loading && !filtered.length && (
          <div className="sales-empty" role="status">
            <i className="fa-regular fa-folder-open" aria-hidden="true" />
            <strong>ไม่พบรายการบิล</strong>
            <span>{!branchTransactions.length ? "ไม่มีรายการขายในวันที่และสาขาที่เลือก" : "ลองเปลี่ยนสถานะบิลหรือคำค้นหา"}</span>
            {(search || statusFilter !== "all" || branchFilter !== "all") && (
              <button type="button" onClick={() => { setSearch(""); setStatus("all"); setBranch("all"); }}>ล้างตัวกรอง</button>
            )}
          </div>
        )}

        {!error && !loading && filtered.length > 0 && (
          <div className="sales-list ui-row-list">
            {filtered.map((row) => {
              const voided = isVoidedTransaction(row);
              return (
                <button type="button" key={row.id} className="sales-row ui-list-row"
                  onClick={() => setSelectedId(row.id)}
                  aria-label={"ดูบิล " + row.id + " ช่าง " + (row.barberName || "")}>
                  <span className={"sales-row-icon" + (voided ? " is-voided" : "")}>
                    <i className={"fa-solid " + (voided ? "fa-ban" : "fa-receipt")} aria-hidden="true" />
                  </span>
                  <span className="sales-row-main">
                    <strong>บิล {shortId(row.id)}</strong>
                    <span>{row.barberName || row.barberId || "ไม่ระบุช่าง"} · {branchName(row, branchesById)}</span>
                    <small>{paymentName(row.paymentMethod)} · {time(row.createdAt)}</small>
                  </span>
                  <span className="sales-row-side">
                    <strong className={voided ? "is-voided" : ""}>{money(saleAmount(row))}</strong>
                    <span className={voided ? "sales-state is-voided" : "sales-state is-active"}>
                      {voided ? "ยกเลิก" : "สำเร็จ"}
                    </span>
                  </span>
                  <i className="fa-solid fa-chevron-right sales-row-arrow" aria-hidden="true" />
                </button>
              );
            })}
          </div>
        )}
      </section>
      <p className="sales-footnote">แสดงข้อมูลจาก POS โดยตรง · บิลยกเลิกยังอยู่ในประวัติ แต่ไม่นำไปคำนวณยอดขาย · หน้านี้ไม่แก้ไขข้อมูลบิล</p>

      <dialog ref={dialog} className="sales-dialog ui-dialog" aria-label="รายละเอียดบิล"
        onCancel={() => setSelectedId(null)}
        onClose={() => setSelectedId(null)}
        onClick={(event) => {
          const box = event.currentTarget.getBoundingClientRect();
          if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) setSelectedId(null);
        }}>
        {selected && (
          <div className="sales-receipt">
            <header className="sales-receipt-header ui-dialog-header">
              <div>
                <span>รายละเอียดการขาย</span>
                <h3>ใบสรุปบิล</h3>
                <p>บิล {shortId(selected.id)}</p>
              </div>
              <button className="ui-close" type="button" aria-label="ปิดรายละเอียดบิล" onClick={() => setSelectedId(null)}>
                <i className="fa-solid fa-xmark" aria-hidden="true" />
              </button>
            </header>
            <div className="sales-receipt-scroll">
              <div className="sales-receipt-hero">
                <span>ยอดเงินในบิล</span>
                <strong>{money(saleAmount(selected))}</strong>
                <span className={selectedVoided ? "sales-state is-voided" : "sales-state is-active"}>
                  {selectedVoided ? "ยกเลิกแล้ว · ไม่รวมในยอดขาย" : "บิลสำเร็จ"}
                </span>
              </div>
              <dl className="sales-receipt-info">
                <div><dt>เลขรายการ</dt><dd className="sales-receipt-id">{selected.id}</dd></div>
                <div><dt>วันที่ / เวลา</dt><dd>{dateTime(selected.createdAt)}</dd></div>
                <div><dt>สาขา</dt><dd>{branchName(selected, branchesById)}</dd></div>
                <div><dt>ช่าง</dt><dd>{selected.barberName || selected.barberId || "ไม่ระบุชื่อ"}</dd></div>
                <div><dt>ชำระเงิน</dt><dd>{paymentName(selected.paymentMethod)}</dd></div>
              </dl>
              <section className="sales-receipt-services">
                <h4>บริการในบิล</h4>
                {historyServices(selected).length ? historyServices(selected).map((service, index) => (
                  <div key={index} className="sales-receipt-service">
                    <span><strong>{service.name}</strong>{service.detail && <small>{service.detail}</small>}</span>
                    <strong>{money(service.price)}</strong>
                  </div>
                )) : <p className="sales-receipt-muted">ไม่พบรายละเอียดบริการในบิลนี้</p>}
              </section>
              <div className="sales-receipt-totals">
                <div><span>ค่าบริการ</span><strong>{money(historyAmounts(selected).serviceTotal)}</strong></div>
                <div><span>ทิป</span><strong>{money(historyAmounts(selected).tipAmount)}</strong></div>
                <div className="sales-receipt-total"><span>รวม</span><strong>{money(saleAmount(selected))}</strong></div>
              </div>
              {selectedVoided && <section className="sales-void-details" aria-label="ข้อมูลการยกเลิก">
                <h4><i className="fa-solid fa-ban" aria-hidden="true" /> รายการยกเลิก</h4>
                <div><span>เหตุผล</span><strong>{selected.voidReason || "ไม่ระบุเหตุผล"}</strong></div>
                {(selected.voidedByBarberName || selected.voidedByEmail) &&
                  <div><span>ผู้ยกเลิก</span><strong>{selected.voidedByBarberName || selected.voidedByEmail}</strong></div>}
                {selected.voidedAt && <div><span>เวลายกเลิก</span><strong>{
                  typeof selected.voidedAt === "object" && selected.voidedAt !== null &&
                  "toDate" in selected.voidedAt && typeof selected.voidedAt.toDate === "function"
                    ? dateTime(selected.voidedAt.toDate()) : dateTime(selected.voidedAt)
                }</strong></div>}
              </section>}
              <p className="sales-receipt-note"><i className="fa-solid fa-lock" aria-hidden="true" /> สำหรับตรวจสอบเท่านั้น ไม่สามารถแก้ไขบิลจากหน้านี้</p>
            </div>
            <footer className="sales-receipt-pager ui-detail-pager">
              <button type="button" disabled={selectedIndex <= 0}
                onClick={() => setSelectedId(filtered[selectedIndex - 1].id)}>
                <i className="fa-solid fa-chevron-left" aria-hidden="true" /> ก่อนหน้า
              </button>
              <span>{(selectedIndex + 1).toLocaleString("th-TH")} / {filtered.length.toLocaleString("th-TH")}</span>
              <button type="button" disabled={selectedIndex >= filtered.length - 1}
                onClick={() => setSelectedId(filtered[selectedIndex + 1].id)}>
                ถัดไป <i className="fa-solid fa-chevron-right" aria-hidden="true" />
              </button>
            </footer>
          </div>
        )}
      </dialog>
    </section>
  );
}
