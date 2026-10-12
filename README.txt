BKK-CUTZ — Excel Branch Summary

วางทับ:
- src/admin/features/payouts/exportPayout.ts
- src/admin/features/payouts/exportPayout.test.ts

สิ่งที่เพิ่ม:
- เพิ่มชีต "สรุปยอดสาขา" ใน Excel Export รอบจ่ายช่าง
- สรุป ค่ามือ / ประกันมือ / ทิป / หักเบิกล่วงหน้า / รวมจ่ายสุทธิ แยกตามสาขา
- ไม่ Freeze/ล็อกหัวตาราง
- ถ้าข้อมูลเก่าระบุหลายสาขาในวันเดียวและไม่มีสัดส่วนละเอียด ระบบแบ่งยอดวันนั้นเท่า ๆ กันเพื่อป้องกันการนับซ้ำ

ตรวจสอบ:
- npx tsc --noEmit ผ่าน
- Vitest/Build ใน environment นี้รันไม่ได้เพราะ node_modules ขาด @rollup/rollup-linux-x64-gnu (optional native Rollup package)
