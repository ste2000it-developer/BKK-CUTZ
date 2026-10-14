import { useEffect, useRef, useState } from "react";
import { adminPushAvailability, disableAdminPush, enableAdminPush, refreshAdminPush, showForegroundAdminPush, watchForegroundAdminPush, type AdminPushState } from "../../shared/firebase/admin-push";
import { markAllAdminNotificationsRead, watchAdminNotifications, watchAdminUnread, type AdminNotification } from "../../shared/firebase/repositories/admin-notifications";
import { notificationTime, unreadLabel } from "../../shared/domain/admin-notifications";
import "./notification-center.css";

export function NotificationCenter({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<AdminNotification[]>([]);
  const [count, setCount] = useState<number | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [readAttempt, setReadAttempt] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [pushState, setPushState] = useState<AdminPushState>("available");
  const [pushError, setPushError] = useState("");
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
    let live = true;
    void adminPushAvailability().then((state) => {
      if (!live) return;
      setPushState(state);
      if (state === "enabled") {
        void refreshAdminPush(userId).catch((issue: unknown) => {
          if (!live) return;
          setPushState("error");
          setPushError(issue instanceof Error ? issue.message : "ซิงก์การแจ้งเตือนไม่สำเร็จ");
        });
      }
    });
    let stop: (() => void) | undefined;
    void watchForegroundAdminPush((payload) => showForegroundAdminPush(payload)).then((unsubscribe) => { stop = unsubscribe; });
    return () => { live = false; stop?.(); };
  }, [userId]);

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

  async function togglePush() {
    setPushError("");
    if (pushState === "enabled") {
      setPushState("enabling");
      try {
        await disableAdminPush(userId);
        setPushState("available");
      } catch (issue) {
        setPushState("error");
        setPushError(issue instanceof Error ? issue.message : "ปิดการแจ้งเตือนไม่สำเร็จ");
      }
      return;
    }
    setPushState("enabling");
    try {
      await enableAdminPush(userId);
      setPushState("enabled");
    } catch (issue) {
      const next = await adminPushAvailability();
      setPushState(next === "available" ? "error" : next);
      setPushError(issue instanceof Error ? issue.message : "เปิดการแจ้งเตือนไม่สำเร็จ");
    }
  }

  const pushLabel = pushState === "enabled" ? "เปิดแจ้งเตือนมือถือแล้ว"
    : pushState === "enabling" ? "กำลังตั้งค่า..."
    : pushState === "blocked" ? "การแจ้งเตือนถูกบล็อก"
    : pushState === "unsupported" ? "Push ต้องใช้ HTTPS"
    : "เปิดแจ้งเตือนบนเครื่องนี้";

  return <div className="notification-center" ref={container} onBlur={(event) => {
    if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget as Node)) setOpen(false);
  }}>
    <button ref={bell} type="button" className="notification-bell" aria-label={"การแจ้งเตือน" + (count ? " ยังไม่อ่าน " + unreadLabel(count) + " รายการ" : "")} aria-expanded={open} aria-controls="admin-notifications" onClick={() => setOpen(!open)}>
      <i className="fa-regular fa-bell" aria-hidden="true" />
      {error ? <span className="notification-badge">!</span> : count !== null && count > 0 && <span className="notification-badge">{unreadLabel(count)}</span>}
    </button>
    {open && <section id="admin-notifications" className="notification-panel" aria-label="การแจ้งเตือน">
      <div className="notification-heading"><div><h2>การแจ้งเตือน</h2><small>ทุกสาขา · 50 รายการล่าสุด</small></div><button ref={close} type="button" aria-label="ปิดการแจ้งเตือน" onClick={() => { setOpen(false); bell.current?.focus(); }}><i className="fa-solid fa-xmark" aria-hidden="true" /></button></div>
      <div className="notification-push"><div><strong>แจ้งเตือนเข้าโทรศัพท์</strong><span>{pushState === "enabled" ? "เครื่องนี้จะได้รับ Push เมื่อช่างเข้างานหรือปิดร้าน" : "เปิดครั้งเดียวบนมือถือ Admin เครื่องนี้"}</span></div><button type="button" className={pushState === "enabled" ? "is-enabled" : ""} disabled={pushState === "enabling" || pushState === "unsupported" || pushState === "blocked"} onClick={() => void togglePush()}>{pushLabel}</button></div>
      {pushError && <div className="notification-status" role="alert">{pushError}</div>}
      {pushState === "blocked" && <div className="notification-status">อนุญาต Notification จากการตั้งค่าเว็บไซต์ของเบราว์เซอร์ แล้วโหลดหน้าใหม่</div>}
      {pushState === "unsupported" && <div className="notification-status">เปิดหน้า Admin ผ่าน HTTPS บนมือถือเพื่อใช้ Push Notification</div>}
      {error && <div className="notification-status" role="alert">{error} <button type="button" onClick={() => setAttempt(attempt + 1)}>ลองใหม่</button></div>}
      {saveError && <div className="notification-status" role="alert">{saveError} <button type="button" onClick={() => setReadAttempt((value) => value + 1)}>ลองบันทึกอีกครั้ง</button></div>}
      {!ready && !error && <p className="notification-status" role="status">กำลังโหลด...</p>}
      {ready && !rows.length && <p className="notification-status">ยังไม่มีการแจ้งเตือน</p>}
      <div className="notification-list" role="list">{rows.map((row) => <div key={row.id} role="listitem" className={"notification-item" + (row.read ? "" : " is-unread")} aria-label={row.message + " " + row.branchName + (row.read ? " อ่านแล้ว" : " ยังไม่อ่าน")}>
        <span className="notification-icon" aria-hidden="true">
          <i className={`fa-solid ${row.type === "store_closed" ? "fa-store" : "fa-user-check"}`} />
        </span><span className="notification-copy"><strong>{row.message}</strong><span>{row.branchName || row.branchId} · {notificationTime(row.eventAt)}</span></span>{!row.read && <span className="notification-dot" aria-hidden="true" />}
      </div>)}</div>
      <p className="notification-footer">เปิดกระดิ่งเพื่อทำเครื่องหมายว่าอ่านทั้งหมดแล้ว</p>
    </section>}
  </div>;
}
