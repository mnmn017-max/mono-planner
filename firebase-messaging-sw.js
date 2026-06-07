importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDnAr8er9NTegYGfIeVErrC96zvO9JlvgQ",
  authDomain: "mono-planner-75a60.firebaseapp.com",
  projectId: "mono-planner-75a60",
  storageBucket: "mono-planner-75a60.firebasestorage.app",
  messagingSenderId: "948778604548",
  appId: "1:948778604548:web:99470273105c125d41fd51"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  var title = (payload.notification && payload.notification.title) || '새 메시지';
  var body  = (payload.notification && payload.notification.body)  || '';
  self.registration.showNotification(title, {
    body: body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'mono-chat',
    renotify: true,
    data: payload.data || {}
  });
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(list) {
      for (var i = 0; i < list.length; i++) {
        if (list[i].url && 'focus' in list[i]) return list[i].focus();
      }
      if (clients.openWindow) return clients.openWindow('/');
    })
  );
});
