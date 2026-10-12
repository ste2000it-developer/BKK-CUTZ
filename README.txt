BKK-CUTZ Branch Network patch

ไฟล์ที่แก้:
- src/admin/AdminApp.tsx -> วางทับ
- src/admin/features/network/branch-network.css -> เพิ่มไฟล์ใหม่

สิ่งที่เพิ่ม:
- เพิ่มเมนู "ผังเครือข่ายสาขา" ใน Admin
- ตั้งให้หน้าเปิดเริ่มต้นเป็นผังสาขา
- ต่อ BranchNetworkPage เข้ากับเมนูจริง
- เพิ่มสไตล์ branch-network.css ให้ได้หน้าตาแบบ dark network dashboard
- รองรับ desktop และ mobile layout

ตรวจแล้ว:
- npm run typecheck ผ่าน
- npm run build ใน environment นี้รันไม่ได้ เพราะคำสั่ง vite permission denied
