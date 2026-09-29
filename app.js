import {
  login,
  logout,
  watchAuth,
  getUserProfile,
  getBranch,
  uploadPaymentSlip,
  loadPaymentSlipUrl
} from "./firebase.js?v=37";

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
let readerScanUnsubscribe = null;
const processedReaderScanIds = new Set();


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
const historyButton = document.getElementById("historyButton");
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
const historyPage = document.getElementById("historyPage");

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

const tipToggleButton =
  document.getElementById("tipToggleButton");
const tipEntry =
  document.getElementById("tipEntry");
const tipInput =
  document.getElementById("tipInput");
const tipAmountText =
  document.getElementById("tipAmountText");
const qrGrandTotal =
  document.getElementById("qrGrandTotal");
const tipQuickButtons =
  document.querySelectorAll("[data-tip-amount]");

const slipFileInput =
  document.getElementById("slipFileInput");
const slipCaptureButton =
  document.getElementById("slipCaptureButton");
const slipCaptureButtonText =
  document.getElementById("slipCaptureButtonText");
const slipPreview =
  document.getElementById("slipPreview");
const slipPreviewImage =
  document.getElementById("slipPreviewImage");
const slipStatus =
  document.getElementById("slipStatus");

const successBarberName = document.getElementById("successBarberName");
const successServiceList = document.getElementById("successServiceList");
const successTotal = document.getElementById("successTotal");
const successTipRow =
  document.getElementById("successTipRow");
const successTipAmount =
  document.getElementById("successTipAmount");
const successGrandTotal =
  document.getElementById("successGrandTotal");
const successPaymentMethod =
  document.getElementById("successPaymentMethod");

const successDateTime =
  document.getElementById("successDateTime");
const homeButton = document.getElementById("homeButton");

const historyBackButton =
  document.getElementById("historyBackButton");
const historyDateInput =
  document.getElementById("historyDateInput");
const historyRefreshButton =
  document.getElementById("historyRefreshButton");
const historyBarberFilter =
  document.getElementById("historyBarberFilter");
const historyList =
  document.getElementById("historyList");
const historyCount =
  document.getElementById("historyCount");
const historyServiceTotal =
  document.getElementById("historyServiceTotal");
const historyTipTotal =
  document.getElementById("historyTipTotal");
const historyGrandTotal =
  document.getElementById("historyGrandTotal");

const historySlipModal =
  document.getElementById("historySlipModal");
const historySlipBackdrop =
  document.getElementById("historySlipBackdrop");
const historySlipCloseButton =
  document.getElementById("historySlipCloseButton");
const historySlipImage =
  document.getElementById("historySlipImage");
const historySlipStatus =
  document.getElementById("historySlipStatus");

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
// PRIMARY ACTION BINDINGS
// Bind these early so the main POS buttons remain responsive
// even if a later optional UI section has a runtime problem.
// ========================================

if (historyButton) {
  historyButton.addEventListener(
    "click",
    () => {
      openTransactionHistory().catch(
        (error) => {
          console.error(
            "Open history error:",
            error
          );

          showNotice(
            error?.message ||
              "ไม่สามารถเปิดประวัติรายการได้",
            "ประวัติรายการ"
          );
        }
      );
    }
  );
}


// ========================================
// STATE
// ========================================

let currentUserProfile = null;
let currentBranch = null;
let selectedBarber = null;

const selectedServices = new Map();

let pendingService = null;

let paymentTipAmount = 0;
let pendingSlipFile = null;
let pendingSlipPreviewUrl = null;
let isCompletingTransaction = false;

// HISTORY STATE
let historyTransactions = [];
let isLoadingHistory = false;
let historyReturnPage = null;



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




// ========================================
// BARBER ATTENDANCE HISTORY
// เก็บประวัติเข้างานรายวันสำหรับคำนวณประกันมือ
// ========================================

function getAttendanceDocumentId(
  barberId,
  dateKey = getLocalDateKey()
) {
  return [
    dateKey,
    currentBranch?.id || "unknown",
    barberId
  ].join("_");
}

async function saveBarberCheckIn(
  barber,
  checkInMethod
) {
  const dateKey =
    getLocalDateKey();

  const batch =
    writeBatch(db);

  batch.set(
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

      dateKey,

      active:
        true,

      checkInAt:
        serverTimestamp(),

      updatedAt:
        serverTimestamp(),

      checkInMethod
    },
    {
      merge: true
    }
  );

  batch.set(
    doc(
      db,
      "barber_attendance",
      getAttendanceDocumentId(
        barber.id,
        dateKey
      )
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

      dateKey,

      attended:
        true,

      active:
        true,

      checkInAt:
        serverTimestamp(),

      updatedAt:
        serverTimestamp(),

      checkInMethod
    },
    {
      merge: true
    }
  );

  await batch.commit();
}

// ========================================
// RFID READER SCANS
// ========================================

function stopReaderScanWatcher() {
  if (readerScanUnsubscribe) {
    readerScanUnsubscribe();
    readerScanUnsubscribe = null;
  }

  processedReaderScanIds.clear();
}

function normalizeRfidUid(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^0-9A-F]/g, "");
}

function findBarberByRfid(cardUid) {
  const normalizedCardUid =
    normalizeRfidUid(cardUid);

  if (!normalizedCardUid) {
    return {
      barber: null,
      error: "ไม่พบ UID ของบัตร"
    };
  }

  const matches =
    barbers.filter(
      (barber) =>
        normalizeRfidUid(
          barber.rfidUid
        ) === normalizedCardUid
    );

  if (matches.length === 0) {
    return {
      barber: null,
      error: "ไม่พบบัตรนี้ในระบบ"
    };
  }

  if (matches.length > 1) {
    return {
      barber: null,
      error:
        "บัตร RFID นี้ถูกผูกกับช่างมากกว่า 1 คน กรุณาแก้ข้อมูลในระบบ"
    };
  }

  return {
    barber: matches[0],
    error: null
  };
}

async function checkInBarberByRfid(cardUid) {
  if (!currentBranch) {
    throw new Error(
      "ยังไม่พบข้อมูลสาขา"
    );
  }

  const result =
    findBarberByRfid(cardUid);

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

  await saveBarberCheckIn(
    barber,
    "rfid"
  );

  return {
    barber,
    alreadyActive: false
  };
}

function startReaderScanWatcher(branchId) {
  stopReaderScanWatcher();

  const scanQuery = query(
    collection(
      db,
      "reader_scans"
    ),
    where(
      "branchId",
      "==",
      branchId
    )
  );

  let firstSnapshot = true;

  readerScanUnsubscribe =
    onSnapshot(
      scanQuery,
      async (snapshot) => {
        // ตอนเปิด POS ครั้งแรก ให้จำ scan เก่าไว้เฉย ๆ
        // เพื่อไม่ให้ refresh แล้วนำบัตรเก่ามาเข้างานซ้ำ
        if (firstSnapshot) {
          snapshot.docs.forEach(
            (snapshot) => {
              const data =
                snapshot.data();

              const scanId =
                String(
                  data.scanId || ""
                ).trim();

              if (scanId) {
                processedReaderScanIds.add(
                  `${snapshot.id}:${scanId}`
                );
              }
            }
          );

          firstSnapshot = false;
          return;
        }

        for (
          const change of snapshot.docChanges()
        ) {
          if (change.type === "removed") {
            continue;
          }

          const scan = {
            id: change.doc.id,
            ...change.doc.data()
          };

          const scanId =
            String(
              scan.scanId || ""
            ).trim();

          if (!scanId) {
            continue;
          }

          const processedKey =
            `${scan.id}:${scanId}`;

          if (
            processedReaderScanIds.has(
              processedKey
            )
          ) {
            continue;
          }

          processedReaderScanIds.add(
            processedKey
          );

          if (
            processedReaderScanIds.size > 300
          ) {
            const firstKey =
              processedReaderScanIds
                .values()
                .next()
                .value;

            if (firstKey) {
              processedReaderScanIds.delete(
                firstKey
              );
            }
          }

          try {
            const result =
              await checkInBarberByRfid(
                scan.cardUid
              );

            showNotice(
              result.alreadyActive
                ? `${result.barber.name} เข้างานอยู่แล้ว`
                : `${result.barber.name} เข้างานเรียบร้อย`,
              "RFID"
            );

          } catch (error) {
            console.error(
              "RFID check-in error:",
              error
            );

            showNotice(
              error.message ||
                "ไม่สามารถเข้างานด้วยบัตร RFID ได้",
              "RFID"
            );
          }
        }
      },
      (error) => {
        console.error(
          "Reader scan watcher error:",
          error
        );
      }
    );
}


// ========================================
// PIN CHECK-IN
// ========================================

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

  await saveBarberCheckIn(
    barber,
    "pin"
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

      batch.set(
        doc(
          db,
          "barber_attendance",
          getAttendanceDocumentId(
            barber.id,
            dateKey
          )
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

          dateKey,

          attended:
            true,

          active:
            false,

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
    stopReaderScanWatcher();

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

    startReaderScanWatcher(
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
  historyPage.classList.add("hidden");
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
  async () => {
    closePaymentModal();
    await completeTransaction("cash");
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
// TIP + SLIP
// ========================================

function getTipAmount() {
  const value =
    Number(paymentTipAmount || 0);

  if (
    !Number.isFinite(value) ||
    value < 0
  ) {
    return 0;
  }

  return Math.round(value);
}

function updateQrPaymentSummary() {
  const serviceTotal =
    calculateTotal();

  const tipAmount =
    getTipAmount();

  tipAmountText.textContent =
    `${formatMoney(tipAmount)} บาท`;

  qrGrandTotal.textContent =
    `${formatMoney(serviceTotal + tipAmount)} บาท`;

  tipQuickButtons.forEach(
    (button) => {
      button.classList.toggle(
        "active",
        Number(button.dataset.tipAmount) === tipAmount
      );
    }
  );
}

function setPaymentTipAmount(value) {
  const amount =
    Math.max(
      0,
      Math.round(
        Number(value || 0)
      )
    );

  paymentTipAmount =
    Number.isFinite(amount)
      ? amount
      : 0;

  tipInput.value =
    paymentTipAmount > 0
      ? String(paymentTipAmount)
      : "";

  updateQrPaymentSummary();
}

function clearSlipSelection() {
  pendingSlipFile = null;

  if (pendingSlipPreviewUrl) {
    URL.revokeObjectURL(
      pendingSlipPreviewUrl
    );

    pendingSlipPreviewUrl = null;
  }

  slipFileInput.value = "";
  slipPreviewImage.removeAttribute("src");
  slipPreview.classList.add("hidden");
  slipStatus.textContent = "พร้อมบันทึก";
  slipCaptureButtonText.textContent = "ถ่ายสลิป";
}

function resetPaymentExtras() {
  paymentTipAmount = 0;
  tipInput.value = "";
  tipEntry.classList.add("hidden");
  tipToggleButton.textContent = "+ เพิ่มทิป";

  clearSlipSelection();
  updateQrPaymentSummary();
}

function createTransactionId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return (
    "tx_" +
    Date.now().toString(36) +
    "_" +
    Math.random()
      .toString(36)
      .slice(2, 10)
  );
}

function loadImageFromFile(file) {
  return new Promise(
    (resolve, reject) => {
      const objectUrl =
        URL.createObjectURL(file);

      const image =
        new Image();

      image.onload = () => {
        URL.revokeObjectURL(
          objectUrl
        );

        resolve(image);
      };

      image.onerror = () => {
        URL.revokeObjectURL(
          objectUrl
        );

        reject(
          new Error(
            "ไม่สามารถอ่านรูปสลิปได้"
          )
        );
      };

      image.src = objectUrl;
    }
  );
}

function canvasToJpegBlob(
  canvas,
  quality
) {
  return new Promise(
    (resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(
              new Error(
                "ไม่สามารถเตรียมรูปสลิปได้"
              )
            );
            return;
          }

          resolve(blob);
        },
        "image/jpeg",
        quality
      );
    }
  );
}

async function compressSlipImage(file) {
  if (
    !file ||
    !String(file.type || "").startsWith("image/")
  ) {
    throw new Error(
      "กรุณาเลือกไฟล์รูปภาพ"
    );
  }

  const image =
    await loadImageFromFile(file);

  const maxDimension = 1600;

  const sourceWidth =
    image.naturalWidth || image.width;

  const sourceHeight =
    image.naturalHeight || image.height;

  const ratio =
    Math.min(
      1,
      maxDimension /
        Math.max(
          sourceWidth,
          sourceHeight
        )
    );

  const width =
    Math.max(
      1,
      Math.round(
        sourceWidth * ratio
      )
    );

  const height =
    Math.max(
      1,
      Math.round(
        sourceHeight * ratio
      )
    );

  const canvas =
    document.createElement("canvas");

  canvas.width = width;
  canvas.height = height;

  const context =
    canvas.getContext("2d");

  if (!context) {
    throw new Error(
      "อุปกรณ์นี้ไม่สามารถเตรียมรูปสลิปได้"
    );
  }

  context.drawImage(
    image,
    0,
    0,
    width,
    height
  );

  let quality = 0.82;
  let blob =
    await canvasToJpegBlob(
      canvas,
      quality
    );

  const maxBytes =
    5 * 1024 * 1024;

  while (
    blob.size >= maxBytes &&
    quality > 0.52
  ) {
    quality -= 0.08;

    blob =
      await canvasToJpegBlob(
        canvas,
        quality
      );
  }

  if (blob.size >= maxBytes) {
    throw new Error(
      "รูปสลิปมีขนาดใหญ่เกินไป กรุณาถ่ายใหม่"
    );
  }

  return blob;
}

function setQrPaidLoading(isLoading) {
  qrPaidButton.disabled =
    isLoading;

  qrPaidButton.innerHTML =
    isLoading
      ? "กำลังบันทึกรูปสลิป..."
      : `
          ตรวจสลิปแล้ว — ชำระแล้ว
          <span>→</span>
        `;
}

if (
  tipToggleButton &&
  tipEntry
) {
  tipToggleButton.addEventListener(
    "click",
    () => {
      const willOpen =
        tipEntry.classList.contains(
          "hidden"
        );

      tipEntry.classList.toggle(
        "hidden",
        !willOpen
      );

      tipToggleButton.textContent =
        willOpen
          ? "ปิดช่องทิป"
          : "+ เพิ่มทิป";

      if (willOpen) {
        setTimeout(
          () => tipInput.focus(),
          0
        );
      }
    }
  );
}

if (tipInput) {
  tipInput.addEventListener(
    "input",
    () => {
      setPaymentTipAmount(
        tipInput.value
      );
    }
  );
}

tipQuickButtons.forEach(
  (button) => {
    button.addEventListener(
      "click",
      () => {
        setPaymentTipAmount(
          button.dataset.tipAmount
        );
      }
    );
  }
);

if (
  slipCaptureButton &&
  slipFileInput
) {
  slipCaptureButton.addEventListener(
    "click",
    () => {
      slipFileInput.click();
    }
  );
}

if (slipFileInput) {
  slipFileInput.addEventListener(
    "change",
    () => {
      const file =
        slipFileInput.files?.[0];

      if (!file) {
        return;
      }

      if (
        !String(file.type || "").startsWith("image/")
      ) {
        clearSlipSelection();

        showNotice(
          "กรุณาเลือกไฟล์รูปภาพ"
        );

        return;
      }

      pendingSlipFile = file;

      if (pendingSlipPreviewUrl) {
        URL.revokeObjectURL(
          pendingSlipPreviewUrl
        );
      }

      pendingSlipPreviewUrl =
        URL.createObjectURL(file);

      slipPreviewImage.src =
        pendingSlipPreviewUrl;

      slipPreview.classList.remove(
        "hidden"
      );

      slipStatus.textContent =
        "ถ่ายสลิปแล้ว • พร้อมบันทึก";

      slipCaptureButtonText.textContent =
        "ถ่ายใหม่";
    }
  );
}


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

  updateQrPaymentSummary();
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
  async () => {
    await completeTransaction("scan");
  }
);

qrBackButton.addEventListener(
  "click",
  () => {
    if (isCompletingTransaction) {
      return;
    }

    qrPage.classList.add("hidden");
    servicePage.classList.remove("hidden");

    openPaymentModal();
  }
);


// ========================================
// COMPLETE TRANSACTION
// ========================================

async function completeTransaction(paymentMethod) {
  const selected =
    getSelectedServiceList();

  if (
    !selectedBarber ||
    selected.length === 0 ||
    !currentBranch ||
    isCompletingTransaction
  ) {
    return;
  }

  if (
    paymentMethod === "scan" &&
    !pendingSlipFile
  ) {
    showNotice(
      "กรุณาถ่ายรูปสลิปก่อนยืนยันการชำระเงิน",
      "ยังไม่มีรูปสลิป"
    );

    return;
  }

  isCompletingTransaction = true;

  let slipUploaded = false;

  if (paymentMethod === "scan") {
    setQrPaidLoading(true);
  }

  try {
    const createdAt =
      new Date().toISOString();

    const transactionId =
      createTransactionId();

    const serviceTotal =
      calculateTotal();

    const tipAmount =
      paymentMethod === "scan"
        ? getTipAmount()
        : 0;

    const grandTotal =
      serviceTotal + tipAmount;

    let slipStoragePath = null;

    if (
      paymentMethod === "scan" &&
      pendingSlipFile
    ) {
      slipStatus.textContent =
        "กำลังบันทึกรูปสลิป...";

      const slipBlob =
        await compressSlipImage(
          pendingSlipFile
        );

      const uploadResult =
        await uploadPaymentSlip({
          branchId:
            currentBranch.id,

          dateKey:
            getLocalDateKey(),

          transactionId,

          blob:
            slipBlob,

          metadata: {
            transactionId,
            branchId:
              currentBranch.id,
            barberId:
              selectedBarber.id,
            barberName:
              selectedBarber.name || "",
            serviceTotal,
            tipAmount,
            grandTotal,
            paymentMethod,
            createdAt
          }
        });

      slipStoragePath =
        uploadResult.path;

      slipUploaded = true;

      slipStatus.textContent =
        "บันทึกรูปสลิปแล้ว";
    }

    const transaction = {
      id:
        transactionId,

      branchId:
        currentBranch.id,

      branchName:
        currentBranch.name || currentBranch.id,

      serviceGroup:
        currentBranch.serviceGroup,

      barberId:
        selectedBarber.id,

      barberName:
        selectedBarber.name || selectedBarber.id,

      services:
        selected,

      serviceTotal,

      total:
        serviceTotal,

      tipAmount,

      grandTotal,

      paymentMethod,

      slipStoragePath,

      dateKey:
        getLocalDateKey(),

      createdAt,

      createdAtServer:
        serverTimestamp(),

      source:
        "pos"
    };

    await setDoc(
      doc(
        db,
        "transactions",
        transactionId
      ),
      transaction
    );

    console.log(
      "บันทึกประวัติรายการแล้ว:",
      transaction
    );

    showSuccessPage(
      transaction
    );

  } catch (error) {
    console.error(
      "Complete transaction error:",
      error
    );

    if (
      paymentMethod === "scan" &&
      slipStatus &&
      !slipUploaded
    ) {
      slipStatus.textContent =
        "บันทึกรูปสลิปไม่สำเร็จ";
    }

    showNotice(
      error?.message ||
        "บันทึกรายการไม่สำเร็จ กรุณาลองอีกครั้ง",
      "บันทึกไม่สำเร็จ"
    );

  } finally {
    isCompletingTransaction = false;

    if (paymentMethod === "scan") {
      setQrPaidLoading(false);
    }
  }
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
    `${formatMoney(transaction.serviceTotal ?? transaction.total)} บาท`;

  const tipAmount =
    Number(transaction.tipAmount || 0);

  successTipAmount.textContent =
    `${formatMoney(tipAmount)} บาท`;

  successTipRow.classList.toggle(
    "hidden",
    tipAmount <= 0
  );

  successGrandTotal.textContent =
    `${formatMoney(
      transaction.grandTotal ??
      (
        Number(transaction.total || 0) +
        tipAmount
      )
    )} บาท`;

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
// TRANSACTION HISTORY
// ========================================

function getVisiblePosPage() {
  const pages = [
    barberPage,
    servicePage,
    qrPage,
    successPage
  ];

  return pages.find(
    (page) =>
      page &&
      !page.classList.contains("hidden")
  ) || barberPage;
}

function getHistoryDateKey() {
  return (
    historyDateInput?.value ||
    getLocalDateKey()
  );
}

function setHistoryLoading(isLoading) {
  isLoadingHistory = isLoading;

  if (historyRefreshButton) {
    historyRefreshButton.disabled =
      isLoading;

    historyRefreshButton.textContent =
      isLoading
        ? "กำลังโหลด..."
        : "รีเฟรช";
  }
}

function populateHistoryBarberFilter() {
  if (!historyBarberFilter) {
    return;
  }

  const previousValue =
    historyBarberFilter.value || "all";

  const barberMap = new Map();

  historyTransactions.forEach(
    (transaction) => {
      const id =
        String(
          transaction.barberId || ""
        );

      if (!id) {
        return;
      }

      barberMap.set(
        id,
        transaction.barberName || id
      );
    }
  );

  const options = [
    `<option value="all">ช่างทุกคน</option>`
  ];

  Array.from(barberMap.entries())
    .sort(
      (a, b) =>
        String(a[1]).localeCompare(
          String(b[1]),
          "th"
        )
    )
    .forEach(([id, name]) => {
      options.push(`
        <option value="${escapeHtml(id)}">
          ${escapeHtml(name)}
        </option>
      `);
    });

  historyBarberFilter.innerHTML =
    options.join("");

  const stillExists =
    previousValue === "all" ||
    barberMap.has(previousValue);

  historyBarberFilter.value =
    stillExists
      ? previousValue
      : "all";
}

function getFilteredHistoryTransactions() {
  const barberId =
    historyBarberFilter?.value || "all";

  if (barberId === "all") {
    return historyTransactions;
  }

  return historyTransactions.filter(
    (transaction) =>
      String(transaction.barberId || "") ===
      barberId
  );
}

function renderHistorySummary(
  transactions
) {
  const serviceTotal =
    transactions.reduce(
      (sum, transaction) =>
        sum + Number(
          transaction.serviceTotal ??
          transaction.total ??
          0
        ),
      0
    );

  const tipTotal =
    transactions.reduce(
      (sum, transaction) =>
        sum + Number(
          transaction.tipAmount || 0
        ),
      0
    );

  const grandTotal =
    transactions.reduce(
      (sum, transaction) =>
        sum + Number(
          transaction.grandTotal ??
          (
            Number(
              transaction.serviceTotal ??
              transaction.total ??
              0
            ) +
            Number(
              transaction.tipAmount || 0
            )
          )
        ),
      0
    );

  historyCount.textContent =
    String(transactions.length);

  historyServiceTotal.textContent =
    `${formatMoney(serviceTotal)} บาท`;

  historyTipTotal.textContent =
    `${formatMoney(tipTotal)} บาท`;

  historyGrandTotal.textContent =
    `${formatMoney(grandTotal)} บาท`;
}

function getHistoryServiceText(transaction) {
  const items =
    Array.isArray(transaction.services)
      ? transaction.services
      : [];

  if (items.length === 0) {
    return "ไม่มีรายละเอียดบริการ";
  }

  return items
    .map((service) => {
      const detail =
        service.detail
          ? ` (${service.detail})`
          : "";

      return `${service.name || "รายการ"}${detail}`;
    })
    .join(" · ");
}

function renderTransactionHistory() {
  const transactions =
    getFilteredHistoryTransactions();

  renderHistorySummary(
    transactions
  );

  historyList.innerHTML = "";

  if (transactions.length === 0) {
    historyList.innerHTML = `
      <div class="history-empty">
        <span class="material-symbols-outlined">
          receipt_long
        </span>
        <strong>ยังไม่มีประวัติในวันที่เลือก</strong>
        <p>รายการที่ชำระสำเร็จจะมาแสดงตรงนี้</p>
      </div>
    `;

    return;
  }

  transactions.forEach(
    (transaction) => {
      const card =
        document.createElement("article");

      card.className =
        "history-item";

      const serviceTotal =
        Number(
          transaction.serviceTotal ??
          transaction.total ??
          0
        );

      const tipAmount =
        Number(
          transaction.tipAmount || 0
        );

      const grandTotal =
        Number(
          transaction.grandTotal ??
          serviceTotal + tipAmount
        );

      const paymentText =
        transaction.paymentMethod === "cash"
          ? "เงินสด"
          : "สแกนจ่าย";

      const slipButtonHtml =
        transaction.slipStoragePath
          ? `
            <button
              class="history-slip-button"
              type="button"
              data-slip-path="${escapeHtml(transaction.slipStoragePath)}"
            >
              <span class="material-symbols-outlined">image</span>
              ดูสลิป
            </button>
          `
          : "";

      const tipHtml =
        tipAmount > 0
          ? `
            <div>
              <span>ทิปช่าง</span>
              <strong>${formatMoney(tipAmount)} บาท</strong>
            </div>
          `
          : "";

      card.innerHTML = `
        <div class="history-item-head">
          <div>
            <div class="history-time">
              ${escapeHtml(formatThaiDateTime(transaction.createdAt, true))}
            </div>
            <h3>${escapeHtml(transaction.barberName || "-")}</h3>
          </div>

          <span class="history-payment-badge">
            ${paymentText}
          </span>
        </div>

        <div class="history-services-text">
          ${escapeHtml(getHistoryServiceText(transaction))}
        </div>

        <div class="history-money-grid">
          <div>
            <span>ค่าบริการ</span>
            <strong>${formatMoney(serviceTotal)} บาท</strong>
          </div>

          ${tipHtml}

          <div class="grand">
            <span>รับทั้งหมด</span>
            <strong>${formatMoney(grandTotal)} บาท</strong>
          </div>
        </div>

        <div class="history-item-foot">
          <small>
            #${escapeHtml(transaction.id || "-")}
          </small>
          ${slipButtonHtml}
        </div>
      `;

      historyList.appendChild(card);
    }
  );

  historyList
    .querySelectorAll(
      "[data-slip-path]"
    )
    .forEach((button) => {
      button.addEventListener(
        "click",
        async () => {
          await openHistorySlip(
            button.dataset.slipPath,
            button
          );
        }
      );
    });
}

async function loadTransactionHistory() {
  if (
    !currentBranch ||
    isLoadingHistory
  ) {
    return;
  }

  setHistoryLoading(true);

  historyList.innerHTML = `
    <div class="history-loading">
      กำลังโหลดประวัติ...
    </div>
  `;

  try {
    const dateKey =
      getHistoryDateKey();

    const historyQuery = query(
      collection(db, "transactions"),
      where(
        "branchId",
        "==",
        currentBranch.id
      ),
      where(
        "dateKey",
        "==",
        dateKey
      )
    );

    const snapshot =
      await getDocs(
        historyQuery
      );

    historyTransactions =
      snapshot.docs
        .map((snapshot) => ({
          id: snapshot.id,
          ...snapshot.data()
        }))
        .sort(
          (a, b) =>
            new Date(b.createdAt || 0) -
            new Date(a.createdAt || 0)
        );

    populateHistoryBarberFilter();
    renderTransactionHistory();

  } catch (error) {
    console.error(
      "Load transaction history error:",
      error
    );

    historyTransactions = [];
    renderHistorySummary([]);

    historyList.innerHTML = `
      <div class="history-empty">
        <strong>โหลดประวัติไม่สำเร็จ</strong>
        <p>กรุณาลองรีเฟรชอีกครั้ง</p>
      </div>
    `;

    showNotice(
      error?.message ||
        "โหลดประวัติไม่สำเร็จ",
      "ประวัติรายการ"
    );

  } finally {
    setHistoryLoading(false);
  }
}

async function openTransactionHistory() {
  const visiblePage =
    getVisiblePosPage();

  if (visiblePage !== historyPage) {
    historyReturnPage = visiblePage;
  }

  if (historyDateInput) {
    historyDateInput.value =
      historyDateInput.value ||
      getLocalDateKey();
  }

  hideAllPages();
  historyPage.classList.remove("hidden");

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

  await loadTransactionHistory();
}

function closeTransactionHistory() {
  historyPage.classList.add("hidden");

  const target =
    historyReturnPage &&
    historyReturnPage !== historyPage
      ? historyReturnPage
      : barberPage;

  target.classList.remove("hidden");

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

function closeHistorySlip() {
  historySlipModal.classList.add(
    "hidden"
  );

  document.body.classList.remove(
    "modal-open"
  );

  historySlipImage.removeAttribute(
    "src"
  );

}

async function openHistorySlip(
  fullPath,
  button
) {
  if (!fullPath) {
    return;
  }

  const oldHtml =
    button.innerHTML;

  button.disabled = true;
  button.textContent =
    "กำลังโหลด...";

  try {
    historySlipImage.removeAttribute(
      "src"
    );

    historySlipStatus.textContent =
      "กำลังโหลดรูปสลิป...";

    historySlipModal.classList.remove(
      "hidden"
    );

    document.body.classList.add(
      "modal-open"
    );

    const slipUrl =
      await loadPaymentSlipUrl(
        fullPath
      );

    historySlipImage.src =
      slipUrl;

    historySlipStatus.textContent =
      "";

  } catch (error) {
    console.error(
      "Load slip error:",
      error
    );

    closeHistorySlip();

    showNotice(
      error?.message ||
        "เปิดรูปสลิปไม่สำเร็จ",
      "รูปสลิป"
    );

  } finally {
    button.disabled = false;
    button.innerHTML = oldHtml;
  }
}

if (historyBackButton) {
  historyBackButton.addEventListener(
    "click",
    closeTransactionHistory
  );
}

if (historyDateInput) {
  historyDateInput.addEventListener(
    "change",
    loadTransactionHistory
  );
}

if (historyRefreshButton) {
  historyRefreshButton.addEventListener(
    "click",
    loadTransactionHistory
  );
}

if (historyBarberFilter) {
  historyBarberFilter.addEventListener(
    "change",
    renderTransactionHistory
  );
}

if (historySlipCloseButton) {
  historySlipCloseButton.addEventListener(
    "click",
    closeHistorySlip
  );
}

if (historySlipBackdrop) {
  historySlipBackdrop.addEventListener(
    "click",
    closeHistorySlip
  );
}


// ========================================
// RESET
// ========================================

function resetTransaction() {
  selectedBarber = null;
  selectedServices.clear();

  closePaymentModal();
  closeServiceOptionModal();
  resetPaymentExtras();

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