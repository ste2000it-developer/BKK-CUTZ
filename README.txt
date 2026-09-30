BKK-CUTZ RFID + TFT RESULT V42

สิ่งที่เปลี่ยน
1. POS ไม่เด้ง Popup RFID แล้ว
2. POS ยังเป็นคนตรวจบัตรและบันทึก barber_presence + barber_attendance เหมือนเดิม
3. POS เขียนผลไปที่ reader_results/{scanId}
4. ESP32 รอผลแล้วแสดงบน TFT
5. สแกนสำเร็จ Buzzer ดัง 1 ครั้ง
6. เข้างานอยู่แล้ว Buzzer ดัง 2 ครั้ง
7. Error Buzzer ดังยาว 1 ครั้ง

==================================================
ไฟล์ที่ต้องเปลี่ยน
==================================================

POS/
- index.html -> วางทับ index.html
- app.js     -> วางทับ app.js
- pos.css    -> วางทับ pos.css

DEVICE/
- BKK_CUTZ_RFID_TFT_READER_V2.ino
  -> Upload ลง ESP32

firestore.rules
- ใช้แทน rules ปัจจุบัน แล้ว Deploy Firestore Rules

==================================================
PIN MAP
==================================================

RC522
SDA/SS -> GPIO5
SCK    -> GPIO18
MOSI   -> GPIO23
MISO   -> GPIO19
RST    -> GPIO22
3.3V   -> 3.3V
GND    -> GND
IRQ    -> ไม่ต่อ

TFT ST7789V 2.4"
VCC        -> 5V
GND        -> GND
SCK/CLK    -> GPIO18   (แชร์ RC522)
SDA/MOSI   -> GPIO23   (แชร์ RC522)
CS         -> GPIO27
DC/RS      -> GPIO26
RESET/RST  -> GPIO25
LED/BL     -> 5V
SDO/MISO   -> ไม่ต่อ

Buzzer Module
I/O/SIG -> GPIO4
VCC     -> 3.3V
GND     -> GND

==================================================
Arduino IDE Libraries
==================================================

ติดตั้งใน Library Manager:
- MFRC522
- Adafruit GFX Library
- Adafruit ST7735 and ST7789 Library
- U8g2_for_Adafruit_GFX
- ArduinoJson

Serial Monitor:
115200 baud

==================================================
ก่อน Upload ESP32
==================================================

แก้ 3 จุด:
- WIFI_SSID
- WIFI_PASSWORD
- BRANCH_ID

==================================================
สำคัญ
==================================================

ต้อง Deploy firestore.rules ชุดนี้ก่อน
ไม่งั้น ESP32 จะอ่านผลจาก reader_results ไม่ได้

ถ้าใช้ Firebase CLI:
firebase deploy --only firestore:rules
