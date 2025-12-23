// Custom service worker code for push notifications
// This file is automatically included by next-pwa

// Handle push notifications
self.addEventListener("push", (event) => {
    console.log("[SW] Push received:", event);

    if (!event.data) {
        console.log("[SW] No data in push event");
        return;
    }

    try {
        const data = event.data.json();
        console.log("[SW] Push data:", data);

        const options = {
            body: data.body || "You have a notification",
            icon: "/icons/icon-192x192.png",
            badge: "/icons/icon-72x72.png",
            vibrate: [200, 100, 200, 100, 200],
            tag: data.tag || "reach-notification",
            renotify: true,
            requireInteraction: data.type === "incoming_call",
            data: {
                url: data.url || "/",
                type: data.type,
                callerId: data.callerId,
                callerName: data.callerName,
            },
            actions:
                data.type === "incoming_call"
                    ? [
                          { action: "answer", title: "Answer" },
                          { action: "decline", title: "Decline" },
                      ]
                    : [],
        };

        event.waitUntil(
            self.registration.showNotification(
                data.title || "Reach",
                options
            )
        );
    } catch (err) {
        console.error("[SW] Error processing push:", err);
    }
});

// Handle notification clicks
self.addEventListener("notificationclick", (event) => {
    console.log("[SW] Notification click:", event);

    event.notification.close();

    const data = event.notification.data || {};
    const action = event.action;

    // Handle call actions
    if (data.type === "incoming_call") {
        if (action === "decline") {
            // Just close the notification
            return;
        }
        // For answer or general click, open the app
    }

    // Open or focus the app
    event.waitUntil(
        clients
            .matchAll({ type: "window", includeUncontrolled: true })
            .then((clientList) => {
                // If app is already open, focus it
                for (const client of clientList) {
                    if (client.url.includes(self.location.origin)) {
                        return client.focus();
                    }
                }
                // Otherwise open new window
                return clients.openWindow(data.url || "/");
            })
    );
});

// Handle subscription change
self.addEventListener("pushsubscriptionchange", (event) => {
    console.log("[SW] Subscription changed");
    event.waitUntil(
        self.registration.showNotification("Reach", {
            body: "Please open the app to restore notifications",
            icon: "/icons/icon-192x192.png",
        })
    );
});



