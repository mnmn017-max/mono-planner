/**
 * MONO PLANNER - 채팅 푸시 알림 발송 (Vercel Serverless Function) v2
 * ============================================================
 * v1 대비 개선사항:
 *   - 수신자가 여러 명일 때 순차 처리 → 병렬 처리로 변경 (지연 감소)
 *   - webpush Urgency: high 헤더 추가 (전달 우선순위 상승)
 *   - TTL(유효시간) 명시 - 오래 지연된 알림이 뒤늦게 우르르 오는 것 방지
 *   - 상세 결과 로그 (어떤 대상이 실패했는지 응답에 포함)
 *
 * 필요한 환경변수 (cleanup.js, reset-password.js와 동일하게 재사용):
 *   - FIREBASE_SERVICE_ACCOUNT
 */

const admin = require("firebase-admin");

function ensureFirebaseAdmin() {
  if (admin.apps.length > 0) return;
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!b64) throw new Error("FIREBASE_SERVICE_ACCOUNT 환경변수가 설정되지 않았습니다.");
  const json = JSON.parse(Buffer.from(b64, "base64").toString("utf-8"));
  admin.initializeApp({
    credential: admin.credential.cert(json),
  });
}

module.exports = async function handler(req, res) {
  // ── 진단용 임시 코드: 이 함수가 실제로 몇 번 호출되는지, 매 호출마다 FCM이
  // 실제로 어떤 messageId를 돌려주는지 응답에 그대로 담아서 눈으로 확인한다.
  // (원인 다 찾고 나면 이 로그 관련 부분은 다시 정리해서 없애면 됩니다)
  const requestId = Math.random().toString(36).slice(2, 8) + '-' + Date.now();
  console.log('[send-push] 함수 호출 시작 requestId=' + requestId);

  if (req.method !== "POST") {
    res.status(405).json({ error: "POST 요청만 허용됩니다." });
    return;
  }

  try {
    ensureFirebaseAdmin();
  } catch (e) {
    res.status(500).json({ error: "서버 설정 오류: " + e.message });
    return;
  }

  const authHeader = req.headers["authorization"] || "";
  if (!authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "인증되지 않은 요청입니다." });
    return;
  }
  let callerUid;
  try {
    const idToken = authHeader.substring(7);
    const decoded = await admin.auth().verifyIdToken(idToken);
    callerUid = decoded.uid;
  } catch (e) {
    res.status(401).json({ error: "인증 토큰이 유효하지 않습니다." });
    return;
  }

  const { targetUids, title, body, data } = req.body || {};
  if (!Array.isArray(targetUids) || targetUids.length === 0) {
    res.status(400).json({ error: "알림을 받을 대상이 없습니다." });
    return;
  }
  if (!title || !body) {
    res.status(400).json({ error: "제목과 본문이 필요합니다." });
    return;
  }

  const db = admin.firestore();
  const uniqueTargets = Array.from(new Set(targetUids)).filter(function (uid) { return uid !== callerUid; });

  if (uniqueTargets.length === 0) {
    res.status(200).json({ sent: 0, skipped: 0, failed: 0, details: [] });
    return;
  }

  // 대상 uid들의 fcmToken을 병렬로 조회
  const userDocs = await Promise.all(
    uniqueTargets.map(function (uid) {
      return db.collection("users").doc(uid).get().catch(function () { return null; });
    })
  );

  const sendJobs = [];
  const details = [];

  uniqueTargets.forEach(function (uid, i) {
    const userDoc = userDocs[i];
    const token = userDoc && userDoc.exists ? userDoc.data().fcmToken : null;
    if (!token) {
      details.push({ uid: uid, status: "skipped", reason: "no-token" });
      return;
    }
    sendJobs.push(
      admin.messaging().send({
        token: token,
        // notification 필드(최상위, webpush 하위 둘 다)를 넣지 않는다 - 이게 있으면
        // 브라우저가 "알아서" 자동으로 알림을 띄우는 경로가 별도로 하나 더 생겨서,
        // 앱 코드가 직접 띄우는 알림(포그라운드/백그라운드)과 겹쳐 2~4개씩 중복으로
        // 뜨는 원인이 됐다. title/body를 data로만 보내고, 알림을 실제로 만드는 건
        // 오직 앱 코드(foreground onMessage / SW onBackgroundMessage) 한 곳으로 통일한다.
        data: Object.assign({}, data || {}, {
          title: String(title).slice(0, 80),
          body: String(body).slice(0, 200),
          click_action: "FLUTTER_NOTIFICATION_CLICK"
        }),
        android: { priority: "high" },
        apns: {
          headers: { "apns-priority": "10" },
          payload: { aps: { sound: "default", "content-available": 1 } }
        },
        webpush: {
          headers: { Urgency: "high", TTL: "300" }, // 5분 안에 전달 못하면 폐기 (오래된 알림 뒤늦게 몰아오는 것 방지)
          fcmOptions: { link: "/" }
        }
      })
        .then(function (fcmMessageId) {
          // 진단용: FCM이 실제로 몇 번, 어떤 messageId로 응답했는지 그대로 기록
          console.log('[send-push] requestId=' + requestId + ' uid=' + uid + ' → FCM messageId=' + fcmMessageId);
          details.push({ uid: uid, status: "sent", requestId: requestId, fcmMessageId: fcmMessageId });
        })
        .catch(function (e) {
          details.push({ uid: uid, status: "failed", reason: e.code || e.message, requestId: requestId });
          if (e && (e.code === "messaging/registration-token-not-registered" || e.code === "messaging/invalid-registration-token")) {
            db.collection("users").doc(uid).update({ fcmToken: admin.firestore.FieldValue.delete() }).catch(function () {});
          }
        })
    );
  });

  await Promise.all(sendJobs);

  const sent = details.filter(function (d) { return d.status === "sent"; }).length;
  const skipped = details.filter(function (d) { return d.status === "skipped"; }).length;
  const failed = details.filter(function (d) { return d.status === "failed"; }).length;

  res.status(200).json({ requestId: requestId, sent: sent, skipped: skipped, failed: failed, details: details });
};
