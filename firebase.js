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
