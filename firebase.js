// ========================================
// Firebase
// BKK-CUTZ
// ========================================

import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";


import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";


import {
  getFirestore,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-storage.js";



// ========================================
// Firebase Config
// ========================================

const firebaseConfig = {

  apiKey: "AIzaSyCDdF3fUlx5WwRf8mx6T7EQ_IMJ862fEvc",
  authDomain: "bkk-cutz.firebaseapp.com",
  projectId: "bkk-cutz",
  storageBucket: "bkk-cutz.firebasestorage.app",
  messagingSenderId: "539745181048",
  appId: "1:539745181048:web:24fa05be416a582cdefc8d"

};



// ========================================
// Initialize
// ========================================

const app =
  initializeApp(
    firebaseConfig
  );


const auth =
  getAuth(app);


const db =
  getFirestore(app);


const storage =
  getStorage(app);



// ========================================
// จำสถานะ Login ไว้ในเครื่อง
// ========================================

setPersistence(
  auth,
  browserLocalPersistence
).catch(
  (error) => {

    console.error(
      "Firebase persistence error:",
      error
    );

  }
);



// ========================================
// Login
// ========================================

export async function login(
  email,
  password
) {

  const credential =
    await signInWithEmailAndPassword(
      auth,
      email,
      password
    );


  return credential.user;

}



// ========================================
// Logout
// ========================================

export async function logout() {

  await signOut(
    auth
  );

}



// ========================================
// ตรวจสถานะ Login
// ========================================

export function watchAuth(
  callback
) {

  return onAuthStateChanged(
    auth,
    callback
  );

}



// ========================================
// ดึงข้อมูล user profile
//
// users/{UID}
// ========================================

export async function getUserProfile(
  uid
) {

  const ref =
    doc(
      db,
      "users",
      uid
    );


  const snapshot =
    await getDoc(
      ref
    );


  if (
    !snapshot.exists()
  ) {

    throw new Error(
      "ไม่พบข้อมูลบัญชีนี้ใน Firestore"
    );

  }


  return {
    id:
      snapshot.id,

    ...snapshot.data()
  };

}



// ========================================
// ดึงข้อมูลสาขา
//
// branches/{branchId}
// ========================================

export async function getBranch(
  branchId
) {

  const ref =
    doc(
      db,
      "branches",
      branchId
    );


  const snapshot =
    await getDoc(
      ref
    );


  if (
    !snapshot.exists()
  ) {

    throw new Error(
      "ไม่พบข้อมูลสาขา"
    );

  }


  return {
    id:
      snapshot.id,

    ...snapshot.data()
  };

}



// ========================================
// อัปโหลดรูปสลิปการชำระเงิน
// payment_slips/{branchId}/{dateKey}/{transactionId}.jpg
// ========================================

function sanitizeStorageSegment(
  value,
  fallback = "unknown"
) {

  const cleaned =
    String(value || "")
      .trim()
      .replace(
        /[^a-zA-Z0-9_-]/g,
        "_"
      );

  return cleaned || fallback;

}


export async function uploadPaymentSlip({
  branchId,
  dateKey,
  transactionId,
  blob,
  metadata = {}
}) {

  if (!blob) {
    throw new Error(
      "ไม่พบไฟล์สลิปสำหรับอัปโหลด"
    );
  }

  const safeBranchId =
    sanitizeStorageSegment(
      branchId,
      "branch"
    );

  const safeDateKey =
    sanitizeStorageSegment(
      dateKey,
      "date"
    );

  const safeTransactionId =
    sanitizeStorageSegment(
      transactionId,
      "transaction"
    );

  const fullPath =
    `payment_slips/${safeBranchId}/${safeDateKey}/${safeTransactionId}.jpg`;

  const customMetadata = {};

  Object.entries(metadata).forEach(
    ([key, value]) => {
      if (
        value !== undefined &&
        value !== null
      ) {
        customMetadata[key] =
          String(value);
      }
    }
  );

  const fileRef =
    storageRef(
      storage,
      fullPath
    );

  const result =
    await uploadBytes(
      fileRef,
      blob,
      {
        contentType: "image/jpeg",
        cacheControl:
          "private,max-age=0,no-transform",
        customMetadata
      }
    );

  return {
    path:
      result.metadata.fullPath,

    size:
      result.metadata.size
  };

}



// ========================================
// ขอ URL สำหรับดูรูปสลิป
// ต้องผ่าน Firebase Storage Rules ก่อน
// ========================================

export async function loadPaymentSlipUrl(
  fullPath
) {

  if (!fullPath) {
    throw new Error(
      "ไม่พบตำแหน่งไฟล์สลิป"
    );
  }

  const fileRef =
    storageRef(
      storage,
      fullPath
    );

  return await getDownloadURL(
    fileRef
  );

}
