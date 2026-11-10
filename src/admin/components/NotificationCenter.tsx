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
  const dialog = useRef<HTMLDialogElement>(null);
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
    const modal = dialog.current;
    if (!modal) return;

    // overflow:hidden alone does not lock the background on iOS Safari.
    // Freeze the page at its current position while the dialog is open.
    const root = document.documentElement;
    const body = document.body;
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    const previous = {
      htmlOverflow: root.style.overflow,
      bodyOverflow: body.style.overflow,
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyLeft: body.style.left,
      bodyRight: body.style.right,
      bodyWidth: body.style.width,
    };

    root.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";

    if (!modal.open) modal.showModal();
    close.current?.focus({ preventScroll: true });

    // Allow the mobile sheet to be dismissed by pulling its handle/header
    // downward, or by pulling down on the notification list when at its top.
    // Keep regular list scrolling intact and never scroll the page behind it.
    const list = modal.querySelector<HTMLElement>(".notification-list");
    const isMobile = window.matchMedia("(max-width: 640px)").matches;
    const dismissDistance = 110;
    type TouchGesture = {
      startX: number;
      startY: number;
      startTime: number;
      dragging: boolean;
      eligible: boolean;
      fromList: boolean;
      distance: number;
    };
    let gesture: TouchGesture | null = null;
    let animationTimer: number | undefined;
    let lastTouchY = 0;

    const clearAnimation = () => {
      if (animationTimer !== undefined) window.clearTimeout(animationTimer);
      animationTimer = undefined;
      modal.style.removeProperty("transition");
      modal.style.removeProperty("transform");
    };
    const finishGesture = (cancel = false) => {
      const active = gesture;
      gesture = null;
      if (!active?.dragging) return;
      const speed = active.distance / Math.max(1, performance.now() - active.startTime);
      const dismiss = !cancel && (active.distance >= dismissDistance || (active.distance >= 65 && speed > 0.65));
      modal.style.transition = "transform 190ms ease-out";
      modal.style.transform = dismiss ? "translate3d(0, 100%, 0)" : "translate3d(0, 0, 0)";
      animationTimer = window.setTimeout(() => {
        animationTimer = undefined;
        if (dismiss) {
          if (modal.open) modal.close();
        } else {
          clearAnimation();
        }
      }, 195);
    };

    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) {
        gesture = null;
        return;
      }
      const touch = event.touches[0];
      lastTouchY = touch.clientY;
      if (!isMobile || !modal.contains(event.target as Node)) {
        gesture = null;
        return;
      }
      const target = event.target instanceof Element ? event.target : null;
      const fromList = Boolean(list?.contains(event.target as Node));
      const fromGrabArea = Boolean(target?.closest(".notification-sheet-handle, .notification-heading, .notification-section-heading"));
      const isControl = Boolean(target?.closest("button, a, input, select, textarea"));
      gesture = {
        startX: touch.clientX,
        startY: touch.clientY,
        startTime: performance.now(),
        dragging: false,
        eligible: !isControl && (fromGrabArea || (fromList && (list?.scrollTop ?? 0) <= 0)),
        fromList,
        distance: 0,
      };
    };
    const onTouchMove = (event: TouchEvent) => {
      if (event.touches.length !== 1) {
        event.preventDefault();
        return;
      }
      const touch = event.touches[0];
      const nextY = touch.clientY;
      const deltaY = nextY - lastTouchY;
      lastTouchY = nextY;

      if (gesture?.eligible) {
        const down = nextY - gesture.startY;
        const across = Math.abs(touch.clientX - gesture.startX);
        if (gesture.dragging || (down > 9 && down > across * 1.25 && (!gesture.fromList || (list?.scrollTop ?? 0) <= 0))) {
          gesture.dragging = true;
          gesture.distance = Math.max(0, down);
          event.preventDefault();
          modal.style.transition = "none";
          modal.style.transform = `translate3d(0, ${Math.min(gesture.distance, window.innerHeight)}px, 0)`;
          return;
        }
      }
      // All areas outside the scrollable list (including the backdrop) are
      // locked. At the ends of the list, suppress scroll chaining.
      if (!list?.contains(event.target as Node)) {
        event.preventDefault();
        return;
      }
      const atTop = list.scrollTop <= 0;
      const atBottom = list.scrollTop + list.clientHeight >= list.scrollHeight - 1;
      if (list.scrollHeight <= list.clientHeight || (atTop && deltaY > 0) || (atBottom && deltaY < 0)) {
        event.preventDefault();
      }
    };
    const onTouchEnd = () => finishGesture();
    const onTouchCancel = () => finishGesture(true);
    document.addEventListener("touchstart", onTouchStart, { capture: true, passive: true });
    document.addEventListener("touchmove", onTouchMove, { capture: true, passive: false });
    document.addEventListener("touchend", onTouchEnd, true);
    document.addEventListener("touchcancel", onTouchCancel, true);

    return () => {
      document.removeEventListener("touchstart", onTouchStart, true);
      document.removeEventListener("touchmove", onTouchMove, true);
      document.removeEventListener("touchend", onTouchEnd, true);
      document.removeEventListener("touchcancel", onTouchCancel, true);
      clearAnimation();
      if (modal.open) modal.close();
      root.style.overflow = previous.htmlOverflow;
      body.style.overflow = previous.bodyOverflow;
      body.style.position = previous.bodyPosition;
      body.style.top = previous.bodyTop;
      body.style.left = previous.bodyLeft;
      body.style.right = previous.bodyRight;
      body.style.width = previous.bodyWidth;
      window.scrollTo(scrollX, scrollY);
    };
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

  const pushLabel = pushState === "enabled" ? "ปิดแจ้งเตือน"
    : pushState === "enabling" ? "กำลังตั้งค่า..."
    : pushState === "blocked" ? "ถูกบล็อก"
    : pushState === "unsupported" ? "ไม่รองรับ"
    : "เปิดแจ้งเตือน";

  return <div className="notification-center">
    <button ref={bell} type="button" className="notification-bell" aria-label={"การแจ้งเตือน" + (count ? " ยังไม่อ่าน " + unreadLabel(count) + " รายการ" : "")} aria-haspopup="dialog" aria-expanded={open} aria-controls="admin-notifications" onClick={() => setOpen(true)}>
      <i className="fa-regular fa-bell" aria-hidden="true" />
      {error ? <span className="notification-badge">!</span> : count !== null && count > 0 && <span className="notification-badge">{unreadLabel(count)}</span>}
    </button>
    {open && <dialog
      ref={dialog}
      id="admin-notifications"
      className="notification-panel"
      aria-labelledby="admin-notification-title"
      aria-modal="true"
      onClose={() => { setOpen(false); bell.current?.focus(); }}
      onClick={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) {
          event.currentTarget.close();
        }
      }}
    >
      <div className="notification-sheet-handle" aria-hidden="true" />
      <header className="notification-heading">
        <div className="notification-heading-copy">
          <h2 id="admin-notification-title">การแจ้งเตือน</h2>
          <p>ความเคลื่อนไหวจากทุกสาขา</p>
        </div>
        <button ref={close} type="button" aria-label="ปิดการแจ้งเตือน" onClick={() => dialog.current?.close()}>
          <i className="fa-solid fa-xmark" aria-hidden="true" />
        </button>
      </header>
      <div className="notification-push">
        <div className="notification-push-mark" aria-hidden="true"><i className="fa-regular fa-bell" /></div>
        <div className="notification-push-copy">
          <strong>แจ้งเตือนบนเครื่องนี้</strong>
          <span>{pushState === "enabled" ? "เปิดรับแจ้งเตือนแล้ว" : "รับแจ้งเตือนเมื่อช่างเข้างานหรือปิดร้าน"}</span>
        </div>
        <button type="button" className={pushState === "enabled" ? "is-enabled" : ""} disabled={pushState === "enabling" || pushState === "unsupported" || pushState === "blocked"} onClick={() => void togglePush()}>{pushLabel}</button>
      </div>
      {pushError && <div className="notification-status" role="alert">{pushError}</div>}
      {pushState === "blocked" && <div className="notification-status">อนุญาต Notification จากการตั้งค่าเว็บไซต์ของเบราว์เซอร์ แล้วโหลดหน้าใหม่</div>}
      {pushState === "unsupported" && <div className="notification-status">เปิดหน้า Admin ผ่าน HTTPS บนมือถือเพื่อใช้ Push Notification</div>}
      {error && <div className="notification-status" role="alert">{error} <button type="button" onClick={() => setAttempt(attempt + 1)}>ลองใหม่</button></div>}
      {saveError && <div className="notification-status" role="alert">{saveError} <button type="button" onClick={() => setReadAttempt((value) => value + 1)}>ลองบันทึกอีกครั้ง</button></div>}
      <div className="notification-section-heading">
        <span>รายการล่าสุด</span>
        {ready && <span className="notification-list-count">{rows.length.toLocaleString("th-TH")} รายการ</span>}
      </div>
      <div className="notification-list" role="list" aria-label="รายการแจ้งเตือนล่าสุด">
        {!ready && !error && <p className="notification-empty" role="status">กำลังโหลดการแจ้งเตือน...</p>}
        {ready && !rows.length && <div className="notification-empty">
          <i className="fa-regular fa-bell" aria-hidden="true" />
          <strong>ยังไม่มีการแจ้งเตือน</strong>
          <span>ความเคลื่อนไหวของร้านจะปรากฏที่นี่</span>
        </div>}
        {rows.map((row) => <div key={row.id} role="listitem" className={"notification-item" + (row.read ? "" : " is-unread")} aria-label={row.message + " " + (row.branchName || row.branchId) + (row.read ? " อ่านแล้ว" : " ยังไม่อ่าน")}>
          <span className={"notification-icon" + (row.type === "store_closed" ? " is-closing" : "")} aria-hidden="true">
            <i className={`fa-solid ${row.type === "store_closed" ? "fa-store" : "fa-user-check"}`} />
          </span>
          <span className="notification-copy">
            <strong>{row.message}</strong>
            <span className="notification-item-meta">
              <span className="notification-branch">{row.branchName || row.branchId}</span>
              <span className="notification-meta-divider" aria-hidden="true">·</span>
              <time>{notificationTime(row.eventAt)}</time>
            </span>
          </span>
          {!row.read && <span className="notification-dot" aria-hidden="true" />}
        </div>)}
      </div>
    </dialog>}
  </div>;
}
