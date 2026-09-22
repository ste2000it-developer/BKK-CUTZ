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
  getDocs,
  doc,
  setDoc,
  onSnapshot,
  serverTimestamp,
  writeBatch
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
let activeBarbers = [];
let services = [];

let presenceUnsubscribe = null;


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
const posDateTime = document.getElementById("posDateTime");


const shiftButton = document.getElementById("shiftButton");
const shiftModal = document.getElementById("shiftModal");
const shiftBackdrop = document.getElementById("shiftBackdrop");
const shiftCloseButton = document.getElementById("shiftCloseButton");
const shiftPinInput = document.getElementById("shiftPinInput");
const shiftCheckInButton = document.getElementById("shiftCheckInButton");
const shiftStatus = document.getElementById("shiftStatus");

const openCloseStoreButton =
  document.getElementById("openCloseStoreButton");

const closeStoreModal =
  document.getElementById("closeStoreModal");

const closeStoreBackdrop =
  document.getElementById("closeStoreBackdrop");

const closeStoreCancelButton =
  document.getElementById("closeStoreCancelButton");

const closeStorePinInput =
  document.getElementById("closeStorePinInput");

const closeStoreStatus =
  document.getElementById("closeStoreStatus");

const confirmCloseStoreButton =
  document.getElementById("confirmCloseStoreButton");

const backToShiftButton =
  document.getElementById("backToShiftButton");

const barberPage = document.getElementById("barberPage");
const servicePage = document.getElementById("servicePage");
const qrPage = document.getElementById("qrPage");
const successPage = document.getElementById("successPage");

const barberList = document.getElementById("barberList");

const noShiftState =
  document.getElementById("noShiftState");

const openShiftFromEmptyButton =
  document.getElementById("openShiftFromEmptyButton");
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

const successDateTime =
  document.getElementById("successDateTime");
const homeButton = document.getElementById("homeButton");

const serviceOptionModal =
  document.getElementById("serviceOptionModal");
const serviceOptionBackdrop =
  document.getElementById("serviceOptionBackdrop");
const serviceOptionTitle =
  document.getElementById("serviceOptionTitle");
const choiceOptionsArea =
  document.getElementById("choiceOptionsArea");
const rangeServiceArea =
  document.getElementById("rangeServiceArea");
const rangePriceLabel =
  document.getElementById("rangePriceLabel");
const rangePriceInput =
  document.getElementById("rangePriceInput");
const rangeConfirmButton =
  document.getElementById("rangeConfirmButton");

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


const noticeModal =
  document.getElementById("noticeModal");

const noticeBackdrop =
  document.getElementById("noticeBackdrop");

const noticeTitle =
  document.getElementById("noticeTitle");

const noticeMessage =
  document.getElementById("noticeMessage");

const noticeCloseButton =
  document.getElementById("noticeCloseButton");


// ========================================
// STATE
// ========================================

let currentUserProfile = null;
let currentBranch = null;
let selectedBarber = null;

const selectedServices = new Map();

let pendingService = null;



// ========================================
// DATE / TIME
// ========================================

function formatThaiDateTime(
  value,
  includeSeconds = false
) {
  const date =
    value instanceof Date
      ? value
      : new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "-";
  }

  const dateText =
    date.toLocaleDateString(
      "th-TH",
      {
        day: "numeric",
        month: "short",
        year: "numeric"
      }
    );

  const timeText =
    date.toLocaleTimeString(
      "th-TH",
      {
        hour: "2-digit",
        minute: "2-digit",
        second:
          includeSeconds
            ? "2-digit"
            : undefined,
        hour12: false
      }
    );

  return `${dateText} • ${timeText}`;
}

function updatePosDateTime() {
  if (!posDateTime) {
    return;
  }

  posDateTime.textContent =
    formatThaiDateTime(
      new Date(),
      false
    );
}

updatePosDateTime();

window.setInterval(
  updatePosDateTime,
  1000
);


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
// BARBER PRESENCE / TODAY
// ========================================

function getLocalDateKey() {
  const now = new Date();

  const year =
    now.getFullYear();

  const month =
    String(
      now.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      now.getDate()
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function stopPresenceWatcher() {
  if (presenceUnsubscribe) {
    presenceUnsubscribe();
    presenceUnsubscribe = null;
  }

  activeBarbers = [];
}

function startPresenceWatcher(branchId) {
  stopPresenceWatcher();

  const today =
    getLocalDateKey();

  const presenceQuery = query(
    collection(
      db,
      "barber_presence"
    ),
    where(
      "branchId",
      "==",
      branchId
    )
  );

  return new Promise(
    (resolve, reject) => {
      let firstSnapshot = true;

      presenceUnsubscribe =
        onSnapshot(
          presenceQuery,
          (snapshot) => {
            const activeIds =
              new Set(
                snapshot.docs
                  .map(
                    (snapshot) => ({
                      id: snapshot.id,
                      ...snapshot.data()
                    })
                  )
                  .filter(
                    (presence) =>
                      presence.active === true &&
                      presence.dateKey === today
                  )
                  .map(
                    (presence) =>
                      presence.barberId
                  )
              );

            activeBarbers =
              barbers.filter(
                (barber) =>
                  activeIds.has(
                    barber.id
                  )
              );

            renderBarbers();

            if (firstSnapshot) {
              firstSnapshot = false;
              resolve();
            }
          },
          (error) => {
            console.error(
              "Presence watcher error:",
              error
            );

            if (firstSnapshot) {
              firstSnapshot = false;
              reject(error);
            }
          }
        );
    }
  );
}

function findBarberByPin(pin) {
  const matches =
    barbers.filter(
      (barber) =>
        String(
          barber.pin ?? ""
        ).trim() === pin
    );

  if (matches.length === 0) {
    return {
      barber: null,
      error:
        "ไม่พบช่างที่ใช้ PIN นี้"
    };
  }

  if (matches.length > 1) {
    return {
      barber: null,
      error:
        "PIN นี้ซ้ำกับช่างมากกว่า 1 คน กรุณาแก้ PIN ในระบบ"
    };
  }

  return {
    barber: matches[0],
    error: null
  };
}

async function checkInBarberByPin(pin) {
  if (!currentBranch) {
    throw new Error(
      "ยังไม่พบข้อมูลสาขา"
    );
  }

  const result =
    findBarberByPin(pin);

  if (!result.barber) {
    throw new Error(
      result.error
    );
  }

  const barber =
    result.barber;

  const alreadyActive =
    activeBarbers.some(
      (activeBarber) =>
        activeBarber.id === barber.id
    );

  if (alreadyActive) {
    return {
      barber,
      alreadyActive: true
    };
  }

  await setDoc(
    doc(
      db,
      "barber_presence",
      barber.id
    ),
    {
      barberId:
        barber.id,

      barberName:
        barber.name || "",

      branchId:
        currentBranch.id,

      branchName:
        currentBranch.name || "",

      dateKey:
        getLocalDateKey(),

      active:
        true,

      checkInAt:
        serverTimestamp(),

      updatedAt:
        serverTimestamp()
    },
    {
      merge: true
    }
  );

  return {
    barber,
    alreadyActive: false
  };
}



async function closeStoreByPin(pin) {
  if (!currentBranch) {
    throw new Error(
      "ยังไม่พบข้อมูลสาขา"
    );
  }

  const result =
    findBarberByPin(pin);

  if (!result.barber) {
    throw new Error(
      result.error
    );
  }

  const closer =
    result.barber;

  const isWorkingHere =
    activeBarbers.some(
      (barber) =>
        barber.id === closer.id
    );

  if (!isWorkingHere) {
    throw new Error(
      "PIN นี้ไม่ใช่ช่างที่กำลังเข้างานอยู่ในสาขานี้"
    );
  }

  const dateKey =
    getLocalDateKey();

  const batch =
    writeBatch(db);

  activeBarbers.forEach(
    (barber) => {
      batch.set(
        doc(
          db,
          "barber_presence",
          barber.id
        ),
        {
          active: false,
          checkOutAt:
            serverTimestamp(),
          updatedAt:
            serverTimestamp(),
          checkOutReason:
            "store_closed"
        },
        {
          merge: true
        }
      );
    }
  );

  batch.set(
    doc(
      db,
      "daily_closings",
      `${currentBranch.id}_${dateKey}`
    ),
    {
      branchId:
        currentBranch.id,

      branchName:
        currentBranch.name || "",

      dateKey,

      closedByBarberId:
        closer.id,

      closedByBarberName:
        closer.name || "",

      closedAt:
        serverTimestamp(),

      closedBarberCount:
        activeBarbers.length
    },
    {
      merge: true
    }
  );

  await batch.commit();

  return closer;
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

if (logoutButton) {
  logoutButton.addEventListener("click", async () => {
    try {
      await logout();

    } catch (error) {
      console.error(error);
    }
  });
}


// ========================================
// AUTH
// ========================================

watchAuth(async (user) => {
  if (!user) {
    stopPresenceWatcher();

    currentUserProfile = null;
    currentBranch = null;
    barbers = [];
    activeBarbers = [];
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

    await startPresenceWatcher(
      branch.id
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

  if (activeBarbers.length === 0) {
    barberList.classList.add("hidden");
    noShiftState.classList.remove("hidden");
    return;
  }

  noShiftState.classList.add("hidden");
  barberList.classList.remove("hidden");

  activeBarbers.forEach((barber) => {
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

// ========================================
// DISPLAY HELPERS
// ========================================

function getServiceDisplayName(service) {
  if (service.type === "free_cut") {
    return "ตัดผมฟรี 1 ครั้ง";
  }

  if (service.type === "half_cut") {
    return `ส่วนลดค่าตัดผม ${Number(service.discountPercent || 0)}%`;
  }

  return service.name || "-";
}

function getServiceIconMarkup(service) {
  const code = service.serviceCode || "";
  const type = service.type || "";

  const icons = {
    haircut: "content_cut",
    kids: "child_care",
    trim: "health_and_beauty",
    shave: "cleaning_services",
    wash: "shower",
    product: "inventory_2",
    custom: "more_horiz",
    free_cut: "redeem",
    half_cut: "percent"
  };

  const iconName =
    icons[code] ||
    icons[type] ||
    "more_horiz";

  return `
    <span
      class="material-symbols-outlined"
      aria-hidden="true"
    >
      ${iconName}
    </span>
  `;
}



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

    if (
      service.serviceCode === "shave" &&
      choices.length >= 2
    ) {
      const minPrice =
        Math.min(...choices.map(Number));

      const maxPrice =
        Math.max(...choices.map(Number));

      return `${formatMoney(minPrice)} - ${formatMoney(maxPrice)} บาท`;
    }

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
        <span class="service-icon">
          ${getServiceIconMarkup(service)}
        </span>

        <span class="service-copy">
          <span class="service-name">
            ${escapeHtml(getServiceDisplayName(service))}
          </span>
        </span>

        <span class="service-check">
          ${isSelected ? "✓" : ""}
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
    if (
      service.serviceCode === "shave"
    ) {
      openRangePriceModal(service);
    } else {
      openChoiceModal(service);
    }

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
    service.serviceCode === "haircut" ||
    service.serviceCode === "kids"
  ) {
    removeDiscountForTarget(
      service.serviceCode
    );
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
    name: getServiceDisplayName(service),
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
    getServiceDisplayName(service) || "เลือกตัวเลือก";

  choiceOptionsArea.innerHTML = "";

  customServiceArea.classList.add(
    "hidden"
  );

  rangeServiceArea.classList.add(
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
// APP NOTICE POPUP
// ========================================

function showNotice(
  message,
  title = "แจ้งเตือน"
) {
  noticeTitle.textContent =
    title;

  noticeMessage.textContent =
    message;

  noticeModal.classList.remove(
    "hidden"
  );

  document.body.classList.add(
    "modal-open"
  );
}

function closeNotice() {
  noticeModal.classList.add(
    "hidden"
  );

  if (
    paymentModal.classList.contains("hidden") &&
    serviceOptionModal.classList.contains("hidden")
  ) {
    document.body.classList.remove(
      "modal-open"
    );
  }
}

noticeCloseButton.addEventListener(
  "click",
  closeNotice
);

noticeBackdrop.addEventListener(
  "click",
  closeNotice
);


// ========================================
// RANGE PRICE SERVICE
// ใช้กับโกนหนวด / กันขอบ
// ========================================

function openRangePriceModal(service) {
  pendingService = service;

  const choices =
    Array.isArray(service.choices)
      ? service.choices
          .map(Number)
          .filter(Number.isFinite)
      : [];

  const minPrice =
    choices.length > 0
      ? Math.min(...choices)
      : 150;

  const maxPrice =
    choices.length > 0
      ? Math.max(...choices)
      : 200;

  serviceOptionTitle.textContent =
    getServiceDisplayName(service) || "ใส่ราคา";

  choiceOptionsArea.classList.add(
    "hidden"
  );

  rangeServiceArea.classList.add(
    "hidden"
  );

  customServiceArea.classList.add(
    "hidden"
  );

  rangeServiceArea.classList.remove(
    "hidden"
  );

  rangePriceLabel.textContent =
    `ใส่ราคา ${formatMoney(minPrice)} - ${formatMoney(maxPrice)} บาท`;

  rangePriceInput.min =
    String(minPrice);

  rangePriceInput.max =
    String(maxPrice);

  rangePriceInput.value = "";

  rangePriceInput.dataset.min =
    String(minPrice);

  rangePriceInput.dataset.max =
    String(maxPrice);

  serviceOptionModal.classList.remove(
    "hidden"
  );

  document.body.classList.add(
    "modal-open"
  );

  setTimeout(
    () => {
      rangePriceInput.focus();
    },
    0
  );
}

rangeConfirmButton.addEventListener(
  "click",
  () => {
    if (!pendingService) {
      return;
    }

    const price =
      Number(
        rangePriceInput.value
      );

    const minPrice =
      Number(
        rangePriceInput.dataset.min
      );

    const maxPrice =
      Number(
        rangePriceInput.dataset.max
      );

    if (
      !Number.isInteger(price) ||
      price < minPrice ||
      price > maxPrice
    ) {
      showNotice(
        `กรุณาใส่จำนวนเต็มตั้งแต่ ${formatMoney(minPrice)} ถึง ${formatMoney(maxPrice)} บาท`
      );
      return;
    }

    selectedServices.set(
      pendingService.id,
      makeSelectedService(
        pendingService,
        price
      )
    );

    closeServiceOptionModal();

    renderServices();
    renderSummary();
  }
);


// ========================================
// CUSTOM SERVICE
// ========================================

function openCustomModal(service) {
  pendingService = service;

  serviceOptionTitle.textContent =
    getServiceDisplayName(service) || "อื่นๆ";

  choiceOptionsArea.classList.add(
    "hidden"
  );

  rangeServiceArea.classList.add(
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
      showNotice(
        "กรุณาใส่รายละเอียด"
      );
      return;
    }

    if (
      !Number.isFinite(price) ||
      price < 0
    ) {
      showNotice(
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

function getSelectedDiscountTarget() {
  const eligible =
    Array
      .from(
        selectedServices.values()
      )
      .filter(
        (selectedService) =>
          selectedService.serviceCode === "haircut" ||
          selectedService.serviceCode === "kids"
      );

  return eligible.length > 0
    ? eligible[eligible.length - 1]
    : null;
}

function removeHaircutDiscounts() {
  Array
    .from(
      selectedServices.entries()
    )
    .forEach(
      ([id, selectedService]) => {
        if (
          selectedService.type === "free_cut" ||
          selectedService.type === "half_cut"
        ) {
          selectedServices.delete(id);
        }
      }
    );
}

function removeDiscountForTarget(
  targetServiceCode
) {
  Array
    .from(
      selectedServices.entries()
    )
    .forEach(
      ([id, selectedService]) => {
        if (
          (
            selectedService.type === "free_cut" ||
            selectedService.type === "half_cut"
          ) &&
          selectedService.targetServiceCode === targetServiceCode
        ) {
          selectedServices.delete(id);
        }
      }
    );
}

function applyHaircutDiscount(service) {
  const target =
    getSelectedDiscountTarget();

  if (!target) {
    showNotice(
      "กรุณาเลือก ตัดผม หรือ ตัดผมเด็ก ก่อนใช้ส่วนลด"
    );
    return;
  }

  removeHaircutDiscounts();

  let discountAmount = 0;

  if (
    service.type === "free_cut"
  ) {
    discountAmount =
      target.price;
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
        target.price *
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
          target.serviceCode,
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

  rangeServiceArea.classList.add(
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

  if (successDateTime) {
    successDateTime.textContent =
      formatThaiDateTime(
        transaction.createdAt,
        true
      );
  }

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
// PASSWORD VISIBILITY
// ========================================

const passwordToggleButton =
  document.getElementById("passwordToggleButton");

const passwordToggleIcon =
  document.getElementById("passwordToggleIcon");

if (
  passwordToggleButton &&
  passwordToggleIcon
) {
  passwordToggleButton.addEventListener(
    "click",
    () => {
      const isHidden =
        passwordInput.type === "password";

      passwordInput.type =
        isHidden
          ? "text"
          : "password";

      passwordToggleIcon.classList.toggle(
        "fa-eye",
        !isHidden
      );

      passwordToggleIcon.classList.toggle(
        "fa-eye-slash",
        isHidden
      );

      passwordToggleButton.setAttribute(
        "aria-label",
        isHidden
          ? "ซ่อนรหัสผ่าน"
          : "แสดงรหัสผ่าน"
      );

      passwordInput.focus();
    }
  );
}




// ========================================
// CLOSE STORE
// ========================================

function openCloseStoreModal() {
  if (
    !closeStoreModal ||
    !closeStorePinInput ||
    !closeStoreStatus
  ) {
    return;
  }

  closeShiftModal();

  closeStorePinInput.value = "";

  closeStoreStatus.textContent = "";
  closeStoreStatus.classList.add(
    "hidden"
  );

  closeStoreStatus.classList.remove(
    "is-error",
    "is-success"
  );

  closeStoreModal.classList.remove(
    "hidden"
  );

  document.body.classList.add(
    "modal-open"
  );

  setTimeout(
    () =>
      closeStorePinInput.focus(),
    50
  );
}

function closeCloseStoreModal() {
  if (!closeStoreModal) {
    return;
  }

  closeStoreModal.classList.add(
    "hidden"
  );

  if (
    paymentModal.classList.contains("hidden") &&
    serviceOptionModal.classList.contains("hidden") &&
    noticeModal.classList.contains("hidden") &&
    shiftModal.classList.contains("hidden")
  ) {
    document.body.classList.remove(
      "modal-open"
    );
  }
}

if (openCloseStoreButton) {
  openCloseStoreButton.addEventListener(
    "click",
    openCloseStoreModal
  );
}

if (closeStoreCancelButton) {
  closeStoreCancelButton.addEventListener(
    "click",
    closeCloseStoreModal
  );
}

if (closeStoreBackdrop) {
  closeStoreBackdrop.addEventListener(
    "click",
    closeCloseStoreModal
  );
}

if (backToShiftButton) {
  backToShiftButton.addEventListener(
    "click",
    () => {
      closeCloseStoreModal();
      openShiftModal();
    }
  );
}

if (closeStorePinInput) {
  closeStorePinInput.addEventListener(
    "input",
    () => {
      closeStorePinInput.value =
        closeStorePinInput.value
          .replace(/\D/g, "")
          .slice(0, 4);
    }
  );
}

if (
  confirmCloseStoreButton &&
  closeStorePinInput &&
  closeStoreStatus
) {
  confirmCloseStoreButton.addEventListener(
    "click",
    async () => {
      const pin =
        closeStorePinInput.value.trim();

      closeStoreStatus.classList.remove(
        "is-error",
        "is-success"
      );

      if (pin.length !== 4) {
        closeStoreStatus.textContent =
          "กรุณาใส่ PIN ให้ครบ 4 หลัก";

        closeStoreStatus.classList.add(
          "is-error"
        );

        closeStoreStatus.classList.remove(
          "hidden"
        );

        return;
      }

      confirmCloseStoreButton.disabled =
        true;

      confirmCloseStoreButton.textContent =
        "กำลังปิดร้าน...";

      try {
        const closer =
          await closeStoreByPin(pin);

        closeCloseStoreModal();
        closeShiftModal();

        showNotice(
          `ปิดร้านเรียบร้อย โดย ${closer.name}`,
          "ปิดร้านเรียบร้อย"
        );

      } catch (error) {
        console.error(
          "Close store error:",
          error
        );

        closeStoreStatus.textContent =
          error.message ||
          "ไม่สามารถปิดร้านได้";

        closeStoreStatus.classList.add(
          "is-error"
        );

        closeStoreStatus.classList.remove(
          "hidden"
        );

      } finally {
        confirmCloseStoreButton.disabled =
          false;

        confirmCloseStoreButton.textContent =
          "ยืนยันปิดร้าน";
      }
    }
  );
}


// ========================================
// TODAY BARBERS POPUP
// UI shell only — Firestore/PIN logic comes next.
// ========================================

function openShiftModal() {
  if (
    !shiftModal ||
    !shiftStatus ||
    !shiftPinInput
  ) {
    return;
  }

  shiftStatus.classList.add("hidden");
  shiftStatus.textContent = "";
  shiftPinInput.value = "";

  shiftModal.classList.remove("hidden");
  document.body.classList.add("modal-open");

  setTimeout(
    () => shiftPinInput.focus(),
    50
  );
}

function closeShiftModal() {
  if (!shiftModal) {
    return;
  }

  shiftModal.classList.add("hidden");

  if (
    paymentModal.classList.contains("hidden") &&
    serviceOptionModal.classList.contains("hidden") &&
    noticeModal.classList.contains("hidden")
  ) {
    document.body.classList.remove("modal-open");
  }
}

if (shiftButton) {
  shiftButton.addEventListener(
    "click",
    openShiftModal
  );
}

if (openShiftFromEmptyButton) {
  openShiftFromEmptyButton.addEventListener(
    "click",
    openShiftModal
  );
}

if (shiftCloseButton) {
  shiftCloseButton.addEventListener(
    "click",
    closeShiftModal
  );
}

if (shiftBackdrop) {
  shiftBackdrop.addEventListener(
    "click",
    closeShiftModal
  );
}

if (shiftPinInput) {
  shiftPinInput.addEventListener(
    "input",
    () => {
      shiftPinInput.value =
        shiftPinInput.value
          .replace(/\D/g, "")
          .slice(0, 4);
    }
  );
}

if (
  shiftCheckInButton &&
  shiftPinInput &&
  shiftStatus
) {
  shiftCheckInButton.addEventListener(
    "click",
    async () => {
      const pin =
        shiftPinInput.value.trim();

      shiftStatus.classList.remove(
        "is-error",
        "is-success"
      );

      if (pin.length !== 4) {
        shiftStatus.textContent =
          "กรุณาใส่ PIN ให้ครบ 4 หลัก";

        shiftStatus.classList.add(
          "is-error"
        );

        shiftStatus.classList.remove(
          "hidden"
        );

        return;
      }

      shiftCheckInButton.disabled =
        true;

      shiftCheckInButton.textContent =
        "กำลังตรวจสอบ...";

      try {
        const result =
          await checkInBarberByPin(
            pin
          );

        if (result.alreadyActive) {
          shiftStatus.textContent =
            `${result.barber.name} เข้างานอยู่แล้ว`;
        } else {
          shiftStatus.textContent =
            `${result.barber.name} เข้างานเรียบร้อย`;
        }

        shiftStatus.classList.add(
          "is-success"
        );

        shiftStatus.classList.remove(
          "hidden"
        );

        shiftPinInput.value = "";
        shiftPinInput.focus();

      } catch (error) {
        console.error(
          "Check-in error:",
          error
        );

        shiftStatus.textContent =
          error.message ||
          "ไม่สามารถเข้างานได้";

        shiftStatus.classList.add(
          "is-error"
        );

        shiftStatus.classList.remove(
          "hidden"
        );

      } finally {
        shiftCheckInButton.disabled =
          false;

        shiftCheckInButton.textContent =
          "ยืนยันเข้างาน";
      }
    }
  );
}


// ========================================
// START
// ========================================

showLoadingPage();
