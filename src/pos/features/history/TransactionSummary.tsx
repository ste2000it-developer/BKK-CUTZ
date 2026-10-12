import { useState } from "react";
import type { TransactionHistoryRecord } from "../../../shared/firebase/repositories/transactions";
import { formatDateTime, formatMoney, historyAmounts, historyServices } from "../../../shared/domain/pos-history";
import { isVoidedTransaction } from "../../../shared/domain/transaction-status";
import { SlipModal } from "./SlipModal";

export function TransactionSummary({
  transaction,
  fromHistory = false,
  onDone,
  onVoid,
}: {
  transaction: TransactionHistoryRecord;
  fromHistory?: boolean;
  onDone: () => void;
  onVoid?: () => void;
}) {
  const [slip, setSlip] = useState(false);
  const amounts = historyAmounts(transaction);
  const path = typeof transaction.slipStoragePath === "string" ? transaction.slipStoragePath : "";
  const voided = isVoidedTransaction(transaction);

  return <div className="success-wrap">
    <div className={`success-check${voided ? " history-voided-check" : ""}`}>{voided ? "×" : "✓"}</div>
    <div className="success-kicker">{voided ? "รายการถูกยกเลิก" : fromHistory ? "ประวัติรายการ" : "เสร็จเรียบร้อย"}</div>
    <h1>{voided ? "ยกเลิกรายการแล้ว" : fromHistory ? "รายละเอียดรายการ" : "บันทึกรายการแล้ว"}</h1>
    <p>{voided ? "รายการนี้ถูกเก็บไว้เป็นประวัติ แต่ไม่นำไปคิดยอดขายและค่ามือ" : fromHistory ? "ข้อมูลรายการที่ชำระสำเร็จ" : "รายการได้รับการยืนยันเรียบร้อย"}</p>
    <div className={`success-card${voided ? " history-voided-card" : ""}`}>
      {voided && <div className="success-row history-void-status-row"><span>สถานะ</span><strong>ยกเลิกแล้ว</strong></div>}
      <div className="success-row"><span>ช่าง</span><strong>{transaction.barberName || "-"}</strong></div>
      <div className="success-service-list">{historyServices(transaction).map((service, index) => <div className="success-service-row" key={index}><span>{service.name}{service.detail && ` (${service.detail})`}</span><strong>{formatMoney(service.price)} บาท</strong></div>)}</div>
      <div className="success-row"><span>ค่าบริการ</span><strong>{formatMoney(amounts.serviceTotal)} บาท</strong></div>
      {amounts.tipAmount > 0 && <div className="success-row"><span>ทิปช่าง</span><strong>{formatMoney(amounts.tipAmount)} บาท</strong></div>}
      <div className="success-row success-total"><span>ยอดรับรวม</span><strong>{formatMoney(amounts.grandTotal)} บาท</strong></div>
      <div className="success-row"><span>วิธีชำระเงิน</span><strong>{transaction.paymentMethod === "cash" ? "เงินสด" : "สแกนจ่าย"}</strong></div>
      <div className="success-row"><span>วันที่และเวลา</span><strong>{formatDateTime(transaction.createdAt)}</strong></div>
      {voided && <>
        <div className="success-row"><span>เหตุผลที่ยกเลิก</span><strong>{transaction.voidReason || "-"}</strong></div>
        <div className="success-row"><span>ยกเลิกโดย</span><strong>{transaction.voidedByBarberName || transaction.voidedByEmail || "-"}</strong></div>
        <div className="success-row"><span>เวลาที่ยกเลิก</span><strong>{formatDateTime(transaction.voidedAt)}</strong></div>
      </>}
    </div>
    {path && <button className="success-slip-button" onClick={() => setSlip(true)}>ดูรูปสลิป</button>}
    {fromHistory && !voided && onVoid && <button className="history-void-button" type="button" onClick={onVoid}>ยกเลิกรายการ</button>}
    <button className="primary-button" onClick={onDone}>{fromHistory ? "กลับประวัติ" : "กลับหน้าหลัก →"}</button>
    {slip && <SlipModal path={path} onClose={() => setSlip(false)} />}
  </div>;
}
