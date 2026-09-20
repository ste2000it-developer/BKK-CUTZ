import {
  saveTransaction
} from "./firebase.js";


// ========================================
// ข้อมูลจำลอง
//
// ต่อไปข้อมูลพวกนี้ก็สามารถย้าย
// ไปอ่านจาก Firebase ได้
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


// ========================================
// ข้อมูลที่เลือก
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

    button.type = "button";

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


    barberList.appendChild(button);

  });

}


// ========================================
// เลือกช่าง
// ========================================

function selectBarber(barber) {

  selectedBarber = barber;

  selectedServices.clear();


  selectedBarberName.textContent =
    barber.name;


  barberPage.classList.add(
    "hidden"
  );


  servicePage.classList.remove(
    "hidden"
  );


  renderServices();

  renderSummary();

}


// ========================================
// แสดงบริการ
// ========================================

function renderServices() {

  serviceList.innerHTML = "";


  services.forEach((service) => {

    const button =
      document.createElement("button");

    button.type = "button";

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

        toggleService(service);

      }
    );


    serviceList.appendChild(button);

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
// ดึงรายการที่เลือก
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

  const selected =
    getSelectedServiceList();


  return selected.reduce(
    (sum, service) =>
      sum + service.price,
    0
  );

}


// ========================================
// แสดงสรุป
// ========================================

function renderSummary() {

  const selected =
    getSelectedServiceList();


  summaryList.innerHTML = "";


  if (selected.length === 0) {

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


  selected.forEach((service) => {

    const row =
      document.createElement("div");

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


    summaryList.appendChild(row);

  });


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
  async () => {

    if (!selectedBarber) {
      return;
    }


    const selected =
      getSelectedServiceList();


    if (selected.length === 0) {
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

      createdAt:
        new Date().toISOString()

    };


    try {

      // =============================
      // ส่งให้ firebase.js จัดการ
      // =============================

      await saveTransaction(
        transaction
      );


      alert(
        `ยืนยันรายการเรียบร้อย\n\n${selectedBarber.name}\nยอดรวม ${total.toLocaleString("th-TH")} บาท`
      );


      resetTransaction();

    } catch (error) {

      console.error(
        "บันทึกรายการไม่สำเร็จ:",
        error
      );


      alert(
        "บันทึกรายการไม่สำเร็จ"
      );

    }

  }
);


// ========================================
// ล้างรายการ
// ========================================

function resetTransaction() {

  selectedBarber = null;

  selectedServices.clear();


  servicePage.classList.add(
    "hidden"
  );


  barberPage.classList.remove(
    "hidden"
  );


  renderSummary();

}


// ========================================
// กลับ
// ========================================

backButton.addEventListener(
  "click",
  () => {

    selectedBarber = null;

    selectedServices.clear();


    servicePage.classList.add(
      "hidden"
    );


    barberPage.classList.remove(
      "hidden"
    );


    renderSummary();

  }
);


// ========================================
// เริ่มระบบ
// ========================================

renderBarbers();
