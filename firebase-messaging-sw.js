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

// 백그라운드/종료 상태일 때만 알림 표시
messaging.onBackgroundMessage(function(payload) {
  // 포그라운드 클라이언트가 있으면 알림 표시 안 함 (onMessage가 처리)
  self.clients.matchAll({ type: 'window', includeUncontrolled: false }).then(function(clients) {
    // 포그라운드 탭/PWA가 있으면 스킵
    var hasForeground = clients.some(function(c) { return c.visibilityState === 'visible'; });
    if (hasForeground) return;

    var title = (payload.notification && payload.notification.title) || (payload.data && payload.data.title) || '새 메시지';
    var body  = (payload.notification && payload.notification.body)  || (payload.data && payload.data.body)  || '';

    self.registration.showNotification(title, {
      body: body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'mono-chat-' + Date.now(),
      renotify: true,
      data: payload.data || {}
    });
  });
});

// 알림 클릭 시 앱 열기
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
