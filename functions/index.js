const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

initializeApp();
const db = getFirestore();

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

exports.pushAdminAttendance = onDocumentCreated({
  document: "admin_notifications/{notificationId}",
  region: "asia-southeast1",
}, async (event) => {
  const snapshot = event.data;
  if (!snapshot) return;
  const notification = snapshot.data();
  if (notification.type !== "attendance_checkin") return;

  // A retried Firestore event should not send a second push after a completed delivery.
  const latest = await snapshot.ref.get();
  if (latest.data()?.pushSentAt) return;

  const deviceSnapshot = await db.collection("admin_push_devices").where("active", "==", true).get();
  const deviceRows = deviceSnapshot.docs
    .map((doc) => ({ ref: doc.ref, ...doc.data() }))
    .filter((row) => typeof row.fid === "string" && row.fid.trim());
  const uniqueFids = [...new Set(deviceRows.map((row) => row.fid.trim()))];

  if (!uniqueFids.length) {
    await snapshot.ref.set({ pushSentAt: FieldValue.serverTimestamp(), pushSuccessCount: 0, pushFailureCount: 0 }, { merge: true });
    return;
  }

  const branch = notification.branchName || notification.branchId || "ไม่ระบุสาขา";
  const time = bangkokTime(notification.eventAt);
  const title = "BKK-CUTZ • ช่างเข้างาน";
  const body = `${notification.barberName || "ช่าง"} เข้างานแล้ว • ${branch}${time ? ` • ${time}` : ""}`;
  const invalidFids = new Set();
  let successCount = 0;
  let failureCount = 0;

  for (const group of chunks(uniqueFids, 500)) {
    const result = await getMessaging().sendEachForMulticast({
      fids: group,
      data: {
        title,
        body,
        tag: `attendance-${event.params.notificationId}`,
        notificationId: event.params.notificationId,
        type: "attendance_checkin",
        branchId: String(notification.branchId || ""),
        barberId: String(notification.barberId || ""),
      },
      webpush: {
        headers: { Urgency: "high" },
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
      if (invalidFids.has(row.fid.trim())) batch.set(row.ref, { active: false, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    }
    await batch.commit();
  }

  await snapshot.ref.set({
    pushSentAt: FieldValue.serverTimestamp(),
    pushSuccessCount: successCount,
    pushFailureCount: failureCount,
  }, { merge: true });
});
