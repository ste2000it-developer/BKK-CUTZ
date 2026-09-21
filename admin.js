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
  updateDoc,
  addDoc,
  deleteDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";



// ========================================
// FIRESTORE
// ========================================

const db =
  getFirestore(
    getApp()
  );



// ========================================
// DOM
// ========================================

const loadingPage =
  document.getElementById(
    "loadingPage"
  );


const loginPage =
  document.getElementById(
    "loginPage"
  );


const adminApp =
  document.getElementById(
    "adminApp"
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


const adminEmail =
  document.getElementById(
    "adminEmail"
  );


const logoutButton =
  document.getElementById(
    "logoutButton"
  );


const branchSelect =
  document.getElementById(
    "branchSelect"
  );


const serviceList =
  document.getElementById(
    "serviceList"
  );


const addServiceButton =
  document.getElementById(
    "addServiceButton"
  );


const editor =
  document.getElementById(
    "editor"
  );


const editorTitle =
  document.getElementById(
    "editorTitle"
  );


const serviceNameInput =
  document.getElementById(
    "serviceNameInput"
  );


const serviceTypeInput =
  document.getElementById(
    "serviceTypeInput"
  );


const servicePriceInput =
  document.getElementById(
    "servicePriceInput"
  );


const serviceChoicesInput =
  document.getElementById(
    "serviceChoicesInput"
  );


const discountPercentInput =
  document.getElementById(
    "discountPercentInput"
  );


const sortOrderInput =
  document.getElementById(
    "sortOrderInput"
  );


const activeInput =
  document.getElementById(
    "activeInput"
  );


const priceField =
  document.getElementById(
    "priceField"
  );


const choiceField =
  document.getElementById(
    "choiceField"
  );


const discountField =
  document.getElementById(
    "discountField"
  );


const saveButton =
  document.getElementById(
    "saveButton"
  );


const cancelButton =
  document.getElementById(
    "cancelButton"
  );


const saveStatus =
  document.getElementById(
    "saveStatus"
  );



// ========================================
// STATE
// ========================================

let branches =
  [];


let services =
  [];


let selectedBranchId =
  "";


let editingServiceId =
  null;



// ========================================
// UI
// ========================================

function showLoading() {

  loadingPage.classList.remove(
    "hidden"
  );


  loginPage.classList.add(
    "hidden"
  );


  adminApp.classList.add(
    "hidden"
  );

}



function showLogin() {

  loadingPage.classList.add(
    "hidden"
  );


  adminApp.classList.add(
    "hidden"
  );


  loginPage.classList.remove(
    "hidden"
  );

}



function showAdmin() {

  loadingPage.classList.add(
    "hidden"
  );


  loginPage.classList.add(
    "hidden"
  );


  adminApp.classList.remove(
    "hidden"
  );

}



// ========================================
// AUTH
// ========================================

watchAuth(
  async (user) => {

    if (!user) {

      showLogin();

      return;

    }


    try {

      const profile =
        await getUserProfile(
          user.uid
        );


      if (
        profile.active !== true ||
        profile.role !== "admin"
      ) {

        await logout();


        throw new Error(
          "บัญชีนี้ไม่ใช่ Admin"
        );

      }


      adminEmail.textContent =
        user.email || "Admin";


      showAdmin();


      await loadBranches();


    } catch (error) {

      console.error(
        error
      );


      showLogin();


      loginError.textContent =
        error.message;


      loginError.classList.remove(
        "hidden"
      );

    }

  }
);



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


    loginButton.disabled =
      true;


    loginButton.textContent =
      "กำลังเข้าสู่ระบบ...";


    try {

      await login(
        emailInput.value.trim(),
        passwordInput.value
      );


      passwordInput.value =
        "";


    } catch (error) {

      console.error(
        error
      );


      loginError.textContent =
        "เข้าสู่ระบบไม่สำเร็จ";


      loginError.classList.remove(
        "hidden"
      );


    } finally {

      loginButton.disabled =
        false;


      loginButton.textContent =
        "เข้าสู่ระบบ Admin";

    }

  }
);



// ========================================
// LOGOUT
// ========================================

logoutButton.addEventListener(
  "click",
  async () => {

    await logout();

  }
);



// ========================================
// LOAD BRANCHES
// ========================================

async function loadBranches() {

  const snapshot =
    await getDocs(
      collection(
        db,
        "branches"
      )
    );


  branches =
    snapshot.docs.map(
      (snapshot) => {

        return {

          id:
            snapshot.id,

          ...snapshot.data()

        };

      }
    );


  branches.sort(
    (a, b) => {

      return String(
        a.id
      ).localeCompare(
        String(
          b.id
        )
      );

    }
  );


  renderBranches();

}



// ========================================
// RENDER BRANCHES
// ========================================

function renderBranches() {

  branchSelect.innerHTML = `
    <option value="">
      -- เลือกสาขา --
    </option>
  `;


  branches.forEach(
    (branch) => {

      const option =
        document.createElement(
          "option"
        );


      option.value =
        branch.id;


      option.textContent =
        `${branch.id} - ${branch.name || branch.id}`;


      branchSelect.appendChild(
        option
      );

    }
  );

}



// ========================================
// BRANCH CHANGE
// ========================================

branchSelect.addEventListener(
  "change",
  async () => {

    selectedBranchId =
      branchSelect.value;


    closeEditor();


    if (
      !selectedBranchId
    ) {

      addServiceButton.disabled =
        true;


      serviceList.innerHTML = `
        <div class="empty">
          กรุณาเลือกสาขา
        </div>
      `;


      return;

    }


    addServiceButton.disabled =
      false;


    await loadServices();

  }
);



// ========================================
// LOAD SERVICES
// ========================================

async function loadServices() {

  serviceList.innerHTML = `
    <div class="empty">
      กำลังโหลดเมนู...
    </div>
  `;


  const q =
    query(
      collection(
        db,
        "services"
      ),

      where(
        "branchId",
        "==",
        selectedBranchId
      )
    );


  const snapshot =
    await getDocs(
      q
    );


  services =
    snapshot.docs.map(
      (snapshot) => {

        return {

          id:
            snapshot.id,

          ...snapshot.data()

        };

      }
    );


  services.sort(
    (a, b) => {

      return Number(
        a.sortOrder || 999
      ) -
      Number(
        b.sortOrder || 999
      );

    }
  );


  renderServices();

}



// ========================================
// PRICE TEXT
// ========================================

function getServicePriceText(
  service
) {

  if (
    service.type === "choice"
  ) {

    const choices =
      Array.isArray(
        service.choices
      )
        ? service.choices
        : [];


    return choices
      .map(
        (price) =>
          `${Number(price).toLocaleString("th-TH")} บาท`
      )
      .join(" / ");

  }


  if (
    service.type === "custom"
  ) {

    return "กรอกราคาเอง";

  }


  if (
    service.type === "free_cut"
  ) {

    return "ฟรี";

  }


  if (
    service.type === "half_cut"
  ) {

    return `ลด ${Number(service.discountPercent || 0)}%`;

  }


  return `${Number(service.price || 0).toLocaleString("th-TH")} บาท`;

}



// ========================================
// RENDER SERVICES
// ========================================

function renderServices() {

  serviceList.innerHTML =
    "";


  if (
    services.length === 0
  ) {

    serviceList.innerHTML = `
      <div class="empty">
        ยังไม่มีเมนูในสาขานี้
      </div>
    `;


    return;

  }


  services.forEach(
    (service) => {

      const card =
        document.createElement(
          "div"
        );


      card.className =
        "service-card";


      card.innerHTML = `

        <div class="service-top">

          <div>

            <div class="service-name">
              ${escapeHtml(service.name || "-")}
            </div>

            <div class="service-price">
              ${getServicePriceText(service)}
            </div>

          </div>


          <div class="service-status">
            ${service.active === true ? "เปิด" : "ปิด"}
          </div>

        </div>


        <div class="service-actions">

          <button
            class="edit-button"
            type="button"
          >
            แก้ไข
          </button>


          <button
            class="delete-button"
            type="button"
          >
            ลบ
          </button>

        </div>

      `;


      card
        .querySelector(
          ".edit-button"
        )
        .addEventListener(
          "click",
          () => {

            openEditService(
              service
            );

          }
        );


      card
        .querySelector(
          ".delete-button"
        )
        .addEventListener(
          "click",
          () => {

            deleteService(
              service
            );

          }
        );


      serviceList.appendChild(
        card
      );

    }
  );

}



// ========================================
// ADD
// ========================================

addServiceButton.addEventListener(
  "click",
  () => {

    editingServiceId =
      null;


    editorTitle.textContent =
      "เพิ่มเมนู";


    serviceNameInput.value =
      "";


    serviceTypeInput.value =
      "fixed";


    servicePriceInput.value =
      "";


    serviceChoicesInput.value =
      "";


    discountPercentInput.value =
      "50";


    sortOrderInput.value =
      services.length + 1;


    activeInput.checked =
      true;


    updateEditorFields();


    editor.classList.remove(
      "hidden"
    );


    editor.scrollIntoView({
      behavior: "smooth"
    });

  }
);



// ========================================
// EDIT
// ========================================

function openEditService(
  service
) {

  editingServiceId =
    service.id;


  editorTitle.textContent =
    "แก้ไขเมนู";


  serviceNameInput.value =
    service.name || "";


  serviceTypeInput.value =
    service.type || "fixed";


  servicePriceInput.value =
    Number(
      service.price || 0
    );


  serviceChoicesInput.value =
    Array.isArray(
      service.choices
    )
      ? service.choices.join(", ")
      : "";


  discountPercentInput.value =
    Number(
      service.discountPercent || 50
    );


  sortOrderInput.value =
    Number(
      service.sortOrder || 1
    );


  activeInput.checked =
    service.active === true;


  updateEditorFields();


  editor.classList.remove(
    "hidden"
  );


  editor.scrollIntoView({
    behavior: "smooth"
  });

}



// ========================================
// TYPE CHANGE
// ========================================

serviceTypeInput.addEventListener(
  "change",
  updateEditorFields
);



function updateEditorFields() {

  const type =
    serviceTypeInput.value;


  priceField.classList.add(
    "hidden"
  );


  choiceField.classList.add(
    "hidden"
  );


  discountField.classList.add(
    "hidden"
  );


  if (
    type === "fixed"
  ) {

    priceField.classList.remove(
      "hidden"
    );

  }


  if (
    type === "choice"
  ) {

    choiceField.classList.remove(
      "hidden"
    );

  }


  if (
    type === "half_cut"
  ) {

    discountField.classList.remove(
      "hidden"
    );

  }

}



// ========================================
// SAVE
// ========================================

saveButton.addEventListener(
  "click",
  async () => {

    if (
      !selectedBranchId
    ) {

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


    const data = {

      branchId:
        selectedBranchId,

      name,

      type,

      active:
        activeInput.checked,

      sortOrder:
        Number(
          sortOrderInput.value || 1
        ),

      updatedAt:
        serverTimestamp()

    };


    if (
      type === "fixed"
    ) {

      data.price =
        Number(
          servicePriceInput.value || 0
        );

    }


    if (
      type === "choice"
    ) {

      const choices =
        serviceChoicesInput.value
          .split(",")
          .map(
            (value) =>
              Number(
                value.trim()
              )
          )
          .filter(
            (value) =>
              Number.isFinite(value)
          );


      if (
        choices.length === 0
      ) {

        showSaveStatus(
          "กรุณาใส่ตัวเลือกราคา เช่น 150, 200"
        );


        return;

      }


      data.price =
        0;


      data.choices =
        choices;

    }


    if (
      type === "custom"
    ) {

      data.price =
        0;

    }


    if (
      type === "free_cut"
    ) {

      data.price =
        0;


      data.targetServiceType =
        "haircut";

    }


    if (
      type === "half_cut"
    ) {

      data.price =
        0;


      data.discountPercent =
        Number(
          discountPercentInput.value || 0
        );


      data.targetServiceType =
        "haircut";

    }


    saveButton.disabled =
      true;


    showSaveStatus(
      "กำลังบันทึก..."
    );


    try {

      if (
        editingServiceId
      ) {

        await updateDoc(
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
        () => {

          closeEditor();

        },
        500
      );


    } catch (error) {

      console.error(
        error
      );


      showSaveStatus(
        `บันทึกไม่สำเร็จ: ${error.message}`
      );


    } finally {

      saveButton.disabled =
        false;

    }

  }
);



// ========================================
// DELETE
// ========================================

async function deleteService(
  service
) {

  const confirmed =
    window.confirm(
      `ต้องการลบ "${service.name}" ใช่ไหม?`
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

    console.error(
      error
    );


    window.alert(
      `ลบไม่สำเร็จ: ${error.message}`
    );

  }

}



// ========================================
// CANCEL
// ========================================

cancelButton.addEventListener(
  "click",
  closeEditor
);



function closeEditor() {

  editingServiceId =
    null;


  editor.classList.add(
    "hidden"
  );


  saveStatus.classList.add(
    "hidden"
  );

}



// ========================================
// STATUS
// ========================================

function showSaveStatus(
  text
) {

  saveStatus.textContent =
    text;


  saveStatus.classList.remove(
    "hidden"
  );

}



// ========================================
// HTML ESCAPE
// ========================================

function escapeHtml(
  value
) {

  return String(
    value
  )
    .replaceAll(
      "&",
      "&amp;"
    )
    .replaceAll(
      "<",
      "&lt;"
    )
    .replaceAll(
      ">",
      "&gt;"
    )
    .replaceAll(
      '"',
      "&quot;"
    )
    .replaceAll(
      "'",
      "&#039;"
    );

}



// ========================================
// START
// ========================================

showLoading();
