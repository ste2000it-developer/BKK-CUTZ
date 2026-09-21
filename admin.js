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
  writeBatch,
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
// BRANCH → GROUP
// ========================================

const BRANCH_GROUPS = {

  b001: "A",
  b002: "A",
  b003: "A",

  b004: "B",
  b005: "B",

  b006: "C",

  b007: "B",
  b008: "B",

  b009: "A",

  b010: "D",

  b011: "B"

};



// ========================================
// FALLBACK BRANCH NAMES
// ========================================

const BRANCH_NAMES = {

  b001: "สะพานใหม่",
  b002: "ม.รังสิต",
  b003: "ม.กรุงเทพ",
  b004: "แบริ่ง",
  b005: "สุขุมวิท101",
  b006: "แบริ่ง10",
  b007: "สุขุมวิท66",
  b008: "สุขุมวิท107",
  b009: "นนทบุรี11/1",
  b010: "1981",
  b011: "tops101"

};



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


const migrationButton =
  document.getElementById(
    "migrationButton"
  );


const migrationStatus =
  document.getElementById(
    "migrationStatus"
  );


const groupButtons =
  document.querySelectorAll(
    ".group-button"
  );


const groupBranches =
  document.getElementById(
    "groupBranches"
  );


const serviceTitle =
  document.getElementById(
    "serviceTitle"
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


let selectedGroup =
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


      await checkMigrationState();


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

}



// ========================================
// CHECK MIGRATION
// ========================================

async function checkMigrationState() {

  const branchesReady =
    Object.entries(
      BRANCH_GROUPS
    ).every(
      ([branchId, groupId]) => {

        const branch =
          branches.find(
            (item) =>
              item.id === branchId
          );


        return branch
          && branch.serviceGroup === groupId;

      }
    );


  const serviceSnapshot =
    await getDocs(
      collection(
        db,
        "services"
      )
    );


  const hasGroupServices =
    serviceSnapshot.docs.some(
      (snapshot) =>
        Boolean(
          snapshot.data().groupId
        )
    );


  if (
    branchesReady &&
    hasGroupServices
  ) {

    migrationButton.disabled =
      true;


    migrationButton.textContent =
      "ตั้งค่ากลุ่ม A / B / C / D แล้ว";


    return;

  }


  migrationButton.disabled =
    false;


  migrationButton.textContent =
    "ย้ายระบบเป็นกลุ่ม A / B / C / D";

}



// ========================================
// SERVICE BUILDERS
// ========================================

function fixedService(
  code,
  name,
  price,
  sortOrder
) {

  return {

    serviceCode:
      code,

    name,

    type:
      "fixed",

    price,

    active:
      true,

    sortOrder

  };

}



function choiceService(
  code,
  name,
  choices,
  sortOrder
) {

  return {

    serviceCode:
      code,

    name,

    type:
      "choice",

    price:
      0,

    choices,

    active:
      true,

    sortOrder

  };

}



function customService(
  sortOrder
) {

  return {

    serviceCode:
      "custom",

    name:
      "อื่นๆ",

    type:
      "custom",

    price:
      0,

    active:
      true,

    sortOrder

  };

}



function freeCutService(
  sortOrder
) {

  return {

    serviceCode:
      "free_cut",

    name:
      "discount10ฟรี1",

    type:
      "free_cut",

    price:
      0,

    targetServiceCode:
      "haircut",

    active:
      true,

    sortOrder

  };

}



function halfCutService(
  sortOrder
) {

  return {

    serviceCode:
      "half_cut",

    name:
      "discount 50%",

    type:
      "half_cut",

    price:
      0,

    discountPercent:
      50,

    targetServiceCode:
      "haircut",

    active:
      true,

    sortOrder

  };

}



// ========================================
// GROUP A
// ========================================

function servicesGroupA() {

  return [

    fixedService(
      "haircut",
      "ตัดผม",
      250,
      1
    ),

    fixedService(
      "kids",
      "ตัดผมเด็ก",
      200,
      2
    ),

    fixedService(
      "trim",
      "เก็บทรง",
      200,
      3
    ),

    choiceService(
      "shave",
      "โกนหนวด/กันขอบ",
      [150, 200],
      4
    ),

    fixedService(
      "wash",
      "สระผม",
      50,
      5
    ),

    fixedService(
      "product",
      "ผลิตภัณฑ์",
      285,
      6
    ),

    customService(
      7
    ),

    freeCutService(
      8
    ),

    halfCutService(
      9
    )

  ];

}



// ========================================
// GROUP B
// ========================================

function servicesGroupB() {

  return [

    fixedService(
      "haircut",
      "ตัดผม",
      300,
      1
    ),

    fixedService(
      "kids",
      "ตัดผมเด็ก",
      250,
      2
    ),

    fixedService(
      "trim",
      "เก็บทรง",
      250,
      3
    ),

    choiceService(
      "shave",
      "โกนหนวด/กันขอบ",
      [150, 200],
      4
    ),

    fixedService(
      "wash",
      "สระผม",
      50,
      5
    ),

    fixedService(
      "product",
      "ผลิตภัณฑ์",
      285,
      6
    ),

    customService(
      7
    ),

    freeCutService(
      8
    ),

    halfCutService(
      9
    )

  ];

}



// ========================================
// GROUP C
// ========================================

function servicesGroupC() {

  return [

    fixedService(
      "haircut",
      "ตัดผม",
      300,
      1
    ),

    fixedService(
      "kids",
      "ตัดผมเด็ก",
      250,
      2
    ),

    fixedService(
      "trim",
      "เก็บทรง",
      250,
      3
    ),

    choiceService(
      "shave",
      "โกนหนวด/กันขอบ",
      [150, 200],
      4
    ),

    fixedService(
      "product",
      "ผลิตภัณฑ์",
      285,
      5
    ),

    customService(
      6
    ),

    freeCutService(
      7
    ),

    halfCutService(
      8
    )

  ];

}



// ========================================
// GROUP D
// ========================================

function servicesGroupD() {

  return [

    fixedService(
      "haircut",
      "ตัดผม",
      400,
      1
    ),

    fixedService(
      "kids",
      "ตัดผมเด็ก",
      300,
      2
    ),

    fixedService(
      "trim",
      "เก็บทรง",
      350,
      3
    ),

    fixedService(
      "shave",
      "โกนหนวด/กันขอบ",
      300,
      4
    ),

    fixedService(
      "product",
      "ผลิตภัณฑ์",
      285,
      5
    ),

    customService(
      6
    ),

    freeCutService(
      7
    ),

    halfCutService(
      8
    )

  ];

}



// ========================================
// GROUP SERVICES
// ========================================

function getInitialServices(
  groupId
) {

  if (
    groupId === "A"
  ) {

    return servicesGroupA();

  }


  if (
    groupId === "B"
  ) {

    return servicesGroupB();

  }


  if (
    groupId === "C"
  ) {

    return servicesGroupC();

  }


  return servicesGroupD();

}



// ========================================
// MIGRATION
// ========================================

migrationButton.addEventListener(
  "click",
  async () => {

    const confirmed =
      window.confirm(
        "ระบบจะลบ services แบบแยกสาขาเดิม แล้วสร้างใหม่เป็นกลุ่ม A / B / C / D ต้องการดำเนินการต่อหรือไม่?"
      );


    if (!confirmed) {

      return;

    }


    migrationButton.disabled =
      true;


    migrationStatus.classList.remove(
      "hidden"
    );


    migrationStatus.textContent =
      "กำลังล้าง services แบบเดิม...";


    try {

      const existingServices =
        await getDocs(
          collection(
            db,
            "services"
          )
        );


      const documents =
        existingServices.docs;


      const chunkSize =
        400;


      for (
        let index = 0;
        index < documents.length;
        index += chunkSize
      ) {

        const batch =
          writeBatch(
            db
          );


        documents
          .slice(
            index,
            index + chunkSize
          )
          .forEach(
            (snapshot) => {

              batch.delete(
                snapshot.ref
              );

            }
          );


        await batch.commit();

      }


      migrationStatus.textContent =
        "กำลังกำหนดกลุ่มให้ 11 สาขา...";


      const setupBatch =
        writeBatch(
          db
        );


      Object.entries(
        BRANCH_GROUPS
      ).forEach(
        ([branchId, groupId]) => {

          setupBatch.set(

            doc(
              db,
              "branches",
              branchId
            ),

            {
              serviceGroup:
                groupId
            },

            {
              merge: true
            }

          );

        }
      );


      ["A", "B", "C", "D"]
        .forEach(
          (groupId) => {

            getInitialServices(
              groupId
            ).forEach(
              (service) => {

                const reference =
                  doc(
                    db,
                    "services",
                    `${groupId}_${service.serviceCode}`
                  );


                setupBatch.set(
                  reference,
                  {
                    groupId,
                    ...service
                  }
                );

              }
            );

          }
        );


      await setupBatch.commit();


      migrationStatus.textContent =
        "สำเร็จ ✅\nสร้างกลุ่ม A / B / C / D เรียบร้อย";


      await loadBranches();


      await checkMigrationState();


      selectGroup(
        "A"
      );


    } catch (error) {

      console.error(
        error
      );


      migrationStatus.textContent =
        `ย้ายระบบไม่สำเร็จ\n${error.message}`;


      migrationButton.disabled =
        false;

    }

  }
);



// ========================================
// GROUP BUTTONS
// ========================================

groupButtons.forEach(
  (button) => {

    button.addEventListener(
      "click",
      () => {

        selectGroup(
          button.dataset.group
        );

      }
    );

  }
);



function selectGroup(
  groupId
) {

  selectedGroup =
    groupId;


  groupButtons.forEach(
    (button) => {

      button.classList.toggle(
        "active",
        button.dataset.group === groupId
      );

    }
  );


  serviceTitle.textContent =
    `เมนูบริการ — กลุ่ม ${groupId}`;


  addServiceButton.disabled =
    false;


  renderGroupBranches();


  closeEditor();


  loadServices();

}



// ========================================
// GROUP BRANCHES
// ========================================

function renderGroupBranches() {

  const branchIds =
    Object.keys(
      BRANCH_GROUPS
    ).filter(
      (branchId) =>
        BRANCH_GROUPS[branchId] === selectedGroup
    );


  const names =
    branchIds.map(
      (branchId) => {

        const branch =
          branches.find(
            (item) =>
              item.id === branchId
          );


        return branch?.name
          || BRANCH_NAMES[branchId]
          || branchId;

      }
    );


  groupBranches.textContent =
    `สาขาในกลุ่ม ${selectedGroup}: ${names.join(" / ")}`;

}



// ========================================
// LOAD SERVICES
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

    const serviceQuery =
      query(
        collection(
          db,
          "services"
        ),

        where(
          "groupId",
          "==",
          selectedGroup
        )
      );


    const snapshot =
      await getDocs(
        serviceQuery
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


  } catch (error) {

    console.error(
      error
    );


    serviceList.innerHTML = `
      <div class="empty">
        โหลดเมนูไม่สำเร็จ
      </div>
    `;

  }

}



// ========================================
// SERVICE PRICE TEXT
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

    return "กรอกรายละเอียดและราคาเอง";

  }


  if (
    service.type === "free_cut"
  ) {

    return "ตัดผมฟรี 1 ครั้ง";

  }


  if (
    service.type === "half_cut"
  ) {

    return `ลดค่าตัดผม ${Number(service.discountPercent || 0)}%`;

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
        ยังไม่มีเมนูในกลุ่มนี้
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
              ${escapeHtml(getServicePriceText(service))}
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
// ADD SERVICE
// ========================================

addServiceButton.addEventListener(
  "click",
  () => {

    if (!selectedGroup) {

      return;

    }


    editingServiceId =
      null;


    editorTitle.textContent =
      `เพิ่มเมนู — กลุ่ม ${selectedGroup}`;


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


    saveStatus.classList.add(
      "hidden"
    );


    editor.classList.remove(
      "hidden"
    );


    editor.scrollIntoView({
      behavior: "smooth"
    });

  }
);



// ========================================
// EDIT SERVICE
// ========================================

function openEditService(
  service
) {

  editingServiceId =
    service.id;


  editorTitle.textContent =
    `แก้ไขเมนู — กลุ่ม ${selectedGroup}`;


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


  saveStatus.classList.add(
    "hidden"
  );


  editor.classList.remove(
    "hidden"
  );


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

      groupId:
        selectedGroup,

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
      existingService?.serviceCode
    ) {

      data.serviceCode =
        existingService.serviceCode;

    }


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


      data.targetServiceCode =
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


      data.targetServiceCode =
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
// ESCAPE HTML
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
