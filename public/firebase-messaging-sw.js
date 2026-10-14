/* BKK-CUTZ Admin push service worker */
importScripts("https://www.gstatic.com/firebasejs/12.19.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.19.0/firebase-messaging-compat.js");

const params = new URL(self.location.href).searchParams;
const config = {
  apiKey: params.get("apiKey") || "",
  authDomain: params.get("authDomain") || "",
  projectId: params.get("projectId") || "",
  storageBucket: params.get("storageBucket") || "",
  messagingSenderId: params.get("messagingSenderId") || "",
  appId: params.get("appId") || "",
};

firebase.initializeApp(config);
const messaging = firebase.messaging();

function adminUrl() {
  return new URL("admin.html", self.registration.scope).href;
}

messaging.onBackgroundMessage((payload) => {
  // When Cloud Functions sends a notification payload, FCM/browser displays it
  // automatically while the Admin app is backgrounded or closed. Do not show a
  // second notification from the service worker.
  if (payload.notification) return;

  // Fallback for any legacy/data-only message.
  const data = payload.data || {};
  const title = data.title || "BKK-CUTZ";
  const body = data.body || "มีการแจ้งเตือนใหม่";
  return self.registration.showNotification(title, {
    body,
    tag: data.tag || "bkk-admin-notification",
    renotify: false,
    data: { url: data.url || adminUrl() },
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url || adminUrl();
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of windows) {
      if (client.url.includes("admin") && "focus" in client) {
        if ("navigate" in client && client.url !== target) await client.navigate(target);
        return client.focus();
      }
    }
    return self.clients.openWindow(target);
  })());
});
