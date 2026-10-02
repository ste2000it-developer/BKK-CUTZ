import { useState } from "react";
import type { TransactionHistoryRecord } from "../../../shared/firebase/repositories/transactions";
import { formatDateTime, formatMoney, historyAmounts, historyServices } from "../../../shared/domain/pos-history";
import { SlipModal } from "./SlipModal";

export function TransactionSummary({ transaction, fromHistory = false, onDone }: { transaction: TransactionHistoryRecord; fromHistory?: boolean; onDone: () => void }) {
  const [slip, setSlip] = useState(false);
  const amounts = historyAmounts(transaction);
  const path = typeof transaction.slipStoragePath === "string" ? transaction.slipStoragePath : "";
  return <div className="success-wrap"><div className="success-check">✓</div><div className="success-kicker">{fromHistory ? "ประวัติรายการ" : "เสร็จเรียบร้อย"}</div>
    <h1>{fromHistory ? "รายละเอียดรายการ" : "บันทึกรายการแล้ว"}</h1><p>{fromHistory ? "ข้อมูลรายการที่ชำระสำเร็จ" : "รายการได้รับการยืนยันเรียบร้อย"}</p>
    <div className="success-card"><div className="success-row"><span>ช่าง</span><strong>{transaction.barberName || "-"}</strong></div>
      <div className="success-service-list">{historyServices(transaction).map((service, index) => <div className="success-service-row" key={index}><span>{service.name}{service.detail && ` (${service.detail})`}</span><strong>{formatMoney(service.price)} บาท</strong></div>)}</div>
      <div className="success-row"><span>ค่าบริการ</span><strong>{formatMoney(amounts.serviceTotal)} บาท</strong></div>
      {amounts.tipAmount > 0 && <div className="success-row"><span>ทิปช่าง</span><strong>{formatMoney(amounts.tipAmount)} บาท</strong></div>}
      <div className="success-row success-total"><span>ยอดรับรวม</span><strong>{formatMoney(amounts.grandTotal)} บาท</strong></div>
      <div className="success-row"><span>วิธีชำระเงิน</span><strong>{transaction.paymentMethod === "cash" ? "เงินสด" : "สแกนจ่าย"}</strong></div>
      <div className="success-row"><span>วันที่และเวลา</span><strong>{formatDateTime(transaction.createdAt)}</strong></div>
    </div>
    {path && <button className="success-slip-button" onClick={() => setSlip(true)}>ดูรูปสลิป</button>}
    <button className="primary-button" onClick={onDone}>{fromHistory ? "กลับประวัติ" : "กลับหน้าหลัก →"}</button>
    {slip && <SlipModal path={path} onClose={() => setSlip(false)} />}
  </div>;
}
