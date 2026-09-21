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


const db = getFirestore(getApp());


// ========================================
// TRUE MONEY
// ========================================

const TRUE_MONEY_QR_IMAGE = "";


// ========================================
// DATA
// ========================================

let barbers = [];
let services = [];


// ========================================
// DOM
// ========================================

const loadingPage = document.getElementById("loadingPage");

const loginPage = document.getElementById("loginPage");
const mainApp = document.getElementById("mainApp");

const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("emailInput");
const passwordInput = document.getElementById("passwordInput");
const loginButton = document.getElementById("loginButton");
const loginError = document.getElementById("loginError");

const logoutButton = document.getElementById("logoutButton");
const currentBranchName = document.getElementById("currentBranchName");

const barberPage = document.getElementById("barberPage");
const servicePage = document.getElementById("servicePage");
const qrPage = document.getElementById("qrPage");
const successPage = document.getElementById("successPage");

const barberList = document.getElementById("barberList");
const serviceList = document.getElementById("serviceList");
const summaryList = document.getElementById("summaryList");
const totalPrice = document.getElementById("totalPrice");
const selectedBarberName = document.getElementById("selectedBarberName");
const backButton = document.getElementById("backButton");
const confirmButton = document.getElementById("confirmButton");

const paymentModal = document.getElementById("paymentModal");
const paymentTotal = document.getElementById("paymentTotal");
const cashPaymentButton = document.getElementById("cashPaymentButton");
const scanPaymentButton = document.getElementById("scanPaymentButton");
const cancelPaymentButton = document.getElementById("cancelPaymentButton");

const qrTotal = document.getElementById("qrTotal");
const qrPaidButton = document.getElementById("qrPaidButton");
const qrBackButton = document.getElementById("qrBackButton");
const trueMoneyQrImage = document.getElementById("trueMoneyQrImage");
const trueMoneyQrPlaceholder =
  document.getElementById("trueMoneyQrPlaceholder");

const successBarberName = document.getElementById("successBarberName");
const successServiceList = document.getElementById("successServiceList");
const successTotal = document.getElementById("successTotal");
const successPaymentMethod =
  document.getElementById("successPaymentMethod");
const homeButton = document.getElementById("homeButton");

const serviceOptionModal =
  document.getElementById("serviceOptionModal");
const serviceOptionBackdrop =
  document.getElementById("serviceOptionBackdrop");
const serviceOptionTitle =
  document.getElementById("serviceOptionTitle");
const choiceOptionsArea =
  document.getElementById("choiceOptionsArea");
const customServiceArea =
  document.getElementById("customServiceArea");
const customDescriptionInput =
  document.getElementById("customDescriptionInput");
const customPriceInput =
  document.getElementById("customPriceInput");
const customConfirmButton =
  document.getElementById("customConfirmButton");
const serviceOptionCancelButton =
  document.getElementById("serviceOptionCancelButton");


// ========================================
// STATE
// ========================================

let currentUserProfile = null;
let currentBranch = null;
let selectedBarber = null;

const selectedServices = new Map();

let pendingService = null;


// ========================================
// LOAD BARBERS
// ========================================

async function loadBarbers() {
  const barberQuery = query(
    collection(db, "barbers"),
    where("active", "==", true)
  );

  const snapshot = await getDocs(
    barberQuery
  );

  barbers = snapshot.docs.map(
    (snapshot) => ({
      id: snapshot.id,
      ...snapshot.data()
    })
  );

  barbers.sort(
    (a, b) =>
      String(a.name || "").localeCompare(
        String(b.name || ""),
        "th"
      )
  );
}


// ========================================
// LOAD SERVICES BY GROUP
// ========================================

async function loadServices(groupId) {
  const serviceQuery = query(
    collection(db, "services"),
    where(
      "groupId",
      "==",
      groupId
    )
  );

  const snapshot = await getDocs(
    serviceQuery
  );

  services = snapshot.docs
    .map(
      (snapshot) => ({
        id: snapshot.id,
        ...snapshot.data()
      })
    )
    .filter(
      (service) =>
        service.active === true
    );

  services.sort(
    (a, b) =>
      Number(a.sortOrder || 999) -
      Number(b.sortOrder || 999)
  );
}


// ========================================
// LOGIN
// ========================================

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  loginError.classList.add("hidden");
  loginError.textContent = "";

  loginButton.disabled = true;
  loginButton.textContent = "กำลังเข้าสู่ระบบ...";

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

    loginError.classList.remove("hidden");

    loginButton.disabled = false;
    loginButton.textContent = "เข้าสู่ระบบ";
  }
});


// ========================================
// LOGOUT
// ========================================

logoutButton.addEventListener("click", async () => {
  try {
    await logout();

  } catch (error) {
    console.error(error);
  }
});


// ========================================
// AUTH
// ========================================

watchAuth(async (user) => {
  if (!user) {
    currentUserProfile = null;
    currentBranch = null;
    barbers = [];
    services = [];

    showLoginPage();
    return;
  }

  try {
    const profile =
      await getUserProfile(
        user.uid
      );

    if (profile.active !== true) {
      throw new Error(
        "บัญชีถูกปิดใช้งาน"
      );
    }

    if (profile.role !== "branch") {
      throw new Error(
        "บัญชีนี้ไม่ใช่บัญชีสาขา"
      );
    }

    const branch =
      await getBranch(
        profile.branchId
      );

    if (branch.active !== true) {
      throw new Error(
        "สาขานี้ถูกปิดใช้งาน"
      );
    }

    if (!branch.serviceGroup) {
      throw new Error(
        "สาขานี้ยังไม่ได้กำหนดกลุ่มราคา"
      );
    }

    currentUserProfile = profile;
    currentBranch = branch;

    await loadBarbers();
    await loadServices(
      branch.serviceGroup
    );

    currentBranchName.textContent =
      branch.name || branch.id;

    loginButton.disabled = false;
    loginButton.textContent = "เข้าสู่ระบบ";

    loginError.classList.add("hidden");

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

    loginError.classList.remove("hidden");

    loginButton.disabled = false;
    loginButton.textContent = "เข้าสู่ระบบ";
  }
});


// ========================================
// MAIN PAGE VISIBILITY
// ========================================

function showLoadingPage() {
  loginPage.classList.add("hidden");
  mainApp.classList.add("hidden");
  loadingPage.classList.remove("hidden");

  closePaymentModal();
  closeServiceOptionModal();
}

function showLoginPage() {
  loadingPage.classList.add("hidden");
  mainApp.classList.add("hidden");
  loginPage.classList.remove("hidden");

  closePaymentModal();
  closeServiceOptionModal();
}

function showMainApp() {
  loadingPage.classList.add("hidden");
  loginPage.classList.add("hidden");
  mainApp.classList.remove("hidden");

  resetTransaction();
}

function hideAllPages() {
  barberPage.classList.add("hidden");
  servicePage.classList.add("hidden");
  qrPage.classList.add("hidden");
  successPage.classList.add("hidden");
}


// ========================================
// BARBERS
// ========================================

function renderBarbers() {
  barberList.innerHTML = "";

  if (barbers.length === 0) {
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

  barbers.forEach((barber) => {
    const button =
      document.createElement("button");

    button.type = "button";
    button.className = "barber-button";
    button.textContent = barber.name;

    button.addEventListener(
      "click",
      () => {
        selectBarber(barber);
      }
    );

    barberList.appendChild(button);
  });
}

function selectBarber(barber) {
  selectedBarber = barber;
  selectedServices.clear();

  selectedBarberName.textContent =
    barber.name;

  hideAllPages();
  servicePage.classList.remove("hidden");

  renderServices();
  renderSummary();

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


// ========================================
// SERVICE DISPLAY
// ========================================

function getServiceButtonPriceText(service) {
  const selected =
    selectedServices.get(service.id);

  if (
    service.type === "choice"
  ) {
    if (selected) {
      return `${formatMoney(selected.price)} บาท`;
    }

    const choices =
      Array.isArray(service.choices)
        ? service.choices
        : [];

    return choices.length
      ? `เลือก ${choices.map(formatMoney).join(" / ")}`
      : "เลือกราคา";
  }

  if (
    service.type === "custom"
  ) {
    if (selected) {
      return `${formatMoney(selected.price)} บาท`;
    }

    return "กรอกราคาเอง";
  }

  if (
    service.type === "free_cut"
  ) {
    return "ตัดผมฟรี";
  }

  if (
    service.type === "half_cut"
  ) {
    return `ลด ${Number(service.discountPercent || 0)}%`;
  }

  return `${formatMoney(service.price || 0)} บาท`;
}

function renderServices() {
  serviceList.innerHTML = "";

  if (services.length === 0) {
    serviceList.innerHTML = `
      <p class="empty-summary">
        ยังไม่มีเมนูสำหรับกลุ่มราคานี้
      </p>
    `;
    return;
  }

  services.forEach((service) => {
    const button =
      document.createElement("button");

    button.type = "button";
    button.className = "service-button";

    const isSelected =
      selectedServices.has(
        service.id
      );

    if (isSelected) {
      button.classList.add("selected");
    }

    button.innerHTML = `
      <span class="service-left">
        <span class="service-check">
          ${isSelected ? "✓" : ""}
        </span>

        <span class="service-name">
          ${escapeHtml(service.name || "-")}
        </span>
      </span>

      <span class="service-price">
        ${escapeHtml(getServiceButtonPriceText(service))}
      </span>
    `;

    button.addEventListener(
      "click",
      () => {
        handleServiceClick(service);
      }
    );

    serviceList.appendChild(button);
  });
}


// ========================================
// SERVICE CLICK
// ========================================

function handleServiceClick(service) {
  if (
    selectedServices.has(service.id)
  ) {
    removeService(service);
    return;
  }

  if (
    service.type === "choice"
  ) {
    openChoiceModal(service);
    return;
  }

  if (
    service.type === "custom"
  ) {
    openCustomModal(service);
    return;
  }

  if (
    service.type === "free_cut" ||
    service.type === "half_cut"
  ) {
    applyHaircutDiscount(service);
    return;
  }

  selectedServices.set(
    service.id,
    makeSelectedService(
      service,
      Number(service.price || 0)
    )
  );

  renderServices();
  renderSummary();
}

function removeService(service) {
  selectedServices.delete(
    service.id
  );

  if (
    service.serviceCode === "haircut"
  ) {
    removeHaircutDiscounts();
  }

  renderServices();
  renderSummary();
}

function makeSelectedService(
  service,
  price,
  extra = {}
) {
  return {
    id: service.id,
    serviceCode:
      service.serviceCode || null,
    name: service.name || "",
    type: service.type || "fixed",
    price:
      Number(price || 0),
    basePrice:
      Number(service.price || 0),
    ...extra
  };
}


// ========================================
// CHOICE SERVICE
// ========================================

function openChoiceModal(service) {
  pendingService = service;

  serviceOptionTitle.textContent =
    service.name || "เลือกตัวเลือก";

  choiceOptionsArea.innerHTML = "";

  customServiceArea.classList.add(
    "hidden"
  );

  choiceOptionsArea.classList.remove(
    "hidden"
  );

  const choices =
    Array.isArray(service.choices)
      ? service.choices
      : [];

  choices.forEach((price) => {
    const button =
      document.createElement("button");

    button.type = "button";
    button.className =
      "choice-price-button";

    button.textContent =
      `${formatMoney(price)} บาท`;

    button.addEventListener(
      "click",
      () => {
        selectedServices.set(
          service.id,
          makeSelectedService(
            service,
            Number(price)
          )
        );

        closeServiceOptionModal();

        renderServices();
        renderSummary();
      }
    );

    choiceOptionsArea.appendChild(
      button
    );
  });

  serviceOptionModal.classList.remove(
    "hidden"
  );

  document.body.classList.add(
    "modal-open"
  );
}


// ========================================
// CUSTOM SERVICE
// ========================================

function openCustomModal(service) {
  pendingService = service;

  serviceOptionTitle.textContent =
    service.name || "อื่นๆ";

  choiceOptionsArea.classList.add(
    "hidden"
  );

  customServiceArea.classList.remove(
    "hidden"
  );

  customDescriptionInput.value = "";
  customPriceInput.value = "";

  serviceOptionModal.classList.remove(
    "hidden"
  );

  document.body.classList.add(
    "modal-open"
  );

  setTimeout(
    () => {
      customDescriptionInput.focus();
    },
    0
  );
}

customConfirmButton.addEventListener(
  "click",
  () => {
    if (!pendingService) {
      return;
    }

    const detail =
      customDescriptionInput
        .value
        .trim();

    const price =
      Number(
        customPriceInput.value
      );

    if (!detail) {
      window.alert(
        "กรุณาใส่รายละเอียด"
      );
      return;
    }

    if (
      !Number.isFinite(price) ||
      price < 0
    ) {
      window.alert(
        "กรุณาใส่ราคาให้ถูกต้อง"
      );
      return;
    }

    selectedServices.set(
      pendingService.id,
      makeSelectedService(
        pendingService,
        price,
        {
          detail
        }
      )
    );

    closeServiceOptionModal();

    renderServices();
    renderSummary();
  }
);


// ========================================
// HAIRCUT DISCOUNT
// ========================================

function getSelectedHaircut() {
  return Array
    .from(
      selectedServices.values()
    )
    .find(
      (service) =>
        service.serviceCode === "haircut"
    );
}

function removeHaircutDiscounts() {
  Array
    .from(
      selectedServices.entries()
    )
    .forEach(
      ([id, service]) => {
        if (
          service.type === "free_cut" ||
          service.type === "half_cut"
        ) {
          selectedServices.delete(id);
        }
      }
    );
}

function applyHaircutDiscount(service) {
  const haircut =
    getSelectedHaircut();

  if (!haircut) {
    window.alert(
      "กรุณาเลือกเมนูตัดผมก่อนใช้ส่วนลด"
    );
    return;
  }

  removeHaircutDiscounts();

  let discountAmount = 0;

  if (
    service.type === "free_cut"
  ) {
    discountAmount =
      haircut.price;
  }

  if (
    service.type === "half_cut"
  ) {
    const percent =
      Number(
        service.discountPercent || 0
      );

    discountAmount =
      Math.round(
        haircut.price *
        percent /
        100
      );
  }

  selectedServices.set(
    service.id,
    makeSelectedService(
      service,
      -discountAmount,
      {
        discountAmount,
        targetServiceCode:
          service.targetServiceCode ||
          "haircut",
        discountPercent:
          Number(
            service.discountPercent || 0
          )
      }
    )
  );

  renderServices();
  renderSummary();
}


// ========================================
// SERVICE OPTION MODAL
// ========================================

function closeServiceOptionModal() {
  pendingService = null;

  serviceOptionModal.classList.add(
    "hidden"
  );

  choiceOptionsArea.classList.add(
    "hidden"
  );

  customServiceArea.classList.add(
    "hidden"
  );

  if (
    paymentModal.classList.contains(
      "hidden"
    )
  ) {
    document.body.classList.remove(
      "modal-open"
    );
  }
}

serviceOptionCancelButton.addEventListener(
  "click",
  closeServiceOptionModal
);

serviceOptionBackdrop.addEventListener(
  "click",
  closeServiceOptionModal
);


// ========================================
// SELECTED SERVICES
// ========================================

function getSelectedServiceList() {
  return Array.from(
    selectedServices.values()
  );
}

function calculateTotal() {
  const total =
    getSelectedServiceList()
      .reduce(
        (sum, service) =>
          sum + Number(service.price || 0),
        0
      );

  return Math.max(
    0,
    total
  );
}


// ========================================
// SUMMARY
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

    if (
      service.price < 0
    ) {
      row.classList.add(
        "discount-row"
      );
    }

    const detailHtml =
      service.detail
        ? `
          <span class="summary-detail">
            ${escapeHtml(service.detail)}
          </span>
        `
        : "";

    row.innerHTML = `
      <span>
        ${escapeHtml(service.name)}
        ${detailHtml}
      </span>

      <strong>
        ${formatSignedMoney(service.price)}
      </strong>
    `;

    summaryList.appendChild(row);
  });

  totalPrice.textContent =
    `${formatMoney(calculateTotal())} บาท`;

  confirmButton.disabled = false;
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
    `${formatMoney(calculateTotal())} บาท`;

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

  if (
    serviceOptionModal.classList.contains(
      "hidden"
    )
  ) {
    document.body.classList.remove(
      "modal-open"
    );
  }
}

cashPaymentButton.addEventListener(
  "click",
  () => {
    closePaymentModal();
    completeTransaction("cash");
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
  if (TRUE_MONEY_QR_IMAGE) {
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
    `${formatMoney(calculateTotal())} บาท`;

  renderTrueMoneyQr();

  hideAllPages();
  qrPage.classList.remove("hidden");

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

qrPaidButton.addEventListener(
  "click",
  () => {
    completeTransaction("scan");
  }
);

qrBackButton.addEventListener(
  "click",
  () => {
    qrPage.classList.add("hidden");
    servicePage.classList.remove("hidden");

    openPaymentModal();
  }
);


// ========================================
// COMPLETE TRANSACTION
// ========================================

function completeTransaction(paymentMethod) {
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

    serviceGroup:
      currentBranch.serviceGroup,

    barberId:
      selectedBarber.id,

    barberName:
      selectedBarber.name,

    services:
      selected,

    total:
      calculateTotal(),

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

function showSuccessPage(transaction) {
  closePaymentModal();
  closeServiceOptionModal();

  hideAllPages();
  successPage.classList.remove("hidden");

  successBarberName.textContent =
    transaction.barberName;

  successTotal.textContent =
    `${formatMoney(transaction.total)} บาท`;

  successPaymentMethod.textContent =
    transaction.paymentMethod === "cash"
      ? "เงินสด"
      : "สแกนจ่าย";

  successServiceList.innerHTML = "";

  transaction.services.forEach((service) => {
    const row =
      document.createElement("div");

    row.className =
      "success-service-row";

    const detail =
      service.detail
        ? ` (${service.detail})`
        : "";

    row.innerHTML = `
      <span>
        ${escapeHtml(service.name + detail)}
      </span>

      <strong>
        ${formatSignedMoney(service.price)}
      </strong>
    `;

    successServiceList.appendChild(row);
  });

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


// ========================================
// RESET
// ========================================

function resetTransaction() {
  selectedBarber = null;
  selectedServices.clear();

  closePaymentModal();
  closeServiceOptionModal();

  hideAllPages();
  barberPage.classList.remove("hidden");

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


// ========================================
// HELPERS
// ========================================

function formatMoney(value) {
  return Number(value || 0)
    .toLocaleString(
      "th-TH",
      {
        maximumFractionDigits: 2
      }
    );
}

function formatSignedMoney(value) {
  const amount =
    Number(value || 0);

  if (amount < 0) {
    return `-${formatMoney(Math.abs(amount))} บาท`;
  }

  return `${formatMoney(amount)} บาท`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


// ========================================
// START
// ========================================

showLoadingPage();
