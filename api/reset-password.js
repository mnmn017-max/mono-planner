/**
 * MONO PLANNER - 마스터의 계정 비밀번호 재설정 (Vercel Serverless Function)
 * ============================================================
 * 클라이언트(index.html의 saveResetPassword)가 이 API를 호출합니다.
 *
 * 보안 원칙:
 *   - 기존 비밀번호는 절대 조회하지 않음 (Firebase Auth는애초에 원문을 저장하지 않음)
 *   - 호출자가 Firebase 로그인 상태인지 + role이 'master'인지 서버에서 직접 검증
 *   - 대상 계정의 role이 'master'이면 재설정 차단 (다른 마스터 비밀번호는 못 바꾸게)
 *
 * 필요한 환경변수 (cleanup.js와 동일하게 이미 Vercel에 설정되어 있어야 함):
 *   - FIREBASE_SERVICE_ACCOUNT : Firebase 서비스 계정 키 JSON을 base64로 인코딩한 문자열
 *     (이미 채팅 첨부파일 자동정리 기능을 위해 설정하셨다면 그대로 재사용됩니다)
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

  // 1) 호출자 인증 확인
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

  const db = admin.firestore();

  // 2) 호출자가 master 역할인지 확인
  try {
    const callerDoc = await db.collection("users").doc(callerUid).get();
    if (!callerDoc.exists || callerDoc.data().role !== "master") {
      res.status(403).json({ error: "마스터 권한이 필요합니다." });
      return;
    }
  } catch (e) {
    res.status(500).json({ error: "권한 확인 중 오류: " + e.message });
    return;
  }

  // 3) 요청 값 검증
  const { targetUid, newPassword } = req.body || {};
  if (!targetUid || typeof targetUid !== "string") {
    res.status(400).json({ error: "대상 계정이 지정되지 않았습니다." });
    return;
  }
  if (!newPassword || typeof newPassword !== "string" || newPassword.length < 6) {
    res.status(400).json({ error: "새 비밀번호는 6자 이상이어야 합니다." });
    return;
  }

  // 4) 대상 계정이 다른 마스터가 아닌지 확인 (마스터끼리 비밀번호 변경 방지)
  try {
    const targetDoc = await db.collection("users").doc(targetUid).get();
    if (!targetDoc.exists) {
      res.status(404).json({ error: "대상 계정을 찾을 수 없습니다." });
      return;
    }
    if (targetDoc.data().role === "master" && targetUid !== callerUid) {
      res.status(403).json({ error: "다른 마스터 계정의 비밀번호는 변경할 수 없습니다." });
      return;
    }
  } catch (e) {
    res.status(500).json({ error: "대상 계정 확인 중 오류: " + e.message });
    return;
  }

  // 5) 실제 비밀번호 재설정 (Firebase Admin SDK)
  try {
    await admin.auth().updateUser(targetUid, { password: newPassword });
    res.status(200).json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "비밀번호 변경 실패: " + e.message });
  }
};
