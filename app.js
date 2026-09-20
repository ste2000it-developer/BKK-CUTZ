import {
  PROMPTPAY_ID,
  PROMPTPAY_RECEIVER_NAME
} from "./shop-config.js";


import {
  createPromptPayPayload,
  maskPromptPayId
} from "./promptpay.js";



// ========================================
// ข้อมูลจำลอง
// ========================================

const barbers = [

  {
    id: "barber-001",
    name: "ช่างเอ"
  },

  {
    id: "barber-002",
    name: "ช่างบี"
  },

  {
    id: "barber-003",
    name: "ช่างซี"
  },

  {
    id: "barber-004",
    name: "ช่างดี"
  }

];


const services = [

  {
    id: "service-001",
    name: "ตัดผม",
    price: 150
  },

  {
    id: "service-002",
    name: "สระผม",
    price: 80
  },

  {
    id: "service-003",
    name: "โกนหนวด",
    price: 50
  },

  {
    id: "service-004",
    name: "ตัด + สระ",
    price: 200
  }

];



// ========================================
// DOM
// ========================================

const barberPage =
  document.getElementById(
    "barberPage"
  );


const servicePage =
  document.getElementById(
    "servicePage"
  );


const qrPage =
  document.getElementById(
    "qrPage"
  );


const successPage =
  document.getElementById(
    "successPage"
  );


const barberList =
  document.getElementById(
    "barberList"
  );


const serviceList =
  document.getElementById(
    "serviceList"
  );


const summaryList =
  document.getElementById(
    "summaryList"
  );


const totalPrice =
  document.getElementById(
    "totalPrice"
  );


const selectedBarberName =
  document.getElementById(
    "selectedBarberName"
  );


const backButton =
  document.getElementById(
    "backButton"
  );


const confirmButton =
  document.getElementById(
    "confirmButton"
  );


const homeButton =
  document.getElementById(
    "homeButton"
  );



// ========================================
// Payment
// ========================================

const paymentModal =
  document.getElementById(
    "paymentModal"
  );


const paymentTotal =
  document.getElementById(
    "paymentTotal"
  );


const cashPaymentButton =
  document.getElementById(
    "cashPaymentButton"
  );


const scanPaymentButton =
  document.getElementById(
    "scanPaymentButton"
  );


const cancelPaymentButton =
  document.getElementById(
    "cancelPaymentButton"
  );



// ========================================
// PromptPay QR
// ========================================

const qrTotal =
  document.getElementById(
    "qrTotal"
  );


const qrPaidButton =
  document.getElementById(
    "qrPaidButton"
  );


const qrBackButton =
  document.getElementById(
    "qrBackButton"
  );


const promptPayQrCode =
  document.getElementById(
    "promptPayQrCode"
  );


const qrReceiverName =
  document.getElementById(
    "qrReceiverName"
  );


const qrPromptPayId =
  document.getElementById(
    "qrPromptPayId"
  );


const qrError =
  document.getElementById(
    "qrError"
  );



// ========================================
// Success
// ========================================

const successBarberName =
  document.getElementById(
    "successBarberName"
  );


const successServiceList =
  document.getElementById(
    "successServiceList"
  );


const successTotal =
  document.getElementById(
    "successTotal"
  );


const successPaymentMethod =
  document.getElementById(
    "successPaymentMethod"
  );



// ========================================
// State
// ========================================

let selectedBarber =
  null;


const selectedServices =
  new Set();



// ========================================
// รายชื่อช่าง
// ========================================

function renderBarbers() {

  barberList.innerHTML =
    "";


  barbers.forEach(
    (barber) => {

      const button =
        document.createElement(
          "button"
        );


      button.type =
        "button";


      button.className =
        "barber-button";


      button.textContent =
        barber.name;


      button.addEventListener(
        "click",
        () => {

          selectBarber(
            barber
          );

        }
      );


      barberList.appendChild(
        button
      );

    }
  );

}



// ========================================
// เลือกช่าง
// ========================================

function selectBarber(
  barber
) {

  selectedBarber =
    barber;


  selectedServices.clear();


  selectedBarberName.textContent =
    barber.name;


  hideAllPages();


  servicePage.classList.remove(
    "hidden"
  );


  renderServices();

  renderSummary();

}



// ========================================
// ซ่อนทุกหน้า
// ========================================

function hideAllPages() {

  barberPage.classList.add(
    "hidden"
  );


  servicePage.classList.add(
    "hidden"
  );


  qrPage.classList.add(
    "hidden"
  );


  successPage.classList.add(
    "hidden"
  );

}



// ========================================
// แสดงบริการ
// ========================================

function renderServices() {

  serviceList.innerHTML =
    "";


  services.forEach(
    (service) => {

      const button =
        document.createElement(
          "button"
        );


      button.type =
        "button";


      button.className =
        "service-button";


      const isSelected =
        selectedServices.has(
          service.id
        );


      if (isSelected) {

        button.classList.add(
          "selected"
        );

      }


      button.innerHTML = `
        <span class="service-left">

          <span class="service-check">
            ${isSelected ? "✓" : ""}
          </span>

          <span class="service-name">
            ${service.name}
          </span>

        </span>

        <span class="service-price">
          ${service.price.toLocaleString("th-TH")} บาท
        </span>
      `;


      button.addEventListener(
        "click",
        () => {

          toggleService(
            service
          );

        }
      );


      serviceList.appendChild(
        button
      );

    }
  );

}



// ========================================
// เลือกบริการ
// ========================================

function toggleService(
  service
) {

  if (
    selectedServices.has(
      service.id
    )
  ) {

    selectedServices.delete(
      service.id
    );

  } else {

    selectedServices.add(
      service.id
    );

  }


  renderServices();

  renderSummary();

}



// ========================================
// ดึงบริการที่เลือก
// ========================================

function getSelectedServiceList() {

  return services.filter(
    (service) =>
      selectedServices.has(
        service.id
      )
  );

}



// ========================================
// รวมยอด
// ========================================

function calculateTotal() {

  return getSelectedServiceList()
    .reduce(
      (sum, service) =>
        sum + service.price,
      0
    );

}



// ========================================
// Summary
// ========================================

function renderSummary() {

  const selected =
    getSelectedServiceList();


  summaryList.innerHTML =
    "";


  if (
    selected.length === 0
  ) {

    summaryList.innerHTML = `
      <p class="empty-summary">
        ยังไม่ได้เลือกบริการ
      </p>
    `;


    totalPrice.textContent =
      "0 บาท";


    confirmButton.disabled =
      true;


    return;

  }


  selected.forEach(
    (service) => {

      const row =
        document.createElement(
          "div"
        );


      row.className =
        "summary-row";


      row.innerHTML = `
        <span>
          ${service.name}
        </span>

        <span>
          ${service.price.toLocaleString("th-TH")} บาท
        </span>
      `;


      summaryList.appendChild(
        row
      );

    }
  );


  const total =
    calculateTotal();


  totalPrice.textContent =
    `${total.toLocaleString("th-TH")} บาท`;


  confirmButton.disabled =
    false;

}



// ========================================
// กดยืนยัน
// ========================================

confirmButton.addEventListener(
  "click",
  () => {

    if (!selectedBarber) {
      return;
    }


    if (
      selectedServices.size === 0
    ) {
      return;
    }


    openPaymentModal();

  }
);



// ========================================
// เปิดเลือกการชำระ
// ========================================

function openPaymentModal() {

  const total =
    calculateTotal();


  paymentTotal.textContent =
    `${total.toLocaleString("th-TH")} บาท`;


  paymentModal.classList.remove(
    "hidden"
  );


  document.body.classList.add(
    "modal-open"
  );

}



// ========================================
// ปิดเลือกการชำระ
// ========================================

function closePaymentModal() {

  paymentModal.classList.add(
    "hidden"
  );


  document.body.classList.remove(
    "modal-open"
  );

}



// ========================================
// เงินสด
// ========================================

cashPaymentButton.addEventListener(
  "click",
  () => {

    closePaymentModal();


    completeTransaction(
      "cash"
    );

  }
);



// ========================================
// สแกนจ่าย
// ========================================

scanPaymentButton.addEventListener(
  "click",
  () => {

    closePaymentModal();


    showQrPage();

  }
);



// ========================================
// กลับจาก Payment
// ========================================

cancelPaymentButton.addEventListener(
  "click",
  () => {

    closePaymentModal();

  }
);



// ========================================
// สร้าง PromptPay QR
// ========================================

function renderPromptPayQr(
  amount
) {

  promptPayQrCode.innerHTML =
    "";


  qrError.classList.add(
    "hidden"
  );


  qrError.textContent =
    "";


  qrPaidButton.disabled =
    false;


  try {

    if (
      !PROMPTPAY_ID ||
      PROMPTPAY_ID.trim() === ""
    ) {

      throw new Error(
        "ยังไม่ได้ตั้งค่า PromptPay ของร้าน"
      );

    }


    if (
      typeof QRCode ===
      "undefined"
    ) {

      throw new Error(
        "โหลดระบบสร้าง QR ไม่สำเร็จ"
      );

    }


    const payload =
      createPromptPayPayload(
        PROMPTPAY_ID,
        amount
      );


    new QRCode(
      promptPayQrCode,
      {

        text:
          payload,

        width:
          280,

        height:
          280,

        correctLevel:
          QRCode.CorrectLevel.M

      }
    );


    qrReceiverName.textContent =
      PROMPTPAY_RECEIVER_NAME;


    qrPromptPayId.textContent =
      maskPromptPayId(
        PROMPTPAY_ID
      );

  } catch (error) {

    console.error(
      "PromptPay QR Error:",
      error
    );


    qrError.textContent =
      error.message;


    qrError.classList.remove(
      "hidden"
    );


    qrReceiverName.textContent =
      "-";


    qrPromptPayId.textContent =
      "-";


    qrPaidButton.disabled =
      true;

  }

}



// ========================================
// หน้า QR
// ========================================

function showQrPage() {

  const total =
    calculateTotal();


  qrTotal.textContent =
    `${total.toLocaleString("th-TH")} บาท`;


  renderPromptPayQr(
    total
  );


  hideAllPages();


  qrPage.classList.remove(
    "hidden"
  );


  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

}



// ========================================
// QR ชำระแล้ว
// ========================================

qrPaidButton.addEventListener(
  "click",
  () => {

    completeTransaction(
      "scan"
    );

  }
);



// ========================================
// QR กลับ
// ========================================

qrBackButton.addEventListener(
  "click",
  () => {

    qrPage.classList.add(
      "hidden"
    );


    servicePage.classList.remove(
      "hidden"
    );


    openPaymentModal();

  }
);



// ========================================
// จบรายการ
//
// ตอนนี้ยังไม่บันทึก Firebase
// ========================================

function completeTransaction(
  paymentMethod
) {

  if (!selectedBarber) {
    return;
  }


  const selected =
    getSelectedServiceList();


  if (
    selected.length === 0
  ) {
    return;
  }


  const total =
    calculateTotal();


  const transaction = {

    barberId:
      selectedBarber.id,

    barberName:
      selectedBarber.name,

    services:
      selected,

    total:
      total,

    paymentMethod:
      paymentMethod,

    createdAt:
      new Date().toISOString()

  };


  console.log(
    "รายการทดลอง:",
    transaction
  );


  showSuccessPage(
    transaction
  );

}



// ========================================
// Success
// ========================================

function showSuccessPage(
  transaction
) {

  hideAllPages();


  successPage.classList.remove(
    "hidden"
  );


  successBarberName.textContent =
    transaction.barberName;


  successTotal.textContent =
    `${transaction.total.toLocaleString("th-TH")} บาท`;


  successPaymentMethod.textContent =
    transaction.paymentMethod ===
      "cash"
      ? "เงินสด"
      : "สแกนจ่าย";


  successServiceList.innerHTML =
    "";


  transaction.services.forEach(
    (service) => {

      const row =
        document.createElement(
          "div"
        );


      row.className =
        "success-service-row";


      row.innerHTML = `
        <span>
          ${service.name}
        </span>

        <strong>
          ${service.price.toLocaleString("th-TH")} บาท
        </strong>
      `;


      successServiceList.appendChild(
        row
      );

    }
  );


  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

}



// ========================================
// กลับหน้าหลัก
// ========================================

homeButton.addEventListener(
  "click",
  () => {

    resetTransaction();

  }
);



// ========================================
// Reset
// ========================================

function resetTransaction() {

  selectedBarber =
    null;


  selectedServices.clear();


  closePaymentModal();


  promptPayQrCode.innerHTML =
    "";


  hideAllPages();


  barberPage.classList.remove(
    "hidden"
  );


  renderSummary();


  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

}



// ========================================
// กลับจากหน้าบริการ
// ========================================

backButton.addEventListener(
  "click",
  () => {

    resetTransaction();

  }
);



// ========================================
// Start
// ========================================

renderBarbers();
