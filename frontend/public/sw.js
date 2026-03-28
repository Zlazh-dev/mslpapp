self.addEventListener('push', (event) => {
    let data;
    try {
        data = event.data.json();
    } catch (e) {
        data = { title: 'Pesan Baru', body: event.data.text() || 'Anda menerima pesan baru' };
    }

    const options = {
        body: data.body,
        icon: '/logo.png', // Assuming there's a logo.png
        badge: '/logo.png',
        vibrate: [200, 100, 200],
        data: {
            url: data.url || '/chat'
        },
        actions: [
            { action: 'open', title: 'Buka Obrolan' }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    if (event.action === 'open' || !event.action) {
        event.waitUntil(
            clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
                const urlToOpen = new URL(event.notification.data.url, self.location.origin).href;

                // If already open, focus it
                for (const client of clientList) {
                    if (client.url === urlToOpen && 'focus' in client) {
                        return client.focus();
                    }
                }
                // Otherwise open a new window
                if (clients.openWindow) {
                    return clients.openWindow(urlToOpen);
                }
            })
        );
    }
});
