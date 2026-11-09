import { useEffect, useMemo, useState } from "react";
import { bangkokBusinessDate } from "../../../shared/domain/cash-closing";
import { branchStatus, buildBranchNetwork, type NetworkData } from "../../../shared/domain/branch-network";
import { watchBranchNetwork } from "../../../shared/firebase/repositories/branch-network";
import "./dashboard.css";

type DailySnapshot = {
  dateKey: string;
  data: NetworkData;
  cached: boolean;
};

const baht = (value: number) =>
  "฿" + value.toLocaleString("th-TH", { maximumFractionDigits: 2 });

const thaiDate = (dateKey: string) =>
  new Intl.DateTimeFormat("th-TH-u-ca-buddhist", {
    timeZone: "Asia/Bangkok",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(dateKey + "T12:00:00+07:00"));

/**
 * A deliberately quiet, responsive Admin home.
 * All figures come from the existing realtime branch network data and
 * use its established void-bill and presence calculations.
 */
export function DashboardPage() {
  const [dateKey, setDateKey] = useState(() => bangkokBusinessDate());
  const [snapshot, setSnapshot] = useState<DailySnapshot | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [showAllBranches, setShowAllBranches] = useState(false);

  useEffect(() => {
    const updateDate = () => setDateKey(bangkokBusinessDate());
    const interval = window.setInterval(updateDate, 60_000);
    window.addEventListener("focus", updateDate);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", updateDate);
    };
  }, []);

  useEffect(() => {
    setSnapshot(null);
    setError("");
    setShowAllBranches(false);
    return watchBranchNetwork(
      dateKey,
      (data, cached) => {
        setSnapshot({ dateKey, data, cached });
        setError("");
      },
      (issue) => {
        console.error("Admin dashboard load failed:", issue);
        setError("โหลดข้อมูลร้านไม่สำเร็จ กรุณาลองใหม่");
      },
    );
  }, [dateKey, attempt]);

  const current = snapshot?.dateKey === dateKey ? snapshot : null;
  const branches = useMemo(
    () => (current ? buildBranchNetwork(current.data, dateKey) : []),
    [current, dateKey],
  );
  const totalSales = branches.reduce((sum, branch) => sum + branch.sales, 0);
  const totalBills = branches.reduce((sum, branch) => sum + branch.bills, 0);
  const checkedInBarbers = branches.reduce((sum, branch) => sum + branch.barbers.length, 0);
  const workingBranches = branches.filter((branch) => branch.status === "working").length;
  const visibleBranches = showAllBranches ? branches : branches.slice(0, 5);

  const statusText = error
    ? "เชื่อมต่อขัดข้อง"
    : !current
      ? "กำลังโหลดข้อมูล"
      : current.cached
        ? "ข้อมูลจากเครื่อง"
        : "อัปเดตอัตโนมัติ";

  return (
    <div className="dash-page" aria-label="ภาพรวมร้าน BKK-CUTZ">
      <header className="dash-page-header">
        <div className="dash-heading">
          <h2>ภาพรวมร้าน</h2>
          <p>{thaiDate(dateKey)}</p>
        </div>
        <div className="dash-header-actions">
          <span className={"dash-live" + (error || current?.cached ? " dash-live--offline" : "")} role="status">
            <span className="dash-live-dot" aria-hidden="true" />
            {statusText}
          </span>
          <button type="button" className="dash-refresh" aria-label="โหลดข้อมูลใหม่" title="โหลดข้อมูลใหม่" onClick={() => setAttempt((value) => value + 1)}>
            <i className="fa-solid fa-rotate-right" aria-hidden="true" />
          </button>
        </div>
      </header>

      {error && (
        <div className="dash-error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => setAttempt((value) => value + 1)}>ลองใหม่</button>
        </div>
      )}
      {current?.cached && !error && (
        <p className="dash-cache-note" role="status">กำลังแสดงข้อมูลที่เก็บไว้ในเครื่อง อาจยังไม่ใช่ยอดล่าสุด</p>
      )}

      <section className="dash-overview" aria-label="ตัวเลขสำคัญวันนี้" aria-busy={!current && !error}>
        <div className="dash-sales">
          <div className="dash-sales-label">
            <span>ยอดวันนี้</span>
            <i className="fa-solid fa-chart-line" aria-hidden="true" />
          </div>
          <strong>{current ? baht(totalSales) : "—"}</strong>
          <p>รวมทุกสาขา · ค่าบริการและทิป ไม่รวมบิลยกเลิก</p>
        </div>
        <div className="dash-stat">
          <span className="dash-stat-label">จำนวนบิล</span>
          <strong>{current ? totalBills.toLocaleString("th-TH") : "—"}</strong>
          <span className="dash-stat-desc">รายการวันนี้</span>
        </div>
        <div className="dash-stat">
          <span className="dash-stat-label">ช่างอยู่ในร้าน</span>
          <strong>{current ? checkedInBarbers.toLocaleString("th-TH") : "—"} <small>คน</small></strong>
          <span className="dash-stat-desc">กำลังเข้างาน</span>
        </div>
      </section>

      <section className="dash-branches" aria-labelledby="dash-branches-title">
        <div className="dash-branches-head">
          <div>
            <h3 id="dash-branches-title">สถานะสาขา</h3>
            <p>{current ? workingBranches.toLocaleString("th-TH") + " สาขามีช่างอยู่ในร้าน" : "สถานะทุกสาขาในวันนี้"}</p>
          </div>
          {current && <span className="dash-branch-count">{branches.length.toLocaleString("th-TH")} สาขา</span>}
        </div>

        {!current && !error && <p className="dash-empty" role="status">กำลังโหลดข้อมูลสาขา...</p>}
        {!current && error && <p className="dash-empty">ยังแสดงสถานะสาขาไม่ได้</p>}
        {current && branches.length === 0 && <p className="dash-empty">ยังไม่มีข้อมูลสาขา</p>}
        {current && branches.length > 0 && (
          <div className="dash-branch-list">
            {visibleBranches.map((branch) => (
              <div className="dash-branch" key={branch.id}>
                <span className={"dash-branch-indicator dash-branch-indicator--" + branch.status} aria-hidden="true" />
                <div className="dash-branch-info">
                  <strong>{branch.name}</strong>
                  <span>{branchStatus[branch.status]}{branch.barbers.length ? " · " + branch.barbers.length.toLocaleString("th-TH") + " คน" : ""}</span>
                </div>
                <div className="dash-branch-sales">
                  <strong>{baht(branch.sales)}</strong>
                  <span>{branch.bills.toLocaleString("th-TH")} บิล</span>
                </div>
              </div>
            ))}
          </div>
        )}
        {current && branches.length > 5 && (
          <button type="button" className="dash-show-all" onClick={() => setShowAllBranches((value) => !value)} aria-expanded={showAllBranches}>
            {showAllBranches ? "แสดงน้อยลง" : "ดูทุกสาขา (" + branches.length.toLocaleString("th-TH") + ")"}
            <i className={"fa-solid " + (showAllBranches ? "fa-chevron-up" : "fa-chevron-down")} aria-hidden="true" />
          </button>
        )}
      </section>
      <p className="dash-footnote">สถานะ “มีช่างเข้างาน” อ้างอิงข้อมูลลงเวลาปัจจุบัน ไม่ใช่เวลาเปิดทำการของสาขา</p>
    </div>
  );
}
