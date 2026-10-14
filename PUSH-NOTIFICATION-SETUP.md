# BKK-CUTZ — Admin Push Notification setup

ระบบนี้ส่ง Push เฉพาะ `attendance_checkin` ใหม่ไปยังมือถือ/เบราว์เซอร์ที่ Admin กดเปิดการแจ้งเตือนไว้

## 1) วางไฟล์ patch
แตก ZIP ที่ root โปรเจกต์ แล้ววางทับตาม path เดิม

## 2) ติดตั้ง Functions dependencies
จาก root โปรเจกต์:

```powershell
cd functions
npm.cmd install
cd ..
```

## 3) Deploy Firestore Rules + Cloud Function

```powershell
firebase.cmd deploy --only firestore:rules,functions
```

ถ้า Firebase CLI ขอเลือก project ให้ใช้ project ของ BKK-CUTZ (`bkk-cutz`)

> Cloud Functions อาจขอให้ project เปิด Billing/Blaze ก่อน deploy ตามข้อกำหนดของ Firebase

## 4) Web Push certificate (แนะนำ)
Firebase Console > Project settings > Cloud Messaging > Web Push certificates
สร้าง key pair แล้วเอา **Public key** ใส่:

`.env.local`
```env
VITE_FIREBASE_VAPID_KEY=YOUR_PUBLIC_VAPID_KEY
```

และถ้า deploy ผ่าน GitHub Pages ให้เพิ่ม Repository Variable ชื่อ:
`VITE_FIREBASE_VAPID_KEY`

ถ้ายังไม่ใส่ ระบบจะลองใช้ default Web Push credential ของ Firebase ก่อน

## 5) Deploy เว็บตาม flow GitHub Pages เดิม
Push/commit source ตามปกติให้ GitHub Actions build และ deploy

## 6) เปิด Push บน Android Admin
เปิดหน้า Admin จาก URL **HTTPS ที่ deploy แล้ว** (ไม่ใช่ `http://192.168...`)

1. Login Admin
2. กดกระดิ่ง
3. กด `เปิดแจ้งเตือนบนเครื่องนี้`
4. Chrome ถาม permission > กด Allow
5. ใน Firestore ควรมี document ใหม่ที่ collection `admin_push_devices`

## 7) Test
ใช้ช่างที่ **ยังไม่ได้เข้างานในวันนี้** แล้ว Check-in ผ่าน PIN หรือ RFID

ผลที่ควรได้:
- `admin_notifications` มี event ใหม่ตามเดิม
- มือถือ Admin เด้ง Push เช่น `ช่างนพ เข้างานแล้ว • สะพานใหม่ • 09:12`
- สแกนซ้ำ/กด PIN ซ้ำของ attendance เดิม ไม่ควรสร้าง push event ใหม่

หมายเหตุ: Cloud Function ฟังเฉพาะ notification ที่สร้างใหม่หลัง deploy เท่านั้น ไม่ส่งย้อนหลังจาก notification เก่า
