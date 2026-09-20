// ================================
// ข้อมูลจำลอง
//
// เซ็ตแรกยังใช้ข้อมูลในไฟล์ก่อน
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
// ตัวแปรเก็บช่างที่เลือก
// ================================

let selectedBarber = null;


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


    button.innerHTML = `
      <span class="service-name">
        ${service.name}
      </span>

      <span class="service-price">
        ${service.price.toLocaleString("th-TH")} บาท
      </span>
    `;


    button.addEventListener(
      "click",
      () => {

        selectService(service);

      }
    );


    serviceList.appendChild(button);

  });

}


// ================================
// เมื่อเลือกบริการ
//
// ตอนนี้ยังไม่ทำอะไรต่อ
// รอเรากำหนดขั้นถัดไป
// ================================

function selectService(service) {

  console.log(
    "ช่าง:",
    selectedBarber
  );

  console.log(
    "บริการ:",
    service
  );

}


// ================================
// กลับไปหน้าเลือกช่าง
// ================================

backButton.addEventListener(
  "click",
  () => {

    selectedBarber = null;


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