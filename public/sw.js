// JD Internacional — Service Worker for Web Push Notifications

self.addEventListener('push', event => {
  if (!event.data) return

  let data = {}
  try { data = event.data.json() } catch { data = { title: 'JD Internacional', body: event.data.text() } }

  const title = data.title || 'JD Internacional'
  const options = {
    body: data.body || '',
    icon: '/logo.png',
    badge: '/logo.png',
    data: { link: data.link || '/dashboard/services/whatsapp' },
    vibrate: [200, 100, 200],
    requireInteraction: false,
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const link = event.notification.data?.link || '/dashboard/services/whatsapp'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(link)
          return client.focus()
        }
      }
      if (clients.openWindow) return clients.openWindow(link)
    })
  )
})
