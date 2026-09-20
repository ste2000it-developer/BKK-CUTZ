// ========================================
// ข้อมูลจำลอง
//
// ตอนนี้ยังไม่เชื่อม Firebase
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
  document.getElementById("barberPage");

const servicePage =
  document.getElementById("servicePage");

const qrPage =
  document.getElementById("qrPage");

const successPage =
  document.getElementById("successPage");


const barberList =
  document.getElementById("barberList");

const serviceList =
  document.getElementById("serviceList");

const summaryList =
  document.getElementById("summaryList");

const totalPrice =
  document.getElementById("totalPrice");


const selectedBarberName =
  document.getElementById("selectedBarberName");


const backButton =
  document.getElementById("backButton");

const confirmButton =
  document.getElementById("confirmButton");

const homeButton =
  document.getElementById("homeButton");


// ========================================
// PAYMENT
// ========================================

const paymentModal =
  document.getElementById("paymentModal");

const paymentTotal =
  document.getElementById("paymentTotal");

const cashPaymentButton =
  document.getElementById("cashPaymentButton");

const scanPaymentButton =
  document.getElementById("scanPaymentButton");

const cancelPaymentButton =
  document.getElementById("cancelPaymentButton");


// ========================================
// QR
// ========================================

const qrTotal =
  document.getElementById("qrTotal");

const qrPaidButton =
  document.getElementById("qrPaidButton");

const qrBackButton =
  document.getElementById("qrBackButton");


// ========================================
// SUCCESS
// ========================================

const successBarberName =
  document.getElementById("successBarberName");

const successServiceList =
  document.getElementById("successServiceList");

const successTotal =
  document.getElementById("successTotal");

const successPaymentMethod =
  document.getElementById("successPaymentMethod");


// ========================================
// STATE
// ========================================

let selectedBarber = null;

const selectedServices =
  new Set();


// ========================================
// แสดงรายชื่อช่าง
// ========================================

function renderBarbers() {

  barberList.innerHTML = "";


  barbers.forEach((barber) => {

    const button =
      document.createElement("button");

    button.type =
      "button";

    button.className =
      "barber-button";

    button.textContent =
      barber.name;


    button.addEventListener(
      "click",
      () => {

        selectBarber(barber);

      }
    );


    barberList.appendChild(
      button
    );

  });

}


// ========================================
// เลือกช่าง
// ========================================

function selectBarber(barber) {

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


  services.forEach((service) => {

    const button =
      document.createElement("button");

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

  });

}


// ========================================
// เลือก / ยกเลิกบริการ
// ========================================

function toggleService(service) {

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
// คำนวณยอดรวม
// ========================================

function calculateTotal() {

  return getSelectedServiceList().reduce(
    (sum, service) =>
      sum + service.price,
    0
  );

}


// ========================================
// SUMMARY
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
// ยืนยันรายการ
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
// เปิดเลือกวิธีชำระเงิน
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
// ปิดเลือกวิธีชำระเงิน
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
// กลับจากเลือกวิธีจ่าย
// ========================================

cancelPaymentButton.addEventListener(
  "click",
  () => {

    closePaymentModal();

  }
);


// ========================================
// แสดงหน้า QR
// ========================================

function showQrPage() {

  const total =
    calculateTotal();


  qrTotal.textContent =
    `${total.toLocaleString("th-TH")} บาท`;


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
// QR → ชำระแล้ว
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
// QR → กลับไปเลือกวิธีชำระ
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
// ยังไม่บันทึก Firebase
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
// หน้าสำเร็จ
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
    transaction.paymentMethod === "cash"
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
// RESET
// ========================================

function resetTransaction() {

  selectedBarber =
    null;

  selectedServices.clear();


  closePaymentModal();


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
// กลับจากหน้าเลือกบริการ
// ========================================

backButton.addEventListener(
  "click",
  () => {

    resetTransaction();

  }
);


// ========================================
// START
// ========================================

renderBarbers();
