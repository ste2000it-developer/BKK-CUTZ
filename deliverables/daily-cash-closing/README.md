# BKK-CUTZ — Daily Cash Closing

ไฟล์ต้นฉบับแก้แล้วใน `T:\Project\BKK-CUTZ` และ ZIP เก็บโครงสร้าง path จาก root ของโปรเจกต์

## การทำงาน

1. จัดการช่างวันนี้ → ปิดร้าน → ยืนยัน PIN ของช่างที่กำลังทำงานในสาขา
2. แสดงสาขา วันที่ไทย ผู้ปิดร้าน ยอดขายเงินสด เบิกซื้อของ เบิกทิปเงินสด และเงินสดที่ควรเหลือ
3. กรอกเงินจริงที่นับได้ (รวม 0 ได้) ระบบแสดงยอดตรง / ขาด / เกิน
4. ยืนยันปิดร้าน: อ่านยอดล่าสุดอีกครั้ง หากยอดเปลี่ยนต้องย้อนกลับและเปิดสรุปใหม่
5. บันทึกประวัติและ checkout ช่างด้วย Firestore transaction เดียว หาก commit ล้มเหลวจะไม่ปิด presence

## Schema ที่ตรวจและใช้

- `transactions`: `branchId`, `dateKey`, `paymentMethod === "cash"`; ใช้ `grandTotal` และ fallback `total` / `serviceTotal` สำหรับข้อมูลเดิม ไม่รวม `scan`
- `shop_expenses`: รายการเบิกเงินสดหน้าร้านทั้งหมดของสาขาและวันนั้น ไม่มี field แหล่งชำระเงินใน schema เดิม
- `barber_advances`: อ่านเฉพาะ `type === "tip"`, `source === "pos"`, สถานะ active / approved / deducted; flow POS เดิมหมายถึงนำเงินสดจากเก๊ะไปจ่ายทิป หักครั้งเดียวตามรายการเบิก ไม่หัก `tipAmount` จากยอดขายโอน และไม่หักเบิกล่วงหน้าจากเจ้าของ
- `daily_closings/{branchId}_{businessDate}`: ใช้ collection และ id เดิม เก็บ `id`, `branchId`, `branchName`, `dateKey`, `businessDate`, `cashSales`, `shopExpenses`, `cashTipWithdrawals`, `expectedCash`, `actualCash`, `difference`, `cashClosingVersion: 1`, `closedAt`, `closedBarberCount`
- ผู้ปิดร้านใช้ field audit เดิม `closedByBarberId` / `closedByBarberName` ไม่สร้างชื่อ field ซ้ำ
- business date ใช้ `Asia/Bangkok` โดยตรง การขายและการเบิกเดิมยังบันทึก `dateKey` ตาม timezone ของอุปกรณ์เหมือนเดิม จึงควรตั้งอุปกรณ์ POS เป็นเวลาไทย
- บัญชี Admin อ่านประวัติได้ตาม Rules เดิม ข้อมูลครบสำหรับการทำ History ภายหลัง งานนี้ไม่เพิ่มหน้า Admin ใหม่

## ไฟล์ส่งมอบ (path สัมพันธ์กับ T:\Project\BKK-CUTZ)

| วิธีนำไปใช้ | ไฟล์ |
|---|---|
| วางทับ | `src/pos/features/attendance/AttendanceModal.tsx` |
| วางทับ | `src/pos/features/attendance/session.ts` |
| วางทับ | `src/pos/features/attendance/session.test.ts` |
| วางทับ | `src/pos/features/attendance/useAttendance.ts` |
| วางทับ | `src/shared/firebase/repositories/attendance.ts` |
| วางทับ | `src/shared/firebase/repositories/attendance.test.ts` |
| วางทับ | `firestore.rules` |
| เพิ่มไฟล์ใหม่ | `src/pos/features/attendance/CashClosingForm.tsx` |
| เพิ่มไฟล์ใหม่ | `src/pos/features/attendance/CashClosingForm.test.tsx` |
| เพิ่มไฟล์ใหม่ | `src/pos/features/attendance/cash-closing.css` |
| เพิ่มไฟล์ใหม่ | `src/shared/domain/cash-closing.ts` |
| เพิ่มไฟล์ใหม่ | `src/shared/domain/cash-closing.test.ts` |
| เพิ่มไฟล์ใหม่ | `src/shared/firebase/repositories/cash-closing.ts` |
| เพิ่มไฟล์ใหม่ | `src/shared/firebase/repositories/cash-closing.test.ts` |
| เพิ่มไฟล์ใหม่ (เอกสาร) | `deliverables/daily-cash-closing/README.md` |

## การนำไปใช้

- แตก ZIP ที่ root ของโปรเจกต์เวอร์ชันปัจจุบันนี้ โดยรักษาโครงสร้างโฟลเดอร์
- อัปเดต Firestore Rules จาก `firestore.rules` ก่อนใช้งาน: มีการอนุญาตอ่าน closing ที่ยังไม่ถูกสร้างเพื่อเช็ค duplicate และห้าม update ทับ closing เดิม การแก้ Rules จำกัดเฉพาะ `daily_closings`
- หากระบบออนไลน์มี Rules ที่แก้เพิ่มนอก workspace นี้ ให้ใช้เฉพาะ block `daily_closings` ที่ปรับแล้วแทน block เดิม
- Build และนำขึ้นระบบตามขั้นตอนเดิม งานนี้ไม่ได้ deploy แอปหรือ Rules ให้
- Closing เก่า (รวม record ก่อนมี cash summary) จะไม่ถูกเขียนทับ หากมี record ของสาขา/วันเดียวกันจะแสดงข้อความว่าปิดแล้ว

## ผลตรวจ

- `npm.cmd run typecheck`: ผ่าน
- `npm.cmd test -- --run`: ผ่าน 20 ไฟล์ / 86 tests รวม regression ของ payment, PIN, RFID, payout และ cases เงินสดที่กำหนด
- `npm.cmd run build`: ผ่าน มีคำเตือน chunk ขนาดเกิน 500 kB
- ไม่มี lint script ใน package.json
- ทดสอบสูตรยอดตรง/ขาด/เกิน, scan-only/ศูนย์, ไม่มี sales แต่มี expense, วัน/สาขาอื่น, ทิปที่ไม่ได้เบิกเงินสด, เงินทศนิยม, วันที่ไทย, กดซ้ำ, ประวัติมีอยู่แล้ว, save/read fail และยอดเปลี่ยนก่อนยืนยัน
- UI ตรวจการ render ข้อความและการปิดปุ่มเมื่อค่าไม่ถูกต้องด้วย React server rendering tests
- Firestore tests ใช้ mocks ยังไม่ได้ทดสอบ emulator, Rules ที่ deploy จริง หรือปิดร้านจริงผ่าน browser จึงไม่มีการสร้างหรือแก้ข้อมูลร้านจริง
- ยอดถูกอ่านใหม่ก่อนบันทึก แต่ไม่ได้ล็อกการขายจาก POS เครื่องอื่นระหว่างอ่านยอดกับ commit เพราะงานนี้คง payment flow เดิมไว้ ควรหยุดรับรายการของสาขาระหว่างนับและปิดเงินสด

ไม่ได้แก้ commission, ประกันมือ, payout, เบิกล่วงหน้า, Financial Summary, payment, QR หรือ logic RFID ในงานนี้
