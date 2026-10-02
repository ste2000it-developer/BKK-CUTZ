import { useEffect, useState } from "react";
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

export function PosWorkspace({ branch }: { branch: PosBranch }) {
  const attendance = useAttendance(branch);
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [catalogReady, setCatalogReady] = useState(false);
  const [error, setError] = useState("");
  const [barber, setBarber] = useState<Barber | null>(null);
  const [checkout, setCheckout] = useState<Checkout | null>(null);
  const [transaction, setTransaction] = useState<PosTransaction | null>(null);
  const [shift, setShift] = useState(false);
  const [history, setHistory] = useState(false);
  const [paymentScan, setPaymentScan] = useState(false);
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
    document.body.classList.toggle("modal-open", shift || history || Boolean(checkout && !paymentScan));
    return () => document.body.classList.remove("modal-open");
  }, [shift, history, checkout, paymentScan]);
  function reset() { setBarber(null); setCheckout(null); setPaymentScan(false); setTransaction(null); window.scrollTo({ top: 0, behavior: "smooth" }); }
  const ready = attendance.ready && catalogReady;
  return <main id="mainApp" className="app"><header className="app-header">
    <div><div className="system-brand">BKK-CUTZ</div><div className="system-subbrand">BARBER POS SYSTEM</div></div>
    <div className="branch-block"><svg className="branch-pin" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11Z" /><circle cx="12" cy="10" r="2" /></svg><div><div className="branch-caption">สาขาปัจจุบัน</div><strong>{branch.name || branch.id}</strong></div></div>
    <div className="header-actions"><div className="pos-datetime" aria-label="วันที่และเวลาปัจจุบัน">{formatDateTime(now)}</div><button className="history-header-button" aria-label="ประวัติรายการ" disabled={busy} onClick={() => setHistory(true)}><span className="material-symbols-outlined">receipt_long</span></button><button className="shift-header-button" aria-label="จัดการช่างวันนี้" disabled={busy || !attendance.ready} onClick={() => setShift(true)}><span className="material-symbols-outlined">person_check</span></button><button className="shift-header-button" aria-label="ออกจากระบบ" disabled={busy} onClick={() => void logout().catch(() => setError("ออกจากระบบไม่สำเร็จ"))}><span className="material-symbols-outlined">logout</span></button></div>
  </header>
    {(error || attendance.error) && <div className="error-box" role="alert">{error || attendance.error}</div>}
    {!ready && !error && !attendance.error && <LoadingScreen message="กำลังโหลดข้อมูลสาขา..." messageElement="p" spinnerClassName="loading-spinner" />}
    {ready && <>
      <section id="barberPage" className={`page${barber || transaction ? " hidden" : ""}`}><div id="barberReactRoot"><BarberSelectionPage barbers={attendance.barbers} onSelect={setBarber} onOpenShift={() => setShift(true)} /></div></section>
      {barber && !transaction && <section id="servicePage" className={`page${paymentScan ? " hidden" : ""}`}><div id="serviceReactRoot"><ServiceSelectionPage key={barber.id} services={services} barber={barber} onBack={reset} onCheckout={(services) => { setPaymentScan(false); setCheckout({ barber, services }); }} /></div></section>}
      {checkout && <PaymentPage branch={branch} checkout={checkout} onCancel={() => setCheckout(null)} onBusy={setBusy} onScanChange={setPaymentScan} onSuccess={(saved) => { setTransaction(saved); setCheckout(null); setBusy(false); window.scrollTo({ top: 0, behavior: "smooth" }); }} />}
      {transaction && <section id="successPage" className="page"><TransactionSummary transaction={transaction} onDone={reset} /></section>}
    </>}
    {shift && <AttendanceModal attendance={attendance} onClose={() => setShift(false)} />}
    {history && <HistoryModal branchId={branch.id} onClose={() => setHistory(false)} />}
  </main>;
}
