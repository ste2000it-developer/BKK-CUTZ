import { AppSelect } from "../../components/AppSelect";
import { useEffect, useState } from "react";
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

type AdminIdentity = {
  uid?: string;
  email?: string | null;
};

type PayoutActivationEvent = CustomEvent<{ user: AdminIdentity | null }>;

function formatMoney(value: number): string {
  return Number(value || 0).toLocaleString("th-TH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function formatThaiDate(dateOrKey: Date | string, style: "short" | "long"): string {
  const date = typeof dateOrKey === "string"
    ? fromDateKey(dateOrKey)
    : dateOrKey;

  return new Intl.DateTimeFormat("th-TH-u-ca-buddhist", {
    day: "numeric",
    month: style === "short" ? "short" : "long",
    year: "numeric",
  }).format(date);
}

function buildPayoutCycles(
  sources: Awaited<ReturnType<typeof listPayoutCycleSources>>,
): PayoutCycle[] {
  const cycles = new Map<string, PayoutCycle>();
  const addWorkDate = (dateValue: unknown) => {
    const dateKey = String(dateValue || "").trim();
    if (!dateKey) return;

    const cycle = getPayoutCycleForWorkDate(dateKey);
    if (cycle) cycles.set(cycle.payoutDateKey, cycle);
  };

  sources.transactions.forEach((record) => addWorkDate(record.dateKey));
  sources.attendance.forEach((record) => addWorkDate(record.dateKey));
  sources.advances?.forEach((record) => addWorkDate(record.dateKey));
  sources.payouts.forEach((record) => {
    const cycleId = String(record.payoutCycleId || "").trim();
    if (!cycleId) return;

    const payoutDate = fromDateKey(cycleId);
    if (Number.isFinite(payoutDate.getTime())) {
      cycles.set(cycleId, getPayoutCycle(payoutDate));
    }
  });

  return Array.from(cycles.values()).sort((first, second) =>
    first.payoutDateKey.localeCompare(second.payoutDateKey),
  );
}

export function PayoutPage() {
  const [admin, setAdmin] = useState<AdminIdentity | null>(null);
  const [cycles, setCycles] = useState<PayoutCycle[]>([]);
  const [selectedCycleIndex, setSelectedCycleIndex] = useState(0);
  const [rows, setRows] = useState<PayoutRow[]>([]);
  const [paidRecords, setPaidRecords] = useState<Map<string, PayoutRecord>>(
    new Map(),
  );
  const [loading, setLoading] = useState(false);
  const [savingBarberId, setSavingBarberId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [exporting, setExporting] = useState(false);
  const [selectedRow, setSelectedRow] = useState<PayoutRow | null>(null);

  async function loadCycle(cycle: PayoutCycle) {
    setLoading(true);
    setError("");
    setStatus("");
    setSelectedRow(null);

    try {
      const data = await loadPayoutCycleData(
        cycle.startKey,
        cycle.endKey,
        cycle.payoutDateKey,
      );
      const nextPaidRecords = new Map<string, PayoutRecord>();

      data.paidPayouts.forEach((record) => {
        if (record.barberId) nextPaidRecords.set(record.barberId, record);
      });

      setPaidRecords(nextPaidRecords);
      setRows(buildPayoutRows(
        data.transactions,
        data.attendance,
        data.advances,
        data.previousCarryovers,
      ));
    } catch (loadError) {
      console.error("Load payout error:", loadError);
      setRows([]);
      setPaidRecords(new Map());
      setError(loadError instanceof Error ? loadError.message : "โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  async function loadCycles(selectLatest: boolean) {
    setLoading(true);
    setError("");

    try {
      const sources = await listPayoutCycleSources();
      const nextCycles = buildPayoutCycles(sources);
      const nextIndex = selectLatest ? Math.max(0, nextCycles.length - 1) : 0;

      setCycles(nextCycles);
      setSelectedCycleIndex(nextIndex);

      if (nextCycles.length > 0) {
        await loadCycle(nextCycles[nextIndex]);
      } else {
        setRows([]);
        setPaidRecords(new Map());
        setSelectedRow(null);
      }
    } catch (loadError) {
      console.error("Load payout cycles error:", loadError);
      setCycles([]);
      setRows([]);
      setPaidRecords(new Map());
      setError(loadError instanceof Error ? loadError.message : "โหลดรอบจ่ายไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const handleActivation = (event: Event) => {
      const activation = event as PayoutActivationEvent;
      setAdmin(activation.detail.user);

      if (cycles.length === 0) {
        void loadCycles(true);
      } else {
        const selectedCycle = cycles[selectedCycleIndex];
        if (selectedCycle) void loadCycle(selectedCycle);
      }
    };

    window.addEventListener("bkk:payout:activate", handleActivation);
    return () => window.removeEventListener("bkk:payout:activate", handleActivation);
  }, [cycles, selectedCycleIndex]);

  async function selectCycle(index: number) {
    const cycle = cycles[index];
    if (!cycle) return;

    setSelectedCycleIndex(index);
    await loadCycle(cycle);
  }

  async function markPaid(row: PayoutRow) {
    const cycle = cycles[selectedCycleIndex];
    if (!cycle || paidRecords.has(row.barberId) || savingBarberId) return;

    const carryoverText = row.advanceCarryoverAmount > 0
      ? `\nยอดเบิกล่วงหน้าคงค้าง ${formatMoney(row.advanceCarryoverAmount)} บาท จะยกไปหักรอบถัดไป`
      : "";
    const confirmed = window.confirm(
      `ยืนยันรอบจ่าย ${row.barberName} จำนวน ${formatMoney(row.totalAmount)} บาทใช่ไหม?${carryoverText}`,
    );
    if (!confirmed) return;

    setSavingBarberId(row.barberId);
    setError("");

    try {
      const payoutId = `${cycle.payoutDateKey}_${row.barberId}`;
      const payoutData = createPayoutWriteData(cycle, row, admin || {});
      await savePayoutRecord(payoutId, payoutData);

      setPaidRecords((previous) => new Map(previous).set(row.barberId, {
        id: payoutId,
        ...payoutData,
        paidAt: new Date(),
      }));
      setStatus(`บันทึกการจ่าย ${row.barberName} เรียบร้อย`);
    } catch (saveError) {
      console.error("Save payout error:", saveError);

      if (saveError instanceof PayoutAlreadyExistsError) {
        await loadCycle(cycle);
        setStatus("รอบนี้มีการบันทึก payout แล้ว ระบบไม่ได้เขียนทับข้อมูลเดิม");
      } else {
        setError(saveError instanceof Error ? saveError.message : "บันทึกการจ่ายไม่สำเร็จ");
      }
    } finally {
      setSavingBarberId(null);
    }
  }

  const selectedCycle = cycles[selectedCycleIndex] || null;
  async function exportExcel() {
    if (!selectedCycle || loading || exporting || savingBarberId || rows.length === 0) return;
    setExporting(true);
    setError("");
    try {
      const { downloadPayoutExcel } = await import("./exportPayout");
      await downloadPayoutExcel(selectedCycle, rows, paidRecords);
      setStatus("ส่งออก Excel เรียบร้อยแล้ว");
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "ส่งออก Excel ไม่สำเร็จ กรุณาลองใหม่");
    } finally { setExporting(false); }
  }
  const totals = rows.reduce(
    (result, row) => ({
      labor: result.labor + row.commissionAmount + row.guaranteeAmount,
      tip: result.tip + row.tipAmount,
      grossTip: result.grossTip + (row.grossTipAmount ?? row.tipAmount),
      tipAdvance: result.tipAdvance + (row.tipAdvanceAmount || 0),
      advance: result.advance + (row.advanceAmount || 0),
      carryover: result.carryover + (row.advanceCarryoverAmount || 0),
      grand: result.grand + row.totalAmount,
    }),
    { labor: 0, tip: 0, grossTip: 0, tipAdvance: 0, advance: 0, carryover: 0, grand: 0 },
  );

  useEffect(() => {
    if (!selectedRow) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedRow(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedRow]);

  return (
    <div className="payout-react-page">
      <section className="payout-cycle-card">
        <div>
          <div className="section-kicker">BARBER PAYOUT</div>
          <h2>รอบจ่ายเงินช่าง</h2>
          <p>วันที่ 1 = งานวันที่ 16–สิ้นเดือนก่อน · วันที่ 16 = งานวันที่ 1–15</p>
        </div>
        <div className="payout-cycle-controls">
          <button
            className="secondary-button payout-cycle-nav"
            type="button"
            aria-label="รอบก่อนหน้า"
            disabled={loading || selectedCycleIndex <= 0}
            onClick={() => void selectCycle(selectedCycleIndex - 1)}
          ><i className="fa-solid fa-chevron-left" aria-hidden="true" /></button>
          <AppSelect
            aria-label="เลือกรอบจ่าย"
            value={selectedCycle ? String(selectedCycleIndex) : ""}
            disabled={loading || cycles.length === 0}
            onChange={(value) => void selectCycle(Number(value))}
          >
            {cycles.map((cycle, index) => (
              <option key={cycle.payoutDateKey} value={index}>
                รอบจ่าย {formatThaiDate(cycle.payoutDate, "long")}
              </option>
            ))}
          </AppSelect>
          <button
            className="secondary-button payout-cycle-nav"
            type="button"
            aria-label="รอบถัดไป"
            disabled={loading || selectedCycleIndex >= cycles.length - 1}
            onClick={() => void selectCycle(selectedCycleIndex + 1)}
          ><i className="fa-solid fa-chevron-right" aria-hidden="true" /></button>
        </div>
      </section>

      {!loading && cycles.length === 0 && !error && (
        <section className="payout-empty-state">
          <div className="payout-empty-icon"><i className="fa-solid fa-money-bill-transfer" aria-hidden="true" /></div>
          <strong>ยังไม่มีข้อมูลสำหรับรอบจ่าย</strong>
          <p>เมื่อมีรายการขายหรือมีช่างเข้างาน ระบบจะแสดงรอบจ่ายให้อัตโนมัติ</p>
        </section>
      )}

      {selectedCycle && (
        <>
          <div className="payout-period-text">
            คิดผลงาน {formatThaiDate(selectedCycle.startDate, "long")} – {formatThaiDate(selectedCycle.endDate, "long")} · จ่ายวันที่ {formatThaiDate(selectedCycle.payoutDate, "long")}
          </div>
          <section className="payout-summary-grid">
            <article className="payout-summary-card"><span>ช่างในรอบนี้</span><strong>{formatMoney(rows.length)}</strong><small>คน</small></article>
            <article className="payout-summary-card"><span>ค่ามือ + ประกันมือ</span><strong>{formatMoney(totals.labor)}</strong><small>บาท</small></article>
            <article className="payout-summary-card"><span>ทิปคงเหลือที่จะจ่าย</span><strong>{formatMoney(totals.tip)}</strong><small>จากทิปก่อนหัก {formatMoney(totals.grossTip)} บาท</small></article>
            <article className="payout-summary-card payout-summary-card-advance"><span>หักทิปเงินสดที่เบิกแล้ว</span><strong className="advance-negative">{totals.tipAdvance > 0 ? `-${formatMoney(totals.tipAdvance)}` : "0"}</strong><small>บาท · หักในยอดทิปคงเหลือแล้ว</small></article>
            <article className="payout-summary-card payout-summary-card-advance"><span>หักเบิกล่วงหน้า</span><strong style={{ color: totals.advance > 0 ? "#dc2626" : undefined }}>{totals.advance > 0 ? `-${formatMoney(totals.advance)}` : "0"}</strong><small>บาท</small></article>
            <article className="payout-summary-card payout-summary-card-advance"><span>ค้างยกไปรอบหน้า</span><strong style={{ color: totals.carryover > 0 ? "#dc2626" : undefined }}>{formatMoney(totals.carryover)}</strong><small>บาท</small></article>
            <article className="payout-summary-card payout-summary-card-dark"><span>ยอดต้องจ่ายสุทธิ</span><strong>{formatMoney(totals.grand)}</strong><small>บาท</small></article>
          </section>
          <section className="payout-rule-note">
            <strong>สูตรที่ใช้</strong>
            <span>(ค่ามือ + ประกันมือ + ทิปคงเหลือ) - หักเบิกล่วงหน้า = ยอดสุทธิ · ยอดจ่ายไม่ติดลบ หากยอดเบิกเกินจะยกส่วนคงค้างไปหักรอบถัดไปก่อน · ทิปคงเหลือหักทิปเงินสดที่เบิกแล้ว ไม่ต้องหักซ้ำ · หากเบิกทิปเกินยอดทิป ส่วนเกินรวมในหักเบิกล่วงหน้า · ค่ามือต่อบริการ = ครึ่งหนึ่งของราคาจริง สูงสุด 100 บาท · ประกันมือทั่วไป 400 บาท/วัน · barber01 500 บาท/วัน</span>
          </section>
          <section className="payout-table-card">
            <div className="payout-table-toolbar">
              <div><h2>สรุปยอดช่าง</h2><p>กดดูรายละเอียดเพื่อดูยอดรายวันก่อนยืนยันจ่าย</p></div>
              <div className="payout-export-actions">
              <button className="secondary-text-button excel-export-button" type="button" disabled={loading || exporting || Boolean(savingBarberId) || rows.length === 0} onClick={() => void exportExcel()}>
                <i className="fa-solid fa-file-excel" aria-hidden="true" /> {exporting ? "กำลังส่งออก..." : "Export Excel"}
              </button>
              <button className="secondary-text-button" type="button" disabled={loading} onClick={() => void loadCycles(true)}>
                <i className="fa-solid fa-rotate-right" aria-hidden="true" /> โหลดใหม่
              </button>
              </div>
            </div>
            {(error || status) && (
              <div className={`payout-status${error ? " payout-error" : ""}`} role={error ? "alert" : "status"}>
                {error || status}
              </div>
            )}
            <div className="payout-list">
              {loading ? <div className="empty">กำลังโหลดข้อมูลจ่ายเงิน...</div> : rows.length === 0 ? <div className="empty">ยังไม่มีข้อมูลช่างในรอบนี้</div> : (
                <>
                  <div className="payout-table-head"><div>ช่าง</div><div>วันทำงาน</div><div>ค่ามือ</div><div>ประกันมือ</div><div>ทิป</div><div>หักเบิก</div><div>รวมจ่ายสุทธิ</div><div>สถานะ</div><div>จัดการ</div></div>
                  {rows.map((row) => {
                    const paid = paidRecords.has(row.barberId);
                    return (
                      <div className="payout-table-row" key={row.barberId}>
                        <div className="payout-barber-cell"><strong>{row.barberName}</strong><small>{row.barberId} · {row.transactionCount} รายการ</small></div>
                        <div><strong>{row.workDays}</strong><small>วัน</small></div>
                        <div>{formatMoney(row.commissionAmount)}</div>
                        <div>{formatMoney(row.guaranteeAmount)}</div>
                        <div>
                          {formatMoney(row.tipAmount)}
                          {Boolean(row.tipAdvanceAmount && row.tipAdvanceAmount > 0) && (
                            <small className="payout-subtext" title="ยอดรวมทิปลูกค้าโอน หักเบิกทิปเงินสด">
                              (ได้ {formatMoney(row.grossTipAmount || (row.tipAmount + (row.tipAdvanceAmount || 0)))} - เบิก {formatMoney(row.tipAdvanceAmount || 0)})
                            </small>
                          )}
                        </div>
                        <div className="payout-advance-cell">
                          {row.advanceAmount > 0 ? <span className="advance-negative">-{formatMoney(row.advanceAmount)}</span> : <span className="dash-text">–</span>}
                          {row.advanceCarryoverAmount > 0 && <small className="payout-subtext">ค้าง {formatMoney(row.advanceCarryoverAmount)}</small>}
                        </div>
                        <div className="payout-total-cell">{formatMoney(row.totalAmount)}</div>
                        <div><span className={`payout-badge ${paid ? "paid" : "unpaid"}`}>{paid ? "จ่ายแล้ว" : "ยังไม่จ่าย"}</span></div>
                        <div className="payout-actions">
                          <button className="payout-detail-button" type="button" onClick={() => setSelectedRow(row)}>รายละเอียด</button>
                          <button className="payout-paid-button" type="button" disabled={paid || savingBarberId !== null} onClick={() => void markPaid(row)}>
                            {savingBarberId === row.barberId ? "กำลังบันทึก..." : paid ? "จ่ายแล้ว" : row.totalAmount === 0 && row.advanceCarryoverAmount > 0 ? "ยืนยันรอบ" : "ยืนยันจ่าย"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </section>
          {selectedRow && (
            <div className="payout-detail-modal">
              <button
                className="payout-detail-backdrop"
                type="button"
                aria-label="ปิดรายละเอียด"
                onClick={() => setSelectedRow(null)}
              />
              <section
                className="payout-detail-card"
                role="dialog"
                aria-modal="true"
                aria-labelledby="payoutDetailTitle"
              >
                <div className="payout-detail-heading">
                  <div>
                    <div className="section-kicker">DAILY BREAKDOWN</div>
                    <h2 id="payoutDetailTitle">{selectedRow.barberName}</h2>
                    <p>รอบ {formatThaiDate(selectedCycle.startDate, "short")} – {formatThaiDate(selectedCycle.endDate, "short")}</p>
                  </div>
                  <button
                    className="secondary-button payout-detail-close"
                    type="button"
                    aria-label="ปิดรายละเอียด"
                    onClick={() => setSelectedRow(null)}
                  ><i className="fa-solid fa-xmark" aria-hidden="true" /></button>
                </div>
                <div className="payout-detail-summary">
                  <div><span>ค่ามือ</span><strong>{formatMoney(selectedRow.commissionAmount)} บาท</strong></div>
                  <div><span>ประกันมือ</span><strong>{formatMoney(selectedRow.guaranteeAmount)} บาท</strong></div>
                  <div><span>ทิปก่อนหัก</span><strong>{formatMoney(selectedRow.grossTipAmount ?? selectedRow.tipAmount)} บาท</strong></div>
                  <div><span>หักทิปเงินสดที่เบิกแล้ว</span><strong className="advance-negative">{selectedRow.tipAdvanceAmount ? `-${formatMoney(selectedRow.tipAdvanceAmount)}` : "0"} บาท</strong></div>
                  <div><span>ทิปคงเหลือที่จะจ่าย</span><strong>{formatMoney(selectedRow.tipAmount)} บาท</strong><small className="payout-subtext">หักทิปเงินสดที่เบิกแล้ว</small></div>
                  <div><span>ยอดค้างจากรอบก่อน</span><strong>{formatMoney(selectedRow.previousAdvanceCarryoverAmount)} บาท</strong></div>
                  <div><span>เบิกล่วงหน้าเพิ่มรอบนี้</span><strong>{formatMoney(selectedRow.currentAdvanceAmount)} บาท</strong></div>
                  <div className="advance"><span>หักเบิกล่วงหน้ารอบนี้</span><strong style={{ color: selectedRow.advanceAmount > 0 ? "#dc2626" : undefined }}>{selectedRow.advanceAmount > 0 ? `-${formatMoney(selectedRow.advanceAmount)}` : "0"} บาท</strong></div>
                  <div className="advance"><span>ค้างยกไปรอบหน้า</span><strong style={{ color: selectedRow.advanceCarryoverAmount > 0 ? "#dc2626" : undefined }}>{formatMoney(selectedRow.advanceCarryoverAmount)} บาท</strong></div>
                  <div className="grand"><span>ยอดสุทธิจ่าย</span><strong>{formatMoney(selectedRow.totalAmount)} บาท</strong></div>
                </div>
                {selectedRow.advances.length > 0 && (
                  <div className="payout-advances-breakdown">
                    <div className="payout-advances-title">
                      <i className="fa-solid fa-money-bill-transfer" aria-hidden="true" style={{ color: "#dc2626" }} />
                      <strong>รายการเบิกเงินของช่าง ({selectedRow.advances.length} รายการ)</strong>
                    </div>
                    <div className="payout-advances-table">
                      {selectedRow.advances.map((adv) => (
                        <div className="payout-advance-item" key={adv.id}>
                          <div>
                            <span className={`payout-type-tag ${adv.type === "tip" ? "tip" : "regular"}`}>
                              {adv.type === "tip" ? "เบิกทิป" : "เบิกค่าแรง"}
                            </span>
                            <strong>{formatThaiDate(adv.dateKey, "short")}</strong>
                            <span>{adv.reason || (adv.type === "tip" ? "เบิกทิปเงินสด" : "เบิกล่วงหน้า")}{adv.note ? ` (${adv.note})` : ""}</span>
                          </div>
                          <strong className="advance-negative">-{formatMoney(adv.amount)} บาท</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="payout-daily-list">
                  <div className="payout-daily-head"><div>วันที่</div><div>สาขา</div><div>รายการ</div><div>ค่ามือ</div><div>ประกัน</div><div>ทิป</div><div>หักเบิก</div><div>รวม</div></div>
                  {selectedRow.dailyBreakdown.map((day) => (
                    <div className="payout-daily-row" key={day.dateKey}>
                      <div>{formatThaiDate(day.dateKey, "short")}</div>
                      <div className="payout-daily-branch">{day.branches.join(" · ") || "-"}</div>
                      <div>{day.transactionCount}</div><div>{formatMoney(day.commissionAmount)}</div><div>{formatMoney(day.guaranteeAmount)}</div>
                      <div>
                        {formatMoney(day.tipAmount)}
                        {Boolean(day.tipAdvanceAmount && day.tipAdvanceAmount > 0) && (
                          <small className="payout-subtext">
                            ({formatMoney(day.grossTipAmount || (day.tipAmount + (day.tipAdvanceAmount || 0)))} - {formatMoney(day.tipAdvanceAmount || 0)})
                          </small>
                        )}
                      </div>
                      <div style={{ color: day.advanceAmount > 0 ? "#dc2626" : "#888888" }}>{day.advanceAmount > 0 ? `-${formatMoney(day.advanceAmount)}` : "–"}</div>
                      <div className="payout-daily-total">{formatMoney(day.totalAmount)}</div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}
          <section className="payout-data-note">
            <i className="fa-solid fa-circle-info" aria-hidden="true" />
            <span>ประกันมือของวันที่ไม่มีรายการขาย ต้องอาศัยประวัติเข้างานจาก POS ระบบจะเริ่มเก็บประวัตินี้หลังวางไฟล์ POS ที่แนบมาด้วย</span>
          </section>
        </>
      )}
      {error && cycles.length === 0 && <div className="payout-status payout-error" role="alert">{error}</div>}
    </div>
  );
}
