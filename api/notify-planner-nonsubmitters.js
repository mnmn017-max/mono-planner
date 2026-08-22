// /api/notify-planner-nonsubmitters.js
// 오늘 플래너를 아직 제출하지 않은 학생들에게 푸시 알림을 보낸다.
//
// 하루 두 번(예: 오전/오후) 실행하도록 설계되어 있고, 이미 제출한 학생에게는
// 절대 보내지 않는다 — 매 실행 시 Firestore의 오늘자 planners 문서를 직접
// 확인해서 "아직 없는" 사람만 골라낸다.
//
// 트리거 방법 두 가지:
//   1) Vercel Cron (vercel.json의 crons 설정) - 정해진 시각에 자동 실행
//   2) 마스터가 "플래너" 탭에서 수동으로 즉시 실행 (Authorization 헤더로 인증)
//
// 주의: 이 파일은 초기화 단계에서 에러가 나도 절대 "그냥 죽지" 않도록,
// 모든 단계를 try/catch로 감싸서 항상 JSON으로 응답한다. (초기화 실패가
// 그대로 터지면 Vercel이 자체 에러 HTML 페이지를 대신 돌려주는데, 그걸
// 프론트엔드가 JSON으로 파싱하려다 "Unexpected token 'A'..." 같은
// 알아보기 힘든 에러로 보이게 된다 - 실제 원인은 항상 res.error 메시지로
// 그대로 노출되도록 해서 바로 원인을 알 수 있게 한다.)

const admin = require('firebase-admin');

function getAdminServices() {
  if (!admin.apps.length) {
    if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
      throw new Error('Firebase Admin 환경변수(FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY)가 Vercel에 설정되어 있지 않습니다. 프로젝트 Settings → Environment Variables에서 확인해주세요.');
    }
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });
  }
  return { db: admin.firestore(), messaging: admin.messaging() };
}

function getKstDateStr(now) {
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const y = kst.getUTCFullYear();
  const m = String(kst.getUTCMonth() + 1).padStart(2, '0');
  const d = String(kst.getUTCDate()).padStart(2, '0');
  return { dateStr: `${y}-${m}-${d}`, hour: kst.getUTCHours() };
}

module.exports = async function handler(req, res) {
  // 어떤 단계에서 실패하든 반드시 JSON으로 응답 (절대 그냥 크래시하지 않음)
  let db, messaging;
  try {
    const services = getAdminServices();
    db = services.db;
    messaging = services.messaging;
  } catch (e) {
    console.error('Firebase Admin 초기화 실패', e);
    return res.status(500).json({ error: 'Firebase Admin 초기화 실패: ' + e.message });
  }

  try {
    const authHeader = req.headers['authorization'] || '';
    const cronSecret = process.env.CRON_SECRET;
    const isCron = cronSecret && authHeader === 'Bearer ' + cronSecret;

    if (!isCron) {
      const idToken = authHeader.replace(/^Bearer\s+/i, '');
      if (!idToken) return res.status(401).json({ error: '인증 정보가 없습니다' });
      try {
        const decoded = await admin.auth().verifyIdToken(idToken);
        const userDoc = await db.collection('users').doc(decoded.uid).get();
        const role = userDoc.exists ? userDoc.data().role : null;
        if (role !== 'master' && role !== 'teacher') {
          return res.status(403).json({ error: '선생님/마스터 계정만 실행할 수 있습니다' });
        }
      } catch (e) {
        return res.status(401).json({ error: '인증 실패: ' + e.message });
      }
    }

    const slot = (req.query && req.query.slot) || (req.body && req.body.slot) || 'manual';
    const now = new Date();
    const { dateStr: today } = getKstDateStr(now);

    let scanned = 0, alreadySubmitted = 0, noToken = 0, sent = 0, failed = 0;

    const plannerSnap = await db.collection('planners').where('date', '==', today).get();
    const submittedUids = new Set(plannerSnap.docs.map((d) => d.data().uid));

    const studentSnap = await db.collection('users').where('role', '==', 'student').get();

    const targets = [];
    studentSnap.docs.forEach((d) => {
      const u = d.data();
      scanned++;
      if (u.suspended === true) return;
      if (submittedUids.has(d.id)) { alreadySubmitted++; return; }
      if (!u.fcmToken) { noToken++; return; }
      targets.push({ uid: d.id, token: u.fcmToken, name: u.name || '' });
    });

    const title = '📋 플래너 제출 안내';
    const body = slot === 'afternoon'
      ? '오늘 플래너를 아직 제출하지 않았어요! 마감 전에 잊지 말고 제출해주세요.'
      : '오늘 플래너 제출 잊지 않으셨나요? 지금 바로 제출해보세요 🙂';

    for (const t of targets) {
      try {
        await messaging.send({
          token: t.token,
          notification: { title, body },
          data: { type: 'planner_reminder', date: today, slot },
        });
        sent++;
      } catch (e) {
        failed++;
        if (e.code === 'messaging/registration-token-not-registered') {
          await db.collection('users').doc(t.uid).update({ fcmToken: admin.firestore.FieldValue.delete() }).catch(() => {});
        }
      }
    }

    return res.status(200).json({
      date: today, slot, scanned, alreadySubmitted, noToken,
      targeted: targets.length, sent, failed,
    });
  } catch (e) {
    console.error('notify-planner-nonsubmitters 실패', e);
    return res.status(500).json({ error: e.message || String(e) });
  }
};
