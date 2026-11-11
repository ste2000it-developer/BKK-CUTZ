import { useEffect, useMemo, useRef, useState } from "react";
import {
  buildPayoutRows,
  createPayoutWriteData,
  fromDateKey,
  getPayoutCycle,
  getPayoutCycleForWorkDate,
  type PayoutCycle,
  type PayoutRow,
} from "../../../shared/domain/payout";
import {
  listPayoutCycleSources,
  loadPayoutCycleData,
  PayoutAlreadyExistsError,
  savePayoutRecord,
  type PayoutRecord,
} from "../../../shared/firebase/repositories/payouts";
import "./payroll.css";

type FilterStatus = "all" | "unpaid" | "paid";
type ModalMode = "details" | "confirm" | null;
type AdminIdentity = { uid: string; email: string | null };

async function withTimeout<T>(promise: Promise<T>, reason: string): Promise<T> {
  let handle: number | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        handle = window.setTimeout(() => reject(new Error(reason)), 20000);
      }),
    ]);
  } finally {
    if (handle !== undefined) window.clearTimeout(handle);
  }
}

const money = (amount: number) => "฿" + Number(amount || 0).toLocaleString("th-TH", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const thaiDate = (key: string, short = false) =>
  new Intl.DateTimeFormat("th-TH-u-ca-buddhist", {
    timeZone: "Asia/Bangkok",
    day: "numeric",
    month: short ? "short" : "long",
    year: "numeric",
  }).format(new Date(key + "T12:00:00+07:00"));

function availableCycles(sources: Awaited<ReturnType<typeof listPayoutCycleSources>>): PayoutCycle[] {
  const cycles = new Map<string, PayoutCycle>();
  const addWorkDate = (input: unknown) => {
    const key = String(input || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return;
    const cycle = getPayoutCycleForWorkDate(key);
    if (cycle) cycles.set(cycle.payoutDateKey, cycle);
  };
  sources.transactions.forEach((row) => addWorkDate(row.dateKey));
  sources.attendance.forEach((row) => addWorkDate(row.dateKey));
  sources.advances?.forEach((row) => addWorkDate(row.dateKey));
  sources.payouts.forEach((row) => {
    const key = String(row.payoutCycleId || row.payoutDate || "");
    if (!/^\d{4}-(?:0[1-9]|1[0-2])-(?:01|16)$/.test(key)) return;
    const date = fromDateKey(key);
    if (Number.isFinite(date.getTime())) cycles.set(key, getPayoutCycle(date));
  });
  return [...cycles.values()].sort((a, b) => a.payoutDateKey.localeCompare(b.payoutDateKey));
}

function matchesSnapshot(before: PayoutRow, after: PayoutRow) {
  const values: Array<keyof PayoutRow> = [
    "workDays", "transactionCount", "commissionAmount", "guaranteeAmount",
    "tipAmount", "tipAdvanceAmount", "currentAdvanceAmount", "previousAdvanceCarryoverAmount",
    "advanceAmount", "advanceCarryoverAmount", "totalAmount",
  ];
  if (values.some((key) => (before[key] || 0) !== (after[key] || 0))) return false;
  if ([...before.transactionIds].sort().join("|") !== [...after.transactionIds].sort().join("|")) return false;
  if ([...before.advanceIds].sort().join("|") !== [...after.advanceIds].sort().join("|")) return false;
  return true;
}

function paidAmount(row: PayoutRow, record?: PayoutRecord): number {
  if (!record) return row.totalAmount;
  const saved = Number(record.totalAmount);
  return Number.isFinite(saved) && saved >= 0 ? saved : row.totalAmount;
}

export function PayrollPage({ admin }: { admin: AdminIdentity }) {
  const [cycles, setCycles] = useState<PayoutCycle[]>([]);
  const [index, setIndex] = useState(0);
  const [rows, setRows] = useState<PayoutRow[]>([]);
  const [paidRecords, setPaidRecords] = useState<Map<string, PayoutRecord>>(new Map());
  const [loading, setLoading] = useState(true);
  const [loadingCycles, setLoadingCycles] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [message, setMessage] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const requestId = useRef(0);

  const cycle = cycles[index] || null;

  async function loadCycle(selected: PayoutCycle) {
    const token = ++requestId.current;
    setLoading(true);
    setError("");
    setActionError("");
    setMessage("");
    setSelectedId(null);
    setModalMode(null);
    try {
      const data = await withTimeout(
        loadPayoutCycleData(selected.startKey, selected.endKey, selected.payoutDateKey),
        "โหลดข้อมูลรอบจ่ายนานเกินไป กรุณาลองใหม่อีกครั้ง",
      );
      if (token !== requestId.current) return;
      const paid = new Map<string, PayoutRecord>();
      data.paidPayouts.forEach((record) => {
        if (record.barberId) paid.set(record.barberId, record);
      });
      setPaidRecords(paid);
      setRows(buildPayoutRows(
        data.transactions, data.attendance, data.advances, data.previousCarryovers,
      ));
    } catch (issue) {
      if (token !== requestId.current) return;
      console.error("Load payroll cycle failed:", issue);
      setRows([]);
      setPaidRecords(new Map());
      setError(issue instanceof Error ? issue.message : "โหลดข้อมูลจ่ายเงินไม่สำเร็จ");
    } finally {
      if (token === requestId.current) setLoading(false);
    }
  }

  async function loadCycles() {
    const token = ++requestId.current;
    setLoading(true);
    setLoadingCycles(true);
    setError("");
    setActionError("");
    setMessage("");
    try {
      const sources = await withTimeout(
        listPayoutCycleSources(),
        "โหลดรอบจ่ายนานเกินไป กรุณาตรวจสอบการเชื่อมต่อแล้วลองใหม่",
      );
      if (token !== requestId.current) return;
      const list = availableCycles(sources);
      setCycles(list);
      const latestIndex = Math.max(0, list.length - 1);
      setIndex(latestIndex);
      if (list.length) {
        await loadCycle(list[latestIndex]);
      } else {
        setRows([]);
        setPaidRecords(new Map());
      }
    } catch (issue) {
      if (token !== requestId.current) return;
      console.error("Discover payroll cycles failed:", issue);
      setError(issue instanceof Error ? issue.message : "โหลดรอบจ่ายไม่สำเร็จ");
      setRows([]);
    } finally {
      // loadCycle owns its own loading state when a cycle was found.
      if (token === requestId.current) setLoading(false);
      setLoadingCycles(false);
    }
  }

  useEffect(() => {
    void loadCycles();
    return () => { requestId.current++; };
  }, []);

  const totals = useMemo(() => {
    let total = 0, already = 0, toPay = 0, paidCount = 0;
    for (const row of rows) {
      const record = paidRecords.get(row.barberId);
      const amount = paidAmount(row, record);
      total += amount;
      if (record) { already += amount; paidCount++; }
      else toPay += amount;
    }
    return { total, already, toPay, paidCount, unpaidCount: rows.length - paidCount };
  }, [rows, paidRecords]);

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("th");
    return rows.filter((row) => {
      if (statusFilter === "paid" && !paidRecords.has(row.barberId)) return false;
      if (statusFilter === "unpaid" && paidRecords.has(row.barberId)) return false;
      return !term || [row.barberName, row.barberId].some((value) =>
        value.toLocaleLowerCase("th").includes(term));
    });
  }, [rows, paidRecords, statusFilter, search]);

  const selectedIndex = filtered.findIndex((row) => row.barberId === selectedId);
  const selected = selectedIndex >= 0 ? filtered[selectedIndex] : null;
  const selectedPaid = selected ? paidRecords.get(selected.barberId) : undefined;
  const selectedAmount = selected ? paidAmount(selected, selectedPaid) : 0;
  const modalOpen = modalMode !== null;

  useEffect(() => {
    const node = dialog.current;
    if (!node) return;
    if (!modalOpen) {
      if (node.open) node.close();
      return;
    }
    if (!node.open) node.showModal();

    const body = document.body;
    const html = document.documentElement;
    const before = {
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
      bodyOverflow: body.style.overflow,
      htmlOverflow: html.style.overflow,
    };
    const scrollY = window.scrollY;
    html.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = "-" + scrollY + "px";
    body.style.width = "100%";
    body.style.overflow = "hidden";
    return () => {
      if (node.open) node.close();
      body.style.position = before.position;
      body.style.top = before.top;
      body.style.width = before.width;
      body.style.overflow = before.bodyOverflow;
      html.style.overflow = before.htmlOverflow;
      window.scrollTo(0, scrollY);
    };
  }, [modalOpen]);

  useEffect(() => {
    if (!modalOpen || modalMode !== "details") return;
    const handleKeys = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft" && selectedIndex > 0) {
        event.preventDefault();
        setSelectedId(filtered[selectedIndex - 1].barberId);
      }
      if (event.key === "ArrowRight" && selectedIndex < filtered.length - 1) {
        event.preventDefault();
        setSelectedId(filtered[selectedIndex + 1].barberId);
      }
    };
    window.addEventListener("keydown", handleKeys);
    return () => window.removeEventListener("keydown", handleKeys);
  }, [modalOpen, modalMode, selectedIndex, filtered]);

  function closeModal() {
    if (savingId) return;
    setModalMode(null);
    setSelectedId(null);
  }

  async function confirmPaid() {
    if (!cycle || !selected || savingId || selectedPaid) return;
    const row = selected;
    const targetCycle = cycle;
    setSavingId(row.barberId);
    setActionError("");
    setMessage("");
    try {
      // Reconcile source data before creating an irreversible financial record.
      // Existing transaction logic in savePayoutRecord also prevents duplicates.
      const fresh = await withTimeout(
        loadPayoutCycleData(targetCycle.startKey, targetCycle.endKey, targetCycle.payoutDateKey),
        "ตรวจสอบยอดล่าสุดนานเกินไป ยังไม่ได้บันทึกจ่าย กรุณาลองใหม่",
      );
      if (fresh.paidPayouts.some((item) => item.barberId === row.barberId)) {
        throw new PayoutAlreadyExistsError();
      }
      const freshRow = buildPayoutRows(
        fresh.transactions, fresh.attendance, fresh.advances, fresh.previousCarryovers,
      ).find((item) => item.barberId === row.barberId);
      if (!freshRow || !matchesSnapshot(row, freshRow)) {
        setModalMode(null);
        await loadCycle(targetCycle);
        setMessage("ยอดของช่างมีการเปลี่ยนแปลง ระบบยังไม่ได้บันทึกจ่าย กรุณาตรวจสอบยอดใหม่");
        return;
      }
      const payoutId = targetCycle.payoutDateKey + "_" + row.barberId;
      const saved = createPayoutWriteData(targetCycle, freshRow, admin);
      await savePayoutRecord(payoutId, saved);
      setPaidRecords((previous) => new Map(previous).set(row.barberId, {
        id: payoutId, ...saved, paidAt: new Date(),
      }));
      setModalMode("details");
      setMessage("บันทึกว่าจ่ายเงินให้ " + row.barberName + " แล้วเรียบร้อย");
    } catch (issue) {
      console.error("Save payroll payment failed:", issue);
      if (issue instanceof PayoutAlreadyExistsError) {
        setModalMode(null);
        await loadCycle(targetCycle);
        setMessage("งวดนี้มีบันทึกจ่ายให้ช่างคนนี้แล้ว ระบบไม่ได้บันทึกซ้ำ");
      } else {
        setActionError(issue instanceof Error ? issue.message : "บันทึกจ่ายไม่สำเร็จ");
      }
    } finally {
      setSavingId(null);
    }
  }

  async function exportExcel() {
    if (!cycle || loading || exporting || savingId || !rows.length) return;
    setExporting(true);
    setActionError("");
    try {
      const { downloadPayoutExcel } = await import("./exportPayout");
      await downloadPayoutExcel(cycle, rows, paidRecords);
      setMessage("ส่งออก Excel เรียบร้อยแล้ว");
    } catch (issue) {
      setActionError(issue instanceof Error ? issue.message : "ส่งออก Excel ไม่สำเร็จ");
    } finally {
      setExporting(false);
    }
  }

  const changeCycle = (next: number) => {
    if (loading || savingId || next < 0 || next >= cycles.length || next === index) return;
    setIndex(next);
    setStatusFilter("all");
    setSearch("");
    void loadCycle(cycles[next]);
  };

  return (
    <section className="pay-page" aria-label="จ่ายเงินช่าง">
      <header className="pay-page-header">
        <div>
          <h2>จ่ายเงินช่าง</h2>
          <p>ตรวจยอดให้ครบ ก่อนบันทึกว่าจ่ายเงินแล้ว</p>
        </div>
        <div className="pay-head-actions">
          <button type="button" className="pay-icon-button" aria-label="โหลดข้อมูลใหม่" title="โหลดข้อมูลใหม่"
            disabled={loading || Boolean(savingId)}
            onClick={() => cycle ? void loadCycle(cycle) : void loadCycles()}>
            <i className="fa-solid fa-rotate-right" aria-hidden="true" />
          </button>
          <button type="button" className="pay-export" disabled={!cycle || loading || exporting || Boolean(savingId) || !rows.length}
            onClick={() => void exportExcel()}>
            <i className="fa-solid fa-file-excel" aria-hidden="true" />
            {exporting ? "กำลังส่งออก..." : "Excel"}
          </button>
        </div>
      </header>

      <section className="pay-cycle" aria-label="เลือกรอบจ่ายเงิน">
        <div className="pay-cycle-label">
          <span>รอบจ่ายเงิน</span>
          <small>จ่ายวันที่ 1 และ 16 ของเดือน</small>
        </div>
        <div className="pay-cycle-controls">
          <button type="button" aria-label="งวดก่อนหน้า" disabled={loading || Boolean(savingId) || index <= 0}
            onClick={() => changeCycle(index - 1)}><i className="fa-solid fa-chevron-left" aria-hidden="true" /></button>
          <label className="pay-cycle-picker">
            <span className="pay-sr-only">เลือกรอบจ่ายเงิน</span>
            <select aria-label="เลือกรอบจ่ายเงิน" disabled={loading || Boolean(savingId) || !cycles.length} value={cycle ? String(index) : ""}
              onChange={(event) => changeCycle(Number(event.target.value))}>
              {!cycle && <option value="">{loadingCycles ? "กำลังค้นหางวด..." : "ยังไม่มีรอบจ่าย"}</option>}
              {cycles.map((item, cycleIndex) =>
                <option key={item.payoutDateKey} value={cycleIndex}>จ่าย {thaiDate(item.payoutDateKey)}</option>)}
            </select>
            <i className="fa-solid fa-chevron-down" aria-hidden="true" />
          </label>
          <button type="button" aria-label="งวดถัดไป" disabled={loading || Boolean(savingId) || index >= cycles.length - 1}
            onClick={() => changeCycle(index + 1)}><i className="fa-solid fa-chevron-right" aria-hidden="true" /></button>
        </div>
        {cycle && <p className="pay-cycle-period">คิดผลงาน {thaiDate(cycle.startKey, true)} – {thaiDate(cycle.endKey, true)}</p>}
      </section>

      {error && <div className="pay-alert pay-alert-error" role="alert">
        <i className="fa-solid fa-circle-exclamation" aria-hidden="true" />
        <span>{error}</span>
        <button type="button" disabled={loading} onClick={() => cycle ? void loadCycle(cycle) : void loadCycles()}>ลองใหม่</button>
      </div>}
      {actionError && <div className="pay-alert pay-alert-error" role="alert">
        <i className="fa-solid fa-circle-exclamation" aria-hidden="true" /><span>{actionError}</span>
      </div>}
      {message && <div className="pay-alert pay-alert-success" role="status">
        <i className="fa-solid fa-circle-check" aria-hidden="true" /><span>{message}</span>
      </div>}

      {loading && <section className="pay-loading" role="status"><i className="fa-solid fa-spinner fa-spin" aria-hidden="true" /> กำลังคำนวณเงินช่างจากข้อมูลจริง...</section>}
      {!loading && !error && !cycle && (
        <div className="pay-empty">
          <i className="fa-regular fa-calendar" aria-hidden="true" />
          <strong>ยังไม่มีรอบจ่ายเงินในระบบ</strong>
          <p>เมื่อมีข้อมูลเข้างานหรือการขาย ระบบจะแสดงรอบจ่ายให้อัตโนมัติ</p>
          <button type="button" onClick={() => void loadCycles()}>ตรวจสอบอีกครั้ง</button>
        </div>
      )}

      {!loading && !error && cycle && (
        <>
          <section className="pay-summary" aria-label="ภาพรวมยอดจ่ายงวดนี้">
            <div className="pay-summary-main">
              <div className="pay-summary-heading"><span>ยอดจ่ายสุทธิทั้งงวด</span><i className="fa-solid fa-wallet" aria-hidden="true" /></div>
              <strong>{money(totals.total)}</strong>
              <p>ช่างทั้งหมด {rows.length.toLocaleString("th-TH")} คน · จ่ายแล้ว {totals.paidCount.toLocaleString("th-TH")} คน</p>
              <div className="pay-progress" aria-label={"จ่ายแล้ว " + totals.paidCount + " จาก " + rows.length + " คน"}>
                <span style={{ width: rows.length ? 100 * totals.paidCount / rows.length + "%" : "0%" }} />
              </div>
            </div>
            <div className="pay-summary-side">
              <div><span><i className="fa-solid fa-circle-check" aria-hidden="true" /> จ่ายแล้ว</span><strong>{money(totals.already)}</strong><small>{totals.paidCount} คน</small></div>
              <div><span><i className="fa-regular fa-clock" aria-hidden="true" /> รอจ่าย</span><strong>{money(totals.toPay)}</strong><small>{totals.unpaidCount} คน</small></div>
            </div>
          </section>

          <section className="pay-directory" aria-labelledby="pay-directory-title">
            <div className="pay-directory-head">
              <div><h3 id="pay-directory-title">รายชื่อช่าง</h3><p>กดชื่อเพื่อดูสลิปและรายละเอียดรายวัน</p></div>
              <label className="pay-search"><i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
                <input aria-label="ค้นหาช่าง" placeholder="ค้นหาชื่อช่าง..." type="search"
                  value={search} onChange={(event) => setSearch(event.target.value)} />
              </label>
            </div>
            <div className="pay-tabs" role="group" aria-label="กรองสถานะการจ่าย">
              {([
                ["all", "ทั้งหมด", rows.length],
                ["unpaid", "รอจ่าย", totals.unpaidCount],
                ["paid", "จ่ายแล้ว", totals.paidCount],
              ] as const).map(([value, label, count]) => (
                <button key={value} type="button" aria-pressed={statusFilter === value}
                  className={statusFilter === value ? "is-active" : ""}
                  onClick={() => setStatusFilter(value)}>
                  {label} <span>{count.toLocaleString("th-TH")}</span>
                </button>
              ))}
            </div>

            {!filtered.length && <div className="pay-empty pay-empty-filter">
              <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
              <strong>ไม่พบช่างตามเงื่อนไข</strong>
              <p>{rows.length ? "ลองเปลี่ยนสถานะหรือคำค้นหา" : "ยังไม่มีข้อมูลช่างในรอบจ่ายนี้"}</p>
              {(statusFilter !== "all" || search) && <button type="button" onClick={() => { setStatusFilter("all"); setSearch(""); }}>ดูช่างทั้งหมด</button>}
            </div>}

            {filtered.length > 0 && (
              <div className="pay-list">
                <div className="pay-list-heading" aria-hidden="true">
                  <span>ช่าง</span><span>ค่ามือ + ประกัน</span><span>ทิปคงเหลือ</span><span>หักเบิก</span><span>สุทธิจ่าย</span><span>สถานะ</span>
                </div>
                {filtered.map((row) => {
                  const saved = paidRecords.get(row.barberId);
                  const amount = paidAmount(row, saved);
                  return (
                    <button type="button" className="pay-row" key={row.barberId}
                      onClick={() => { setSelectedId(row.barberId); setModalMode("details"); }}
                      aria-label={"ดูสลิป " + row.barberName + " ยอดสุทธิ " + money(amount)}>
                      <span className="pay-row-person">
                        <span className="pay-avatar" aria-hidden="true">{row.barberName.slice(0, 1)}</span>
                        <span className="pay-row-person-name"><strong>{row.barberName}</strong><small>{row.workDays} วัน · {row.transactionCount} บิล</small></span>
                      </span>
                      <span className="pay-row-metric">{money(row.commissionAmount + row.guaranteeAmount)}</span>
                      <span className="pay-row-metric">{money(row.tipAmount)}</span>
                      <span className="pay-row-metric pay-minus">{row.advanceAmount ? "−" + money(row.advanceAmount) : "—"}</span>
                      <span className="pay-row-amount"><strong>{money(amount)}</strong><small>{saved ? "ยอดที่บันทึกจ่าย" : "ยอดรอจ่าย"}</small></span>
                      <span className="pay-row-state">
                        <span className={saved ? "pay-status is-paid" : "pay-status is-unpaid"}>
                          <i aria-hidden="true" />{saved ? "จ่ายแล้ว" : "รอจ่าย"}
                        </span>
                        <i className="fa-solid fa-chevron-right pay-row-arrow" aria-hidden="true" />
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
          <p className="pay-footnote">ยอดคำนวณจากข้อมูลขายและเข้างานตามสูตรเดิม · ทิปที่เบิกเงินสดหักจากทิปคงเหลือแล้ว · ยอดเบิกเกินจะยกค้างไปงวดถัดไป</p>
        </>
      )}

      <dialog className="pay-dialog" ref={dialog} aria-label={modalMode === "confirm" ? "ยืนยันบันทึกการจ่ายเงิน" : "สลิปจ่ายเงินช่าง"}
        onCancel={(event) => { if (savingId) event.preventDefault(); else { setModalMode(null); setSelectedId(null); } }}
        onClose={() => { if (!savingId) { setModalMode(null); setSelectedId(null); } }}
        onClick={(event) => {
          const bounds = event.currentTarget.getBoundingClientRect();
          if (event.clientX < bounds.left || event.clientX > bounds.right ||
            event.clientY < bounds.top || event.clientY > bounds.bottom) closeModal();
        }}>
        {selected && cycle && modalMode === "details" && (
          <div className="pay-slip">
            <header className="pay-slip-header">
              <div><span>รายละเอียดเงินช่าง</span><h3>{selected.barberName}</h3><p>ผลงาน {thaiDate(cycle.startKey, true)} – {thaiDate(cycle.endKey, true)}</p></div>
              <button type="button" className="pay-dialog-close" aria-label="ปิดสลิป" onClick={closeModal}><i className="fa-solid fa-xmark" aria-hidden="true" /></button>
            </header>
            <div className="pay-slip-scroll">
              <div className="pay-slip-hero">
                <span>ยอดสุทธิ{selectedPaid ? "ที่บันทึกจ่ายแล้ว" : "ที่ต้องจ่าย"}</span>
                <strong>{money(selectedAmount)}</strong>
                <span className={selectedPaid ? "pay-status is-paid" : "pay-status is-unpaid"}>
                  <i aria-hidden="true" />{selectedPaid ? "จ่ายแล้ว" : "รอจ่าย"}
                </span>
              </div>
              {selectedPaid && Math.abs(selectedAmount - selected.totalAmount) > .001 && (
                <p className="pay-slip-difference" role="status">ยอดตามบันทึกจ่ายคือ {money(selectedAmount)} ส่วนยอดคำนวณจากข้อมูลปัจจุบันคือ {money(selected.totalAmount)} กรุณาตรวจสอบความต่าง</p>
              )}
              <section className="pay-slip-section">
                <h4>ที่มาของเงิน</h4>
                <div className="pay-slip-line"><span>ค่ามือ ({selected.transactionCount} บิล)</span><strong>{money(selected.commissionAmount)}</strong></div>
                <div className="pay-slip-line"><span>ประกันมือเพิ่ม</span><strong>{money(selected.guaranteeAmount)}</strong></div>
                <div className="pay-slip-line"><span>ทิปก่อนหักเบิก</span><strong>{money(selected.grossTipAmount ?? selected.tipAmount)}</strong></div>
                <div className="pay-slip-line pay-slip-negative"><span>หักทิปเงินสดที่เบิกแล้ว</span><strong>{selected.tipAdvanceAmount ? "−" + money(selected.tipAdvanceAmount) : "—"}</strong></div>
                <div className="pay-slip-line pay-slip-highlight"><span>ทิปคงเหลือ</span><strong>{money(selected.tipAmount)}</strong></div>
                <div className="pay-slip-line"><span>เงินเบิกล่วงหน้ารอบนี้</span><strong>{money(selected.currentAdvanceAmount)}</strong></div>
                <div className="pay-slip-line"><span>ค้างจากงวดก่อน</span><strong>{money(selected.previousAdvanceCarryoverAmount)}</strong></div>
                <div className="pay-slip-line pay-slip-negative"><span>หักเบิกล่วงหน้าที่หักได้</span><strong>{selected.advanceAmount ? "−" + money(selected.advanceAmount) : "—"}</strong></div>
                {selected.advanceCarryoverAmount > 0 && (
                  <div className="pay-slip-line pay-slip-carry"><span>ยอดค้างยกไปงวดหน้า</span><strong>{money(selected.advanceCarryoverAmount)}</strong></div>
                )}
              </section>

              {selected.advances.length > 0 && (
                <section className="pay-slip-section">
                  <h4>รายการที่ช่างเบิก ({selected.advances.length})</h4>
                  <div className="pay-advance-list">
                    {selected.advances.map((item, i) => (
                      <div className="pay-advance" key={item.id || i}>
                        <div><strong>{item.type === "tip" ? "เบิกทิปเงินสด" : "เบิกค่าแรงล่วงหน้า"}</strong>
                          <span>{thaiDate(item.dateKey, true)} · {item.reason || "ไม่ระบุเหตุผล"}{item.note ? " · " + item.note : ""}</span>
                        </div>
                        <strong>{money(item.amount)}</strong>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <section className="pay-slip-section pay-days">
                <h4>รายละเอียดรายวัน ({selected.dailyBreakdown.length} วัน)</h4>
                {selected.dailyBreakdown.map((day) => (
                  <details className="pay-day" key={day.dateKey}>
                    <summary>
                      <span><strong>{thaiDate(day.dateKey, true)}</strong><small>{day.branches.join(" · ") || "ไม่ระบุสาขา"} · {day.transactionCount} บิล</small></span>
                      <span className="pay-day-amount">{money(day.totalAmount)} <i className="fa-solid fa-chevron-down" aria-hidden="true" /></span>
                    </summary>
                    <div className="pay-day-inner">
                      <div><span>ค่ามือ</span><strong>{money(day.commissionAmount)}</strong></div>
                      <div><span>ประกันมือ</span><strong>{money(day.guaranteeAmount)}</strong></div>
                      <div><span>ทิปคงเหลือ</span><strong>{money(day.tipAmount)}</strong></div>
                      {(day.tipAdvanceAmount || 0) > 0 && <div><span>เบิกทิปเงินสด</span><strong>{money(day.tipAdvanceAmount || 0)}</strong></div>}
                      <div><span>หักเบิกล่วงหน้า</span><strong>{day.advanceAmount ? "−" + money(day.advanceAmount) : "—"}</strong></div>
                      <div className="pay-day-total"><span>สุทธิวันนั้น</span><strong>{money(day.totalAmount)}</strong></div>
                    </div>
                  </details>
                ))}
                {!selected.dailyBreakdown.length && <p className="pay-slip-muted">ไม่มีรายการทำงานรายวันในงวดนี้</p>}
              </section>
            </div>
            <footer className="pay-slip-footer">
              <div className="pay-slip-stepper">
                <button type="button" disabled={selectedIndex <= 0} onClick={() => setSelectedId(filtered[selectedIndex - 1].barberId)}>
                  <i className="fa-solid fa-chevron-left" aria-hidden="true" /> คนก่อนหน้า
                </button>
                <span>{selectedIndex + 1} / {filtered.length}</span>
                <button type="button" disabled={selectedIndex >= filtered.length - 1} onClick={() => setSelectedId(filtered[selectedIndex + 1].barberId)}>
                  คนถัดไป <i className="fa-solid fa-chevron-right" aria-hidden="true" />
                </button>
              </div>
              {!selectedPaid && <button type="button" className="pay-cta" disabled={Boolean(savingId)}
                onClick={() => setModalMode("confirm")}>
                <i className="fa-solid fa-check" aria-hidden="true" />
                {selected.totalAmount === 0 ? "ยืนยันรอบนี้" : "ยืนยันจ่าย " + money(selected.totalAmount)}
              </button>}
            </footer>
          </div>
        )}

        {selected && cycle && modalMode === "confirm" && (
          <div className="pay-confirm">
            <header className="pay-slip-header">
              <div><span>ตรวจสอบก่อนบันทึก</span><h3>{selected.totalAmount === 0 ? "ยืนยันรอบจ่าย" : "ยืนยันว่าจ่ายเงินแล้ว"}</h3><p>{selected.barberName} · รอบจ่าย {thaiDate(cycle.payoutDateKey, true)}</p></div>
              <button type="button" className="pay-dialog-close" aria-label="ปิด" disabled={Boolean(savingId)} onClick={closeModal}>
                <i className="fa-solid fa-xmark" aria-hidden="true" />
              </button>
            </header>
            <div className="pay-confirm-body">
              <div className="pay-confirm-amount"><span>{selected.totalAmount === 0 ? "ยอดสุทธิรอบนี้" : "ยอดเงินที่ยืนยันว่าจ่ายแล้ว"}</span><strong>{money(selected.totalAmount)}</strong></div>
              <p>{selected.totalAmount === 0
                ? "รอบนี้ไม่มียอดเงินจ่าย ระบบจะบันทึกปิดรอบสำหรับช่างคนนี้และเก็บยอดค้างไปงวดถัดไป (ถ้ามี)"
                : "กรุณายืนยันหลังจากจ่ายเงินให้ช่างจริงแล้วเท่านั้น การกดยืนยันคือการบันทึกประวัติว่าจ่ายแล้ว ไม่ใช่การโอนเงินอัตโนมัติ"}</p>
              {selected.advanceCarryoverAmount > 0 && <div className="pay-confirm-carry"><i className="fa-solid fa-circle-info" aria-hidden="true" /> ยังมียอดเบิกค้าง {money(selected.advanceCarryoverAmount)} ที่ต้องยกไปงวดถัดไป</div>}
              <p className="pay-confirm-warning"><i className="fa-solid fa-lock" aria-hidden="true" /> เมื่อบันทึกแล้วจะไม่สามารถยกเลิกหรือแก้ไขจากหน้านี้ได้</p>
              {actionError && <div className="pay-confirm-error" role="alert">{actionError}</div>}
            </div>
            <footer className="pay-confirm-actions">
              <button type="button" className="pay-secondary" disabled={Boolean(savingId)} onClick={() => setModalMode("details")}>ย้อนกลับ</button>
              <button type="button" className="pay-cta" disabled={Boolean(savingId)} onClick={() => void confirmPaid()}>
                {savingId ? "กำลังตรวจสอบและบันทึก..." : selected.totalAmount === 0 ? "ยืนยันรอบจ่าย" : "ยืนยันว่าจ่ายแล้ว"}
              </button>
            </footer>
          </div>
        )}
      </dialog>
    </section>
  );
}
