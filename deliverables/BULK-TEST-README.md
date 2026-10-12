# BKK-CUTZ Bulk Test

แก้ไฟล์ใน workspace แล้ว ZIP นี้เก็บเฉพาะไฟล์งาน Bulk Test ตาม path เดิม ใช้กับเวอร์ชันโปรเจกต์ปัจจุบันที่มี AppSelect, test-sale-time และ makeTransaction อยู่แล้ว

## วางทับไฟล์เดิม

- `src/pos/PosWorkspace.tsx` — เปลี่ยนทางเข้าโหมดทดสอบเป็น Bulk Test และถอดหน้า POS/attendance session ออกจากหน้าจอระหว่างใช้ Bulk เพื่อไม่ให้ scanner ทำงาน
- `src/pos/features/services/ServiceSelectionPage.tsx` — รับรายการบริการเริ่มต้นสำหรับแก้ไขบิล Bulk; POS ปกติยังเริ่มจากรายการว่าง
- `src/shared/domain/pos-services.ts` — แยกตัวอ่านช่วงราคาที่มีอยู่เดิมเป็นฟังก์ชันกลาง ใช้ร่วมกับ POS และ Bulk โดยคงค่า fallback เดิม

## เพิ่มไฟล์ใหม่

- `src/pos/features/bulk-test/BulkTestPage.tsx` — ตารางวันที่/เวลา/ช่าง/บริการ เพิ่ม ลบ ทำสำเนา แก้ไข สรุปยอด ตรวจทุกแถว และบันทึกทั้งหมด
- `src/pos/features/bulk-test/bulk-test.css` — รูปแบบตาราง dropdown หน้าตัวเลือกบริการ และแถบสรุปด้านล่างสำหรับ desktop/tablet
- `src/shared/domain/bulk-test.ts` — สร้างแถว ตรวจข้อมูล แล้วเรียก makeTransaction เดิม ใช้วันเวลาประเทศไทยและตรวจไม่ให้บันทึกปี พ.ศ. เป็น ค.ศ.
- `src/shared/firebase/repositories/bulk-transactions.ts` — เขียน transactions เดิม ครั้งละไม่เกิน 10 บิล จำกัดขนาด payload แสดงความคืบหน้า หยุดเมื่อชุดใดล้มเหลว และเก็บ ID สำหรับลองใหม่
- `src/shared/domain/bulk-test.test.ts` — ทดสอบเวลา ช่วงราคา หลายบริการ การตรวจแถว และความเข้ากันได้กับค่ามือ/ประกันมือ/รอบจ่ายเดิม
- `src/shared/firebase/repositories/bulk-transactions.test.ts` — ทดสอบ 247 บิล ขนาดชุด ขนาดข้อมูล ความล้มเหลว และการลองใหม่ด้วย ID เดิม
- `src/pos/features/services/ServiceSelectionPage.test.tsx` — ทดสอบการ render หน้าบริการปกติและการแก้บริการจาก Bulk

## วิธีใช้

1. ใช้ dev mode หรือเปิด flag เดิม `VITE_ENABLE_TEST_DATETIME=true` ตอน build
2. เข้าสู่ระบบสาขา กด “โหมดทดสอบ · ลงข้อมูลย้อนหลัง / Bulk Test”
3. เลือกวันที่ เช่น 2026-09-01 ถึง 2026-09-30 ตามแต่ละแถว ซึ่งตรงกับกันยายน พ.ศ. 2569
4. กรอกเวลาไทย เลือกช่างและหลายบริการ หน้าตัวเลือกบริการใช้ชุดเดิม รวมราคาช่วง ราคากำหนดเอง และส่วนลด
5. เพิ่มแถวใหม่จะคัดลอกเฉพาะวันที่ แถวทำสำเนาจะคัดลอกทั้งบิลและสร้าง ID ใหม่
6. กด “บันทึกทั้งหมด” ระบบจะตรวจทุกแถวก่อนเขียนลง Firestore
7. ถ้าชุดใดล้มเหลว จะแสดงแถวที่มีปัญหา ชุดถัดไปยังไม่ถูกส่ง กด “บันทึกต่อ” เพื่อลองข้อมูลเดิมด้วย ID เดิม แถวจะล็อกหลังเริ่มบันทึกเพื่อป้องกันเปลี่ยนข้อมูลระหว่างลองใหม่
8. เมื่อสำเร็จ กด “เริ่มชุดใหม่” หรือกลับ POS

รายการ Bulk บันทึกเป็นเงินสด ไม่มีทิป ลงฐานข้อมูลจริงของสาขาที่เข้าสู่ระบบ ใช้ schema และ collection เดิม จึงปรากฏในประวัติและรายงานเดิม ไม่มีการสร้าง attendance หรือแก้สูตรค่ามือ/ประกันมือ ข้อมูลร่างอยู่ในหน้านี้เท่านั้น; การ reload/ออกจากหน้าจะเสียร่างและสถานะลองใหม่

## ผลตรวจ

- `npm.cmd run typecheck` ผ่าน
- `npm.cmd run build` ผ่าน มีคำเตือน bundle ใหญ่กว่า 500 kB
- `npm.cmd test -- --run` ผ่าน 16 ไฟล์ / 73 tests
- `git diff --check` ผ่าน
- ไม่มี lint script ใน package.json
- ทดสอบ persistence ด้วย mock เท่านั้น ยังไม่ได้เขียนข้อมูลลง Firestore จริงหรือยืนยัน security rules ของระบบที่ deploy
- ทดสอบ component ด้วย server rendering; ยังไม่ได้ทดสอบคลิกหรือ visual QA บน browser เพราะเซสชันไม่มี browser เชื่อมต่อ

## ตรวจต่อกับระบบจริง

เปิดใน dev/staging ตรวจ desktop/tablet เพิ่ม 2 แถวเวลาเดียวกัน เลือกหลายบริการและราคาช่วง ตรวจแถวผิดก่อนบันทึก จากนั้นบันทึก ตรวจ POS/Admin History ตามวันที่ และยอดค่ามือในรอบวันที่ 1/16 รวมถึง Excel เดิม

Firestore ใช้ชุดเล็กเพื่อลดขนาดคำขอและการอ่านเอกสารใน security rules แต่ความสำเร็จยังขึ้นกับ rules ของโปรเจกต์จริง อ้างอิง: https://firebase.google.com/docs/firestore/manage-data/transactions และ https://firebase.google.com/docs/firestore/quotas
