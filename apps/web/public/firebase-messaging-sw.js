// Firebase Messaging Service Worker
// Handles background push notifications when the app is not in focus.

importScripts('https://www.gstatic.com/firebasejs/11.0.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/11.0.0/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: 'AIzaSyBgYWj2XF_hGMNwTuFfVuo4bdsFgEx2YhA',
  authDomain: 'mzadat-s-web.firebaseapp.com',
  projectId: 'mzadat-s-web',
  storageBucket: 'mzadat-s-web.firebasestorage.app',
  messagingSenderId: '203712137565',
  appId: '1:203712137565:web:7778c793095ab74cc980b4',
  measurementId: 'G-PBG3GZH10D',
})

const messaging = firebase.messaging()

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  const { title, body, icon } = payload.notification ?? {}

  self.registration.showNotification(title ?? 'Mzadat', {
    body: body ?? '',
    icon: icon ?? '/logo/icon-192.png',
    badge: '/logo/badge-72.png',
    data: payload.data,
  })
})

// Open / focus the app window when a notification is clicked
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.link ?? '/'
  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if (client.url === url && 'focus' in client) return client.focus()
        }
        return clients.openWindow(url)
      }),
  )
})
