// ========================================
// PromptPay QR Generator
// Thai QR Payment
// ========================================

const PROMPTPAY_AID =
  "A000000677010111";


// ========================================
// สร้าง TLV
// ========================================

function tlv(id, value) {

  const length =
    String(value.length)
      .padStart(2, "0");


  return (
    id +
    length +
    value
  );

}


// ========================================
// ทำความสะอาด PromptPay ID
// ========================================

function normalizePromptPayId(
  promptPayId
) {

  return String(promptPayId)
    .replace(/\D/g, "");

}


// ========================================
// ตรวจสอบประเภท PromptPay
// ========================================

function getPromptPayProxy(
  promptPayId
) {

  const cleanId =
    normalizePromptPayId(
      promptPayId
    );


  // เบอร์มือถือไทย 10 หลัก
  if (
    cleanId.length === 10 &&
    cleanId.startsWith("0")
  ) {

    // ตัวอย่าง
    //
    // 0812345678
    //
    // ->
    //
    // 0066812345678

    return {
      tag: "01",

      value:
        "0066" +
        cleanId.substring(1)
    };

  }


  // เลขประชาชน / เลขภาษี
  if (
    cleanId.length === 13
  ) {

    return {
      tag: "02",
      value: cleanId
    };

  }


  throw new Error(
    "PromptPay ID ต้องเป็นเบอร์มือถือ 10 หลัก หรือเลขประชาชน/เลขภาษี 13 หลัก"
  );

}


// ========================================
// CRC16 CCITT-FALSE
// ========================================

function crc16(payload) {

  let crc =
    0xFFFF;


  for (
    let i = 0;
    i < payload.length;
    i++
  ) {

    crc ^=
      payload.charCodeAt(i)
      << 8;


    for (
      let bit = 0;
      bit < 8;
      bit++
    ) {

      if (
        (crc & 0x8000) !== 0
      ) {

        crc =
          (crc << 1) ^
          0x1021;

      } else {

        crc =
          crc << 1;

      }


      crc &=
        0xFFFF;

    }

  }


  return crc
    .toString(16)
    .toUpperCase()
    .padStart(4, "0");

}


// ========================================
// สร้าง PromptPay Payload
// ========================================

export function createPromptPayPayload(
  promptPayId,
  amount
) {

  const numericAmount =
    Number(amount);


  if (
    !Number.isFinite(
      numericAmount
    ) ||
    numericAmount <= 0
  ) {

    throw new Error(
      "ยอดเงินไม่ถูกต้อง"
    );

  }


  const proxy =
    getPromptPayProxy(
      promptPayId
    );


  // ======================================
  // Merchant Account Information
  // ======================================

  const merchantAccount =
    tlv(
      "00",
      PROMPTPAY_AID
    ) +
    tlv(
      proxy.tag,
      proxy.value
    );


  let payload = "";


  // Payload Format Indicator
  payload +=
    tlv(
      "00",
      "01"
    );


  // Point of Initiation Method
  // 12 = Dynamic
  payload +=
    tlv(
      "01",
      "12"
    );


  // PromptPay Merchant Account
  payload +=
    tlv(
      "29",
      merchantAccount
    );


  // Currency = Thai Baht
  payload +=
    tlv(
      "53",
      "764"
    );


  // Amount
  payload +=
    tlv(
      "54",
      numericAmount.toFixed(2)
    );


  // Country
  payload +=
    tlv(
      "58",
      "TH"
    );


  // CRC placeholder
  payload +=
    "6304";


  const crc =
    crc16(payload);


  return (
    payload +
    crc
  );

}


// ========================================
// ซ่อน PromptPay ID บางส่วน
// ========================================

export function maskPromptPayId(
  promptPayId
) {

  const cleanId =
    normalizePromptPayId(
      promptPayId
    );


  if (cleanId.length === 10) {

    return (
      cleanId.substring(0, 3) +
      "-XXX-" +
      cleanId.substring(7)
    );

  }


  if (cleanId.length === 13) {

    return (
      cleanId.substring(0, 3) +
      "-XXXXXX-" +
      cleanId.substring(9)
    );

  }


  return "-";

}
