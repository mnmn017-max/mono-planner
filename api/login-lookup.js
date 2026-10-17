/**
 * MONO PLANNER - 로그인용 아이디 조회 (Vercel Serverless Function)
 * ============================================================
 * 로그인 화면은 아직 로그인 전이라 Firestore users 컬렉션을 직접 읽을 수 없습니다
 * (보안 규칙에서 로그인 전 읽기를 막음). 그래서 아이디 → 로그인용 이메일만 서버에서 찾아 줍니다.
 *  - 비밀번호 확인은 여전히 Firebase Auth가 합니다 (이 API는 이메일만 알려 줌)
 *  - 이름·학교·성적 등 다른 정보는 절대 돌려주지 않음
 * 필요한 환경변수: FIREBASE_SERVICE_ACCOUNT (기존 API와 동일)
 */
const admin = require("firebase-admin");

function ensureFirebaseAdmin() {
  if (admin.apps.length > 0) return;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT 환경변수가 설정되지 않았습니다.");
  let json;
  try { json = JSON.parse(Buffer.from(raw, "base64").toString("utf-8")); } catch (e) { json = JSON.parse(raw); }
  admin.initializeApp({ credential: admin.credential.cert(json) });
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  const username = String((body && body.username) || "").trim();
  const type = (body && body.type) === "teacher" ? "teacher" : "student";
  if (!username || username.length > 60) return res.status(400).json({ error: "아이디를 입력해 주세요." });
  try {
    ensureFirebaseAdmin();
    const snap = await admin.firestore().collection("users").where("username", "==", username).get();
    const accounts = snap.docs
      .map(d => d.data())
      .filter(u => u.email && (type === "teacher" ? (u.role === "teacher" || u.role === "master") : u.role === "student"))
      .map(u => ({ email: u.email, role: u.role }));
    return res.status(200).json({ found: !snap.empty, accounts });
  } catch (e) {
    return res.status(500).json({ error: "조회 실패" });
  }
};
