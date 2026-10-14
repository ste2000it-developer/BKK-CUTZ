import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AppSelect } from "../../components/AppSelect";
import { localDateKey, type Barber } from "../../../shared/domain/pos-attendance";
import { listActiveBarbers } from "../../../shared/firebase/repositories/attendance";
import {
  deleteBarberAdvance,
  listBarberAdvances,
  saveBarberAdvance,
  type BarberAdvanceRecord,
} from "../../../shared/firebase/repositories/advances";

function formatMoney(value: unknown): string {
  return Number(value || 0).toLocaleString("th-TH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function formatThaiDate(dateStr: string): string {
  if (!dateStr) return "-";
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return dateStr;
  return new Intl.DateTimeFormat("th-TH-u-ca-buddhist", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(y, m - 1, d));
}

function cleanBarberName(name: string): string {
  return name.replace(/\s*\(ช่างประจำวัน\)/g, "").trim();
}

const QUICK_AMOUNTS = [100, 200, 300, 500, 1000, 1500, 2000, 3000];

const ADVANCE_REASONS = [
  "ค่าเดินทาง",
  "ค่าใช้จ่ายส่วนตัว",
  "ค่าซ่อมอุปกรณ์",
];

export function AdvancePage() {
  const [advances, setAdvances] = useState<BarberAdvanceRecord[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [barberFilter, setBarberFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  // Modal create
  const advanceMonthLabel = monthFilter ? new Intl.DateTimeFormat("th-TH", { month: "long", year: "numeric" }).format(new Date(`${monthFilter}-01T12:00:00+07:00`)) : "ทุกเดือน";
  const changeAdvanceMonth = (delta: number) => {
    const [year, month] = (monthFilter || localDateKey(new Date()).slice(0, 7)).split("-").map(Number);
    const date = new Date(year, month - 1 + delta, 1);
    setMonthFilter(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`);
  };
  const [showModal, setShowModal] = useState(false);
  const [selectedBarberId, setSelectedBarberId] = useState("");
  const [advanceDate, setAdvanceDate] = useState(() => localDateKey(new Date()));
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // Delete confirm
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [barberList, advanceList] = await Promise.all([
        listActiveBarbers(),
        listBarberAdvances(),
      ]);
      setBarbers(barberList);
      setAdvances(advanceList);
    } catch (loadErr) {
      console.error("Failed to load advance data:", loadErr);
      const msg = loadErr instanceof Error ? loadErr.message : "โหลดข้อมูลไม่สำเร็จ";
      setError(
        msg.toLowerCase().includes("permission")
          ? "ยังไม่ได้ตั้ง Firestore Rules สำหรับ barber_advances (กรุณาอัปเดต Security Rules ใน Firestore)"
          : msg,
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const filteredAdvances = useMemo(() => {
    return advances.filter((adv) => {
      const matchesBarber = barberFilter === "all" || adv.barberId === barberFilter;
      const matchesMonth = !monthFilter || adv.dateKey.startsWith(monthFilter);
      return matchesBarber && matchesMonth && adv.type !== "tip";
    });
  }, [advances, barberFilter, monthFilter]);

  const totalAmount = useMemo(() => {
    return filteredAdvances.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  }, [filteredAdvances]);

  const uniqueBarbersCount = useMemo(() => {
    return new Set(filteredAdvances.map((item) => item.barberId)).size;
  }, [filteredAdvances]);

  function openCreateModal() {
    setSelectedBarberId(barbers.length > 0 ? barbers[0].id : "");
    setAdvanceDate(localDateKey(new Date()));
    setAmount("");
    setReason("");
    setFormError("");
    setShowModal(true);
  }

  async function handleCreateAdvance(event: FormEvent) {
    event.preventDefault();
    setFormError("");

    const numericAmount = Number(amount);
    if (!selectedBarberId) {
      setFormError("กรุณาเลือกช่างที่ต้องการเบิก");
      return;
    }
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setFormError("กรุณากรอกจำนวนเงินให้ถูกต้อง (ต้องมากกว่า 0 บาท)");
      return;
    }

    const barberObj = barbers.find((b) => b.id === selectedBarberId);

    setSaving(true);
    try {
      const newRecord = await saveBarberAdvance({
        barberId: selectedBarberId,
        barberName: barberObj?.name || selectedBarberId,
        dateKey: advanceDate,
        amount: numericAmount,
        type: "advance",
        reason: reason.trim() || "เบิกล่วงหน้า",
        source: "admin",
      });
      setAdvances((prev) => [newRecord, ...prev]);
      setShowModal(false);
    } catch (saveErr) {
      console.error("Save advance failed:", saveErr);
      setFormError(saveErr instanceof Error ? saveErr.message : "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteBarberAdvance(id);
      setAdvances((prev) => prev.filter((item) => item.id !== id));
      setDeletingId(null);
    } catch (delErr) {
      console.error("Delete advance failed:", delErr);
      alert("ลบรายการไม่สำเร็จ กรุณาลองใหม่");
    }
  }

  return (
    <div className="advances-react-page">
      <section className="advances-header-card">
        <div className="advances-header-top">
          <div>
            <div className="section-kicker">SALARY ADVANCES</div>
            <h2>รายการเบิกเงินล่วงหน้าช่าง</h2>
            <p>สำหรับแอดมินบันทึกเงินค่าแรงที่ช่างเบิกล่วงหน้า เพื่อนำไปหักจากค่ามือรอบจ่ายเงิน</p>
          </div>
          <div className="advances-header-actions">
            <button className="primary-button" type="button" onClick={openCreateModal}>
              + บันทึกเบิกเงินล่วงหน้า
            </button>
          </div>
        </div>

        {error && <div className="error-box" role="alert">{error}</div>}

        {/* Filter Bar */}
        <div className="advances-filter-bar">
          <div className="advances-filter-item">
            <label htmlFor="advMonthFilter">เดือนที่เบิก</label>
            <div className="admin-date-nav advances-month-nav">
              <button type="button" aria-label="เดือนก่อนหน้า" onClick={() => changeAdvanceMonth(-1)}><i className="fa-solid fa-chevron-left" aria-hidden="true" /></button>
              <div className="admin-date-nav-picker"><span aria-hidden="true">{advanceMonthLabel}</span><input id="advMonthFilter" aria-label="เลือกเดือนที่เบิก" type="month" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} /></div>
              <button type="button" aria-label="เดือนถัดไป" onClick={() => changeAdvanceMonth(1)}><i className="fa-solid fa-chevron-right" aria-hidden="true" /></button>
            </div>
          </div>
          <div className="advances-filter-item">
            <label id="advBarberFilterLabel">ช่าง</label>
            <AppSelect
              id="advBarberFilter"
              aria-label="เลือกช่าง"
              value={barberFilter}
              onChange={(val) => setBarberFilter(val)}
            >
              <option value="all">ช่างทุกคน ({barbers.length} คน)</option>
              {barbers.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name || b.id}
                </option>
              ))}
            </AppSelect>
          </div>
          {monthFilter && (
            <button
              className="advances-clear-filter"
              type="button"
              onClick={() => setMonthFilter("")}
            >
              ดูทุกเดือน
            </button>
          )}
        </div>
      </section>

      {/* KPI Cards */}
      <section className="advances-kpi-grid">
        <div className="advances-kpi-card highlight">
          <span>รวมยอดเบิกเงินล่วงหน้า</span>
          <strong>{formatMoney(totalAmount)} บาท</strong>
          <small>{monthFilter ? `เฉพาะเดือน ${monthFilter}` : "ทุกช่วงเวลา"}</small>
        </div>
        <div className="advances-kpi-card">
          <span>จำนวนช่างที่เบิก</span>
          <strong>{formatMoney(uniqueBarbersCount)} คน</strong>
          <small>{formatMoney(filteredAdvances.length)} รายการ</small>
        </div>
      </section>

      {/* Main Table */}
      <section className="advances-table-card">
        <div className="advances-table-header">
          <h3>
            ประวัติการเบิกเงินล่วงหน้าช่าง
            <span className="advances-count-pill">{filteredAdvances.length} รายการ</span>
          </h3>
        </div>

        {loading ? (
          <div className="advances-loading">กำลังโหลดข้อมูลรายการเบิก...</div>
        ) : filteredAdvances.length === 0 ? (
          <div className="advances-empty">
            <p>ไม่พบรายการเบิกตามเงื่อนไขที่เลือก</p>
          </div>
        ) : (
          <div className="advances-table-wrap">
            <table className="advances-table">
              <thead>
                <tr>
                  <th>วันที่เบิก</th>
                  <th>ช่าง</th>
                  <th>จำนวนเงิน</th>
                  <th>เหตุผล / หมายเหตุ</th>
                  <th style={{ textAlign: "right" }}>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {filteredAdvances.map((adv) => (
                  <tr key={adv.id}>
                    <td>
                      <strong>{formatThaiDate(adv.dateKey)}</strong>
                      <div className="advances-subtext">
                        {adv.createdAt
                          ? new Date(adv.createdAt).toLocaleTimeString("th-TH", {
                              hour: "2-digit",
                              minute: "2-digit",
                            }) + " น."
                          : ""}
                      </div>
                    </td>
                    <td>
                      <div className="advances-barber-badge">
                        {adv.barberName || adv.barberId}
                      </div>
                    </td>
                    <td className="advances-amount-col">
                      <strong>{formatMoney(adv.amount)} บาท</strong>
                    </td>
                    <td>{adv.reason || adv.note || "-"}</td>
                    <td style={{ textAlign: "right" }}>
                      {deletingId === adv.id ? (
                        <div className="advances-delete-confirm">
                          <span>ลบรายการนี้?</span>
                          <button
                            className="advances-del-yes"
                            type="button"
                            onClick={() => void handleDelete(adv.id)}
                          >
                            ใช่
                          </button>
                          <button
                            className="advances-del-no"
                            type="button"
                            onClick={() => setDeletingId(null)}
                          >
                            ยกเลิก
                          </button>
                        </div>
                      ) : (
                        <button
                          className="advances-delete-btn"
                          type="button"
                          aria-label="ลบรายการ"
                          onClick={() => setDeletingId(adv.id)}
                        >
                          ลบ
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Modal create */}
      {showModal && (
        <div className="advances-modal-overlay">
          <div className="advances-modal-backdrop" onClick={() => setShowModal(false)} />
          <section
            className="advances-modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="advanceModalTitle"
          >
            <button
              className="modal-close advances-modal-close"
              type="button"
              aria-label="ปิด"
              onClick={() => setShowModal(false)}
            ><i className="fa-solid fa-xmark" aria-hidden="true" /></button>

            <div className="advances-modal-head">
              <div>
                <div className="section-kicker">
                  เบิกค่าแรงล่วงหน้า
                </div>
                <h2 id="advanceModalTitle">
                  บันทึกเบิกล่วงหน้า
                </h2>
                <p>
                  บันทึกเงินที่ช่างเบิกจากเจ้าของโดยตรง เพื่อนำไปหักออกจากค่ามือรอบคิดเงิน
                </p>
              </div>
            </div>

            <form onSubmit={(e) => void handleCreateAdvance(e)}>
              <div className="advances-form-row" style={{ zIndex: 40 }}>
                <label id="modalBarberLabel">ช่างที่ต้องการเบิก</label>
                <AppSelect
                  id="modalBarberSelect"
                  aria-label="ช่างที่ต้องการเบิก"
                  value={selectedBarberId}
                  onChange={(val) => setSelectedBarberId(val)}
                >
                  {barbers.map((b) => (
                    <option key={b.id} value={b.id}>
                      {cleanBarberName(b.name || b.id)}
                    </option>
                  ))}
                </AppSelect>
              </div>

              <div className="advances-form-row">
                <label htmlFor="modalAdvanceDate">วันที่เบิก</label>
                <input
                  id="modalAdvanceDate"
                  type="date"
                  value={advanceDate}
                  required
                  onChange={(e) => setAdvanceDate(e.target.value)}
                />
              </div>

              <div className="advances-form-row">
                <label htmlFor="modalAdvanceAmount">จำนวนเงินที่เบิก (บาท)</label>
                <div className="advances-amount-input-wrap">
                  <input
                    id="modalAdvanceAmount"
                    type="number"
                    min="1"
                    step="1"
                    value={amount}
                    required
                    onChange={(e) => setAmount(e.target.value)}
                    autoFocus
                  />
                  <span className="advances-unit">บาท</span>
                </div>
                <div className="advances-chips">
                  {QUICK_AMOUNTS.map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      className="advances-chip"
                      onClick={() => setAmount(String(amt))}
                    >
                      {amt.toLocaleString()}฿
                    </button>
                  ))}
                </div>
              </div>

              <div className="advances-form-row">
                <label htmlFor="modalAdvanceReason">
                  เหตุผลการเบิกล่วงหน้า
                </label>
                <input
                  id="modalAdvanceReason"
                  type="text"
                  placeholder="เช่น ค่าเดินทาง, ค่าใช้จ่ายส่วนตัว"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
                <div className="advances-tags">
                  {ADVANCE_REASONS.map((r) => (
                    <button
                      key={r}
                      type="button"
                      className="advances-tag"
                      onClick={() => setReason(r)}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {formError && <div className="error-box" role="alert">{formError}</div>}

              <button
                className="advances-submit-btn"
                type="submit"
                disabled={saving || !selectedBarberId}
              >
                {saving
                  ? "กำลังบันทึก..."
                  : "ยืนยันบันทึกเบิกล่วงหน้า"}
              </button>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
