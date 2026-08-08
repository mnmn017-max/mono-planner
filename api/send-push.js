/**
 * MONO PLANNER - 채팅 푸시 알림 발송 (Vercel Serverless Function)
 * ============================================================
 * 메시지를 보낸 클라이언트가 이 API를 호출하면, 상대방(들)의 기기로
 * FCM 푸시 알림을 발송합니다. (앱이 백그라운드/종료 상태여도 수신)
 *
 * 필요한 환경변수 (cleanup.js, reset-password.js와 동일하게 재사용):
 *   - FIREBASE_SERVICE_ACCOUNT : Firebase 서비스 계정 키 JSON을 base64로 인코딩한 문자열
 *     (이미 설정되어 있다면 추가 설정 없이 그대로 작동합니다)
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

  // 1) 호출자 인증 확인 (로그인한 사용자만 알림을 트리거할 수 있음)
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
  const results = { sent: 0, skipped: 0, failed: 0 };

  for (const uid of targetUids) {
    if (uid === callerUid) { results.skipped++; continue; } // 본인에게는 보내지 않음
    try {
      const userDoc = await db.collection("users").doc(uid).get();
      const token = userDoc.exists ? userDoc.data().fcmToken : null;
      if (!token) { results.skipped++; continue; }

      await admin.messaging().send({
        token: token,
        notification: { title: String(title).slice(0, 80), body: String(body).slice(0, 200) },
        data: Object.assign({}, data || {}, { click_action: "FLUTTER_NOTIFICATION_CLICK" }),
        webpush: {
          fcmOptions: { link: "/" },
          notification: { icon: "/icon-192.png" }
        }
      });
      results.sent++;
    } catch (e) {
      results.failed++;
      // 토큰이 만료/무효화된 경우 Firestore에서 정리
      if (e && (e.code === "messaging/registration-token-not-registered" || e.code === "messaging/invalid-registration-token")) {
        db.collection("users").doc(uid).update({ fcmToken: admin.firestore.FieldValue.delete() }).catch(function () {});
      }
    }
  }

  res.status(200).json(results);
};
