self.addEventListener("push", (event) => {
  let data = { title: "Ziklink", body: "", link: "/" };
  try {
    data = event.data.json();
  } catch {
    // corps non-JSON — on garde les valeurs par défaut
  }

  event.waitUntil(
    self.registration.showNotification(data.title || "Ziklink", {
      body: data.body || "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { link: data.link || "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = event.notification.data?.link || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.endsWith(link) && "focus" in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(link);
    })
  );
});
