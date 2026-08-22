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

// FCM은 "최소 1번 이상 전달"을 보장하는 시스템이라, 네트워크 상황에 따라 같은 메시지가
// 실제로 2~3번 중복 전달되는 경우가 드물게 있다 (구글 공식 문서에도 명시된 특성).
// 게다가 안드로이드는 리소스 관리를 위해 서비스워커를 수시로 껐다 켜서, 3개가 "거의 동시에"
// 도착하면 서비스워커가 병렬로 여러 번 깨어나 실행될 수 있다.
// Cache Storage의 "읽어서 확인 → 없으면 쓰기" 방식은, 이 병렬 실행들이 서로 "확인"하는
// 순간이 겹치면(둘 다 아직 안 써진 상태를 동시에 보고) 여전히 둘 다 통과해버리는 경쟁
// 상태가 남는다. IndexedDB는 "이 id로 무조건 새로 추가 시도 → 이미 있으면 실패"라는
// 방식이 저장소 엔진 차원에서 원자적으로 보장되기 때문에(둘이 동시에 시도해도 반드시
// 하나만 성공), 이 방식으로 바꿔야 완전히 확실하게 걸러진다.
var _DEDUP_DB_NAME = 'mono-planner-dedup';
var _DEDUP_STORE = 'seenMessages';
var _DEDUP_KEEP_LIMIT = 50;

function _openDedupDb(){
  return new Promise(function(resolve, reject){
    var req = indexedDB.open(_DEDUP_DB_NAME, 1);
    req.onupgradeneeded = function(){
      var store = req.result.createObjectStore(_DEDUP_STORE, { keyPath: 'id' });
      store.createIndex('ts', 'ts');
    };
    req.onsuccess = function(){ resolve(req.result); };
    req.onerror = function(){ reject(req.error); };
  });
}

async function _isDuplicateMessage(id){
  if (!id) return false; // messageId가 없는 경우(구버전 등)는 기존 tag 방식에 맡김
  try {
    var db = await _openDedupDb();
    var isDup = await new Promise(function(resolve){
      var tx = db.transaction(_DEDUP_STORE, 'readwrite');
      var store = tx.objectStore(_DEDUP_STORE);
      var addReq = store.add({ id: id, ts: Date.now() });
      // add()는 같은 키(id)가 이미 있으면 반드시 실패한다 - 이 성공/실패 자체가
      // "내가 최초로 이 id를 기록한 쪽인지"를 원자적으로 알려주는 판정 기준이 된다.
      addReq.onsuccess = function(){ resolve(false); }; // 처음 보는 메시지
      addReq.onerror = function(e){ e.preventDefault(); resolve(true); }; // 이미 있음 = 중복
    });

    // 오래된 기록 정리 (매번 하지 않고 가끔만 - id 뒷자리로 대충 1/10 확률 정도만 정리)
    if (Math.random() < 0.1) {
      var tx2 = db.transaction(_DEDUP_STORE, 'readwrite');
      var idx = tx2.objectStore(_DEDUP_STORE).index('ts');
      var cursorReq = idx.openCursor();
      var all = [];
      await new Promise(function(res){
        cursorReq.onsuccess = function(e){
          var cursor = e.target.result;
          if (cursor) { all.push(cursor.primaryKey); cursor.continue(); }
          else res();
        };
        cursorReq.onerror = function(){ res(); };
      });
      if (all.length > _DEDUP_KEEP_LIMIT) {
        var toDelete = all.slice(0, all.length - _DEDUP_KEEP_LIMIT);
        var store2 = tx2.objectStore(_DEDUP_STORE);
        toDelete.forEach(function(key){ store2.delete(key); });
      }
    }

    return isDup;
  } catch (e) {
    console.warn('[FCM] 중복 체크 저장소 오류(무시하고 계속 진행):', e);
    return false;
  }
}

// 백그라운드(또는 앱 종료 상태)에서 푸시 수신 시 OS 알림 표시
messaging.onBackgroundMessage(async function (payload) {
  if (await _isDuplicateMessage(payload.messageId)) {
    console.log('[FCM] 중복 메시지 감지 - 알림 표시 건너뜀:', payload.messageId);
    return;
  }

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
