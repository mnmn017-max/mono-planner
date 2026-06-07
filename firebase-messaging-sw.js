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

// 앱이 백그라운드/종료 상태일 때 수신되는 푸시 알림 처리
messaging.onBackgroundMessage(function(payload) {
  const title = payload.notification?.title || payload.data?.title || '새 메시지';
  const body  = payload.notification?.body  || payload.data?.body  || '';
  const icon  = '/icon-192.png';

  self.registration.showNotification(title, {
    body: body,
    icon: icon,
    badge: icon,
    tag: 'mono-chat',        // 같은 tag면 기존 알림 덮어쓰기
    renotify: true,
    data: payload.data || {}
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
