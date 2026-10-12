# BKK-CUTZ Admin Notification Center

ฐาน path: T:\Project\BKK-CUTZ

## การติดตั้ง

1. แตก ZIP ลง root ของโปรเจกต์ตาม path ด้านล่าง (เก็บโครงสร้างโฟลเดอร์เดิม)
2. ต้อง deploy firestore.rules ไปยัง Firebase project ที่แอปใช้อยู่ก่อน deploy เว็บรุ่นนี้ โดยใช้ Firebase Console > Firestore Database > Rules หรือกระบวนการ deploy rules ของทีม โปรเจกต์นี้ยังไม่มี firebase.json/Firebase CLI จึงไม่ได้ deploy ให้อัตโนมัติ
3. รัน npm run typecheck, npm test -- --run และ npm run build แล้ว deploy dist ตามวิธีเดิม
4. ให้สาขา reload POS เพื่อใช้ saveCheckIn รุ่นใหม่ และ reload Admin

อย่า deploy POS รุ่นใหม่ก่อน rules: transaction ต้องมีสิทธิ์อ่าน attendance ที่ยังไม่มีและสร้าง notification ไม่เช่นนั้นการเข้างานจะถูกปฏิเสธทั้ง transaction

## ไฟล์ทั้งหมด

- วางทับ: firestore.rules
- วางทับ: src/admin/AdminApp.tsx
- วางทับ: src/shared/firebase/repositories/attendance.ts
- วางทับ: src/shared/firebase/repositories/attendance.test.ts
- เพิ่มไฟล์ใหม่: src/admin/components/NotificationCenter.tsx
- เพิ่มไฟล์ใหม่: src/admin/components/notification-center.css
- เพิ่มไฟล์ใหม่: src/shared/domain/admin-notifications.ts
- เพิ่มไฟล์ใหม่: src/shared/domain/admin-notifications.test.ts
- เพิ่มไฟล์ใหม่: src/shared/firebase/repositories/admin-notifications.ts
- เพิ่มไฟล์ใหม่: src/shared/firebase/repositories/admin-notifications.test.ts
- เพิ่มไฟล์ใหม่: deliverables/notification-center/README.md (เอกสารนี้)
- เพิ่มไฟล์ใหม่: deliverables/BKK-CUTZ-notification-center.zip (ชุดส่งมอบ ไม่ต้อง deploy)

## พฤติกรรม

- PIN และ RFID ยังเรียก saveCheckIn ที่เดิม ไม่มีการเปลี่ยน session, PIN validation, RFID protocol หรือ payment/commission/guarantee/payout
- เปลี่ยนเฉพาะการบันทึก check-in จาก batch เป็น transaction อ่าน attendance เดิมก่อนบันทึก presence + attendance ด้วย field/merge เดิม
- หาก attendanceId ยังไม่เคยมี จะสร้าง admin_notifications/attendance-checkin_<attendanceId> ใน transaction เดียวกัน ทั้งหมดสำเร็จหรือทั้งหมดไม่ถูกบันทึก; transaction ต้องออนไลน์
- concurrent check-in จะทำให้ Firestore retry transaction และพบ attendance เดิม จึงไม่สร้าง notification ซ้ำหรือ reset read
- attendance ที่มีอยู่ก่อนติดตั้งจะไม่สร้างย้อนหลัง; การเข้างานซ้ำใน attendanceId เดิมแม้ปิดร้านแล้วก็ไม่สร้างแจ้งเตือนใหม่
- ชื่อช่าง/สาขามาจากข้อมูลจริงของ session เช่นเดียวกับ attendance; rules ผูกชื่อและ ID ให้ตรงกับ attendance ที่สร้างพร้อมกัน
- Rules อนุญาตเฉพาะ attendance_checkin และ store_closed โดยแต่ละชนิดมี fields ที่ระบุ, read=false และ server timestamps; ไม่อนุญาต notification แยกเดี่ยวหรือ notification ของสาขาอื่น
- สิทธิ์พิสูจน์ PIN/RFID ยังคงเป็นระบบ client attendance เดิม ไม่ได้เพิ่ม backend authentication ของช่าง
- Admin ทุกคนเห็นทุกสาขา และใช้ read ร่วมกัน (Admin คนหนึ่งอ่าน อีกคนจะเห็นอ่านแล้ว)
- เรียง eventAt descending จำกัด 50 รายการล่าสุด; listener อีกชุดนับ unread ทุกช่วงเวลาสูงสุด 101 documents แสดง 100+ เมื่อเกิน 100 ไม่โหลดทั้ง collection
- เปิดกระดิ่งแล้ว mark read รายการค้างทั้งหมด โดยอ่าน/เขียนทีละไม่เกิน 100 รายการ รวมรายการเก่านอก history 50 รายการ; badge ลดตามผลบันทึกจริง หากล้มเหลวมีปุ่มลองใหม่; แสดงเวลา Asia/Bangkok
- แจ้งเตือนที่เข้าหลังการอ่านทั้งหมดเสร็จแล้วจะเป็น unread จนเปิดกระดิ่งครั้งต่อไป
- ไม่มี push, FCM, service worker, browser notification permission หรือ Cloud Function ใหม่
- ใช้ single-field indexes มาตรฐาน eventAt และ read ไม่มี composite index ใหม่ หาก production ปิด index ของ fields นี้ไว้ต้องเปิดคืน

## ผลตรวจในเครื่อง

- TypeScript: ผ่าน
- Vitest: 108 tests / 23 files ผ่าน รวม regression ของ attendance PIN/RFID และระบบเดิม
- Production build: ผ่าน มีคำเตือน bundle ขนาดเกิน 500 kB
- git diff --check: ผ่าน
- Lint: package.json ไม่มี lint script
- Tests ของ notification ใช้ Firestore mocks: ตรวจ PIN/RFID writes, ID เดิมไม่สร้างซ้ำ, อ่านล้มเหลวไม่เขียน, commit failure ถูกส่งกลับ, ชื่อสาขาจริง, listener update/unsubscribe/reload, query ordering/limits, mark-read และ Bangkok midnight
- ยังไม่ได้ทดสอบ Firestore Emulator (เครื่องไม่มี Java/Firebase CLI) หรือ Firebase production จริง
- ยังไม่ได้ตรวจภาพ/คลิกบน browser จริง: browser automation ไม่มี browser ที่ใช้งานได้ใน session นี้; temporary preview ถูกลบแล้ว

## ตรวจหลัง deploy บนสภาพแวดล้อมทดสอบ

1. เปิด Admin ค้างไว้ ใช้ PIN เข้างานครั้งแรกของวัน: attendance และ notification หนึ่งรายการ, badge เพิ่ม
2. ใช้ RFID กับช่างอีกคน: notification หนึ่งรายการ และ reader_results ยัง success
3. สแกนซ้ำ/กด PIN ซ้ำ/reconnect/refresh listener/สองเครื่องเข้างานคนเดียวพร้อมกัน: notification ID เดิมยังมีเพียงรายการเดียว, read ไม่ถูก reset
4. ช่างต่างสาขา: Admin เห็นทั้งคู่พร้อม branchName ถูกต้อง เรียงตามเวลาใหม่ไปเก่า
5. เปิดกระดิ่ง: รายการค้างทั้งหมด read=true และ badge ลดในทุก Admin ที่เปิดอยู่ ไม่ต้องกดทีละรายการ (ลองมากกว่า 100 รายการด้วย)
6. Reload Admin: history และ read คงเดิม
7. PIN ผิด/บัตรไม่รู้จัก/transaction ถูกปฏิเสธ: ไม่มี notification และ attendance ใหม่
8. ตรวจหน้าจอ desktop/tablet/mobile, Escape/คลิกนอก panel/Tab, error และ retry
9. ทดสอบ rules: branch อ่าน notification ไม่ได้, สาขาอื่นสร้างไม่ได้, ปลอม type/fields/time/ชื่อไม่ตรง attendance ไม่ได้, standalone create ไม่ได้, Admin แก้ message/delete ไม่ได้แต่ read=true ได้
10. ทดสอบ offline/reconnect: transaction fail ต้องไม่รายงาน success และให้ลองเข้างานอีกครั้งหลังออนไลน์

## อัปเดตรอบเปิดกระดิ่งแล้วอ่านทั้งหมด

วางทับ 4 ไฟล์โค้ด: src/admin/components/NotificationCenter.tsx, src/admin/components/notification-center.css, src/shared/firebase/repositories/admin-notifications.ts, src/shared/firebase/repositories/admin-notifications.test.ts และเอกสารนี้

การเปลี่ยนเปิดกระดิ่งแล้วอ่านทั้งหมดไม่ต้องแก้ rules เพิ่ม แต่มี hotfix สิทธิ์ปิดร้านด้านล่างซึ่งต้อง deploy rules ใหม่

## Hotfix: ยืนยันปิดร้านขึ้น Missing or insufficient permissions

- วางทับ: firestore.rules
- สาเหตุใน source: saveStoreClosing อ่าน daily_closings/<branchId>_<dateKey> ก่อนสร้างใน transaction แต่ rules เดิมใช้ resource.data.branchId จึงปฏิเสธเมื่อเอกสารยังไม่มี
- เพิ่มเฉพาะ allow get สำหรับบัญชี branch ที่ active เมื่อเอกสารยังไม่มี ไม่ให้ list ข้ามสาขาหรืออ่านเอกสารที่มีอยู่ของสาขาอื่น
- ต้อง deploy/publish firestore.rules ล่าสุดใน Firebase project ของ POS แล้ว reload POS และลองปิดร้านใหม่ ไม่จำเป็นต้อง build เว็บใหม่สำหรับ hotfix นี้
- Tests ที่เกี่ยวกับ attendance/session/cash-closing ผ่าน 25 เคส เป็น mocked repository tests ไม่ใช่การทดสอบ rules บน emulator หรือ production
- หลัง deploy ตรวจปิดร้านครั้งแรกสำเร็จ, ปิดซ้ำถูกปฏิเสธ, บัญชีสาขาอื่นอ่านเอกสารปิดร้านที่มีอยู่ไม่ได้

## อัปเดต: แจ้งเตือนปิดร้าน

- เมื่อ saveStoreClosing สำเร็จ สร้าง admin_notifications/store-closed_<closingId> โดย type=store_closed, closingId=<branchId>_<dateKey>
- บันทึก notification ใน transaction เดียวกับ daily_closings และการ checkout: ถ้า commit fail จะไม่มีข้อมูลส่วนใดถูกบันทึก; การตรวจ closing เดิมป้องกันรายการซ้ำ รวมการ retry transaction
- แสดงชื่อผู้ปิดร้าน + ปิดร้านแล้ว, ชื่อสาขา และเวลา Asia/Bangkok พร้อมไอคอนร้าน; ไม่เปลี่ยนการคำนวณเงินสดหรือขั้นตอนยืนยันเดิม
- unread/realtime/history และเปิดกระดิ่งแล้วอ่านทั้งหมดรองรับทั้งสองประเภท; ไม่สร้างแจ้งเตือนย้อนจากประวัติปิดร้านเดิม
- Rules ตรวจ closing ที่สร้างพร้อมกัน, ID, สาขา, ผู้ปิดร้าน, ข้อความ และ server timestamp; ห้ามสร้าง notification แยกจาก closing หรือปลอมชนิดอื่น

ไฟล์วางทับสำหรับผู้ติดตั้งรุ่นก่อนแล้ว (ไม่มีไฟล์โค้ดใหม่รอบนี้):

- firestore.rules
- src/shared/firebase/repositories/attendance.ts
- src/shared/firebase/repositories/attendance.test.ts
- src/shared/firebase/repositories/admin-notifications.ts
- src/admin/components/NotificationCenter.tsx
- deliverables/notification-center/README.md

ต้อง Publish/deploy firestore.rules ใหม่ก่อน deploy เว็บ จากนั้น reload POS และ Admin แม้เพิ่ง deploy hotfix สิทธิ์ปิดร้านไปแล้วก็ต้อง deploy rules รอบนี้อีกครั้ง

ทดสอบหลัง deploy: ปิดร้านครั้งแรกสำเร็จ → Admin ได้ 1 รายการและ badge เพิ่ม; กดยืนยันซ้ำ/สองเครื่องปิดพร้อมกัน → มี notification ID เดียว; ปิดร้านไม่สำเร็จ → ไม่มีรายการใหม่; ผู้ปิดร้านและสาขาต้องตรง daily_closings; เปิดกระดิ่ง → อ่านทั้งหมด; reload → ประวัติยังอยู่

ตรวจ TypeScript, tests 108 เคส และ build ผ่าน (ยังมีคำเตือน bundle >500 kB); ไม่มี lint script; ยังไม่ได้ยืนยัน rules บน emulator หรือ Firebase จริง

## ปรับไอคอนแจ้งเตือน

วางทับ: src/admin/components/NotificationCenter.tsx และ src/admin/components/notification-center.css

เปลี่ยนตัวอักษรสัญลักษณ์เป็น SVG เส้นชุดเดียวกัน: รูปหน้าร้านสำหรับปิดร้าน และรูปคนพร้อมเครื่องหมายถูกสำหรับเข้างาน ขนาด 22px ในกรอบมุมมน 40px สีทองอ่อนสำหรับ unread

รอบปรับไอคอนนี้ผ่าน TypeScript และ production build; ไม่เปลี่ยน rules เพิ่ม ให้ build/deploy เว็บและ reload Admin
