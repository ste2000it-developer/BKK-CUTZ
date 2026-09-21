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
  getDocs,
  doc,
  writeBatch
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

const loadingArea =
  document.getElementById(
    "loadingArea"
  );


const loginArea =
  document.getElementById(
    "loginArea"
  );


const adminArea =
  document.getElementById(
    "adminArea"
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


const importButton =
  document.getElementById(
    "importButton"
  );


const logoutButton =
  document.getElementById(
    "logoutButton"
  );


const importStatus =
  document.getElementById(
    "importStatus"
  );



// ========================================
// BRANCH GROUPS
// ========================================

const groupA = [
  "b001",
  "b002",
  "b003",
  "b009"
];


const groupB = [
  "b004",
  "b005",
  "b007",
  "b008",
  "b011"
];


const groupC = [
  "b006"
];


const groupD = [
  "b010"
];



// ========================================
// SERVICE BUILDERS
// ========================================

function fixedService(
  id,
  name,
  price,
  sortOrder
) {

  return {
    id,
    name,
    type: "fixed",
    price,
    active: true,
    sortOrder
  };

}



function choiceService(
  id,
  name,
  choices,
  sortOrder
) {

  return {
    id,
    name,
    type: "choice",
    choices,
    price: 0,
    active: true,
    sortOrder
  };

}



function customService(
  sortOrder
) {

  return {
    id: "custom",
    name: "อื่นๆ",
    type: "custom",
    price: 0,
    active: true,
    sortOrder
  };

}



function freeCutService(
  sortOrder
) {

  return {
    id: "free_cut",
    name: "discount10ฟรี1",
    type: "free_cut",

    price: 0,

    targetServiceType:
      "haircut",

    active: true,
    sortOrder
  };

}



function halfCutService(
  sortOrder
) {

  return {
    id: "half_cut",
    name: "discount 50%",
    type: "half_cut",

    discountPercent:
      50,

    targetServiceType:
      "haircut",

    price: 0,

    active: true,
    sortOrder
  };

}



// ========================================
// GROUP A
//
// สะพานใหม่
// ม.รังสิต
// ม.กรุงเทพ
// นนทบุรี11/1
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
      [
        150,
        200
      ],
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
//
// แบริ่ง
// สุขุมวิท101
// สุขุมวิท66
// สุขุมวิท107
// tops101
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
      [
        150,
        200
      ],
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
//
// แบริ่ง10
// ไม่มีสระผม
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
      [
        150,
        200
      ],
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
//
// 1981
// ไม่มีสระผม
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
// CREATE COMPLETE SERVICE LIST
// ========================================

function buildAllServices() {

  const result =
    [];


  groupA.forEach(
    (branchId) => {

      servicesGroupA().forEach(
        (service) => {

          result.push({
            branchId,
            ...service
          });

        }
      );

    }
  );


  groupB.forEach(
    (branchId) => {

      servicesGroupB().forEach(
        (service) => {

          result.push({
            branchId,
            ...service
          });

        }
      );

    }
  );


  groupC.forEach(
    (branchId) => {

      servicesGroupC().forEach(
        (service) => {

          result.push({
            branchId,
            ...service
          });

        }
      );

    }
  );


  groupD.forEach(
    (branchId) => {

      servicesGroupD().forEach(
        (service) => {

          result.push({
            branchId,
            ...service
          });

        }
      );

    }
  );


  return result;

}



// ========================================
// DELETE OLD SERVICES
// ========================================

async function deleteExistingServices() {

  const snapshot =
    await getDocs(
      collection(
        db,
        "services"
      )
    );


  if (
    snapshot.empty
  ) {

    return 0;

  }


  const documents =
    snapshot.docs;


  let deleted =
    0;


  const batchSize =
    400;


  for (
    let index = 0;
    index < documents.length;
    index += batchSize
  ) {

    const batch =
      writeBatch(
        db
      );


    const chunk =
      documents.slice(
        index,
        index + batchSize
      );


    chunk.forEach(
      (documentSnapshot) => {

        batch.delete(
          documentSnapshot.ref
        );

      }
    );


    await batch.commit();


    deleted +=
      chunk.length;

  }


  return deleted;

}



// ========================================
// WRITE NEW SERVICES
// ========================================

async function writeServices(
  services
) {

  const batchSize =
    400;


  let created =
    0;


  for (
    let index = 0;
    index < services.length;
    index += batchSize
  ) {

    const batch =
      writeBatch(
        db
      );


    const chunk =
      services.slice(
        index,
        index + batchSize
      );


    chunk.forEach(
      (service) => {

        const documentId =
          `${service.branchId}_${service.id}`;


        const reference =
          doc(
            db,
            "services",
            documentId
          );


        const data = {
          branchId:
            service.branchId,

          serviceCode:
            service.id,

          name:
            service.name,

          type:
            service.type,

          price:
            service.price,

          active:
            service.active,

          sortOrder:
            service.sortOrder
        };


        if (
          service.choices
        ) {

          data.choices =
            service.choices;

        }


        if (
          service.targetServiceType
        ) {

          data.targetServiceType =
            service.targetServiceType;

        }


        if (
          service.discountPercent
        ) {

          data.discountPercent =
            service.discountPercent;

        }


        batch.set(
          reference,
          data
        );

      }
    );


    await batch.commit();


    created +=
      chunk.length;

  }


  return created;

}



// ========================================
// AUTH STATE
// ========================================

watchAuth(
  async (user) => {

    loadingArea.classList.add(
      "hidden"
    );


    if (!user) {

      adminArea.classList.add(
        "hidden"
      );


      loginArea.classList.remove(
        "hidden"
      );


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


      loginArea.classList.add(
        "hidden"
      );


      adminArea.classList.remove(
        "hidden"
      );


      adminEmail.textContent =
        user.email || "Admin";


    } catch (error) {

      console.error(
        error
      );


      loginArea.classList.remove(
        "hidden"
      );


      adminArea.classList.add(
        "hidden"
      );


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
// IMPORT
// ========================================

importButton.addEventListener(
  "click",
  async () => {

    const confirmed =
      window.confirm(
        "ระบบจะล้าง services เดิมทั้งหมด แล้วสร้างเมนูใหม่ครบทั้ง 11 สาขา ต้องการดำเนินการต่อหรือไม่?"
      );


    if (!confirmed) {

      return;

    }


    importButton.disabled =
      true;


    importStatus.classList.remove(
      "hidden"
    );


    importStatus.textContent =
      "กำลังล้าง services เดิม...";


    try {

      const deleted =
        await deleteExistingServices();


      importStatus.textContent =
        `ล้างข้อมูลเดิมแล้ว ${deleted} รายการ\nกำลังสร้างข้อมูลใหม่...`;


      const services =
        buildAllServices();


      const created =
        await writeServices(
          services
        );


      importStatus.textContent =
        `สำเร็จ ✅\nลบข้อมูลเดิม: ${deleted} รายการ\nสร้างใหม่: ${created} รายการ\nครบ 11 สาขา`;


    } catch (error) {

      console.error(
        "Import error:",
        error
      );


      importStatus.textContent =
        `Import ไม่สำเร็จ\n${error.message}`;


    } finally {

      importButton.disabled =
        false;

    }

  }
);
