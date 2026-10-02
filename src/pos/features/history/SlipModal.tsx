import { useEffect, useState } from "react";
import { loadPaymentSlipUrl } from "../../../shared/firebase/storage";

export function SlipModal({ path, onClose }: { path: string; onClose: () => void }) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    let live = true; setUrl(""); setError("");
    void loadPaymentSlipUrl(path).then((value) => { if (live) setUrl(value); }).catch((issue: unknown) => {
      if (live) setError(issue instanceof Error ? issue.message : "เปิดรูปสลิปไม่สำเร็จ");
    });
    return () => { live = false; };
  }, [path]);
  return <div className="history-slip-modal" id="historySlipModal"><div className="history-slip-backdrop" onClick={onClose} /><section className="history-slip-card" role="dialog" aria-modal="true" aria-labelledby="slipTitle">
    <div className="history-slip-head"><div><div className="page-kicker">หลักฐานการชำระเงิน</div><h2 id="slipTitle">รูปสลิป</h2></div><button className="modal-close" aria-label="ปิดสลิป" onClick={onClose}>×</button></div>
    {error ? <p role="alert">{error}</p> : url ? <><img className="history-slip-image" src={url} alt="รูปสลิป" onError={() => setError("เปิดรูปสลิปไม่สำเร็จ")} /><a className="success-slip-button" href={url} download target="_blank" rel="noreferrer">เปิด / ดาวน์โหลดสลิป</a></> : <p className="history-slip-status">กำลังโหลดรูปสลิป...</p>}
  </section></div>;
}
