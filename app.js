import {
  login,
  logout,
  watchAuth,
  getUserProfile,
  getBranch
} from "./firebase.js";


import {
  getApp
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";


import {
  getFirestore,
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";



// ========================================
// FIRESTORE
// ========================================

const db =
  getFirestore(
    getApp()
  );



// ========================================
// TRUE MONEY
// ========================================

const TRUE_MONEY_QR_IMAGE =
  "";



// ========================================
// BARBERS
//
// เปลี่ยนจาก hard-code
// เป็นโหลดจาก Firestore
// ========================================

let barbers =
  [];



// ========================================
// SERVICES
//
// ตอนนี้ยังใช้ข้อมูลทดลองเดิมก่อน
// ขั้นต่อไปค่อยย้ายเข้า Firestore
// ========================================

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
// LOGIN DOM
// ========================================

const loginPage =
  document.getElementById(
    "loginPage"
  );


const mainApp =
  document.getElementById(
    "mainApp"
  );


const loginForm =
  document.getElementById(
    "loginForm"
  );


const emailInput =
  document.getElementById(
    "emailInput"
  );


const passwordInput =
  document.getElementById(
    "passwordInput"
  );


const loginButton =
  document.getElementById(
    "loginButton"
  );


const loginError =
  document.getElementById(
    "loginError"
  );


const logoutButton =
  document.getElementById(
    "logoutButton"
  );


const currentBranchName =
  document.getElementById(
    "currentBranchName"
  );



// ========================================
// PAGE DOM
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



// ========================================
// POS DOM
// ========================================

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



// ========================================
// PAYMENT
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
// QR
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


const trueMoneyQrImage =
  document.getElementById(
    "trueMoneyQrImage"
  );


const trueMoneyQrPlaceholder =
  document.getElementById(
    "trueMoneyQrPlaceholder"
  );



// ========================================
// SUCCESS
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


const homeButton =
  document.getElementById(
    "homeButton"
  );



// ========================================
// STATE
// ========================================

let currentUserProfile =
  null;


let currentBranch =
  null;


let selectedBarber =
  null;


const selectedServices =
  new Set();



// ========================================
// LOAD BARBERS FROM FIRESTORE
// ========================================

async function loadBarbers() {

  const barberQuery =
    query(
      collection(
        db,
        "barbers"
      ),

      where(
        "active",
        "==",
        true
      )
    );


  const snapshot =
    await getDocs(
      barberQuery
    );


  barbers =
    snapshot.docs.map(
      (documentSnapshot) => {

        return {

          id:
            documentSnapshot.id,

          ...documentSnapshot.data()

        };

      }
    );


  // เรียงชื่อตามภาษาไทย
  barbers.sort(
    (a, b) => {

      return String(
        a.name || ""
      ).localeCompare(
        String(
          b.name || ""
        ),
        "th"
      );

    }
  );

}



// ========================================
// LOGIN
// ========================================

loginForm.addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();


    loginError.classList.add(
      "hidden"
    );


    loginError.textContent =
      "";


    loginButton.disabled =
      true;


    loginButton.textContent =
      "กำลังเข้าสู่ระบบ...";


    try {

      await login(
        emailInput.value.trim(),
        passwordInput.value
      );

    } catch (error) {

      console.error(
        "Login error:",
        error
      );


      loginError.textContent =
        "อีเมลหรือรหัสผ่านไม่ถูกต้อง";


      loginError.classList.remove(
        "hidden"
      );


      loginButton.disabled =
        false;


      loginButton.textContent =
        "เข้าสู่ระบบ";

    }

  }
);



// ========================================
// LOGOUT
// ========================================

logoutButton.addEventListener(
  "click",
  async () => {

    try {

      await logout();

    } catch (error) {

      console.error(
        "Logout error:",
        error
      );

    }

  }
);



// ========================================
// AUTH STATE
// ========================================

watchAuth(
  async (user) => {

    if (!user) {

      currentUserProfile =
        null;


      currentBranch =
        null;


      barbers =
        [];


      showLoginPage();


      return;

    }


    try {

      const profile =
        await getUserProfile(
          user.uid
        );


      if (
        profile.active !== true
      ) {

        throw new Error(
          "บัญชีถูกปิดใช้งาน"
        );

      }


      if (
        profile.role !== "branch"
      ) {

        throw new Error(
          "บัญชีนี้ไม่ใช่บัญชีสาขา"
        );

      }


      const branch =
        await getBranch(
          profile.branchId
        );


      if (
        branch.active !== true
      ) {

        throw new Error(
          "สาขานี้ถูกปิดใช้งาน"
        );

      }


      currentUserProfile =
        profile;


      currentBranch =
        branch;


      // โหลดรายชื่อช่างกลางจาก Firestore
      await loadBarbers();


      currentBranchName.textContent =
        branch.name || branch.id;


      loginButton.disabled =
        false;


      loginButton.textContent =
        "เข้าสู่ระบบ";


      loginError.classList.add(
        "hidden"
      );


      showMainApp();

    } catch (error) {

      console.error(
        "Account setup error:",
        error
      );


      await logout();


      showLoginPage();


      loginError.textContent =
        error.message;


      loginError.classList.remove(
        "hidden"
      );


      loginButton.disabled =
        false;


      loginButton.textContent =
        "เข้าสู่ระบบ";

    }

  }
);



// ========================================
// SHOW LOGIN
// ========================================

function showLoginPage() {

  mainApp.classList.add(
    "hidden"
  );


  loginPage.classList.remove(
    "hidden"
  );


  closePaymentModal();

}



// ========================================
// SHOW APP
// ========================================

function showMainApp() {

  loginPage.classList.add(
    "hidden"
  );


  mainApp.classList.remove(
    "hidden"
  );


  resetTransaction();

}



// ========================================
// HIDE POS PAGES
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
// BARBERS
// ========================================

function renderBarbers() {

  barberList.innerHTML =
    "";


  if (
    barbers.length === 0
  ) {

    barberList.innerHTML = `
      <p
        class="empty-summary"
        style="grid-column: 1 / -1;"
      >
        ยังไม่มีรายชื่อช่าง
      </p>
    `;


    return;

  }


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
// SELECT BARBER
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


  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

}



// ========================================
// SERVICES
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
// TOGGLE SERVICE
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
// GET SELECTED SERVICES
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
// TOTAL
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

        <strong>
          ${service.price.toLocaleString("th-TH")} บาท
        </strong>
      `;


      summaryList.appendChild(
        row
      );

    }
  );


  totalPrice.textContent =
    `${calculateTotal().toLocaleString("th-TH")} บาท`;


  confirmButton.disabled =
    false;

}



// ========================================
// CONFIRM
// ========================================

confirmButton.addEventListener(
  "click",
  () => {

    if (
      !selectedBarber ||
      selectedServices.size === 0
    ) {

      return;

    }


    openPaymentModal();

  }
);



// ========================================
// PAYMENT
// ========================================

function openPaymentModal() {

  paymentTotal.textContent =
    `${calculateTotal().toLocaleString("th-TH")} บาท`;


  paymentModal.classList.remove(
    "hidden"
  );


  document.body.classList.add(
    "modal-open"
  );

}



function closePaymentModal() {

  paymentModal.classList.add(
    "hidden"
  );


  document.body.classList.remove(
    "modal-open"
  );

}



cashPaymentButton.addEventListener(
  "click",
  () => {

    closePaymentModal();


    completeTransaction(
      "cash"
    );

  }
);



scanPaymentButton.addEventListener(
  "click",
  () => {

    closePaymentModal();


    showQrPage();

  }
);



cancelPaymentButton.addEventListener(
  "click",
  closePaymentModal
);



// ========================================
// TRUE MONEY
// ========================================

function renderTrueMoneyQr() {

  if (
    TRUE_MONEY_QR_IMAGE
  ) {

    trueMoneyQrImage.src =
      TRUE_MONEY_QR_IMAGE;


    trueMoneyQrImage.classList.remove(
      "hidden"
    );


    trueMoneyQrPlaceholder.classList.add(
      "hidden"
    );


    return;

  }


  trueMoneyQrImage.classList.add(
    "hidden"
  );


  trueMoneyQrPlaceholder.classList.remove(
    "hidden"
  );

}



function showQrPage() {

  qrTotal.textContent =
    `${calculateTotal().toLocaleString("th-TH")} บาท`;


  renderTrueMoneyQr();


  hideAllPages();


  qrPage.classList.remove(
    "hidden"
  );


  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

}



qrPaidButton.addEventListener(
  "click",
  () => {

    completeTransaction(
      "scan"
    );

  }
);



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
// COMPLETE TRANSACTION
// ========================================

function completeTransaction(
  paymentMethod
) {

  const selected =
    getSelectedServiceList();


  if (
    !selectedBarber ||
    selected.length === 0 ||
    !currentBranch
  ) {

    return;

  }


  const transaction = {

    branchId:
      currentBranch.id,

    branchName:
      currentBranch.name,

    barberId:
      selectedBarber.id,

    barberName:
      selectedBarber.name,

    services:
      selected,

    total:
      calculateTotal(),

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
// SUCCESS
// ========================================

function showSuccessPage(
  transaction
) {

  closePaymentModal();


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


  renderBarbers();

  renderSummary();


  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

}



// ========================================
// BUTTONS
// ========================================

homeButton.addEventListener(
  "click",
  resetTransaction
);


backButton.addEventListener(
  "click",
  resetTransaction
);
