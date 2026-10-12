import { useEffect, useRef, useState } from "react";
import { markAllAdminNotificationsRead, watchAdminNotifications, watchAdminUnread, type AdminNotification } from "../../shared/firebase/repositories/admin-notifications";
import { notificationTime, unreadLabel } from "../../shared/domain/admin-notifications";
import "./notification-center.css";

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<AdminNotification[]>([]);
  const [count, setCount] = useState<number | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [readAttempt, setReadAttempt] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const container = useRef<HTMLDivElement>(null);
  const bell = useRef<HTMLButtonElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    setError(""); setReady(false); setCount(null);
    const fail = () => setError("โหลดการแจ้งเตือนไม่สำเร็จ กรุณาลองใหม่");
    const stopHistory = watchAdminNotifications((next) => { setRows(next); setReady(true); }, fail);
    const stopUnread = watchAdminUnread(setCount, fail);
    return () => { stopHistory(); stopUnread(); };
  }, [attempt]);
  useEffect(() => {
    if (!open) return;
    close.current?.focus();
    const outside = (event: PointerEvent) => { if (!container.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(false); bell.current?.focus(); } };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [open]);
  useEffect(() => {
    if (!open) return;
    let live = true;
    setSaveError("");
    void markAllAdminNotificationsRead().catch(() => {
      if (live) setSaveError("บันทึกสถานะอ่านไม่สำเร็จ กรุณาลองใหม่");
    });
    return () => { live = false; };
  }, [open, readAttempt]);
  return <div className="notification-center" ref={container} onBlur={(event) => {
    if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget as Node)) setOpen(false);
  }}>
    <button ref={bell} type="button" className="notification-bell" aria-label={"การแจ้งเตือน" + (count ? " ยังไม่อ่าน " + unreadLabel(count) + " รายการ" : "")} aria-expanded={open} aria-controls="admin-notifications" onClick={() => setOpen(!open)}>
      <svg viewBox="0 0 24 24" width="23" height="23" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>
      {error ? <span className="notification-badge">!</span> : count !== null && count > 0 && <span className="notification-badge">{unreadLabel(count)}</span>}
    </button>
    {open && <section id="admin-notifications" className="notification-panel" aria-label="การแจ้งเตือน">
      <div className="notification-heading"><div><h2>การแจ้งเตือน</h2><small>ทุกสาขา · 50 รายการล่าสุด</small></div><button ref={close} type="button" aria-label="ปิดการแจ้งเตือน" onClick={() => { setOpen(false); bell.current?.focus(); }}>✕</button></div>
      {error && <div className="notification-status" role="alert">{error} <button type="button" onClick={() => setAttempt(attempt + 1)}>ลองใหม่</button></div>}
      {saveError && <div className="notification-status" role="alert">{saveError} <button type="button" onClick={() => setReadAttempt((value) => value + 1)}>ลองบันทึกอีกครั้ง</button></div>}
      {!ready && !error && <p className="notification-status" role="status">กำลังโหลด...</p>}
      {ready && !rows.length && <p className="notification-status">ยังไม่มีการแจ้งเตือน</p>}
      <div className="notification-list" role="list">{rows.map((row) => <div key={row.id} role="listitem" className={"notification-item" + (row.read ? "" : " is-unread")} aria-label={row.message + " " + row.branchName + (row.read ? " อ่านแล้ว" : " ยังไม่อ่าน")}>
        <span className="notification-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" focusable="false">
            {row.type === "store_closed" ? <>
              <path d="M4 10v10h16V10M3 7l2-4h14l2 4v2a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0V7ZM3 7h18" />
              <path d="M9 20v-6h6v6" />
            </> : <>
              <circle cx="9" cy="7" r="3.5" />
              <path d="M3 20v-2a6 6 0 0 1 10-4.5M15 16l2.5 2.5L22 14" />
            </>}
          </svg>
        </span><span className="notification-copy"><strong>{row.message}</strong><span>{row.branchName || row.branchId} · {notificationTime(row.eventAt)}</span></span>{!row.read && <span className="notification-dot" aria-hidden="true" />}
      </div>)}</div>
      <p className="notification-footer">เปิดกระดิ่งเพื่อทำเครื่องหมายว่าอ่านทั้งหมดแล้ว</p>
    </section>}
  </div>;
}
