// Service worker for Globaal Elevate PWA — handles incoming web-push events
// and notification clicks. Kept minimal (no offline caching) on purpose.

self.addEventListener('push', function (event) {
  if (!event.data) return
  let data = {}
  try {
    data = event.data.json()
  } catch (e) {
    data = { title: 'Globaal Elevate', body: event.data.text() }
  }
  const title = data.title || 'Globaal Elevate'
  const options = {
    body: data.body || '',
    icon: data.icon || '/icon-192x192.png',
    badge: '/icon-192x192.png',
    vibrate: [100, 50, 100],
    tag: data.tag || undefined,
    data: { url: data.url || '/dashboard' },
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', function (event) {
  event.notification.close()
  const target = (event.notification.data && event.notification.data.url) || '/dashboard'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      // Focus an existing tab if one is open, otherwise open a new one.
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(target)
          return client.focus()
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(target)
    })
  )
})
