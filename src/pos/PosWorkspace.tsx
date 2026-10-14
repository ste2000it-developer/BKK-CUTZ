import { useEffect, useRef, useState } from "react";
import { logout } from "../shared/firebase/auth";
import type { Barber, PosBranch } from "../shared/domain/pos-attendance";
import type { Checkout, PosTransaction } from "../shared/domain/pos-payment";
import { formatDateTime } from "../shared/domain/pos-history";
import { listServicesByGroup, type ServiceRecord } from "../shared/firebase/repositories/services";
import { useAttendance } from "./features/attendance/useAttendance";
import { AttendanceModal } from "./features/attendance/AttendanceModal";
import { BarberSelectionPage } from "./features/barbers/BarberSelectionPage";
import { ServiceSelectionPage } from "./features/services/ServiceSelectionPage";
import { PaymentPage } from "./features/payment/PaymentPage";
import { HistoryModal } from "./features/history/HistoryModal";
import { TransactionSummary } from "./features/history/TransactionSummary";
import { LoadingScreen } from "../shared/components/LoadingScreen";
import { ShopExpenseModal } from "./features/expenses/ShopExpenseModal";

export function PosWorkspace({ branch }: { branch: PosBranch }) {
  const attendance = useAttendance(branch);
  const headerRef = useRef<HTMLElement>(null);
  const appRef = useRef<HTMLElement>(null);
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [catalogReady, setCatalogReady] = useState(false);
  const [error, setError] = useState("");
  const [barber, setBarber] = useState<Barber | null>(null);
  const [checkout, setCheckout] = useState<Checkout | null>(null);
  const [transaction, setTransaction] = useState<PosTransaction | null>(null);
  const [shift, setShift] = useState(false);
  const [history, setHistory] = useState(false);
  const [expense, setExpense] = useState(false);
  const [paymentScan, setPaymentScan] = useState(false);
  const [logoutConfirm, setLogoutConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => new Date().toISOString());
  useEffect(() => {
    let live = true;
    void listServicesByGroup(branch.serviceGroup).then((rows) => { if (live) { setServices(rows.filter((row) => row.active === true)); setCatalogReady(true); } })
      .catch((issue: unknown) => { if (live) setError(issue instanceof Error ? issue.message : "โหลดบริการไม่สำเร็จ"); });
    return () => { live = false; };
  }, [branch.serviceGroup]);
  useEffect(() => { const timer = window.setInterval(() => setNow(new Date().toISOString()), 1000); return () => window.clearInterval(timer); }, []);
  useEffect(() => {
    const header = headerRef.current;
    const app = appRef.current;
    if (!header || !app) return;
    const updateHeaderSpace = () => {
      const mobile = window.matchMedia("(max-width: 600px)").matches;
      app.style.setProperty("--pos-phone-header-height", mobile ? `${header.getBoundingClientRect().height}px` : "0px");
    };
    updateHeaderSpace();
    const observer = new ResizeObserver(updateHeaderSpace);
    observer.observe(header);
    window.addEventListener("resize", updateHeaderSpace);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateHeaderSpace);
      app.style.removeProperty("--pos-phone-header-height");
    };
  }, []);
  useEffect(() => {
    document.body.classList.toggle("modal-open", shift || history || expense || logoutConfirm || Boolean(checkout && !paymentScan));
    return () => document.body.classList.remove("modal-open");
  }, [shift, history, expense, checkout, paymentScan, logoutConfirm]);
  useEffect(() => {
    if (!logoutConfirm) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLogoutConfirm(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [logoutConfirm]);
  function selectBarber(next: Barber) {
    setBarber(next);
  }
  function reset() { setBarber(null); setCheckout(null); setPaymentScan(false); setTransaction(null); window.scrollTo({ top: 0, behavior: "smooth" }); }
  async function confirmLogout() {
    setLogoutConfirm(false);
    try { await logout(); } catch { setError("ออกจากระบบไม่สำเร็จ"); }
  }
  const ready = attendance.ready && catalogReady;
  return <main id="mainApp" ref={appRef} className="app"><header ref={headerRef} className="app-header">
    <div><div className="system-brand">BKK-CUTZ</div><div className="system-subbrand">BARBER POS SYSTEM</div></div>
    <div className="branch-block"><svg className="branch-pin" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11Z" /><circle cx="12" cy="10" r="2" /></svg><div><div className="branch-caption">สาขาปัจจุบัน</div><strong>{branch.name || branch.id}</strong></div></div>
    <div className="header-actions"><div className="pos-datetime" aria-label="วันที่และเวลาปัจจุบัน">{formatDateTime(now)}</div><button className="expense-header-button" aria-label="เบิกเงินร้านไปซื้อของ" title="เบิกเงินร้านไปซื้อของ" disabled={busy} onClick={() => setExpense(true)}><span className="material-symbols-outlined">shopping_bag</span></button><button className="history-header-button" aria-label="ประวัติรายการ" title="ประวัติรายการ" disabled={busy} onClick={() => setHistory(true)}><span className="material-symbols-outlined">receipt_long</span></button><button className="shift-header-button" aria-label="จัดการช่างวันนี้" title="จัดการช่างวันนี้" disabled={busy || !attendance.ready} onClick={() => setShift(true)}><span className="material-symbols-outlined">person_check</span></button><button className="shift-header-button" aria-label="ออกจากระบบ" title="ออกจากระบบ" disabled={busy} onClick={() => setLogoutConfirm(true)}><span className="material-symbols-outlined">logout</span></button></div>
  </header>
    {logoutConfirm && <div className="modal"><button className="modal-backdrop" type="button" aria-label="ยกเลิกออกจากระบบ" onClick={() => setLogoutConfirm(false)} /><section className="logout-confirm-card" role="alertdialog" aria-modal="true" aria-labelledby="logoutConfirmTitle" aria-describedby="logoutConfirmDescription"><button className="modal-close" type="button" aria-label="ปิด" onClick={() => setLogoutConfirm(false)}>×</button><h2 id="logoutConfirmTitle">ออกจากระบบ?</h2><p id="logoutConfirmDescription">ต้องการออกจากระบบสาขานี้หรือไม่</p><div className="logout-confirm-actions"><button className="secondary-button" type="button" autoFocus onClick={() => setLogoutConfirm(false)}>ยกเลิก</button><button className="primary-button" type="button" onClick={() => void confirmLogout()}>ออกจากระบบ</button></div></section></div>}
    {(error || attendance.error) && <div className="error-box" role="alert">{error || attendance.error}</div>}
    {!ready && !error && !attendance.error && <section className="pos-workspace-loading" aria-live="polite"><LoadingScreen message="กำลังโหลดข้อมูลสาขา..." spinnerClassName="loading-spinner" /></section>}
    {ready && <>
      <section id="barberPage" className={`page${barber || transaction ? " hidden" : ""}`}>
<div id="barberReactRoot"><BarberSelectionPage barbers={attendance.barbers} onSelect={selectBarber} onOpenShift={() => setShift(true)} /></div></section>
      {barber && !transaction && <section id="servicePage" className={`page${paymentScan ? " hidden" : ""}`}><div id="serviceReactRoot"><ServiceSelectionPage key={barber.id} services={services} barber={barber} onBack={reset} onCheckout={(services) => { setPaymentScan(false); setCheckout({ barber, services }); }} /></div></section>}
      {checkout && <PaymentPage branch={branch} checkout={checkout} onCancel={() => setCheckout(null)} onBusy={setBusy} onScanChange={setPaymentScan} onSuccess={(saved) => { setTransaction(saved); setCheckout(null); setBusy(false); window.scrollTo({ top: 0, behavior: "smooth" }); }} />}
      {transaction && <section id="successPage" className="page"><TransactionSummary transaction={transaction} onDone={reset} /></section>}
    </>}
    {shift && <AttendanceModal attendance={attendance} onClose={() => setShift(false)} />}
    {history && <HistoryModal branchId={branch.id} barbers={attendance.barbers} onClose={() => setHistory(false)} />}
    {expense && <ShopExpenseModal branch={branch} barbers={attendance.barbers} onClose={() => setExpense(false)} />}
  </main>;
}
