/**
 * MONO PLANNER - 생성한 성적표 보관함 (Vercel Serverless Function)
 * 선생님·마스터만 생성/조회/삭제할 수 있고 학생은 접근할 수 없다(호출자 role을 서버에서 확인).
 * 저장 위치: Firestore cardArchive/{id}  { branch, studentUid, studentName, title, themeId, payload, createdBy, createdByName, createdAt }
 * POST body: { action: 'create' | 'list' | 'get' | 'update' | 'delete', ... }  (수정: 마스터=전체, 선생님=본인 작성분)
 * 환경변수: FIREBASE_SERVICE_ACCOUNT (다른 API와 같음)
 */
const admin = require("firebase-admin");
function ensure() {
  if (admin.apps.length) return;
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!b64) throw new Error("FIREBASE_SERVICE_ACCOUNT 환경변수가 없습니다.");
  admin.initializeApp({ credential: admin.credential.cert(JSON.parse(Buffer.from(b64, "base64").toString("utf-8"))) });
}
module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST만 허용" });
  try { ensure(); } catch (e) { return res.status(500).json({ error: "서버 설정 오류: " + e.message }); }
  const h = req.headers["authorization"] || "";
  if (!h.startsWith("Bearer ")) return res.status(401).json({ error: "인증되지 않은 요청" });
  let uid;
  try { uid = (await admin.auth().verifyIdToken(h.substring(7))).uid; } catch (e) { return res.status(401).json({ error: "토큰이 유효하지 않음" }); }
  const db = admin.firestore();
  const me = await db.collection("users").doc(uid).get();
  const role = me.exists ? me.data().role : null;
  if (role !== "teacher" && role !== "master") return res.status(403).json({ error: "선생님·마스터만 사용할 수 있어요." });
  const myBranch = me.data().branch || "";
  const b = req.body || {};
  const col = db.collection("cardArchive");
  try {
    if (b.action === "create") {
      const items = Array.isArray(b.items) ? b.items : [b.item];
      if (!items.length || items.length > 60) return res.status(400).json({ error: "항목 수 오류" });
      const branch = b.branch || myBranch;
      const batch = db.batch(), ids = [];
      items.forEach(function (it) {
        if (!it || !it.payload || !it.studentUid) return;
        const ref = col.doc(); ids.push(ref.id);
        batch.set(ref, {
          branch, studentUid: String(it.studentUid), studentName: String(it.studentName || ""), title: String(it.title || "성적표").slice(0, 120),
          themeId: it.themeId || null, examCount: it.examCount || null, payload: it.payload,
          createdBy: uid, createdByName: me.data().name || "", createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
      });
      await batch.commit();
      return res.json({ ok: true, ids });
    }
    if (b.action === "list") {
      const branch = b.branch || myBranch;
      const snap = await col.where("branch", "==", branch).get();
      const list = snap.docs.map(function (d) { const x = d.data(); return { id: d.id, studentUid: x.studentUid, studentName: x.studentName, title: x.title, themeId: x.themeId, examCount: x.examCount, createdBy: x.createdBy, createdByName: x.createdByName, updatedByName: x.updatedByName || null, updatedAt: x.updatedAt ? x.updatedAt.toMillis() : 0, createdAt: x.createdAt ? x.createdAt.toMillis() : 0 }; })
        .sort(function (a, c) { return c.createdAt - a.createdAt; }).slice(0, b.limit || 500);
      return res.json({ ok: true, list });
    }
    if (b.action === "get") {
      const d = await col.doc(String(b.id)).get();
      if (!d.exists) return res.status(404).json({ error: "없음" });
      const x = d.data();
      if (role !== "master" && x.branch !== myBranch) return res.status(403).json({ error: "다른 지점 자료" });
      return res.json({ ok: true, item: Object.assign({ id: d.id }, x, { createdAt: x.createdAt ? x.createdAt.toMillis() : 0, updatedAt: x.updatedAt ? x.updatedAt.toMillis() : 0 }) });
    }
    if (b.action === "update") {
      // 수정: 마스터는 모든 성적표, 선생님은 자기가 만든 성적표만
      const ref = col.doc(String(b.id)), d = await ref.get();
      if (!d.exists) return res.status(404).json({ error: "없음" });
      const x = d.data();
      if (role !== "master" && x.createdBy !== uid) return res.status(403).json({ error: "작성자와 마스터만 수정할 수 있어요." });
      const p = b.patch || {}, payload = Object.assign({}, x.payload);
      if (p.themeId != null) payload.themeId = Number(p.themeId);
      if (p.comment != null) payload.comment = String(p.comment).slice(0, 2000);
      if (p.include && typeof p.include === "object") payload.include = Object.assign({}, payload.include || {}, p.include);
      const upd = { payload, updatedBy: uid, updatedByName: me.data().name || "", updatedAt: admin.firestore.FieldValue.serverTimestamp() };
      if (p.themeId != null) upd.themeId = Number(p.themeId);
      if (p.title) upd.title = String(p.title).slice(0, 120);
      await ref.update(upd);
      return res.json({ ok: true });
    }
    if (b.action === "delete") {
      const d = await col.doc(String(b.id)).get();
      if (!d.exists) return res.json({ ok: true });
      if (role !== "master" && d.data().createdBy !== uid) return res.status(403).json({ error: "작성자와 마스터만 삭제할 수 있어요." });
      await col.doc(String(b.id)).delete();
      return res.json({ ok: true });
    }
    return res.status(400).json({ error: "알 수 없는 action" });
  } catch (e) { return res.status(500).json({ error: e.message }); }
};
