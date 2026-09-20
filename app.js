// ================================
// ข้อมูลจำลอง
//
// หลังจากนี้เราจะย้ายไป Firebase
// ================================

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


// ================================
// DOM
// ================================

const barberPage =
  document.getElementById("barberPage");

const servicePage =
  document.getElementById("servicePage");

const barberList =
  document.getElementById("barberList");

const serviceList =
  document.getElementById("serviceList");

const selectedBarberName =
  document.getElementById("selectedBarberName");

const backButton =
  document.getElementById("backButton");


// ================================
// ข้อมูลที่เลือก
// ================================

let selectedBarber = null;

// เก็บรายการบริการที่เลือก
const selectedServices = new Set();


// ================================
// แสดงรายชื่อช่าง
// ================================

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


// ================================
// เมื่อเลือกช่าง
// ================================

function selectBarber(barber) {

  selectedBarber = barber;

  // เริ่มลูกค้าคนใหม่
  // ล้างบริการที่เคยเลือกไว้
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

}


// ================================
// แสดงบริการ
// ================================

function renderServices() {

  serviceList.innerHTML = "";


  services.forEach((service) => {

    const button =
      document.createElement("button");

    button.type = "button";

    button.className =
      "service-button";


    // เช็กว่ารายการนี้ถูกเลือกอยู่หรือไม่
    const isSelected =
      selectedServices.has(service.id);


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


// ================================
// เลือก / ยกเลิกบริการ
// ================================

function toggleService(service) {

  if (selectedServices.has(service.id)) {

    // ถ้าเลือกอยู่แล้ว
    // กดอีกครั้ง = ยกเลิก
    selectedServices.delete(
      service.id
    );

  } else {

    // ถ้ายังไม่ได้เลือก
    // เพิ่มเข้าไป
    selectedServices.add(
      service.id
    );

  }


  renderServices();


  // เอาไว้ดูค่าทดลองตอนนี้
  console.log(
    "ช่าง:",
    selectedBarber
  );


  console.log(
    "บริการที่เลือก:",
    services.filter(
      (service) =>
        selectedServices.has(service.id)
    )
  );

}


// ================================
// กลับไปหน้าเลือกช่าง
// ================================

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

  }
);


// ================================
// เริ่มระบบ
// ================================

renderBarbers();
