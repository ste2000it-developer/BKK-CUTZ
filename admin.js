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


// ========================================
// STATE
// ========================================

let branches = [];
let services = [];
let selectedGroup = "";
let editingServiceId = null;


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
  button.addEventListener("click", () => {
    const page = button.dataset.adminPage;

    adminNavButtons.forEach((item) => {
      item.classList.toggle(
        "active",
        item.dataset.adminPage === page
      );
    });

    if (page === "services") {
      pageTitle.textContent = "เมนูบริการ / ราคา";
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
