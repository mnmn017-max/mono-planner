// /api/deungbul-reminders.js
// 등불 복습 OMR 마감 알림 (Vercel Cron, 하루 1회)
//  - 아직 제출하지 않았고 마감까지 24시간 이내로 남은 학생 → "마감 임박" 알림 (1회)
//  - 마감이 지났는데 제출하지 않은 학생 → "기한 지남 · 지금 제출하면 지연 표시" 알림 (1회)
// 필요한 환경변수: FIREBASE_SERVICE_ACCOUNT (기존 API와 동일), CRON_SECRET
// 수동 실행: 마스터 계정 ID 토큰(Authorization: Bearer <idToken>)으로도 호출 가능

const admin = require('firebase-admin');

function ensureAdmin() {
  if (admin.apps.length) return admin.firestore();
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT 환경변수가 없습니다');
  let json;
  try { json = JSON.parse(Buffer.from(raw, 'base64').toString('utf8')); } catch (e) { json = JSON.parse(raw); }
  admin.initializeApp({ credential: admin.credential.cert(json) });
  return admin.firestore();
}

async function sendPush(db, uid, title, body) {
  const u = await db.collection('users').doc(uid).get().catch(() => null);
  const token = u && u.exists ? u.data().fcmToken : null;
  if (!token) return 'no-token';
  try {
    await admin.messaging().send({
      token: token,
      data: { title: String(title).slice(0, 80), body: String(body).slice(0, 200), type: 'deungbul', click_action: 'FLUTTER_NOTIFICATION_CLICK' },
      webpush: { headers: { Urgency: 'high', TTL: '3600' }, fcmOptions: { link: '/' } }
    });
    return 'sent';
  } catch (e) { return 'failed:' + (e.code || e.message); }
}

module.exports = async function handler(req, res) {
  let db;
  try { db = ensureAdmin(); } catch (e) { return res.status(500).json({ error: e.message }); }

  const auth = req.headers['authorization'] || '';
  const isCron = process.env.CRON_SECRET && auth === 'Bearer ' + process.env.CRON_SECRET;
  if (!isCron) {
    try {
      const decoded = await admin.auth().verifyIdToken(auth.replace(/^Bearer\s+/i, ''));
      const ud = await db.collection('users').doc(decoded.uid).get();
      if (!ud.exists || ud.data().role !== 'master') return res.status(403).json({ error: '마스터 계정만 실행할 수 있습니다' });
    } catch (e) { return res.status(401).json({ error: '인증 실패' }); }
  }

  const now = Date.now();
  const out = { scanned: 0, soon: 0, overdue: 0, results: [] };
  const s1 = await db.collection('reviewSheets').where('status', '==', 'assigned').get();
  const s2 = await db.collection('reviewSheets').where('needsResubmit', '==', true).get();
  const seen = new Set();
  const docs = s1.docs.concat(s2.docs).filter(d => { if (seen.has(d.id)) return false; seen.add(d.id); return true; });
  for (const d of docs) {
    out.scanned++;
    const s = d.data();
    if (!s.uid || !s.dueAtMs) continue;
    const left = s.dueAtMs - now;
    if (left > 0 && left <= 24 * 3600 * 1000 && !s.remindSoonAt) {
      const hrs = Math.max(1, Math.round(left / 3600000));
      const r = await sendPush(db, s.uid, '🏮 등불 복습 마감 임박', '「' + (s.examTitle || '') + '」 복습 OMR 마감까지 약 ' + hrs + '시간 남았어요.');
      await d.ref.update({ remindSoonAt: now });
      out.soon++; out.results.push({ id: d.id, type: 'soon', r });
    } else if (left <= 0 && !s.remindOverdueAt) {
      const r = await sendPush(db, s.uid, '🏮 등불 복습 기한이 지났어요', '「' + (s.examTitle || '') + '」 복습 OMR을 아직 제출하지 않았어요. 지금 제출하면 지연으로 표시됩니다.');
      await d.ref.update({ remindOverdueAt: now });
      out.overdue++; out.results.push({ id: d.id, type: 'overdue', r });
    }
  }
  return res.status(200).json(out);
};
