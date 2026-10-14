const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

initializeApp();
const db = getFirestore();
const ADMIN_URL = "https://ste2000it-developer.github.io/BKK-CUTZ/admin.html";

function chunks(values, size) {
  const rows = [];
  for (let i = 0; i < values.length; i += size) rows.push(values.slice(i, i + size));
  return rows;
}

function bangkokTime(timestamp) {
  if (!timestamp || typeof timestamp.toDate !== "function") return "";
  return new Intl.DateTimeFormat("th-TH", {
    timeZone: "Asia/Bangkok",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(timestamp.toDate());
}

exports.pushAdminAttendance = onCall({ region: "asia-southeast1" }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "กรุณาเข้าสู่ระบบก่อนส่ง Push");

  const notificationId = String(request.data?.notificationId || "").trim();
  if (!notificationId.startsWith("attendance-checkin_")) {
    throw new HttpsError("invalid-argument", "notificationId ไม่ถูกต้อง");
  }

  const profileSnapshot = await db.collection("users").doc(uid).get();
  if (!profileSnapshot.exists) throw new HttpsError("permission-denied", "ไม่พบบัญชีผู้ใช้งาน");
  const profile = profileSnapshot.data() || {};
  if (profile.active !== true || !["branch", "admin"].includes(String(profile.role || ""))) {
    throw new HttpsError("permission-denied", "บัญชีนี้ไม่มีสิทธิ์ส่ง Push");
  }

  const notificationRef = db.collection("admin_notifications").doc(notificationId);
  const notificationSnapshot = await notificationRef.get();
  if (!notificationSnapshot.exists) throw new HttpsError("not-found", "ไม่พบการแจ้งเตือนเข้างาน");
  const notification = notificationSnapshot.data() || {};
  if (notification.type !== "attendance_checkin") {
    throw new HttpsError("failed-precondition", "รองรับเฉพาะแจ้งเตือนเข้างาน");
  }

  if (String(profile.role || "") === "branch"
      && String(profile.branchId || "") !== String(notification.branchId || "")) {
    throw new HttpsError("permission-denied", "ไม่สามารถส่ง Push ของสาขาอื่นได้");
  }

  if (notification.pushSentAt) {
    return {
      alreadySent: true,
      successCount: Number(notification.pushSuccessCount || 0),
      failureCount: Number(notification.pushFailureCount || 0),
    };
  }

  const deviceSnapshot = await db.collection("admin_push_devices").where("active", "==", true).get();
  const deviceRows = deviceSnapshot.docs
    .map((doc) => ({ ref: doc.ref, ...doc.data() }))
    .filter((row) => typeof row.fid === "string" && row.fid.trim());
  const uniqueFids = [...new Set(deviceRows.map((row) => row.fid.trim()))];

  if (!uniqueFids.length) {
    await notificationRef.set({
      pushSentAt: FieldValue.serverTimestamp(),
      pushSuccessCount: 0,
      pushFailureCount: 0,
    }, { merge: true });
    return { alreadySent: false, successCount: 0, failureCount: 0 };
  }

  const branch = notification.branchName || notification.branchId || "ไม่ระบุสาขา";
  const time = bangkokTime(notification.eventAt);
  const title = "BKK-CUTZ • ช่างเข้างาน";
  const body = `${notification.barberName || "ช่าง"} เข้างานแล้ว • ${branch}${time ? ` • ${time}` : ""}`;
  const tag = `attendance-${notificationId}`;
  const invalidFids = new Set();
  let successCount = 0;
  let failureCount = 0;

  for (const group of chunks(uniqueFids, 500)) {
    const result = await getMessaging().sendEachForMulticast({
      fids: group,
      notification: { title, body },
      data: {
        title,
        body,
        tag,
        url: ADMIN_URL,
        notificationId,
        type: "attendance_checkin",
        branchId: String(notification.branchId || ""),
        barberId: String(notification.barberId || ""),
      },
      webpush: {
        headers: {
          Urgency: "high",
          TTL: "86400",
        },
        fcmOptions: { link: ADMIN_URL },
      },
    });
    successCount += result.successCount;
    failureCount += result.failureCount;
    result.responses.forEach((response, index) => {
      if (response.success) return;
      const code = response.error?.code || "";
      if (code.includes("not-registered") || code.includes("invalid-argument") || code.includes("not-found")) {
        invalidFids.add(group[index]);
      }
    });
  }

  if (invalidFids.size) {
    const batch = db.batch();
    for (const row of deviceRows) {
      if (invalidFids.has(row.fid.trim())) {
        batch.set(row.ref, { active: false, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      }
    }
    await batch.commit();
  }

  await notificationRef.set({
    pushSentAt: FieldValue.serverTimestamp(),
    pushSuccessCount: successCount,
    pushFailureCount: failureCount,
  }, { merge: true });

  return { alreadySent: false, successCount, failureCount };
});
