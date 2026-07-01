/**
 * MONO PLANNER - 채팅 첨부파일 자동 정리 (Vercel Serverless Function)
 * ============================================================
 * 두 가지 방식으로 실행됩니다:
 *   1) Vercel Cron이 매일 자동 호출 (vercel.json에 설정된 스케줄)
 *   2) 앱의 마스터 도구에서 "지금 바로 정리" 버튼 클릭 시 수동 호출
 *
 * 필요한 환경변수 (Vercel 대시보드 > Settings > Environment Variables):
 *   - CLOUDINARY_API_KEY       : Cloudinary Dashboard > Settings > Access Keys
 *   - CLOUDINARY_API_SECRET    : 위와 동일 위치
 *   - FIREBASE_SERVICE_ACCOUNT : Firebase 서비스 계정 키 JSON을 base64로 인코딩한 문자열
 *   - CRON_SECRET              : Vercel Cron 요청을 검증하기 위한 임의의 비밀 문자열
 *
 * 서비스 계정 키 발급 방법:
 *   Firebase Console > 프로젝트 설정 > 서비스 계정 > "새 비공개 키 생성"
 *   다운로드된 JSON 파일 전체를 base64로 인코딩해서 FIREBASE_SERVICE_ACCOUNT에 넣습니다.
 *   (base64 인코딩 방법은 README 참고)
 */

const admin = require("firebase-admin");
const { v2: cloudinary } = require("cloudinary");

const RETENTION_DAYS = 30;

// Firebase Admin 초기화 (콜드스타트마다 한 번만)
function ensureFirebaseAdmin() {
  if (admin.apps.length > 0) return;
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!b64) throw new Error("FIREBASE_SERVICE_ACCOUNT 환경변수가 설정되지 않았습니다.");
  const json = JSON.parse(Buffer.from(b64, "base64").toString("utf-8"));
  admin.initializeApp({
    credential: admin.credential.cert(json),
  });
}

function configureCloudinary() {
  cloudinary.config({
    cloud_name: "dhoxxsyh4",
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

function extractPublicId(url) {
  try {
    const u = new URL(url);
    const parts = u.pathname.split("/upload/");
    if (parts.length < 2) return null;
    let afterUpload = parts[1];
    afterUpload = afterUpload.replace(/^v\d+\//, "");
    const lastDot = afterUpload.lastIndexOf(".");
    const publicId = lastDot > -1 ? afterUpload.substring(0, lastDot) : afterUpload;
    let resourceType = "image";
    if (u.pathname.includes("/video/upload/")) resourceType = "video";
    if (u.pathname.includes("/raw/upload/")) resourceType = "raw";
    return { publicId, resourceType };
  } catch (e) {
    return null;
  }
}

async function runCleanup() {
  ensureFirebaseAdmin();
  configureCloudinary();
  const db = admin.firestore();

  const cutoff = admin.firestore.Timestamp.fromMillis(
    Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000
  );

  const stats = { scanned: 0, deleted: 0, errors: 0 };

  const roomsSnap = await db.collection("chatRooms").get();

  for (const roomDoc of roomsSnap.docs) {
    const msgsSnap = await db
      .collection("chatRooms")
      .doc(roomDoc.id)
      .collection("messages")
      .where("createdAt", "<", cutoff)
      .get();

    for (const msgDoc of msgsSnap.docs) {
      const data = msgDoc.data();
      if (!data.fileUrl) continue;
      stats.scanned++;

      const info = extractPublicId(data.fileUrl);
      if (!info) {
        stats.errors++;
        continue;
      }

      try {
        await cloudinary.uploader.destroy(info.publicId, {
          resource_type: info.resourceType,
          invalidate: true,
        });
        await msgDoc.ref.update({
          fileUrl: admin.firestore.FieldValue.delete(),
          fileName: admin.firestore.FieldValue.delete(),
          text: data.text || "📎 (첨부파일 - 30일 경과로 자동 삭제됨)",
          fileExpired: true,
        });
        stats.deleted++;
      } catch (e) {
        stats.errors++;
      }
    }
  }

  return stats;
}

module.exports = async function handler(req, res) {
  // 1) Vercel Cron이 호출하는 경우 - Authorization 헤더 검증
  const authHeader = req.headers["authorization"] || "";
  const isCron = authHeader === `Bearer ${process.env.CRON_SECRET}`;

  // 2) 앱의 마스터 도구에서 호출하는 경우 - Firebase ID 토큰 검증 + master 권한 확인
  let isMasterUser = false;
  if (!isCron && authHeader.startsWith("Bearer ")) {
    try {
      ensureFirebaseAdmin();
      const idToken = authHeader.substring(7);
      const decoded = await admin.auth().verifyIdToken(idToken);
      const userDoc = await admin.firestore().collection("users").doc(decoded.uid).get();
      if (userDoc.exists && userDoc.data().role === "master") {
        isMasterUser = true;
      }
    } catch (e) {
      // 토큰 검증 실패 - isMasterUser는 false로 유지
    }
  }

  if (!isCron && !isMasterUser) {
    res.status(401).json({ error: "인증되지 않은 요청입니다." });
    return;
  }

  try {
    const stats = await runCleanup();
    res.status(200).json(stats);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
