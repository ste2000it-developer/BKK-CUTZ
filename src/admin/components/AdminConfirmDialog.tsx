import { useEffect, useRef } from "react";
import "./admin-confirm-dialog.css";

type Props = {
  title: string;
  message: string;
  confirmLabel?: string;
  busy?: boolean;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function AdminConfirmDialog({
  title, message, confirmLabel = "ยืนยัน", busy = false, danger = false, onConfirm, onCancel,
}: Props) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    element.showModal();
    return () => { if (element.open) element.close(); };
  }, []);

  return (
    <dialog
      ref={dialog}
      className="admin-confirm-dialog"
      aria-labelledby="admin-confirm-title"
      aria-describedby="admin-confirm-message"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onCancel();
      }}
    >
      <div className="admin-confirm-heading">
        <div className={`admin-confirm-symbol${danger ? " is-danger" : ""}`} aria-hidden="true">
          <i className={`fa-solid ${danger ? "fa-triangle-exclamation" : "fa-circle-question"}`} />
        </div>
        <h2 id="admin-confirm-title">{title}</h2>
        <p id="admin-confirm-message">{message}</p>
      </div>
      <div className="admin-confirm-actions">
        <button type="button" className="admin-confirm-cancel" onClick={onCancel} disabled={busy} autoFocus>ยกเลิก</button>
        <button type="button" className={`admin-confirm-submit${danger ? " is-danger" : ""}`} onClick={onConfirm} disabled={busy}>
          {busy ? "กำลังดำเนินการ..." : confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
