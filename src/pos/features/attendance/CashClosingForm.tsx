import type { FormEvent } from "react";
import { cashDifference, type CashClosingSummary } from "../../../shared/domain/cash-closing";
import "./cash-closing.css";

const money = (value: number) => value.toLocaleString("th-TH", { maximumFractionDigits: 2 });
export function CashClosingForm({ review, actualCash, onChange, pending, onSubmit, onBack }: {
  review: { summary: CashClosingSummary; closer: { name: string }; branchName: string };
  actualCash: string; onChange: (value: string) => void; pending: boolean;
  onSubmit: (event: FormEvent) => void; onBack: () => void;
}) {
  const summary = review.summary;
  let difference: number | null = null;
  if (/^\d+(\.\d{1,2})?$/.test(actualCash)) {
    try { difference = cashDifference(Number(actualCash), summary.expectedCash); } catch { /* Keep confirmation disabled. */ }
  }
  return <form className="cash-closing-form" onSubmit={onSubmit}>
    <p className="cash-closing-context">{review.branchName} · {summary.businessDate}<br />ผู้ปิดร้าน: {review.closer.name}</p>
    <dl className="cash-closing-totals">
      <div><dt>ยอดขายเงินสด</dt><dd>{money(summary.cashSales)} บาท</dd></div>
      <div><dt>เบิกซื้อของ</dt><dd>{money(summary.shopExpenses)} บาท</dd></div>
      <div><dt>เบิกทิปเงินสด</dt><dd>{money(summary.cashTipWithdrawals)} บาท</dd></div>
      <div className="cash-closing-expected"><dt>เงินสดที่ควรเหลือ</dt><dd>{money(summary.expectedCash)} บาท</dd></div>
    </dl>
    <label htmlFor="actualClosingCash">เงินสดที่นับจริง (บาท)</label>
    <input id="actualClosingCash" className="cash-closing-actual" type="number" inputMode="decimal" min="0" step="0.01"
      autoFocus required autoComplete="off" value={actualCash} disabled={pending} placeholder="กรอกยอดที่นับได้"
      onChange={(event) => onChange(event.target.value)} />
    <div role="status" aria-live="polite" className={`cash-closing-difference ${difference === null ? "" : difference < 0 ? "is-short" : difference > 0 ? "is-over" : "is-balanced"}`}>
      {difference === null ? "กรอกยอดเงินจริงเพื่อดูผลต่าง" : difference === 0 ? "ยอดตรง" : `${difference < 0 ? "ขาด" : "เกิน"} ${money(Math.abs(difference))} บาท`}
    </div>
    <div className="cash-closing-actions">
      <button className="close-store-back-button" type="button" disabled={pending} onClick={onBack}>ย้อนกลับ</button>
      <button className="close-store-confirm-button" type="submit" disabled={pending || difference === null}>{pending ? "กำลังบันทึก..." : "ยืนยันปิดร้าน"}</button>
    </div>
  </form>;
}
