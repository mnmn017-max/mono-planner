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
 *
 * 중복 알림 방지:
 *   - 안드로이드에서는 앱이 "포그라운드인지 백그라운드인지" 애매한 상태가 있어서,
 *     이 서비스워커의 onBackgroundMessage와 앱(페이지) 안의 onMessage가
 *     같은 메시지 하나에 대해 동시에 실행되는 경우가 있습니다.
 *   - 그래서 showNotification()의 tag를 FCM이 메시지마다 부여하는 고유값
 *     (payload.messageId, 없으면 채팅방 roomId)으로 맞춰서, 두 경로가 동시에
 *     실행되더라도 같은 tag면 브라우저가 알아서 하나로 합쳐(덮어써) 보여주도록
 *     합니다. 앱(index.html) 쪽도 반드시 이 파일과 같은 우선순위로 tag를
 *     정해야 합니다 - 둘이 다른 tag를 쓰면 다시 중복이 생깁니다.
 */

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// 새 버전의 서비스워커가 배포되면, 사용자가 앱을 완전히 껐다 켜지 않아도
// "즉시" 이전 버전을 밀어내고 활성화되도록 함. (안 이러면 오래된 서비스워커가
// 계속 남아서 새 버전이랑 동시에 알림을 처리하는 바람에 - 중복 알림, 클릭해도
// 채팅으로 안 들어가지는 등 - 어떤 게 뜨는지 뒤죽박죽이 되는 문제가 생김)
self.addEventListener('install', function(event){
  self.skipWaiting();
});
self.addEventListener('activate', function(event){
  event.waitUntil(self.clients.claim());
});

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
  var title = (payload.data && payload.data.title) || (payload.notification && payload.notification.title) || 'MONO PLANNER';
  var body = (payload.data && payload.data.body) || (payload.notification && payload.notification.body) || '';

  var options = {
    body: body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    // 앱(index.html)의 onMessage와 반드시 같은 우선순위 - messageId 우선, 없으면 roomId, 그것도 없으면 고정값
    tag: payload.messageId || (payload.data && payload.data.roomId) || 'mono-planner-notification',
    data: payload.data || {},
    vibrate: [100, 50, 100]
  };

  self.registration.showNotification(title, options);
});

// 알림 클릭 시 앱으로 포커스 이동 (열려있으면 포커스, 없으면 새로 열기) - roomId가 있으면 그 채팅방으로 바로 이동
self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  var roomId = event.notification.data && event.notification.data.roomId;
  var targetUrl = roomId ? ('/?openChat=' + encodeURIComponent(roomId)) : '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if ('focus' in client) {
          client.focus();
          if (roomId && 'postMessage' in client) {
            client.postMessage({ type: 'open-chat-room', roomId: roomId });
          }
          return;
        }
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});
