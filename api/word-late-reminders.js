// /api/word-late-reminders.js
// 단어 Test 밀린 시험 자동 알림 (Vercel Cron, 매일 16:00 KST)
//  - 배정일(date)이 오늘(KST)보다 이전인데 아직 안 본(status=='assigned') 시험을 학생별로 모아 1건 푸시
//  - 시리즈 규칙 lateAlert=false 인 시험은 제외
//  - 같은 날 두 번 실행돼도 중복 발송하지 않음(lateRemindOn 기록)
//  - 담당 선생님(teacherUid)에게는 요약 1건 푸시
// 필요한 환경변수: FIREBASE_SERVICE_ACCOUNT, CRON_SECRET
// 수동 실행: 선생님/마스터 ID 토큰(Authorization: Bearer <idToken>), ?dry=1 이면 발송 없이 결과만

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

function kstToday() {
  const d = new Date(Date.now() + 9 * 3600 * 1000);
  return d.toISOString().slice(0, 10);
}
function daysBetween(a, b) { return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000); }

async function sendPush(db, uid, title, body) {
  const u = await db.collection('users').doc(uid).get().catch(() => null);
  const token = u && u.exists ? u.data().fcmToken : null;
  if (!token) return 'no-token';
  try {
    await admin.messaging().send({
      token: token,
      data: { title: String(title).slice(0, 80), body: String(body).slice(0, 200), type: 'wordtest', click_action: 'FLUTTER_NOTIFICATION_CLICK' },
      webpush: { headers: { Urgency: 'high', TTL: '21600' }, fcmOptions: { link: '/' } }
    });
    return 'sent';
  } catch (e) {
    if (e.code === 'messaging/registration-token-not-registered') {
      await db.collection('users').doc(uid).update({ fcmToken: admin.firestore.FieldValue.delete() }).catch(() => {});
    }
    return 'failed:' + (e.code || e.message);
  }
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
      const role = ud.exists ? ud.data().role : null;
      if (role !== 'master' && role !== 'teacher') return res.status(403).json({ error: '선생님 계정만 실행할 수 있습니다' });
    } catch (e) { return res.status(401).json({ error: '인증 실패' }); }
  }
  const dry = String((req.query && req.query.dry) || '') === '1';

  const today = kstToday();
  const snap = await db.collection('wordAssign').where('status', '==', 'assigned').get();
  const seriesCache = {};
  async function lateOn(sid) {
    if (!sid) return true;
    if (!(sid in seriesCache)) {
      const s = await db.collection('wordSeries').doc(sid).get().catch(() => null);
      seriesCache[sid] = !(s && s.exists && s.data().rules && s.data().rules.lateAlert === false);
    }
    return seriesCache[sid];
  }

  const byStu = {};
  let scanned = 0;
  for (const d of snap.docs) {
    scanned++;
    const a = d.data();
    if (!a.studentUid || !a.date || a.date >= today) continue;
    if (a.lateRemindOn === today) continue;
    if (!(await lateOn(a.seriesId))) continue;
    (byStu[a.studentUid] = byStu[a.studentUid] || []).push({ ref: d.ref, a });
  }

  const out = { today, scanned, students: 0, assigns: 0, teachers: 0, dry, results: [] };
  const byTeacher = {};
  for (const uid of Object.keys(byStu)) {
    const list = byStu[uid].sort((x, y) => (x.a.date < y.a.date ? -1 : 1));
    const n = list.length;
    const oldest = list[0].a;
    const late = daysBetween(oldest.date, today);
    const retests = list.filter(x => x.a.kind === 'retest').length;
    const title = '📚 밀린 단어 Test ' + n + '개';
    let body = n === 1
      ? '「' + (oldest.title || '단어 Test') + '」를 아직 안 봤어요 (' + late + '일 지남). 지금 바로 봐요!'
      : '「' + (oldest.title || '단어 Test') + '」 외 ' + (n - 1) + '개가 밀려 있어요. 가장 오래된 건 ' + late + '일 지났어요.';
    if (retests) body += ' (재시험 ' + retests + '개 포함)';
    const r = dry ? 'dry' : await sendPush(db, uid, title, body);
    if (!dry) {
      const batch = db.batch();
      list.forEach(x => batch.update(x.ref, { lateRemindOn: today, lateRemindCount: admin.firestore.FieldValue.increment(1) }));
      await batch.commit();
    }
    out.students++; out.assigns += n;
    out.results.push({ uid, name: oldest.studentName || '', n, late, r });
    list.forEach(x => {
      const t = x.a.teacherUid; if (!t) return;
      const g = byTeacher[t] = byTeacher[t] || { stu: {}, n: 0 };
      g.stu[uid] = oldest.studentName || '학생'; g.n++;
    });
  }

  for (const t of Object.keys(byTeacher)) {
    const g = byTeacher[t];
    const names = Object.values(g.stu);
    const head = names.slice(0, 3).join(', ') + (names.length > 3 ? ' 외 ' + (names.length - 3) + '명' : '');
    const r = dry ? 'dry' : await sendPush(db, t, '[단어 Test] 밀린 시험 ' + names.length + '명', head + ' · 밀린 시험 총 ' + g.n + '개. 학생에게 알림을 보냈어요.');
    out.teachers++; out.results.push({ teacher: t, students: names.length, n: g.n, r });
  }
  return res.status(200).json(out);
};
