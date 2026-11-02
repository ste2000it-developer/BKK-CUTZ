import { useEffect, useMemo, useRef, useState } from "react";
import { AppSelect } from "../../components/AppSelect";
import { localDateKey } from "../../../shared/domain/pos-attendance";
import { listBranches, type BranchRecord } from "../../../shared/firebase/repositories/branches";
import {
  listTransactionsByDateRange,
  type TransactionHistoryRecord,
} from "../../../shared/firebase/repositories/transactions";
import {
  listPayoutHistory,
  type PayoutRecord,
} from "../../../shared/firebase/repositories/payouts";
import {
  listShopExpensesByDateRange,
  type ShopExpenseRecord,
} from "../../../shared/firebase/repositories/shop-expenses";
import {
  listBarberAdvances,
  type BarberAdvanceRecord,
} from "../../../shared/firebase/repositories/advances";
import {
  allocatePayoutToBranch,
  calculateFinancialSummary,
  type FinancialSummary,
} from "../../../shared/domain/financial-summary";

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

type PeriodType = "today" | "7days" | "month" | "custom";

export function FinancialSummaryPage() {
  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [transactions, setTransactions] = useState<TransactionHistoryRecord[]>([]);
  const [payouts, setPayouts] = useState<PayoutRecord[]>([]);
  const [shopExpenses, setShopExpenses] = useState<ShopExpenseRecord[]>([]);
  const [advances, setAdvances] = useState<BarberAdvanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const loadRequest = useRef(0);

  // Filters
  const [branchFilter, setBranchFilter] = useState("all");
  const [periodType, setPeriodType] = useState<PeriodType>("month");

  const todayKey = useMemo(() => localDateKey(new Date()), []);
  const [startDateKey, setStartDateKey] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  });
  const [endDateKey, setEndDateKey] = useState(todayKey);

  // Tab for detail views
  const [activeTab, setActiveTab] = useState<"overview" | "shop-expenses" | "advances" | "payouts">("overview");

  function changePeriod(type: PeriodType) {
    setPeriodType(type);
    const now = new Date();
    if (type === "today") {
      const today = localDateKey(now);
      setStartDateKey(today);
      setEndDateKey(today);
    } else if (type === "7days") {
      const past = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
      setStartDateKey(localDateKey(past));
      setEndDateKey(localDateKey(now));
    } else if (type === "month") {
      const start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      setStartDateKey(start);
      setEndDateKey(localDateKey(now));
    }
  }

  async function loadFinancialData(start: string, end: string) {
    const request = ++loadRequest.current;
    setLoading(true);
    setError("");
    if (!start || !end || start > end) {
      setError("กรุณาระบุช่วงวันที่ให้ถูกต้อง (วันเริ่มต้องไม่เกินวันสิ้นสุด)");
      setLoading(false);
      return;
    }

    try {
      // These values make up one financial statement. Never show a partial total
      // or retain amounts from an earlier period when a source fails.
      const [branchRecords, transactionsResult, payoutRecords, expensesResult, advancesResult] = await Promise.all([
        listBranches(),
        listTransactionsByDateRange(start, end),
        listPayoutHistory(),
        listShopExpensesByDateRange(start, end),
        listBarberAdvances(start, end),
      ]);
      if (request !== loadRequest.current) return;

      setBranches(branchRecords);
      setTransactions(transactionsResult);
      setPayouts(payoutRecords.filter((payout) => {
        if (payout.status && payout.status !== "paid") return false;
        const payoutDate = String(payout.payoutDate || payout.payoutCycleId || "");
        return payoutDate >= start && payoutDate <= end;
      }));
      setShopExpenses(expensesResult);
      setAdvances(advancesResult);
    } catch (loadErr) {
      if (request !== loadRequest.current) return;
      console.error("Failed to load complete financial summary:", loadErr);
      setBranches([]);
      setTransactions([]);
      setPayouts([]);
      setShopExpenses([]);
      setAdvances([]);
      setError("ข้อมูลการเงินไม่ครบ จึงไม่แสดงยอดสรุปเพื่อป้องกันยอดคลาดเคลื่อน กรุณาตรวจสอบการเชื่อมต่อ/สิทธิ์ Firestore แล้วกดลองใหม่");
    } finally {
      if (request === loadRequest.current) setLoading(false);
    }
  }

  useEffect(() => {
    void loadFinancialData(startDateKey, endDateKey);
  }, [startDateKey, endDateKey]);

  const summary: FinancialSummary = useMemo(() => {
    return calculateFinancialSummary({
      transactions,
      payouts,
      shopExpenses,
      advances,
      branchId: branchFilter,
      branches,
    });
  }, [transactions, payouts, shopExpenses, advances, branchFilter, branches]);

  const filteredShopExpenses = useMemo(() => {
    return shopExpenses.filter(
      (item) => branchFilter === "all" || item.branchId === branchFilter,
    );
  }, [shopExpenses, branchFilter]);

  const filteredAdvances = useMemo(() => {
    return advances.filter(
      (item) => item.status !== "cancelled" && (branchFilter === "all" || item.branchId === branchFilter),
    );
  }, [advances, branchFilter]);

  const filteredPayouts = useMemo(() => {
    return payouts
      .map((payout) => ({
        payout,
        allocation: allocatePayoutToBranch(payout, branchFilter, branches),
      }))
      .filter((item) => item.allocation.matched);
  }, [payouts, branchFilter, branches]);

  return (
    <div className="financial-summary-react-page">
      <section className="financial-summary-filter-card">
        <div className="financial-summary-head">
          <div>
            <div className="section-kicker">FINANCIAL SUMMARY & NET PROFIT</div>
            <h2>สรุปยอดหลังหักค่าใช้จ่ายทั้งหมด</h2>
            <p>รายงานรายรับจากยอดขายบริการ หักค่าใช้จ่ายทั้งหมดเพื่อคำนวณยอดคงเหลือสุทธิ</p>
          </div>
        </div>

        <div className="financial-period-selector">
          <button
            className={`financial-period-btn${periodType === "today" ? " active" : ""}`}
            type="button"
            onClick={() => changePeriod("today")}
          >
            วันนี้
          </button>
          <button
            className={`financial-period-btn${periodType === "7days" ? " active" : ""}`}
            type="button"
            onClick={() => changePeriod("7days")}
          >
            7 วันล่าสุด
          </button>
          <button
            className={`financial-period-btn${periodType === "month" ? " active" : ""}`}
            type="button"
            onClick={() => changePeriod("month")}
          >
            เดือนนี้
          </button>
          <button
            className={`financial-period-btn${periodType === "custom" ? " active" : ""}`}
            type="button"
            onClick={() => setPeriodType("custom")}
          >
            กำหนดเอง
          </button>
        </div>

        <div className="financial-summary-filters">
          <label className="financial-date-field">
            <span>ตั้งแต่วันที่</span>
            <span className="financial-mobile-date-value" aria-hidden="true">{startDateKey ? new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", year: "2-digit" }).format(new Date(`${startDateKey}T12:00:00+07:00`)) : "เลือกวันที่"}</span>
            <input
              type="date"
              aria-label="ตั้งแต่วันที่"
              value={startDateKey}
              onChange={(e) => {
                setPeriodType("custom");
                setStartDateKey(e.target.value);
              }}
            />
          </label>
          <label className="financial-date-field">
            <span>ถึงวันที่</span>
            <span className="financial-mobile-date-value" aria-hidden="true">{endDateKey ? new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", year: "2-digit" }).format(new Date(`${endDateKey}T12:00:00+07:00`)) : "เลือกวันที่"}</span>
            <input
              type="date"
              aria-label="ถึงวันที่"
              value={endDateKey}
              onChange={(e) => {
                setPeriodType("custom");
                setEndDateKey(e.target.value);
              }}
            />
          </label>
          <div className="financial-select-field">
            <span>สาขา</span>
            <AppSelect
              aria-label="สาขา"
              value={branchFilter}
              onChange={(val) => setBranchFilter(val)}
            >
              <option value="all">ทุกสาขา</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name || b.id}
                </option>
              ))}
            </AppSelect>
          </div>
        </div>
      </section>

      {/* Main KPI Cards: Revenue - Expenses = Net Profit */}
      {loading && <div className="financial-loading" role="status">กำลังโหลดข้อมูลการเงินทุกหมวด...</div>}
      {!loading && !error && <section className="financial-kpi-grid">
        {/* Card 1: Revenue */}
        <div className="financial-kpi-card revenue-card">
          <div className="kpi-title">รายรับรวม (ยอดขาย)</div>
          <div className="kpi-amount">{formatMoney(summary.totalRevenue)} <small>บาท</small></div>
          <div className="kpi-breakdown">
            <div>
              <span>ค่าบริการ</span>
              <strong>{formatMoney(summary.serviceRevenue)} ฿</strong>
            </div>
            <div>
              <span>ทิปช่าง</span>
              <strong>{formatMoney(summary.tipRevenue)} ฿</strong>
            </div>
          </div>
          <div className="kpi-meta">
            <span>เงินสด: {formatMoney(summary.cashRevenue)} ฿</span>
            <span>สแกน: {formatMoney(summary.scanRevenue)} ฿</span>
            <span>({summary.transactionCount} รายการ)</span>
          </div>
        </div>

        {/* Card 2: Total Expenses */}
        <div className="financial-kpi-card expense-card">
          <div className="kpi-title">ค่าใช้จ่ายทั้งหมด</div>
          <div className="kpi-amount expense-amount">
            - {formatMoney(summary.totalExpenses)} <small>บาท</small>
          </div>
          <div className="kpi-breakdown">
            <div>
              <span>จ่ายเงินช่าง</span>
              <strong>{formatMoney(summary.barberPayoutTotal)} ฿</strong>
            </div>
            <div>
              <span>ซื้อของร้าน (POS)</span>
              <strong>{formatMoney(summary.shopExpenseTotal)} ฿</strong>
            </div>
            <div>
              <span>เบิกล่วงหน้า</span>
              <strong>{formatMoney(summary.barberAdvanceTotal)} ฿</strong>
            </div>
          </div>
          <div className="kpi-meta">
            <span>หักค่าใช้จ่ายทุกหมวดในรอบ</span>
          </div>
        </div>

        {/* Card 3: Net Remaining Balance */}
        <div className="financial-kpi-card net-card">
          <div className="kpi-title">ยอดคงเหลือสุทธิ (กำไร)</div>
          <div className={`kpi-amount ${summary.netTotal >= 0 ? "net-positive" : "net-negative"}`}>
            {formatMoney(summary.netTotal)} <small>บาท</small>
          </div>
          <div className="kpi-breakdown">
            <div>
              <span>อัตราคงเหลือ</span>
              <strong>{summary.marginPercent}%</strong>
            </div>
            <div>
              <span>สถานะ</span>
              <strong style={{ color: summary.netTotal >= 0 ? "#167343" : "#b42318" }}>
                {summary.netTotal >= 0 ? "กำไรสุทธิ" : "ขาดทุน"}
              </strong>
            </div>
          </div>
          <div className="kpi-meta">
            <span>{formatThaiDate(startDateKey)} – {formatThaiDate(endDateKey)}</span>
          </div>
        </div>
      </section>}

      {error && <div className="error-box" role="alert">{error} <button type="button" className="secondary-button" onClick={() => void loadFinancialData(startDateKey, endDateKey)}>ลองโหลดใหม่</button></div>}

      {/* Detail Tabs */}
      {!loading && !error && <section className="financial-details-card">
        <div className="financial-tabs">
          <button
            className={`financial-tab-btn${activeTab === "overview" ? " active" : ""}`}
            type="button"
            onClick={() => setActiveTab("overview")}
          >
            สรุปภาพรวมรายรับ-รายจ่าย
          </button>
          <button
            className={`financial-tab-btn${activeTab === "shop-expenses" ? " active" : ""}`}
            type="button"
            onClick={() => setActiveTab("shop-expenses")}
          >
            เบิกเงินร้านซื้อของ ({filteredShopExpenses.length})
          </button>
          <button
            className={`financial-tab-btn${activeTab === "advances" ? " active" : ""}`}
            type="button"
            onClick={() => setActiveTab("advances")}
          >
            เบิกล่วงหน้าช่าง ({filteredAdvances.length})
          </button>
          <button
            className={`financial-tab-btn${activeTab === "payouts" ? " active" : ""}`}
            type="button"
            onClick={() => setActiveTab("payouts")}
          >
            จ่ายเงินช่าง ({filteredPayouts.length})
          </button>
        </div>

        {loading ? (
          <div className="financial-loading">กำลังโหลดข้อมูลสรุปการเงิน...</div>
        ) : (
          <div className="financial-tab-content">
            {activeTab === "overview" && (
              <div className="financial-overview-table">
                <div className="financial-overview-row title-row">
                  <span>หมวดหมู่รายการ</span>
                  <span style={{ textAlign: "right" }}>จำนวนเงิน</span>
                </div>
                <div className="financial-overview-row plus">
                  <div>
                    <strong>+ ยอดขายบริการทั้งหมด</strong>
                    <p>รายรับจากบริการตัดผมและบริการอื่นๆ ({summary.transactionCount} รายการ)</p>
                  </div>
                  <strong className="money-plus">{formatMoney(summary.serviceRevenue)} บาท</strong>
                </div>
                <div className="financial-overview-row plus">
                  <div>
                    <strong>+ ทิปช่าง</strong>
                    <p>ลูกค้าระบุให้ทิปผ่านระบบสแกน</p>
                  </div>
                  <strong className="money-plus">{formatMoney(summary.tipRevenue)} บาท</strong>
                </div>
                <div className="financial-overview-row total-income-row">
                  <strong>รวมรายรับทั้งหมด (100%)</strong>
                  <strong>{formatMoney(summary.totalRevenue)} บาท</strong>
                </div>

                <div className="financial-overview-row minus">
                  <div>
                    <strong>- จ่ายเงินช่าง (Payouts)</strong>
                    <p>ค่ามือ + ประกันมือ + ทิป ที่จ่ายให้ช่างในรอบ ({summary.barberPayoutCount} รายการ)</p>
                  </div>
                  <strong className="money-minus">- {formatMoney(summary.barberPayoutTotal)} บาท</strong>
                </div>
                <div className="financial-overview-row minus">
                  <div>
                    <strong>- เบิกเงินร้านไปซื้อของ (POS Shop Expenses)</strong>
                    <p>เงินสดที่ช่าง/พนักงานเบิกไปซื้ออุปกรณ์และของใช้ร้าน ({summary.shopExpenseCount} รายการ)</p>
                  </div>
                  <strong className="money-minus">- {formatMoney(summary.shopExpenseTotal)} บาท</strong>
                </div>
                <div className="financial-overview-row minus">
                  <div>
                    <strong>- เบิกเงินล่วงหน้าช่าง (Barber Advances)</strong>
                    <p>เงินเบิกล่วงหน้าของช่างที่ยังรอหักรอบจ่าย ({summary.barberAdvanceCount} รายการ)</p>
                  </div>
                  <strong className="money-minus">- {formatMoney(summary.barberAdvanceTotal)} บาท</strong>
                </div>
                <div className="financial-overview-row total-expense-row">
                  <strong>รวมค่าใช้จ่ายทั้งหมด</strong>
                  <strong className="money-minus">- {formatMoney(summary.totalExpenses)} บาท</strong>
                </div>

                <div className="financial-overview-row grand-net-row">
                  <div>
                    <strong>ยอดคงเหลือสุทธิหลังหักค่าใช้จ่ายทั้งหมด</strong>
                    <p>รายรับทั้งหมด หัก ค่าใช้จ่ายทั้งหมด</p>
                  </div>
                  <strong className={summary.netTotal >= 0 ? "grand-plus" : "grand-minus"}>
                    {formatMoney(summary.netTotal)} บาท
                  </strong>
                </div>
              </div>
            )}

            {activeTab === "shop-expenses" && (
              <div className="financial-list-wrap">
                {filteredShopExpenses.length === 0 ? (
                  <div className="financial-empty">ไม่มีรายการเบิกเงินร้านไปซื้อของในช่วงเวลานี้</div>
                ) : (
                  <table className="financial-table">
                    <thead>
                      <tr>
                        <th>วันที่</th>
                        <th>สาขา</th>
                        <th>ผู้เบิก</th>
                        <th>รายการที่ซื้อ / เหตุผล</th>
                        <th>หมายเหตุ</th>
                        <th style={{ textAlign: "right" }}>จำนวนเงิน</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredShopExpenses.map((exp) => (
                        <tr key={exp.id}>
                          <td>{formatThaiDate(exp.dateKey)}</td>
                          <td>{exp.branchName || exp.branchId}</td>
                          <td><strong>{exp.barberName}</strong></td>
                          <td>{exp.reason}</td>
                          <td>{exp.note || "-"}</td>
                          <td style={{ textAlign: "right" }}>
                            <strong className="money-minus">{formatMoney(exp.amount)} บาท</strong>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {activeTab === "advances" && (
              <div className="financial-list-wrap">
                {filteredAdvances.length === 0 ? (
                  <div className="financial-empty">ไม่มีรายการเบิกล่วงหน้าของช่างในช่วงเวลานี้</div>
                ) : (
                  <table className="financial-table">
                    <thead>
                      <tr>
                        <th>วันที่เบิก</th>
                        <th>ช่าง</th>
                        <th>สาขา</th>
                        <th>เหตุผล / หมายเหตุ</th>
                        <th style={{ textAlign: "right" }}>จำนวนเงิน</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAdvances.map((adv) => (
                        <tr key={adv.id}>
                          <td>{formatThaiDate(adv.dateKey)}</td>
                          <td><strong>{adv.barberName}</strong></td>
                          <td>{adv.branchName || adv.branchId || "-"}</td>
                          <td>{adv.reason || adv.note || "-"}</td>
                          <td style={{ textAlign: "right" }}>
                            <strong className="money-minus">{formatMoney(adv.amount)} บาท</strong>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {activeTab === "payouts" && (
              <div className="financial-list-wrap">
                {filteredPayouts.length === 0 ? (
                  <div className="financial-empty">ไม่มีรายการจ่ายเงินช่างในช่วงเวลานี้</div>
                ) : (
                  <table className="financial-table">
                    <thead>
                      {branchFilter === "all" ? (
                        <tr>
                          <th>รอบจ่าย</th>
                          <th>ช่าง</th>
                          <th>วันทำงาน</th>
                          <th>ค่ามือ</th>
                          <th>ประกันมือ</th>
                          <th>ทิป</th>
                          <th style={{ textAlign: "right" }}>รวมจ่าย</th>
                        </tr>
                      ) : (
                        <tr>
                          <th>รอบจ่าย</th>
                          <th>ช่าง</th>
                          <th>สาขา</th>
                          <th style={{ textAlign: "right" }}>ยอดจ่ายของสาขานี้</th>
                        </tr>
                      )}
                    </thead>
                    <tbody>
                      {filteredPayouts.map(({ payout: p, allocation }) => (
                        branchFilter === "all" ? (
                          <tr key={p.id}>
                            <td>{String(p.payoutCycleId || p.payoutDate || "-")}</td>
                            <td><strong>{String(p.barberName || p.barberId || "-")}</strong></td>
                            <td>{Number(p.workDays || 0)} วัน</td>
                            <td>{formatMoney(p.commissionAmount)}</td>
                            <td>{formatMoney(p.guaranteeAmount)}</td>
                            <td>{formatMoney(p.tipAmount)}</td>
                            <td style={{ textAlign: "right" }}>
                              <strong className="money-minus">{formatMoney(allocation.amount)} บาท</strong>
                            </td>
                          </tr>
                        ) : (
                          <tr key={p.id}>
                            <td>{String(p.payoutCycleId || p.payoutDate || "-")}</td>
                            <td><strong>{String(p.barberName || p.barberId || "-")}</strong></td>
                            <td>{branches.find((branch) => branch.id === branchFilter)?.name || branchFilter}</td>
                            <td style={{ textAlign: "right" }}>
                              <strong className="money-minus">{formatMoney(allocation.amount)} บาท</strong>
                            </td>
                          </tr>
                        )
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        )}
      </section>}
    </div>
  );
}
