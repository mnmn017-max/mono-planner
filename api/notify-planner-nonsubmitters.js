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

function parseServiceAccountJson(raw) {
  // FIREBASE_SERVICE_ACCOUNT는 base64로 인코딩되어 저장된 경우가 많다 (줄바꿈/따옴표 이스케이프 문제 회피용).
  // 1) base64로 우선 디코딩 시도 -> JSON.parse
  try {
    var decoded = Buffer.from(raw, 'base64').toString('utf8');
    return JSON.parse(decoded);
  } catch (e) {
    // 2) base64가 아니라 순수 JSON 텍스트로 저장된 경우 그대로 파싱
    return JSON.parse(raw);
  }
}

function buildCredential() {
  // 1순위: FIREBASE_SERVICE_ACCOUNT (JSON 통짜로 저장된 서비스 계정) - 이미 설정되어 있으면 이걸 그대로 사용
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    var parsed;
    try {
      parsed = parseServiceAccountJson(process.env.FIREBASE_SERVICE_ACCOUNT);
    } catch (e) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT 환경변수가 올바른 JSON 형식이 아닙니다 (base64 디코딩도 시도했지만 실패): ' + e.message);
    }
    return admin.credential.cert({
      projectId: parsed.project_id,
      clientEmail: parsed.client_email,
      privateKey: (parsed.private_key || '').replace(/\\n/g, '\n'),
    });
  }
  // 2순위: 세 개로 나뉜 개별 환경변수
  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    return admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    });
  }
  throw new Error('Firebase Admin 환경변수를 찾을 수 없습니다. FIREBASE_SERVICE_ACCOUNT 또는 (FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY) 중 하나가 Vercel에 설정되어 있어야 합니다.');
}

function getAdminServices() {
  if (!admin.apps.length) {
    admin.initializeApp({ credential: buildCredential() });
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
    let myBranch = null;

    if (!isCron) {
      const idToken = authHeader.replace(/^Bearer\s+/i, '');
      if (!idToken) return res.status(401).json({ error: '인증 정보가 없습니다' });
      try {
        const decoded = await admin.auth().verifyIdToken(idToken);
        const userDoc = await db.collection('users').doc(decoded.uid).get();
        const userData = userDoc.exists ? userDoc.data() : null;
        const role = userData ? userData.role : null;
        if (role !== 'master' && role !== 'teacher') {
          return res.status(403).json({ error: '선생님/마스터 계정만 실행할 수 있습니다' });
        }
        myBranch = userData.branch || null;
      } catch (e) {
        return res.status(401).json({ error: '인증 실패: ' + e.message });
      }
    } else {
      // Cron으로 실행 시에는 지점 지정 없이 전체 실행 (분점이 여러 곳이면 slot과 함께 branch 파라미터를 넘기도록 확장 가능)
      myBranch = (req.query && req.query.branch) || null;
    }

    const slot = (req.query && req.query.slot) || (req.body && req.body.slot) || 'manual';
    const now = new Date();
    const { dateStr: today } = getKstDateStr(now);

    let scanned = 0, alreadySubmitted = 0, noToken = 0, sent = 0, failed = 0, otherBranch = 0;

    const plannerSnap = await db.collection('planners').where('date', '==', today).get();
    const submittedUids = new Set(plannerSnap.docs.map((d) => d.data().uid));

    const studentSnap = await db.collection('users').where('role', '==', 'student').get();

    const targets = [];
    studentSnap.docs.forEach((d) => {
      const u = d.data();
      scanned++;
      // 지점 필터: 요청한 선생님/마스터와 같은 지점 학생만 대상 (branch 값이 없는 옛날 계정은 포함 - 기존 대시보드 집계 방식과 동일)
      if (myBranch && u.branch && u.branch !== myBranch) { otherBranch++; return; }
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
          // notification 필드를 빼고 data로만 보낸다 - 브라우저의 "자동 알림 표시" 기능을
          // 완전히 끄고, 알림을 실제로 띄우는 코드 경로를 앱(포그라운드 핸들러 / 서비스워커
          // 백그라운드 핸들러) 쪽 하나로 통일해서 안드로이드에서 중복으로 뜨는 문제를 막는다.
          data: { type: 'planner_reminder', date: today, slot, title, body },
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
      date: today, slot, scanned, otherBranch, alreadySubmitted, noToken,
      targeted: targets.length, sent, failed,
    });
  } catch (e) {
    console.error('notify-planner-nonsubmitters 실패', e);
    return res.status(500).json({ error: e.message || String(e) });
  }
};
