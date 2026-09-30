import {
  login,
  logout,
  watchAuth,
  getUserProfile
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
  addDoc,
  setDoc,
  deleteDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";


const db = getFirestore(getApp());


// ========================================
// DOM
// ========================================

const loadingPage = document.getElementById("loadingPage");
const loginPage = document.getElementById("loginPage");
const adminApp = document.getElementById("adminApp");

const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("emailInput");
const passwordInput = document.getElementById("passwordInput");
const loginButton = document.getElementById("loginButton");
const loginError = document.getElementById("loginError");

const adminEmail = document.getElementById("adminEmail");
const logoutButton = document.getElementById("logoutButton");

const adminNavButtons = document.querySelectorAll(".admin-nav-button");
const pageTitle = document.getElementById("pageTitle");

const groupButtons = document.querySelectorAll(".group-button");
const groupBranches = document.getElementById("groupBranches");

const serviceTitle = document.getElementById("serviceTitle");
const serviceList = document.getElementById("serviceList");
const addServiceButton = document.getElementById("addServiceButton");

const editor = document.getElementById("editor");
const editorTitle = document.getElementById("editorTitle");

const serviceNameInput = document.getElementById("serviceNameInput");
const serviceTypeInput = document.getElementById("serviceTypeInput");
const servicePriceInput = document.getElementById("servicePriceInput");
const serviceChoicesInput = document.getElementById("serviceChoicesInput");
const discountPercentInput = document.getElementById("discountPercentInput");
const sortOrderInput = document.getElementById("sortOrderInput");
const activeInput = document.getElementById("activeInput");

const priceField = document.getElementById("priceField");
const choiceField = document.getElementById("choiceField");
const discountField = document.getElementById("discountField");

const saveButton = document.getElementById("saveButton");
const cancelButton = document.getElementById("cancelButton");
const saveStatus = document.getElementById("saveStatus");

const servicesAdminPage =
  document.getElementById("servicesAdminPage");

const payoutAdminPage =
  document.getElementById("payoutAdminPage");

const payoutHistoryAdminPage =
  document.getElementById("payoutHistoryAdminPage");

const payoutHistoryCycleFilter =
  document.getElementById("payoutHistoryCycleFilter");

const payoutHistoryBarberFilter =
  document.getElementById("payoutHistoryBarberFilter");

const refreshPayoutHistoryButton =
  document.getElementById("refreshPayoutHistoryButton");

const payoutHistoryEmptyState =
  document.getElementById("payoutHistoryEmptyState");

const payoutHistoryContent =
  document.getElementById("payoutHistoryContent");

const payoutHistoryCount =
  document.getElementById("payoutHistoryCount");

const payoutHistoryBarberCount =
  document.getElementById("payoutHistoryBarberCount");

const payoutHistoryTipTotal =
  document.getElementById("payoutHistoryTipTotal");

const payoutHistoryGrandTotal =
  document.getElementById("payoutHistoryGrandTotal");

const payoutHistoryList =
  document.getElementById("payoutHistoryList");

const payoutHistoryDetailModal =
  document.getElementById("payoutHistoryDetailModal");

const payoutHistoryDetailBackdrop =
  document.getElementById("payoutHistoryDetailBackdrop");

const payoutHistoryDetailCloseButton =
  document.getElementById("payoutHistoryDetailCloseButton");

const payoutHistoryDetailTitle =
  document.getElementById("payoutHistoryDetailTitle");

const payoutHistoryDetailSubtitle =
  document.getElementById("payoutHistoryDetailSubtitle");

const payoutHistoryDetailSummary =
  document.getElementById("payoutHistoryDetailSummary");

const payoutHistoryDetailPaidAt =
  document.getElementById("payoutHistoryDetailPaidAt");

const payoutHistoryDetailPaidBy =
  document.getElementById("payoutHistoryDetailPaidBy");

const payoutHistoryDetailDailyList =
  document.getElementById("payoutHistoryDetailDailyList");

const payoutCycleSelect =
  document.getElementById("payoutCycleSelect");

const payoutEmptyState =
  document.getElementById("payoutEmptyState");

const payoutSummaryGrid =
  payoutAdminPage.querySelector(".payout-summary-grid");

const payoutRuleNote =
  payoutAdminPage.querySelector(".payout-rule-note");

const payoutTableCard =
  payoutAdminPage.querySelector(".payout-table-card");

const payoutDataNote =
  payoutAdminPage.querySelector(".payout-data-note");

const previousPayoutCycleButton =
  document.getElementById("previousPayoutCycleButton");

const nextPayoutCycleButton =
  document.getElementById("nextPayoutCycleButton");

const payoutPeriodText =
  document.getElementById("payoutPeriodText");

const payoutBarberCount =
  document.getElementById("payoutBarberCount");

const payoutLaborTotal =
  document.getElementById("payoutLaborTotal");

const payoutTipTotal =
  document.getElementById("payoutTipTotal");

const payoutGrandTotal =
  document.getElementById("payoutGrandTotal");

const refreshPayoutButton =
  document.getElementById("refreshPayoutButton");

const payoutStatus =
  document.getElementById("payoutStatus");

const payoutList =
  document.getElementById("payoutList");

const payoutDetailPanel =
  document.getElementById("payoutDetailPanel");

const payoutDetailTitle =
  document.getElementById("payoutDetailTitle");

const payoutDetailSubtitle =
  document.getElementById("payoutDetailSubtitle");

const payoutDetailSummary =
  document.getElementById("payoutDetailSummary");

const payoutDailyList =
  document.getElementById("payoutDailyList");

const closePayoutDetailButton =
  document.getElementById("closePayoutDetailButton");

const dailyHistoryAdminPage =
  document.getElementById("dailyHistoryAdminPage");

const dailyHistoryDateInput =
  document.getElementById("dailyHistoryDateInput");

const dailyHistoryBranchFilter =
  document.getElementById("dailyHistoryBranchFilter");

const dailyHistoryBarberFilter =
  document.getElementById("dailyHistoryBarberFilter");

const dailyHistoryPaymentFilter =
  document.getElementById("dailyHistoryPaymentFilter");

const dailyHistoryRefreshButton =
  document.getElementById("dailyHistoryRefreshButton");


const dailyHistoryEmptyState =
  document.getElementById("dailyHistoryEmptyState");

const dailyHistoryContent =
  document.getElementById("dailyHistoryContent");

const dailyHistoryCount =
  document.getElementById("dailyHistoryCount");

const dailyHistoryServiceTotal =
  document.getElementById("dailyHistoryServiceTotal");

const dailyHistoryTipTotal =
  document.getElementById("dailyHistoryTipTotal");

const dailyHistoryGrandTotal =
  document.getElementById("dailyHistoryGrandTotal");

const dailyHistoryList =
  document.getElementById("dailyHistoryList");

const dailyHistoryDetailModal =
  document.getElementById("dailyHistoryDetailModal");

const dailyHistoryDetailBackdrop =
  document.getElementById("dailyHistoryDetailBackdrop");

const dailyHistoryDetailCloseButton =
  document.getElementById("dailyHistoryDetailCloseButton");

const dailyHistoryDetailBranch =
  document.getElementById("dailyHistoryDetailBranch");

const dailyHistoryDetailBarber =
  document.getElementById("dailyHistoryDetailBarber");

const dailyHistoryDetailServices =
  document.getElementById("dailyHistoryDetailServices");

const dailyHistoryDetailServiceTotal =
  document.getElementById("dailyHistoryDetailServiceTotal");

const dailyHistoryDetailTipRow =
  document.getElementById("dailyHistoryDetailTipRow");

const dailyHistoryDetailTip =
  document.getElementById("dailyHistoryDetailTip");

const dailyHistoryDetailGrandTotal =
  document.getElementById("dailyHistoryDetailGrandTotal");

const dailyHistoryDetailPayment =
  document.getElementById("dailyHistoryDetailPayment");

const dailyHistoryDetailDateTime =
  document.getElementById("dailyHistoryDetailDateTime");

const dailyHistoryDetailId =
  document.getElementById("dailyHistoryDetailId");



// ========================================
// STATE
// ========================================

let branches = [];
let services = [];
let selectedGroup = "";
let editingServiceId = null;

let currentAdminUser = null;

let payoutCycles = [];
let selectedPayoutCycleIndex = 0;
let payoutRows = [];
let payoutPaidMap = new Map();
let payoutLoading = false;
let payoutCyclesLoaded = false;

let payoutHistoryRecords = [];
let payoutHistoryLoading = false;

let dailyHistoryTransactions = [];
let dailyHistoryLoading = false;



// ========================================
// UI
// ========================================

function showLoading() {
  loadingPage.classList.remove("hidden");
  loginPage.classList.add("hidden");
  adminApp.classList.add("hidden");
}

function showLogin() {
  loadingPage.classList.add("hidden");
  adminApp.classList.add("hidden");
  loginPage.classList.remove("hidden");
}

function showAdmin() {
  loadingPage.classList.add("hidden");
  loginPage.classList.add("hidden");
  adminApp.classList.remove("hidden");
}


// ========================================
// ADMIN MENU
// ========================================

adminNavButtons.forEach((button) => {
  button.addEventListener("click", async () => {
    const page = button.dataset.adminPage;

    adminNavButtons.forEach((item) => {
      item.classList.toggle(
        "active",
        item.dataset.adminPage === page
      );
    });

    servicesAdminPage.classList.toggle(
      "hidden",
      page !== "services"
    );

    payoutAdminPage.classList.toggle(
      "hidden",
      page !== "payouts"
    );

    payoutHistoryAdminPage.classList.toggle(
      "hidden",
      page !== "payout-history"
    );

    dailyHistoryAdminPage.classList.toggle(
      "hidden",
      page !== "daily-history"
    );

    payoutDetailPanel.classList.add("hidden");

    if (page === "services") {
      pageTitle.textContent = "เมนูบริการ / ราคา";
      return;
    }

    if (page === "payouts") {
      pageTitle.textContent = "จ่ายเงินช่าง";

      try {
        const hasCycles =
          await ensurePayoutCycles();

        if (hasCycles) {
          await loadPayoutData();
        }
      } catch (error) {
        console.error(error);
      }
    }

    if (page === "payout-history") {
      pageTitle.textContent = "ประวัติจ่ายเงินช่าง";

      try {
        await loadPayoutHistory();
      } catch (error) {
        console.error(error);
      }
    }

    if (page === "daily-history") {
      pageTitle.textContent = "ประวัติรายการรายวัน";

      if (!dailyHistoryDateInput.value) {
        dailyHistoryDateInput.value =
          toDateKey(new Date());
      }

      try {
        await loadDailyHistory();
      } catch (error) {
        console.error(error);
      }
    }
  });
});


// ========================================
// AUTH
// ========================================

watchAuth(async (user) => {
  if (!user) {
    showLogin();
    return;
  }

  try {
    const profile = await getUserProfile(user.uid);

    if (
      profile.active !== true ||
      profile.role !== "admin"
    ) {
      await logout();
      throw new Error("บัญชีนี้ไม่ใช่ Admin");
    }

    currentAdminUser = user;

    adminEmail.textContent = user.email || "Admin";

    showAdmin();
    await loadBranches();

    if (!selectedGroup) {
      selectGroup("A");
    }

  } catch (error) {
    console.error(error);

    showLogin();

    loginError.textContent = error.message;
    loginError.classList.remove("hidden");
  }
});


// ========================================
// LOGIN
// ========================================

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  loginError.classList.add("hidden");

  loginButton.disabled = true;
  loginButton.textContent = "กำลังเข้าสู่ระบบ...";

  try {
    await login(
      emailInput.value.trim(),
      passwordInput.value
    );

    passwordInput.value = "";

  } catch (error) {
    console.error(error);

    loginError.textContent = "เข้าสู่ระบบไม่สำเร็จ";
    loginError.classList.remove("hidden");

  } finally {
    loginButton.disabled = false;
    loginButton.textContent = "เข้าสู่ระบบ Admin";
  }
});


// ========================================
// LOGOUT
// ========================================

logoutButton.addEventListener("click", async () => {
  await logout();
});


// ========================================
// BRANCHES
// ========================================

async function loadBranches() {
  const snapshot = await getDocs(
    collection(db, "branches")
  );

  branches = snapshot.docs.map((snapshot) => ({
    id: snapshot.id,
    ...snapshot.data()
  }));

  branches.sort(
    (a, b) =>
      String(a.id).localeCompare(String(b.id))
  );
}


// ========================================
// GROUP
// ========================================

groupButtons.forEach((button) => {
  button.addEventListener("click", () => {
    selectGroup(button.dataset.group);
  });
});

function selectGroup(groupId) {
  selectedGroup = groupId;

  groupButtons.forEach((button) => {
    button.classList.toggle(
      "active",
      button.dataset.group === groupId
    );
  });

  serviceTitle.textContent =
    `เมนูบริการ — กลุ่ม ${groupId}`;

  addServiceButton.disabled = false;

  renderGroupBranches();
  closeEditor();
  loadServices();
}

function renderGroupBranches() {
  const names = branches
    .filter(
      (branch) =>
        branch.serviceGroup === selectedGroup
    )
    .map(
      (branch) =>
        branch.name || branch.id
    );

  const branchCount =
    names.length;

  groupBranches.innerHTML = `
    <div class="group-branch-label">
      สาขาในกลุ่ม ${escapeHtml(selectedGroup)}
      <span>${branchCount} สาขา</span>
    </div>

    <div class="group-branch-names">
      ${
        branchCount > 0
          ? names.map(escapeHtml).join(" · ")
          : "ยังไม่มีสาขาในกลุ่มนี้"
      }
    </div>
  `;
}


// ========================================
// SERVICES
// ========================================

async function loadServices() {
  if (!selectedGroup) {
    return;
  }

  serviceList.innerHTML = `
    <div class="empty">
      กำลังโหลดเมนู...
    </div>
  `;

  try {
    const serviceQuery = query(
      collection(db, "services"),
      where(
        "groupId",
        "==",
        selectedGroup
      )
    );

    const snapshot = await getDocs(
      serviceQuery
    );

    services = snapshot.docs.map(
      (snapshot) => ({
        id: snapshot.id,
        ...snapshot.data()
      })
    );

    services.sort(
      (a, b) =>
        Number(a.sortOrder || 999) -
        Number(b.sortOrder || 999)
    );

    renderServices();

  } catch (error) {
    console.error(error);

    serviceList.innerHTML = `
      <div class="empty">
        โหลดเมนูไม่สำเร็จ
      </div>
    `;
  }
}

function getServicePriceText(service) {
  if (service.type === "choice") {
    const choices =
      Array.isArray(service.choices)
        ? service.choices
        : [];

    return choices
      .map(
        (price) =>
          `${Number(price).toLocaleString("th-TH")} บาท`
      )
      .join(" / ");
  }

  if (service.type === "custom") {
    return "กรอกรายละเอียดและราคาเอง";
  }

  if (service.type === "free_cut") {
    return "ตัดผมฟรี 1 ครั้ง";
  }

  if (service.type === "half_cut") {
    return `ลดค่าตัดผม ${Number(service.discountPercent || 0)}%`;
  }

  return `${Number(service.price || 0).toLocaleString("th-TH")} บาท`;
}

function renderServices() {
  serviceList.innerHTML = "";

  if (services.length === 0) {
    serviceList.innerHTML = `
      <div class="empty">
        ยังไม่มีเมนูในกลุ่มนี้
      </div>
    `;
    return;
  }

  const header = document.createElement("div");

  header.className = "service-table-head";

  header.innerHTML = `
    <div>#</div>
    <div>ชื่อเมนู</div>
    <div>ประเภท</div>
    <div>ราคา</div>
    <div>สถานะ</div>
    <div>จัดการ</div>
  `;

  serviceList.appendChild(header);

  services.forEach((service, index) => {
    const row =
      document.createElement("div");

    row.className =
      "service-table-row";

    row.innerHTML = `
      <div class="service-index">
        ${index + 1}
      </div>

      <div class="service-main">
        <div class="service-name">
          ${escapeHtml(service.name || "-")}
        </div>

        <div class="service-code">
          ${escapeHtml(service.serviceCode || service.type || "")}
        </div>
      </div>

      <div class="service-type">
        ${escapeHtml(getServiceTypeLabel(service.type))}
      </div>

      <div class="service-price">
        ${escapeHtml(getServicePriceText(service))}
      </div>

      <div>
        <span class="service-status ${service.active === true ? "is-active" : "is-off"}">
          ${service.active === true ? "เปิดใช้งาน" : "ปิดใช้งาน"}
        </span>
      </div>

      <div class="service-actions">
        <button
          class="edit-button"
          type="button"
          aria-label="แก้ไข"
          title="แก้ไข"
        >
          <i class="fa-solid fa-pen" aria-hidden="true"></i>
        </button>

        <button
          class="delete-button"
          type="button"
          aria-label="ลบ"
          title="ลบ"
        >
          <i class="fa-solid fa-xmark" aria-hidden="true"></i>
        </button>
      </div>
    `;

    row
      .querySelector(".edit-button")
      .addEventListener("click", () => {
        openEditService(service);
      });

    row
      .querySelector(".delete-button")
      .addEventListener("click", () => {
        deleteService(service);
      });

    serviceList.appendChild(row);
  });
}

function getServiceTypeLabel(type) {
  const labels = {
    fixed: "ราคาปกติ",
    choice: "ช่วงราคา",
    custom: "กรอกราคา",
    free_cut: "สิทธิ์พิเศษ",
    half_cut: "ส่วนลด"
  };

  return labels[type] || type || "-";
}


// ========================================
// ADD
// ========================================

addServiceButton.addEventListener("click", () => {
  if (!selectedGroup) {
    return;
  }

  editingServiceId = null;

  editorTitle.textContent =
    `เพิ่มเมนู — กลุ่ม ${selectedGroup}`;

  serviceNameInput.value = "";
  serviceTypeInput.value = "fixed";
  servicePriceInput.value = "";
  serviceChoicesInput.value = "";
  discountPercentInput.value = "50";
  sortOrderInput.value = services.length + 1;
  activeInput.checked = true;

  updateEditorFields();

  saveStatus.classList.add("hidden");
  editor.classList.remove("hidden");

  editor.scrollIntoView({
    behavior: "smooth"
  });
});


// ========================================
// EDIT
// ========================================

function openEditService(service) {
  editingServiceId = service.id;

  editorTitle.textContent =
    `แก้ไขเมนู — กลุ่ม ${selectedGroup}`;

  serviceNameInput.value =
    service.name || "";

  serviceTypeInput.value =
    service.type || "fixed";

  servicePriceInput.value =
    Number(service.price || 0);

  serviceChoicesInput.value =
    Array.isArray(service.choices)
      ? service.choices.join(", ")
      : "";

  discountPercentInput.value =
    Number(service.discountPercent || 50);

  sortOrderInput.value =
    Number(service.sortOrder || 1);

  activeInput.checked =
    service.active === true;

  updateEditorFields();

  saveStatus.classList.add("hidden");
  editor.classList.remove("hidden");

  editor.scrollIntoView({
    behavior: "smooth"
  });
}


// ========================================
// TYPE
// ========================================

serviceTypeInput.addEventListener(
  "change",
  updateEditorFields
);

function updateEditorFields() {
  refreshCustomSelect(
    serviceTypeInput
  );

  const type = serviceTypeInput.value;

  priceField.classList.add("hidden");
  choiceField.classList.add("hidden");
  discountField.classList.add("hidden");

  if (type === "fixed") {
    priceField.classList.remove("hidden");
  }

  if (type === "choice") {
    choiceField.classList.remove("hidden");
  }

  if (type === "half_cut") {
    discountField.classList.remove("hidden");
  }
}


// ========================================
// SAVE
// ========================================

saveButton.addEventListener("click", async () => {
  if (!selectedGroup) {
    return;
  }

  const name =
    serviceNameInput.value.trim();

  if (!name) {
    showSaveStatus(
      "กรุณาใส่ชื่อเมนู"
    );
    return;
  }

  const type =
    serviceTypeInput.value;

  const existingService =
    services.find(
      (service) =>
        service.id === editingServiceId
    );

  const data = {
    groupId: selectedGroup,
    name,
    type,
    active: activeInput.checked,
    sortOrder:
      Number(sortOrderInput.value || 1),
    updatedAt:
      serverTimestamp()
  };

  if (existingService?.serviceCode) {
    data.serviceCode =
      existingService.serviceCode;
  }

  if (type === "fixed") {
    data.price =
      Number(servicePriceInput.value || 0);
  }

  if (type === "choice") {
    const choices =
      serviceChoicesInput.value
        .split(",")
        .map(
          (value) =>
            Number(value.trim())
        )
        .filter(
          (value) =>
            Number.isFinite(value)
        );

    if (choices.length === 0) {
      showSaveStatus(
        "กรุณาใส่ตัวเลือกราคา เช่น 150, 200"
      );
      return;
    }

    data.price = 0;
    data.choices = choices;
  }

  if (type === "custom") {
    data.price = 0;
  }

  if (type === "free_cut") {
    data.price = 0;
    data.targetServiceCode = "haircut";
  }

  if (type === "half_cut") {
    data.price = 0;
    data.discountPercent =
      Number(discountPercentInput.value || 0);
    data.targetServiceCode = "haircut";
  }

  saveButton.disabled = true;

  showSaveStatus(
    "กำลังบันทึก..."
  );

  try {
    if (editingServiceId) {
      await setDoc(
        doc(
          db,
          "services",
          editingServiceId
        ),
        data
      );

    } else {
      data.createdAt =
        serverTimestamp();

      await addDoc(
        collection(
          db,
          "services"
        ),
        data
      );
    }

    await loadServices();

    showSaveStatus(
      "บันทึกเรียบร้อย ✅"
    );

    setTimeout(
      closeEditor,
      500
    );

  } catch (error) {
    console.error(error);

    showSaveStatus(
      `บันทึกไม่สำเร็จ: ${error.message}`
    );

  } finally {
    saveButton.disabled = false;
  }
});


// ========================================
// DELETE
// ========================================

async function deleteService(service) {
  const confirmed =
    window.confirm(
      `ต้องการลบ "${service.name}" จากกลุ่ม ${selectedGroup} ใช่ไหม?`
    );

  if (!confirmed) {
    return;
  }

  try {
    await deleteDoc(
      doc(
        db,
        "services",
        service.id
      )
    );

    await loadServices();

  } catch (error) {
    console.error(error);

    window.alert(
      `ลบไม่สำเร็จ: ${error.message}`
    );
  }
}


// ========================================
// EDITOR
// ========================================

cancelButton.addEventListener(
  "click",
  closeEditor
);

function closeEditor() {
  editingServiceId = null;

  editor.classList.add("hidden");
  saveStatus.classList.add("hidden");
}

function showSaveStatus(text) {
  saveStatus.textContent = text;
  saveStatus.classList.remove("hidden");
}





// ========================================
// CUSTOM DROPDOWN
// ========================================

const customSelectRegistry =
  new Map();

function closeAllCustomSelects(
  except = null
) {
  customSelectRegistry.forEach(
    (state) => {
      if (
        state.wrapper !== except
      ) {
        state.wrapper.classList.remove(
          "open"
        );

        state.trigger.setAttribute(
          "aria-expanded",
          "false"
        );
      }
    }
  );
}

function setupCustomSelect(
  select
) {
  if (!select) {
    return;
  }

  if (
    customSelectRegistry.has(
      select
    )
  ) {
    refreshCustomSelect(
      select
    );
    return;
  }

  select.classList.add(
    "native-app-select"
  );

  const wrapper =
    document.createElement("div");

  wrapper.className =
    "app-select";

  const trigger =
    document.createElement("button");

  trigger.type = "button";
  trigger.className =
    "app-select-trigger";

  trigger.setAttribute(
    "aria-haspopup",
    "listbox"
  );

  trigger.setAttribute(
    "aria-expanded",
    "false"
  );

  trigger.innerHTML = `
    <span class="app-select-value">-</span>
    <i
      class="fa-solid fa-chevron-down"
      aria-hidden="true"
    ></i>
  `;

  const menu =
    document.createElement("div");

  menu.className =
    "app-select-menu";

  menu.setAttribute(
    "role",
    "listbox"
  );

  wrapper.appendChild(
    trigger
  );

  wrapper.appendChild(
    menu
  );

  select.insertAdjacentElement(
    "afterend",
    wrapper
  );

  const state = {
    wrapper,
    trigger,
    menu,
    value:
      trigger.querySelector(
        ".app-select-value"
      )
  };

  customSelectRegistry.set(
    select,
    state
  );

  trigger.addEventListener(
    "click",
    (event) => {
      event.stopPropagation();

      if (trigger.disabled) {
        return;
      }

      const willOpen =
        !wrapper.classList.contains(
          "open"
        );

      closeAllCustomSelects(
        willOpen
          ? wrapper
          : null
      );

      wrapper.classList.toggle(
        "open",
        willOpen
      );

      trigger.setAttribute(
        "aria-expanded",
        String(willOpen)
      );
    }
  );

  refreshCustomSelect(
    select
  );
}

function refreshCustomSelect(
  select
) {
  const state =
    customSelectRegistry.get(
      select
    );

  if (!state) {
    return;
  }

  const options =
    Array.from(
      select.options
    );

  const selectedOption =
    options.find(
      (option) =>
        option.selected
    ) ||
    options[0] ||
    null;

  state.value.textContent =
    selectedOption
      ?.textContent
      ?.trim() ||
    "ยังไม่มีข้อมูล";

  state.trigger.disabled =
    select.disabled ||
    options.length === 0;

  state.menu.innerHTML = "";

  options.forEach(
    (option) => {
      const button =
        document.createElement(
          "button"
        );

      button.type = "button";

      button.className =
        "app-select-option";

      button.dataset.value =
        option.value;

      button.setAttribute(
        "role",
        "option"
      );

      const isSelected =
        option.value ===
        select.value;

      button.classList.toggle(
        "selected",
        isSelected
      );

      button.setAttribute(
        "aria-selected",
        String(isSelected)
      );

      button.innerHTML = `
        <span>
          ${escapeHtml(
            option
              .textContent
              .trim()
          )}
        </span>

        <i
          class="fa-solid fa-check"
          aria-hidden="true"
        ></i>
      `;

      button.addEventListener(
        "click",
        () => {
          select.value =
            option.value;

          select.dispatchEvent(
            new Event(
              "change",
              {
                bubbles:
                  true
              }
            )
          );

          refreshCustomSelect(
            select
          );

          closeAllCustomSelects();
        }
      );

      state.menu.appendChild(
        button
      );
    }
  );
}

document.addEventListener(
  "click",
  () => {
    closeAllCustomSelects();
  }
);

document
  .querySelectorAll("select")
  .forEach(
    setupCustomSelect
  );


// ========================================
// BARBER PAYOUT
// ========================================

function pad2(value) {
  return String(value).padStart(2, "0");
}

function toDateKey(date) {
  return [
    date.getFullYear(),
    pad2(date.getMonth() + 1),
    pad2(date.getDate())
  ].join("-");
}

function fromDateKey(value) {
  const [year, month, day] =
    String(value || "")
      .split("-")
      .map(Number);

  return new Date(
    year,
    month - 1,
    day
  );
}

function getUpcomingPayoutDate(baseDate = new Date()) {
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const day = baseDate.getDate();

  if (day <= 1) {
    return new Date(year, month, 1);
  }

  if (day <= 16) {
    return new Date(year, month, 16);
  }

  return new Date(year, month + 1, 1);
}

function getPreviousPayoutDate(date) {
  if (date.getDate() === 16) {
    return new Date(
      date.getFullYear(),
      date.getMonth(),
      1
    );
  }

  return new Date(
    date.getFullYear(),
    date.getMonth() - 1,
    16
  );
}

function getNextPayoutDate(date) {
  if (date.getDate() === 1) {
    return new Date(
      date.getFullYear(),
      date.getMonth(),
      16
    );
  }

  return new Date(
    date.getFullYear(),
    date.getMonth() + 1,
    1
  );
}

function getPayoutCycle(payoutDate) {
  let startDate;
  let endDate;

  if (payoutDate.getDate() === 1) {
    startDate = new Date(
      payoutDate.getFullYear(),
      payoutDate.getMonth() - 1,
      16
    );

    endDate = new Date(
      payoutDate.getFullYear(),
      payoutDate.getMonth(),
      0
    );

  } else {
    startDate = new Date(
      payoutDate.getFullYear(),
      payoutDate.getMonth(),
      1
    );

    endDate = new Date(
      payoutDate.getFullYear(),
      payoutDate.getMonth(),
      15
    );
  }

  return {
    payoutDateKey: toDateKey(payoutDate),
    startKey: toDateKey(startDate),
    endKey: toDateKey(endDate),
    payoutDate,
    startDate,
    endDate
  };
}

function formatThaiDateShort(dateOrKey) {
  const date =
    typeof dateOrKey === "string"
      ? fromDateKey(dateOrKey)
      : dateOrKey;

  return new Intl.DateTimeFormat(
    "th-TH-u-ca-buddhist",
    {
      day: "numeric",
      month: "short",
      year: "numeric"
    }
  ).format(date);
}

function formatThaiDateLong(dateOrKey) {
  const date =
    typeof dateOrKey === "string"
      ? fromDateKey(dateOrKey)
      : dateOrKey;

  return new Intl.DateTimeFormat(
    "th-TH-u-ca-buddhist",
    {
      day: "numeric",
      month: "long",
      year: "numeric"
    }
  ).format(date);
}

function formatMoney(value) {
  return Number(value || 0)
    .toLocaleString(
      "th-TH",
      {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
      }
    );
}

function getCurrentPayoutCycle() {
  return payoutCycles[
    selectedPayoutCycleIndex
  ] || null;
}

function getPayoutCycleForWorkDate(
  dateKey
) {
  const workDate =
    fromDateKey(dateKey);

  if (
    !Number.isFinite(
      workDate.getTime()
    )
  ) {
    return null;
  }

  const payoutDate =
    workDate.getDate() <= 15
      ? new Date(
          workDate.getFullYear(),
          workDate.getMonth(),
          16
        )
      : new Date(
          workDate.getFullYear(),
          workDate.getMonth() + 1,
          1
        );

  return getPayoutCycle(
    payoutDate
  );
}

function setPayoutContentVisible(
  visible
) {
  payoutEmptyState
    .classList
    .toggle(
      "hidden",
      visible
    );

  payoutPeriodText
    .classList
    .toggle(
      "hidden",
      !visible
    );

  payoutSummaryGrid
    .classList
    .toggle(
      "hidden",
      !visible
    );

  payoutRuleNote
    .classList
    .toggle(
      "hidden",
      !visible
    );

  payoutTableCard
    .classList
    .toggle(
      "hidden",
      !visible
    );

  payoutDataNote
    .classList
    .toggle(
      "hidden",
      !visible
    );

  if (!visible) {
    payoutDetailPanel
      .classList
      .add("hidden");
  }
}

async function ensurePayoutCycles(
  forceReload = false
) {
  if (
    payoutCyclesLoaded &&
    !forceReload
  ) {
    return (
      payoutCycles.length > 0
    );
  }

  payoutCycleSelect.innerHTML =
    "";

  payoutCycleSelect.disabled =
    true;

  refreshCustomSelect(
    payoutCycleSelect
  );

  previousPayoutCycleButton
    .disabled = true;

  nextPayoutCycleButton
    .disabled = true;

  setPayoutContentVisible(
    false
  );

  try {
    const [
      transactionSnapshot,
      attendanceSnapshot,
      payoutSnapshot
    ] =
      await Promise.all([
        getDocs(
          collection(
            db,
            "transactions"
          )
        ),

        getDocs(
          collection(
            db,
            "barber_attendance"
          )
        ),

        getDocs(
          collection(
            db,
            "barber_payouts"
          )
        )
      ]);

    const cycleMap =
      new Map();

    const addWorkDate =
      (dateKey) => {
        const normalized =
          String(
            dateKey || ""
          ).trim();

        if (!normalized) {
          return;
        }

        const cycle =
          getPayoutCycleForWorkDate(
            normalized
          );

        if (cycle) {
          cycleMap.set(
            cycle.payoutDateKey,
            cycle
          );
        }
      };

    transactionSnapshot
      .docs
      .forEach(
        (snapshot) => {
          addWorkDate(
            snapshot
              .data()
              .dateKey
          );
        }
      );

    attendanceSnapshot
      .docs
      .forEach(
        (snapshot) => {
          addWorkDate(
            snapshot
              .data()
              .dateKey
          );
        }
      );

    payoutSnapshot
      .docs
      .forEach(
        (snapshot) => {
          const payoutCycleId =
            String(
              snapshot
                .data()
                .payoutCycleId ||
              ""
            ).trim();

          if (!payoutCycleId) {
            return;
          }

          const payoutDate =
            fromDateKey(
              payoutCycleId
            );

          if (
            Number.isFinite(
              payoutDate
                .getTime()
            )
          ) {
            cycleMap.set(
              payoutCycleId,
              getPayoutCycle(
                payoutDate
              )
            );
          }
        }
      );

    payoutCycles =
      Array.from(
        cycleMap.values()
      )
        .sort(
          (a, b) =>
            a.payoutDateKey
              .localeCompare(
                b.payoutDateKey
              )
        );

    selectedPayoutCycleIndex =
      Math.max(
        0,
        payoutCycles.length - 1
      );

    payoutCyclesLoaded =
      true;

    renderPayoutCycleSelect();

    const hasCycles =
      payoutCycles.length > 0;

    setPayoutContentVisible(
      hasCycles
    );

    return hasCycles;

  } catch (error) {
    payoutCyclesLoaded =
      false;

    payoutCycles = [];

    selectedPayoutCycleIndex =
      0;

    renderPayoutCycleSelect();

    setPayoutContentVisible(
      false
    );

    payoutEmptyState
      .classList
      .remove("hidden");

    payoutEmptyState
      .querySelector("strong")
      .textContent =
        "โหลดรอบจ่ายไม่สำเร็จ";

    payoutEmptyState
      .querySelector("p")
      .textContent =
        error.message ||
        "กรุณาลองใหม่อีกครั้ง";

    throw error;
  }
}

function renderPayoutCycleSelect() {
  payoutCycleSelect.innerHTML =
    "";

  payoutCycles.forEach(
    (cycle, index) => {
      const option =
        document.createElement(
          "option"
        );

      option.value =
        String(index);

      option.textContent =
        `รอบจ่าย ${formatThaiDateLong(
          cycle.payoutDate
        )}`;

      payoutCycleSelect
        .appendChild(option);
    }
  );

  payoutCycleSelect.disabled =
    payoutCycles.length === 0;

  if (
    payoutCycles.length > 0
  ) {
    payoutCycleSelect.value =
      String(
        selectedPayoutCycleIndex
      );
  }

  refreshCustomSelect(
    payoutCycleSelect
  );

  updatePayoutCycleControls();
}

function updatePayoutCycleControls() {
  const cycle =
    getCurrentPayoutCycle();

  if (!cycle) {
    payoutPeriodText.textContent =
      "";

    previousPayoutCycleButton
      .disabled = true;

    nextPayoutCycleButton
      .disabled = true;

    refreshCustomSelect(
      payoutCycleSelect
    );

    return;
  }

  payoutCycleSelect.value =
    String(
      selectedPayoutCycleIndex
    );

  refreshCustomSelect(
    payoutCycleSelect
  );

  previousPayoutCycleButton.disabled =
    selectedPayoutCycleIndex <= 0;

  nextPayoutCycleButton.disabled =
    selectedPayoutCycleIndex >=
    payoutCycles.length - 1;

  payoutPeriodText.textContent =
    `คิดผลงาน ${formatThaiDateLong(
      cycle.startDate
    )} – ${formatThaiDateLong(
      cycle.endDate
    )} · จ่ายวันที่ ${formatThaiDateLong(
      cycle.payoutDate
    )}`;
}

function getPayoutDocumentId(
  cycle,
  barberId
) {
  return `${cycle.payoutDateKey}_${barberId}`;
}

function getCommissionableServices(services) {
  return (
    Array.isArray(services)
      ? services
      : []
  ).filter(
    (service) =>
      Number(service.price || 0) > 0
  );
}

function calculateTransactionCommission(
  transaction
) {
  return getCommissionableServices(
    transaction.services
  ).reduce(
    (sum, service) => {
      const price =
        Math.max(
          0,
          Number(service.price || 0)
        );

      const commission =
        Math.min(
          price / 2,
          100
        );

      return sum + commission;
    },
    0
  );
}

function getGuaranteeBase(barberId) {
  return barberId === "barber01"
    ? 500
    : 400;
}

function getOrCreateBarberRow(
  rowsByBarber,
  barberId,
  barberName
) {
  if (!rowsByBarber.has(barberId)) {
    rowsByBarber.set(
      barberId,
      {
        barberId,
        barberName:
          barberName || barberId,
        days: new Map(),
        transactionIds: []
      }
    );
  }

  const row =
    rowsByBarber.get(barberId);

  if (
    barberName &&
    (
      !row.barberName ||
      row.barberName === barberId
    )
  ) {
    row.barberName =
      barberName;
  }

  return row;
}

function getOrCreateDailyRow(
  barberRow,
  dateKey
) {
  if (!barberRow.days.has(dateKey)) {
    barberRow.days.set(
      dateKey,
      {
        dateKey,
        worked: false,
        branches: new Set(),
        transactionCount: 0,
        commissionAmount: 0,
        guaranteeAmount: 0,
        tipAmount: 0,
        totalAmount: 0
      }
    );
  }

  return barberRow.days.get(dateKey);
}

function buildPayoutRows(
  transactions,
  attendance
) {
  const rowsByBarber =
    new Map();

  transactions.forEach(
    (transaction) => {
      const barberId =
        String(
          transaction.barberId || ""
        ).trim();

      const dateKey =
        String(
          transaction.dateKey || ""
        ).trim();

      if (
        !barberId ||
        !dateKey
      ) {
        return;
      }

      const barberRow =
        getOrCreateBarberRow(
          rowsByBarber,
          barberId,
          transaction.barberName
        );

      const day =
        getOrCreateDailyRow(
          barberRow,
          dateKey
        );

      day.worked = true;
      day.transactionCount += 1;
      day.commissionAmount +=
        calculateTransactionCommission(
          transaction
        );
      day.tipAmount +=
        Number(
          transaction.tipAmount || 0
        );

      if (transaction.branchName) {
        day.branches.add(
          transaction.branchName
        );
      } else if (transaction.branchId) {
        day.branches.add(
          transaction.branchId
        );
      }

      barberRow.transactionIds.push(
        transaction.id
      );
    }
  );

  attendance.forEach(
    (record) => {
      const barberId =
        String(
          record.barberId || ""
        ).trim();

      const dateKey =
        String(
          record.dateKey || ""
        ).trim();

      if (
        !barberId ||
        !dateKey
      ) {
        return;
      }

      const barberRow =
        getOrCreateBarberRow(
          rowsByBarber,
          barberId,
          record.barberName
        );

      const day =
        getOrCreateDailyRow(
          barberRow,
          dateKey
        );

      day.worked = true;

      if (record.branchName) {
        day.branches.add(
          record.branchName
        );
      } else if (record.branchId) {
        day.branches.add(
          record.branchId
        );
      }
    }
  );

  return Array.from(
    rowsByBarber.values()
  )
    .map((barberRow) => {
      const guaranteeBase =
        getGuaranteeBase(
          barberRow.barberId
        );

      const dailyBreakdown =
        Array.from(
          barberRow.days.values()
        )
          .filter(
            (day) => day.worked
          )
          .map((day) => {
            day.guaranteeAmount =
              Math.max(
                0,
                guaranteeBase -
                day.commissionAmount
              );

            day.totalAmount =
              day.commissionAmount +
              day.guaranteeAmount +
              day.tipAmount;

            return {
              ...day,
              branches:
                Array.from(day.branches)
            };
          })
          .sort(
            (a, b) =>
              a.dateKey.localeCompare(
                b.dateKey
              )
          );

      const totals =
        dailyBreakdown.reduce(
          (result, day) => {
            result.workDays += 1;
            result.transactionCount +=
              day.transactionCount;
            result.commissionAmount +=
              day.commissionAmount;
            result.guaranteeAmount +=
              day.guaranteeAmount;
            result.tipAmount +=
              day.tipAmount;
            result.totalAmount +=
              day.totalAmount;

            return result;
          },
          {
            workDays: 0,
            transactionCount: 0,
            commissionAmount: 0,
            guaranteeAmount: 0,
            tipAmount: 0,
            totalAmount: 0
          }
        );

      return {
        ...barberRow,
        ...totals,
        guaranteeBase,
        dailyBreakdown
      };
    })
    .sort(
      (a, b) =>
        String(a.barberName)
          .localeCompare(
            String(b.barberName),
            "th"
          )
    );
}

async function loadPayoutData() {
  if (payoutLoading) {
    return;
  }

  const cycle =
    getCurrentPayoutCycle();

  if (!cycle) {
    return;
  }

  payoutLoading = true;

  payoutDetailPanel.classList.add(
    "hidden"
  );

  payoutStatus.classList.add(
    "hidden"
  );

  payoutList.innerHTML = `
    <div class="empty">
      กำลังคำนวณยอดจ่าย...
    </div>
  `;

  updatePayoutCycleControls();

  try {
    const transactionQuery =
      query(
        collection(
          db,
          "transactions"
        ),
        where(
          "dateKey",
          ">=",
          cycle.startKey
        ),
        where(
          "dateKey",
          "<=",
          cycle.endKey
        )
      );

    const attendanceQuery =
      query(
        collection(
          db,
          "barber_attendance"
        ),
        where(
          "dateKey",
          ">=",
          cycle.startKey
        ),
        where(
          "dateKey",
          "<=",
          cycle.endKey
        )
      );

    const paidQuery =
      query(
        collection(
          db,
          "barber_payouts"
        ),
        where(
          "payoutCycleId",
          "==",
          cycle.payoutDateKey
        )
      );

    const [
      transactionSnapshot,
      attendanceSnapshot,
      paidSnapshot
    ] =
      await Promise.all([
        getDocs(transactionQuery),
        getDocs(attendanceQuery),
        getDocs(paidQuery)
      ]);

    const transactions =
      transactionSnapshot.docs.map(
        (snapshot) => ({
          id: snapshot.id,
          ...snapshot.data()
        })
      );

    const attendance =
      attendanceSnapshot.docs.map(
        (snapshot) => ({
          id: snapshot.id,
          ...snapshot.data()
        })
      );

    payoutPaidMap =
      new Map(
        paidSnapshot.docs.map(
          (snapshot) => [
            snapshot.data().barberId,
            {
              id: snapshot.id,
              ...snapshot.data()
            }
          ]
        )
      );

    payoutRows =
      buildPayoutRows(
        transactions,
        attendance
      );

    renderPayoutSummary();
    renderPayoutList();

  } catch (error) {
    console.error(
      "Load payout error:",
      error
    );

    payoutRows = [];
    payoutPaidMap = new Map();

    renderPayoutSummary();

    payoutList.innerHTML = `
      <div class="empty payout-error">
        โหลดข้อมูลจ่ายเงินช่างไม่สำเร็จ
        <br>
        <small>${escapeHtml(
          error.message || "Unknown error"
        )}</small>
      </div>
    `;

    payoutStatus.textContent =
      error.message ||
      "โหลดข้อมูลไม่สำเร็จ";

    payoutStatus.classList.remove(
      "hidden"
    );

  } finally {
    payoutLoading = false;
  }
}

function renderPayoutSummary() {
  const totals =
    payoutRows.reduce(
      (result, row) => {
        result.labor +=
          row.commissionAmount +
          row.guaranteeAmount;

        result.tip +=
          row.tipAmount;

        result.grand +=
          row.totalAmount;

        return result;
      },
      {
        labor: 0,
        tip: 0,
        grand: 0
      }
    );

  payoutBarberCount.textContent =
    formatMoney(
      payoutRows.length
    );

  payoutLaborTotal.textContent =
    formatMoney(totals.labor);

  payoutTipTotal.textContent =
    formatMoney(totals.tip);

  payoutGrandTotal.textContent =
    formatMoney(totals.grand);
}

function getPaidStatusHtml(row) {
  const paid =
    payoutPaidMap.get(
      row.barberId
    );

  if (!paid) {
    return `
      <span class="payout-badge unpaid">
        ยังไม่จ่าย
      </span>
    `;
  }

  return `
    <span class="payout-badge paid">
      จ่ายแล้ว
    </span>
  `;
}

function renderPayoutList() {
  payoutList.innerHTML = "";

  if (payoutRows.length === 0) {
    payoutList.innerHTML = `
      <div class="empty">
        ยังไม่มีข้อมูลช่างในรอบนี้
      </div>
    `;
    return;
  }

  const header =
    document.createElement("div");

  header.className =
    "payout-table-head";

  header.innerHTML = `
    <div>ช่าง</div>
    <div>วันทำงาน</div>
    <div>ค่ามือ</div>
    <div>ประกันมือ</div>
    <div>ทิป</div>
    <div>รวมจ่าย</div>
    <div>สถานะ</div>
    <div>จัดการ</div>
  `;

  payoutList.appendChild(
    header
  );

  payoutRows.forEach(
    (row) => {
      const paid =
        payoutPaidMap.has(
          row.barberId
        );

      const item =
        document.createElement("div");

      item.className =
        "payout-table-row";

      item.innerHTML = `
        <div class="payout-barber-cell">
          <strong>
            ${escapeHtml(row.barberName)}
          </strong>
          <small>
            ${escapeHtml(row.barberId)}
            · ${row.transactionCount} รายการ
          </small>
        </div>

        <div>
          <strong>${row.workDays}</strong>
          <small>วัน</small>
        </div>

        <div>
          ${formatMoney(row.commissionAmount)}
        </div>

        <div>
          ${formatMoney(row.guaranteeAmount)}
        </div>

        <div>
          ${formatMoney(row.tipAmount)}
        </div>

        <div class="payout-total-cell">
          ${formatMoney(row.totalAmount)}
        </div>

        <div>
          ${getPaidStatusHtml(row)}
        </div>

        <div class="payout-actions">
          <button
            class="payout-detail-button"
            type="button"
          >
            รายละเอียด
          </button>

          <button
            class="payout-paid-button"
            type="button"
            ${paid ? "disabled" : ""}
          >
            ${paid ? "จ่ายแล้ว" : "ยืนยันจ่าย"}
          </button>
        </div>
      `;

      item
        .querySelector(
          ".payout-detail-button"
        )
        .addEventListener(
          "click",
          () => {
            openPayoutDetail(row);
          }
        );

      item
        .querySelector(
          ".payout-paid-button"
        )
        .addEventListener(
          "click",
          () => {
            markPayoutPaid(
              row,
              item.querySelector(
                ".payout-paid-button"
              )
            );
          }
        );

      payoutList.appendChild(
        item
      );
    }
  );
}

function openPayoutDetail(row) {
  const cycle =
    getCurrentPayoutCycle();

  payoutDetailTitle.textContent =
    row.barberName;

  payoutDetailSubtitle.textContent =
    `รอบ ${formatThaiDateShort(
      cycle.startDate
    )} – ${formatThaiDateShort(
      cycle.endDate
    )}`;

  payoutDetailSummary.innerHTML = `
    <div>
      <span>ค่ามือ</span>
      <strong>
        ${formatMoney(row.commissionAmount)} บาท
      </strong>
    </div>

    <div>
      <span>ประกันมือ</span>
      <strong>
        ${formatMoney(row.guaranteeAmount)} บาท
      </strong>
    </div>

    <div>
      <span>ทิป</span>
      <strong>
        ${formatMoney(row.tipAmount)} บาท
      </strong>
    </div>

    <div class="grand">
      <span>รวมจ่าย</span>
      <strong>
        ${formatMoney(row.totalAmount)} บาท
      </strong>
    </div>
  `;

  payoutDailyList.innerHTML = "";

  const header =
    document.createElement("div");

  header.className =
    "payout-daily-head";

  header.innerHTML = `
    <div>วันที่</div>
    <div>สาขา</div>
    <div>รายการ</div>
    <div>ค่ามือ</div>
    <div>ประกัน</div>
    <div>ทิป</div>
    <div>รวม</div>
  `;

  payoutDailyList.appendChild(
    header
  );

  row.dailyBreakdown.forEach(
    (day) => {
      const item =
        document.createElement("div");

      item.className =
        "payout-daily-row";

      item.innerHTML = `
        <div>
          ${escapeHtml(
            formatThaiDateShort(
              day.dateKey
            )
          )}
        </div>

        <div class="payout-daily-branch">
          ${escapeHtml(
            day.branches.join(" · ") || "-"
          )}
        </div>

        <div>
          ${day.transactionCount}
        </div>

        <div>
          ${formatMoney(
            day.commissionAmount
          )}
        </div>

        <div>
          ${formatMoney(
            day.guaranteeAmount
          )}
        </div>

        <div>
          ${formatMoney(
            day.tipAmount
          )}
        </div>

        <div class="payout-daily-total">
          ${formatMoney(
            day.totalAmount
          )}
        </div>
      `;

      payoutDailyList.appendChild(
        item
      );
    }
  );

  payoutDetailPanel.classList.remove(
    "hidden"
  );

  payoutDetailPanel.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

async function markPayoutPaid(
  row,
  button
) {
  const cycle =
    getCurrentPayoutCycle();

  if (!cycle) {
    return;
  }

  if (
    payoutPaidMap.has(
      row.barberId
    )
  ) {
    return;
  }

  const confirmed =
    window.confirm(
      `ยืนยันจ่ายเงิน ${row.barberName} จำนวน ${formatMoney(
        row.totalAmount
      )} บาท สำหรับรอบนี้ใช่ไหม?`
    );

  if (!confirmed) {
    return;
  }

  button.disabled = true;
  button.textContent =
    "กำลังบันทึก...";

  const payoutId =
    getPayoutDocumentId(
      cycle,
      row.barberId
    );

  const payoutData = {
    payoutCycleId:
      cycle.payoutDateKey,

    payoutDate:
      cycle.payoutDateKey,

    periodStart:
      cycle.startKey,

    periodEnd:
      cycle.endKey,

    barberId:
      row.barberId,

    barberName:
      row.barberName,

    workDays:
      row.workDays,

    transactionCount:
      row.transactionCount,

    commissionAmount:
      row.commissionAmount,

    guaranteeAmount:
      row.guaranteeAmount,

    tipAmount:
      row.tipAmount,

    totalAmount:
      row.totalAmount,

    guaranteeBase:
      row.guaranteeBase,

    dailyBreakdown:
      row.dailyBreakdown.map(
        (day) => ({
          dateKey:
            day.dateKey,

          branches:
            day.branches,

          transactionCount:
            day.transactionCount,

          commissionAmount:
            day.commissionAmount,

          guaranteeAmount:
            day.guaranteeAmount,

          tipAmount:
            day.tipAmount,

          totalAmount:
            day.totalAmount
        })
      ),

    transactionIds:
      row.transactionIds,

    status:
      "paid",

    paidAt:
      serverTimestamp(),

    paidByUid:
      currentAdminUser?.uid || "",

    paidByEmail:
      currentAdminUser?.email || ""
  };

  try {
    await setDoc(
      doc(
        db,
        "barber_payouts",
        payoutId
      ),
      payoutData
    );

    payoutPaidMap.set(
      row.barberId,
      {
        id: payoutId,
        ...payoutData
      }
    );

    renderPayoutList();

    payoutStatus.textContent =
      `บันทึกการจ่าย ${row.barberName} เรียบร้อย`;

    payoutStatus.classList.remove(
      "hidden"
    );

  } catch (error) {
    console.error(
      "Save payout error:",
      error
    );

    window.alert(
      `บันทึกการจ่ายไม่สำเร็จ: ${error.message}`
    );

    button.disabled = false;
    button.textContent =
      "ยืนยันจ่าย";
  }
}

payoutCycleSelect.addEventListener(
  "change",
  async () => {
    selectedPayoutCycleIndex =
      Number(
        payoutCycleSelect.value
      );

    updatePayoutCycleControls();
    await loadPayoutData();
  }
);

previousPayoutCycleButton.addEventListener(
  "click",
  async () => {
    if (
      selectedPayoutCycleIndex <= 0
    ) {
      return;
    }

    selectedPayoutCycleIndex -= 1;
    updatePayoutCycleControls();
    await loadPayoutData();
  }
);

nextPayoutCycleButton.addEventListener(
  "click",
  async () => {
    if (
      selectedPayoutCycleIndex >=
      payoutCycles.length - 1
    ) {
      return;
    }

    selectedPayoutCycleIndex += 1;
    updatePayoutCycleControls();
    await loadPayoutData();
  }
);

refreshPayoutButton.addEventListener(
  "click",
  async () => {
    const hasCycles =
      await ensurePayoutCycles(
        true
      );

    if (hasCycles) {
      await loadPayoutData();
    }
  }
);

closePayoutDetailButton.addEventListener(
  "click",
  () => {
    payoutDetailPanel.classList.add(
      "hidden"
    );
  }
);





// ========================================
// PAYOUT HISTORY
// ========================================

function getPayoutPaidDate(record) {
  const value =
    record?.paidAt || null;

  if (!value) {
    return null;
  }

  if (
    typeof value.toDate ===
    "function"
  ) {
    const date = value.toDate();

    return Number.isFinite(
      date.getTime()
    )
      ? date
      : null;
  }

  if (value instanceof Date) {
    return Number.isFinite(
      value.getTime()
    )
      ? value
      : null;
  }

  const date = new Date(value);

  return Number.isFinite(
    date.getTime()
  )
    ? date
    : null;
}

function formatPayoutPaidAt(record) {
  const date =
    getPayoutPaidDate(record);

  if (!date) {
    return "-";
  }

  return new Intl.DateTimeFormat(
    "th-TH-u-ca-buddhist",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }
  ).format(date);
}

function getPayoutHistoryLabor(record) {
  return (
    Number(
      record.commissionAmount || 0
    ) +
    Number(
      record.guaranteeAmount || 0
    )
  );
}

function populatePayoutHistoryFilters() {
  const previousCycle =
    payoutHistoryCycleFilter.value ||
    "all";

  const previousBarber =
    payoutHistoryBarberFilter.value ||
    "all";

  const cycleMap = new Map();
  const barberMap = new Map();

  payoutHistoryRecords.forEach(
    (record) => {
      const cycleId =
        String(
          record.payoutCycleId ||
          record.payoutDate ||
          ""
        ).trim();

      if (cycleId) {
        cycleMap.set(
          cycleId,
          cycleId
        );
      }

      const barberId =
        String(
          record.barberId || ""
        ).trim();

      if (barberId) {
        barberMap.set(
          barberId,
          record.barberName ||
          barberId
        );
      }
    }
  );

  payoutHistoryCycleFilter.innerHTML =
    '<option value="all">ทุกรอบจ่าย</option>';

  Array.from(
    cycleMap.keys()
  )
    .sort(
      (a, b) =>
        b.localeCompare(a)
    )
    .forEach(
      (cycleId) => {
        const option =
          document.createElement(
            "option"
          );

        option.value =
          cycleId;

        option.textContent =
          `รอบจ่าย ${formatThaiDateLong(
            cycleId
          )}`;

        payoutHistoryCycleFilter
          .appendChild(option);
      }
    );

  payoutHistoryBarberFilter.innerHTML =
    '<option value="all">ช่างทุกคน</option>';

  Array.from(
    barberMap.entries()
  )
    .sort(
      (a, b) =>
        String(a[1])
          .localeCompare(
            String(b[1]),
            "th"
          )
    )
    .forEach(
      ([barberId, barberName]) => {
        const option =
          document.createElement(
            "option"
          );

        option.value =
          barberId;

        option.textContent =
          barberName;

        payoutHistoryBarberFilter
          .appendChild(option);
      }
    );

  payoutHistoryCycleFilter.value =
    previousCycle === "all" ||
    cycleMap.has(previousCycle)
      ? previousCycle
      : "all";

  payoutHistoryBarberFilter.value =
    previousBarber === "all" ||
    barberMap.has(previousBarber)
      ? previousBarber
      : "all";

  refreshCustomSelect(
    payoutHistoryCycleFilter
  );

  refreshCustomSelect(
    payoutHistoryBarberFilter
  );
}

function getFilteredPayoutHistory() {
  const cycleId =
    payoutHistoryCycleFilter.value ||
    "all";

  const barberId =
    payoutHistoryBarberFilter.value ||
    "all";

  return payoutHistoryRecords.filter(
    (record) => {
      const recordCycleId =
        String(
          record.payoutCycleId ||
          record.payoutDate ||
          ""
        );

      if (
        cycleId !== "all" &&
        recordCycleId !== cycleId
      ) {
        return false;
      }

      if (
        barberId !== "all" &&
        String(
          record.barberId || ""
        ) !== barberId
      ) {
        return false;
      }

      return true;
    }
  );
}

function renderPayoutHistory() {
  const records =
    getFilteredPayoutHistory();

  const hasData =
    records.length > 0;

  payoutHistoryEmptyState
    .classList
    .toggle(
      "hidden",
      hasData
    );

  payoutHistoryContent
    .classList
    .toggle(
      "hidden",
      !hasData
    );

  if (!hasData) {
    payoutHistoryList.innerHTML =
      "";
    return;
  }

  const uniqueBarbers =
    new Set(
      records.map(
        (record) =>
          record.barberId ||
          record.barberName ||
          record.id
      )
    );

  const totalTip =
    records.reduce(
      (sum, record) =>
        sum +
        Number(
          record.tipAmount || 0
        ),
      0
    );

  const totalPaid =
    records.reduce(
      (sum, record) =>
        sum +
        Number(
          record.totalAmount || 0
        ),
      0
    );

  payoutHistoryCount.textContent =
    formatMoney(
      records.length
    );

  payoutHistoryBarberCount.textContent =
    formatMoney(
      uniqueBarbers.size
    );

  payoutHistoryTipTotal.textContent =
    formatMoney(totalTip);

  payoutHistoryGrandTotal.textContent =
    formatMoney(totalPaid);

  payoutHistoryList.innerHTML =
    "";

  records.forEach(
    (record) => {
      const row =
        document.createElement(
          "button"
        );

      row.type =
        "button";

      row.className =
        "payout-history-table-row";

      const cycleId =
        record.payoutCycleId ||
        record.payoutDate ||
        "";

      row.innerHTML = `
        <div>
          <strong>
            ${escapeHtml(
              cycleId
                ? formatThaiDateShort(
                    cycleId
                  )
                : "-"
            )}
          </strong>

          <small>
            ${escapeHtml(
              record.periodStart &&
              record.periodEnd
                ? `${formatThaiDateShort(
                    record.periodStart
                  )} – ${formatThaiDateShort(
                    record.periodEnd
                  )}`
                : "-"
            )}
          </small>
        </div>

        <div class="payout-history-barber-cell">
          <strong>
            ${escapeHtml(
              record.barberName ||
              record.barberId ||
              "-"
            )}
          </strong>

          <small>
            ${escapeHtml(
              record.barberId || ""
            )}
          </small>
        </div>

        <div>
          <strong>
            ${formatMoney(
              record.workDays || 0
            )}
          </strong>
          <small>วัน</small>
        </div>

        <div>
          ${formatMoney(
            getPayoutHistoryLabor(
              record
            )
          )}
        </div>

        <div>
          ${formatMoney(
            record.tipAmount || 0
          )}
        </div>

        <div class="payout-history-total-cell">
          ${formatMoney(
            record.totalAmount || 0
          )}
        </div>

        <div class="payout-history-paid-at">
          ${escapeHtml(
            formatPayoutPaidAt(
              record
            )
          )}
        </div>

        <div class="payout-history-paid-by">
          ${escapeHtml(
            record.paidByEmail ||
            record.paidByUid ||
            "-"
          )}
        </div>

        <div class="payout-history-chevron">
          ›
        </div>
      `;

      row.addEventListener(
        "click",
        () => {
          openPayoutHistoryDetail(
            record
          );
        }
      );

      payoutHistoryList
        .appendChild(row);
    }
  );
}

async function loadPayoutHistory() {
  if (payoutHistoryLoading) {
    return;
  }

  payoutHistoryLoading = true;

  refreshPayoutHistoryButton.disabled =
    true;

  payoutHistoryContent
    .classList
    .add("hidden");

  payoutHistoryEmptyState
    .classList
    .add("hidden");

  try {
    const snapshot =
      await getDocs(
        collection(
          db,
          "barber_payouts"
        )
      );

    payoutHistoryRecords =
      snapshot.docs
        .map(
          (snapshot) => ({
            id: snapshot.id,
            ...snapshot.data()
          })
        )
        .filter(
          (record) =>
            !record.status ||
            record.status === "paid"
        )
        .sort(
          (a, b) => {
            const dateA =
              getPayoutPaidDate(a);

            const dateB =
              getPayoutPaidDate(b);

            if (
              dateA ||
              dateB
            ) {
              return (
                (dateB?.getTime() || 0) -
                (dateA?.getTime() || 0)
              );
            }

            return String(
              b.payoutCycleId ||
              b.payoutDate ||
              ""
            ).localeCompare(
              String(
                a.payoutCycleId ||
                a.payoutDate ||
                ""
              )
            );
          }
        );

    populatePayoutHistoryFilters();
    renderPayoutHistory();

  } catch (error) {
    console.error(
      "Load payout history error:",
      error
    );

    payoutHistoryRecords = [];

    populatePayoutHistoryFilters();
    renderPayoutHistory();

    payoutHistoryEmptyState
      .classList
      .remove("hidden");

    payoutHistoryEmptyState
      .querySelector("strong")
      .textContent =
        "โหลดประวัติการจ่ายไม่สำเร็จ";

    payoutHistoryEmptyState
      .querySelector("p")
      .textContent =
        error.message ||
        "กรุณาลองใหม่อีกครั้ง";

  } finally {
    payoutHistoryLoading = false;

    refreshPayoutHistoryButton.disabled =
      false;
  }
}

function openPayoutHistoryDetail(
  record
) {
  const cycleId =
    record.payoutCycleId ||
    record.payoutDate ||
    "";

  payoutHistoryDetailTitle.textContent =
    record.barberName ||
    record.barberId ||
    "รายละเอียดการจ่าย";

  payoutHistoryDetailSubtitle.textContent =
    cycleId
      ? `รอบจ่าย ${formatThaiDateLong(
          cycleId
        )}`
      : "รอบจ่าย -";

  payoutHistoryDetailSummary.innerHTML = `
    <div>
      <span>ค่ามือ</span>
      <strong>
        ${formatMoney(
          record.commissionAmount || 0
        )} บาท
      </strong>
    </div>

    <div>
      <span>ประกันมือ</span>
      <strong>
        ${formatMoney(
          record.guaranteeAmount || 0
        )} บาท
      </strong>
    </div>

    <div>
      <span>ทิป</span>
      <strong>
        ${formatMoney(
          record.tipAmount || 0
        )} บาท
      </strong>
    </div>

    <div class="grand">
      <span>รวมจ่าย</span>
      <strong>
        ${formatMoney(
          record.totalAmount || 0
        )} บาท
      </strong>
    </div>
  `;

  payoutHistoryDetailPaidAt.textContent =
    formatPayoutPaidAt(record);

  payoutHistoryDetailPaidBy.textContent =
    record.paidByEmail ||
    record.paidByUid ||
    "-";

  payoutHistoryDetailDailyList.innerHTML =
    "";

  const header =
    document.createElement("div");

  header.className =
    "payout-daily-head";

  header.innerHTML = `
    <div>วันที่</div>
    <div>สาขา</div>
    <div>รายการ</div>
    <div>ค่ามือ</div>
    <div>ประกัน</div>
    <div>ทิป</div>
    <div>รวม</div>
  `;

  payoutHistoryDetailDailyList
    .appendChild(header);

  const dailyBreakdown =
    Array.isArray(
      record.dailyBreakdown
    )
      ? record.dailyBreakdown
      : [];

  dailyBreakdown.forEach(
    (day) => {
      const item =
        document.createElement(
          "div"
        );

      item.className =
        "payout-daily-row";

      const branches =
        Array.isArray(day.branches)
          ? day.branches.join(" · ")
          : (
              day.branchName ||
              day.branchId ||
              "-"
            );

      item.innerHTML = `
        <div>
          ${escapeHtml(
            day.dateKey
              ? formatThaiDateShort(
                  day.dateKey
                )
              : "-"
          )}
        </div>

        <div class="payout-daily-branch">
          ${escapeHtml(
            branches || "-"
          )}
        </div>

        <div>
          ${formatMoney(
            day.transactionCount || 0
          )}
        </div>

        <div>
          ${formatMoney(
            day.commissionAmount || 0
          )}
        </div>

        <div>
          ${formatMoney(
            day.guaranteeAmount || 0
          )}
        </div>

        <div>
          ${formatMoney(
            day.tipAmount || 0
          )}
        </div>

        <div class="payout-daily-total">
          ${formatMoney(
            day.totalAmount || 0
          )}
        </div>
      `;

      payoutHistoryDetailDailyList
        .appendChild(item);
    }
  );

  if (dailyBreakdown.length === 0) {
    payoutHistoryDetailDailyList
      .innerHTML = `
        <div class="payout-history-detail-empty">
          ไม่มีรายละเอียดรายวันในรายการนี้
        </div>
      `;
  }

  payoutHistoryDetailModal
    .classList
    .remove("hidden");

  document.body
    .classList
    .add(
      "payout-history-modal-open"
    );
}

function closePayoutHistoryDetail() {
  payoutHistoryDetailModal
    .classList
    .add("hidden");

  document.body
    .classList
    .remove(
      "payout-history-modal-open"
    );
}

if (refreshPayoutHistoryButton) {
  refreshPayoutHistoryButton
    .addEventListener(
      "click",
      loadPayoutHistory
    );
}

[
  payoutHistoryCycleFilter,
  payoutHistoryBarberFilter
].forEach(
  (select) => {
    if (!select) {
      return;
    }

    select.addEventListener(
      "change",
      renderPayoutHistory
    );
  }
);

if (payoutHistoryDetailCloseButton) {
  payoutHistoryDetailCloseButton
    .addEventListener(
      "click",
      closePayoutHistoryDetail
    );
}

if (payoutHistoryDetailBackdrop) {
  payoutHistoryDetailBackdrop
    .addEventListener(
      "click",
      closePayoutHistoryDetail
    );
}


// ========================================
// DAILY TRANSACTION HISTORY
// ========================================

function getTransactionCreatedAtDate(transaction) {
  const raw =
    transaction?.createdAt ||
    null;

  if (!raw) {
    return null;
  }

  const date = new Date(raw);

  return Number.isNaN(date.getTime())
    ? null
    : date;
}

function formatDailyHistoryTime(transaction) {
  const date =
    getTransactionCreatedAtDate(
      transaction
    );

  if (!date) {
    return "-";
  }

  return date.toLocaleTimeString(
    "th-TH",
    {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    }
  );
}

function formatDailyHistoryDateTime(transaction) {
  const date =
    getTransactionCreatedAtDate(
      transaction
    );

  if (!date) {
    return "-";
  }

  return date.toLocaleString(
    "th-TH-u-ca-buddhist",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    }
  );
}

function getTransactionServiceTotal(transaction) {
  return Number(
    transaction.serviceTotal ??
    transaction.total ??
    0
  );
}

function getTransactionTip(transaction) {
  return Number(
    transaction.tipAmount || 0
  );
}

function getTransactionGrandTotal(transaction) {
  return Number(
    transaction.grandTotal ??
    (
      getTransactionServiceTotal(transaction) +
      getTransactionTip(transaction)
    )
  );
}

function getTransactionPaymentText(transaction) {
  return transaction.paymentMethod === "cash"
    ? "เงินสด"
    : "สแกนจ่าย";
}

function getTransactionServiceText(transaction) {
  const services =
    Array.isArray(transaction.services)
      ? transaction.services
      : [];

  if (services.length === 0) {
    return "-";
  }

  return services
    .map((service) => {
      const detail =
        service.detail
          ? ` (${service.detail})`
          : "";

      return `${service.name || "รายการ"}${detail}`;
    })
    .join(" · ");
}

function getBranchDisplayName(transaction) {
  if (transaction.branchName) {
    return transaction.branchName;
  }

  const branch =
    branches.find(
      (item) =>
        item.id === transaction.branchId
    );

  return branch?.name ||
    transaction.branchId ||
    "-";
}

function populateDailyHistoryFilters() {
  const previousBranch =
    dailyHistoryBranchFilter.value ||
    "all";

  const previousBarber =
    dailyHistoryBarberFilter.value ||
    "all";

  const branchMap = new Map();
  const barberMap = new Map();

  dailyHistoryTransactions.forEach(
    (transaction) => {
      if (transaction.branchId) {
        branchMap.set(
          transaction.branchId,
          getBranchDisplayName(transaction)
        );
      }

      if (transaction.barberId) {
        barberMap.set(
          transaction.barberId,
          transaction.barberName ||
            transaction.barberId
        );
      }
    }
  );

  dailyHistoryBranchFilter.innerHTML =
    '<option value="all">ทุกสาขา</option>';

  Array.from(branchMap.entries())
    .sort(
      (a, b) =>
        String(a[1]).localeCompare(
          String(b[1]),
          "th"
        )
    )
    .forEach(([id, name]) => {
      const option =
        document.createElement("option");

      option.value = id;
      option.textContent = name;

      dailyHistoryBranchFilter.appendChild(
        option
      );
    });

  dailyHistoryBarberFilter.innerHTML =
    '<option value="all">ช่างทุกคน</option>';

  Array.from(barberMap.entries())
    .sort(
      (a, b) =>
        String(a[1]).localeCompare(
          String(b[1]),
          "th"
        )
    )
    .forEach(([id, name]) => {
      const option =
        document.createElement("option");

      option.value = id;
      option.textContent = name;

      dailyHistoryBarberFilter.appendChild(
        option
      );
    });

  dailyHistoryBranchFilter.value =
    previousBranch === "all" ||
    branchMap.has(previousBranch)
      ? previousBranch
      : "all";

  dailyHistoryBarberFilter.value =
    previousBarber === "all" ||
    barberMap.has(previousBarber)
      ? previousBarber
      : "all";

  refreshCustomSelect(
    dailyHistoryBranchFilter
  );

  refreshCustomSelect(
    dailyHistoryBarberFilter
  );

  refreshCustomSelect(
    dailyHistoryPaymentFilter
  );
}

function getFilteredDailyHistoryTransactions() {
  const branchId =
    dailyHistoryBranchFilter.value ||
    "all";

  const barberId =
    dailyHistoryBarberFilter.value ||
    "all";

  const payment =
    dailyHistoryPaymentFilter.value ||
    "all";

  return dailyHistoryTransactions.filter(
    (transaction) => {
      if (
        branchId !== "all" &&
        transaction.branchId !== branchId
      ) {
        return false;
      }

      if (
        barberId !== "all" &&
        transaction.barberId !== barberId
      ) {
        return false;
      }

      if (
        payment !== "all" &&
        transaction.paymentMethod !== payment
      ) {
        return false;
      }

      return true;
    }
  );
}

function renderDailyHistory() {
  const transactions =
    getFilteredDailyHistoryTransactions();

  const hasData =
    transactions.length > 0;

  dailyHistoryEmptyState.classList.toggle(
    "hidden",
    hasData
  );

  dailyHistoryContent.classList.toggle(
    "hidden",
    !hasData
  );

  if (!hasData) {
    dailyHistoryList.innerHTML = "";
    return;
  }

  const totals =
    transactions.reduce(
      (result, transaction) => {
        result.service +=
          getTransactionServiceTotal(
            transaction
          );

        result.tip +=
          getTransactionTip(
            transaction
          );

        result.grand +=
          getTransactionGrandTotal(
            transaction
          );

        return result;
      },
      {
        service: 0,
        tip: 0,
        grand: 0
      }
    );

  dailyHistoryCount.textContent =
    formatMoney(transactions.length);

  dailyHistoryServiceTotal.textContent =
    formatMoney(totals.service);

  dailyHistoryTipTotal.textContent =
    formatMoney(totals.tip);

  dailyHistoryGrandTotal.textContent =
    formatMoney(totals.grand);

  dailyHistoryList.innerHTML = "";

  transactions.forEach(
    (transaction) => {
      const row =
        document.createElement("button");

      row.type = "button";
      row.className =
        "daily-history-table-row";

      row.innerHTML = `
        <div class="daily-history-time-cell">
          ${escapeHtml(
            formatDailyHistoryTime(
              transaction
            )
          )}
        </div>

        <div>
          ${escapeHtml(
            getBranchDisplayName(
              transaction
            )
          )}
        </div>

        <div class="daily-history-barber-cell">
          ${escapeHtml(
            transaction.barberName ||
            transaction.barberId ||
            "-"
          )}
        </div>

        <div class="daily-history-services-cell">
          ${escapeHtml(
            getTransactionServiceText(
              transaction
            )
          )}
        </div>

        <div>
          ${formatMoney(
            getTransactionServiceTotal(
              transaction
            )
          )}
        </div>

        <div>
          ${formatMoney(
            getTransactionTip(
              transaction
            )
          )}
        </div>

        <div class="daily-history-grand-cell">
          ${formatMoney(
            getTransactionGrandTotal(
              transaction
            )
          )}
        </div>

        <div>
          <span class="daily-history-payment-badge">
            ${getTransactionPaymentText(
              transaction
            )}
          </span>
        </div>

        <div class="daily-history-chevron">
          ›
        </div>
      `;

      row.addEventListener(
        "click",
        () => {
          openDailyHistoryDetail(
            transaction
          );
        }
      );

      dailyHistoryList.appendChild(row);
    }
  );
}

async function loadDailyHistory() {
  if (dailyHistoryLoading) {
    return;
  }

  const dateKey =
    dailyHistoryDateInput.value ||
    toDateKey(new Date());

  dailyHistoryLoading = true;
  dailyHistoryRefreshButton.disabled = true;
  dailyHistoryEmptyState.classList.add(
    "hidden"
  );
  dailyHistoryContent.classList.add(
    "hidden"
  );

  try {
    const historyQuery = query(
      collection(db, "transactions"),
      where(
        "dateKey",
        "==",
        dateKey
      )
    );

    const snapshot =
      await getDocs(historyQuery);

    dailyHistoryTransactions =
      snapshot.docs
        .map((snapshot) => ({
          id: snapshot.id,
          ...snapshot.data()
        }))
        .sort(
          (a, b) => {
            const aDate =
              getTransactionCreatedAtDate(a);
            const bDate =
              getTransactionCreatedAtDate(b);

            return (
              (bDate?.getTime() || 0) -
              (aDate?.getTime() || 0)
            );
          }
        );

    populateDailyHistoryFilters();
    renderDailyHistory();

  } catch (error) {
    console.error(
      "Load daily history error:",
      error
    );

    dailyHistoryTransactions = [];
    populateDailyHistoryFilters();
    renderDailyHistory();

    dailyHistoryEmptyState.classList.remove(
      "hidden"
    );

    dailyHistoryEmptyState.querySelector(
      "strong"
    ).textContent =
      "โหลดประวัติไม่สำเร็จ";

    dailyHistoryEmptyState.querySelector(
      "p"
    ).textContent =
      error.message ||
      "กรุณาลองใหม่อีกครั้ง";

  } finally {
    dailyHistoryLoading = false;
    dailyHistoryRefreshButton.disabled = false;
  }
}

function openDailyHistoryDetail(transaction) {
  dailyHistoryDetailBranch.textContent =
    getBranchDisplayName(transaction);

  dailyHistoryDetailBarber.textContent =
    transaction.barberName ||
    transaction.barberId ||
    "-";

  dailyHistoryDetailServiceTotal.textContent =
    `${formatMoney(
      getTransactionServiceTotal(
        transaction
      )
    )} บาท`;

  const tip =
    getTransactionTip(transaction);

  dailyHistoryDetailTip.textContent =
    `${formatMoney(tip)} บาท`;

  dailyHistoryDetailTipRow.classList.toggle(
    "hidden",
    tip <= 0
  );

  dailyHistoryDetailGrandTotal.textContent =
    `${formatMoney(
      getTransactionGrandTotal(
        transaction
      )
    )} บาท`;

  dailyHistoryDetailPayment.textContent =
    getTransactionPaymentText(transaction);

  dailyHistoryDetailDateTime.textContent =
    formatDailyHistoryDateTime(
      transaction
    );

  dailyHistoryDetailId.textContent =
    transaction.id || "-";

  dailyHistoryDetailServices.innerHTML =
    "";

  const services =
    Array.isArray(transaction.services)
      ? transaction.services
      : [];

  services.forEach(
    (service) => {
      const row =
        document.createElement("div");

      row.className =
        "daily-history-detail-service-row";

      const detail =
        service.detail
          ? ` (${service.detail})`
          : "";

      row.innerHTML = `
        <span>
          ${escapeHtml(
            (service.name || "รายการ") +
            detail
          )}
        </span>

        <strong>
          ${formatMoney(
            Number(service.price || 0)
          )} บาท
        </strong>
      `;

      dailyHistoryDetailServices.appendChild(
        row
      );
    }
  );

  dailyHistoryDetailModal.classList.remove(
    "hidden"
  );

  document.body.classList.add(
    "daily-history-modal-open"
  );
}

function closeDailyHistoryDetail() {
  dailyHistoryDetailModal.classList.add(
    "hidden"
  );

  document.body.classList.remove(
    "daily-history-modal-open"
  );
}


if (dailyHistoryDateInput) {
  dailyHistoryDateInput.value =
    toDateKey(new Date());

  dailyHistoryDateInput.addEventListener(
    "change",
    loadDailyHistory
  );
}

[
  dailyHistoryBranchFilter,
  dailyHistoryBarberFilter,
  dailyHistoryPaymentFilter
].forEach((select) => {
  if (!select) {
    return;
  }

  select.addEventListener(
    "change",
    renderDailyHistory
  );
});

if (dailyHistoryRefreshButton) {
  dailyHistoryRefreshButton.addEventListener(
    "click",
    loadDailyHistory
  );
}


if (dailyHistoryDetailCloseButton) {
  dailyHistoryDetailCloseButton.addEventListener(
    "click",
    closeDailyHistoryDetail
  );
}

if (dailyHistoryDetailBackdrop) {
  dailyHistoryDetailBackdrop.addEventListener(
    "click",
    closeDailyHistoryDetail
  );
}

// ========================================
// HTML ESCAPE
// ========================================

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

const adminPasswordToggleButton =
  document.getElementById("adminPasswordToggleButton");

const adminPasswordToggleIcon =
  document.getElementById("adminPasswordToggleIcon");

if (
  adminPasswordToggleButton &&
  adminPasswordToggleIcon
) {
  adminPasswordToggleButton.addEventListener(
    "click",
    () => {
      const isHidden =
        passwordInput.type === "password";

      passwordInput.type =
        isHidden
          ? "text"
          : "password";

      adminPasswordToggleIcon.classList.toggle(
        "fa-eye",
        !isHidden
      );

      adminPasswordToggleIcon.classList.toggle(
        "fa-eye-slash",
        isHidden
      );

      adminPasswordToggleButton.setAttribute(
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
// START
// ========================================

showLoading();
