/**
 * MONO PLANNER - FCM 백그라운드 알림 서비스워커
 * ============================================================
 * 이 파일은 반드시 프로젝트 루트(도메인 최상위)에 위치해야 합니다.
 * 예: https://mono-planner.vercel.app/firebase-messaging-sw.js
 *
 * 앱이 백그라운드에 있거나 완전히 종료된 상태에서도
 * 이 서비스워커가 푸시 메시지를 수신해서 OS 알림으로 띄워줍니다.
 *
 * 아이폰/아이패드 참고사항:
 *   - iOS 16.4 이상에서만 웹 푸시가 지원됩니다.
 *   - 반드시 "홈 화면에 추가"로 설치된 앱에서만 동작합니다
 *     (Safari 브라우저 탭 상태에서는 iOS가 웹 푸시를 지원하지 않습니다).
 */

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

// 백그라운드(또는 앱 종료 상태)에서 푸시 수신 시 OS 알림 표시
messaging.onBackgroundMessage(function (payload) {
  var title = (payload.notification && payload.notification.title) || (payload.data && payload.data.title) || 'MONO PLANNER';
  var body = (payload.notification && payload.notification.body) || (payload.data && payload.data.body) || '';

  var options = {
    body: body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: (payload.data && payload.data.roomId) || 'mono-planner-notification',
    data: payload.data || {},
    vibrate: [100, 50, 100]
  };

  self.registration.showNotification(title, options);
});

// 알림 클릭 시 앱으로 포커스 이동 (열려있으면 포커스, 없으면 새로 열기)
self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if ('focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow('/');
    })
  );
});
